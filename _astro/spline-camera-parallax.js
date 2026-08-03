const MAX_CAMERA_ANGLE_DEGREES = 5;
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

function computeRenderableCenter(application) {
  const page = application?._scene?.activePage;
  if (!page || typeof page.traverse !== "function") return null;

  page.updateMatrixWorld?.(true);
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  let meshCount = 0;

  page.traverse((object) => {
    if (!object?.isMesh || object.visible === false || !object.geometry) return;
    object.geometry.computeBoundingBox?.();
    const box = object.geometry.boundingBox;
    const matrix = object.matrixWorld?.elements;
    const bounds = [
      box?.min?.x, box?.min?.y, box?.min?.z,
      box?.max?.x, box?.max?.y, box?.max?.z,
    ];
    if (!matrix || !bounds.every(Number.isFinite)) return;

    meshCount += 1;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const world = [
            matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
            matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
            matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
          ];
          for (let axis = 0; axis < 3; axis += 1) {
            minimum[axis] = Math.min(minimum[axis], world[axis]);
            maximum[axis] = Math.max(maximum[axis], world[axis]);
          }
        }
      }
    }
  });

  if (!meshCount || !minimum.concat(maximum).every(Number.isFinite)) return null;
  return minimum.map((value, axis) => (value + maximum[axis]) / 2);
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

  const renderableCenter = computeRenderableCenter(application);

  // Offset the camera for framing, then orbit around the actual rendered model center.
  const offsetX = -rightAxis[0] * CAMERA_HORIZONTAL_SHIFT;
  const offsetY = -rightAxis[1] * CAMERA_HORIZONTAL_SHIFT;
  const offsetZ = -rightAxis[2] * CAMERA_HORIZONTAL_SHIFT;
  position.x += offsetX;
  position.y += offsetY;
  position.z += offsetZ;
  if (renderableCenter) {
    [target.x, target.y, target.z] = renderableCenter;
  } else {
    target.x += offsetX;
    target.y += offsetY;
    target.z += offsetZ;
  }
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
