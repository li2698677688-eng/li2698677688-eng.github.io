const MAX_CAMERA_ANGLE_DEGREES = 10;
const CAMERA_EASING = 0.16;
const SETTLE_THRESHOLD_RADIANS = 0.0001;
const DEGREES_TO_RADIANS = Math.PI / 180;

function clampAnglePair(yawDegrees, pitchDegrees) {
  const yaw = Number.isFinite(yawDegrees) ? yawDegrees : 0;
  const pitch = Number.isFinite(pitchDegrees) ? pitchDegrees : 0;
  const magnitude = Math.hypot(yaw, pitch);
  const scale = magnitude > MAX_CAMERA_ANGLE_DEGREES
    ? MAX_CAMERA_ANGLE_DEGREES / magnitude
    : 1;
  return { yaw: yaw * scale, pitch: pitch * scale };
}

export function createSplineCameraParallax(application, options = {}) {
  const orbit = application?._controls?.orbitControls;
  const canOrbit = orbit
    && typeof orbit.rotateLeft === "function"
    && typeof orbit.rotateUp === "function"
    && typeof orbit.update === "function"
    && typeof orbit.stopDamping === "function";

  if (!canOrbit) {
    return {
      setCameraParallax() {},
      dispose() {},
    };
  }

  const requestFrame = options.requestFrame ?? ((callback) => globalThis.requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? ((id) => globalThis.cancelAnimationFrame(id));
  let currentYaw = 0;
  let currentPitch = 0;
  let targetYaw = 0;
  let targetPitch = 0;
  let frameId;
  let disposed = false;

  orbit.enableZoom = false;
  orbit.enablePan = false;
  orbit.enableRotate = false;

  function animateCamera() {
    frameId = undefined;
    if (disposed) return;

    const yawGap = targetYaw - currentYaw;
    const pitchGap = targetPitch - currentPitch;
    const nextYaw = Math.abs(yawGap) <= SETTLE_THRESHOLD_RADIANS
      ? targetYaw
      : currentYaw + yawGap * CAMERA_EASING;
    const nextPitch = Math.abs(pitchGap) <= SETTLE_THRESHOLD_RADIANS
      ? targetPitch
      : currentPitch + pitchGap * CAMERA_EASING;

    orbit.rotateLeft(nextYaw - currentYaw);
    orbit.rotateUp(nextPitch - currentPitch);
    orbit.update();
    orbit.stopDamping();
    application._requestRenderAutoMode?.();

    currentYaw = nextYaw;
    currentPitch = nextPitch;
    if (currentYaw !== targetYaw || currentPitch !== targetPitch) {
      frameId = requestFrame(animateCamera);
    }
  }

  function setCameraParallax(yawDegrees, pitchDegrees) {
    const target = clampAnglePair(yawDegrees, pitchDegrees);
    targetYaw = target.yaw * DEGREES_TO_RADIANS;
    targetPitch = target.pitch * DEGREES_TO_RADIANS;
    if (frameId === undefined) frameId = requestFrame(animateCamera);
  }

  function dispose() {
    disposed = true;
    if (frameId !== undefined) cancelFrame(frameId);
    frameId = undefined;
  }

  return { setCameraParallax, dispose };
}
