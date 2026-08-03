const MAX_CAMERA_ANGLE_DEGREES = 10;
const NARROW_CAMERA_ASPECT = 1.34;
const WIDE_CAMERA_ASPECT = 2.49;
const MIN_CAMERA_ZOOM = 1.15;
const MAX_CAMERA_ZOOM = 2;
const CAMERA_HORIZONTAL_SHIFT = 300;
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

function centerAndScaleCamera(application, orbit) {
  const camera = application?._camera;
  const position = camera?.position;
  const target = orbit?.target;
  if (
    !position
    || !target
    || typeof camera.updateMatrixWorld !== "function"
    || typeof camera.updateProjectionMatrix !== "function"
  ) return;

  camera.updateMatrixWorld(true);
  const rightAxis = camera.matrixWorld?.elements;
  if (
    !Number.isFinite(rightAxis?.[0])
    || !Number.isFinite(rightAxis?.[1])
    || !Number.isFinite(rightAxis?.[2])
  ) return;

  const cameraVector = [position.x, position.y, position.z, target.x, target.y, target.z];
  if (!cameraVector.every(Number.isFinite)) return;

  const aspect = Number.isFinite(camera.aspect) ? camera.aspect : WIDE_CAMERA_ASPECT;
  const framingProgress = Math.max(0, Math.min(
    1,
    (aspect - NARROW_CAMERA_ASPECT) / (WIDE_CAMERA_ASPECT - NARROW_CAMERA_ASPECT),
  ));
  camera.zoom = MIN_CAMERA_ZOOM + (MAX_CAMERA_ZOOM - MIN_CAMERA_ZOOM) * framingProgress;

  // Move the camera and orbit target together so centering preserves true 3D depth.
  const offsetX = -rightAxis[0] * CAMERA_HORIZONTAL_SHIFT;
  const offsetY = -rightAxis[1] * CAMERA_HORIZONTAL_SHIFT;
  const offsetZ = -rightAxis[2] * CAMERA_HORIZONTAL_SHIFT;
  position.x += offsetX;
  position.y += offsetY;
  position.z += offsetZ;
  target.x += offsetX;
  target.y += offsetY;
  target.z += offsetZ;
  camera.updateProjectionMatrix();
  orbit.update();
  orbit.stopDamping();
  application._requestRenderAutoMode?.();
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
  centerAndScaleCamera(application, orbit);

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
