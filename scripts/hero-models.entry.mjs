import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getHeroModelsForViewport } from "./hero-models.config.mjs";

const HOVER_SCALE = 1.12;
const REDUCED_MOTION_SCALE = 1.04;
const ROTATION_SPEED = 2.1;
const SCALE_EASING = 10;

function disposeMaterial(material, disposedTextures) {
  for (const value of Object.values(material)) {
    if (!value?.isTexture || disposedTextures.has(value)) continue;
    disposedTextures.add(value);
    value.dispose();
  }
  material.dispose();
}

async function initHeroModels(stage) {
  const canvas = document.createElement("canvas");
  canvas.className = "v3-hero-models__canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
  camera.position.z = 10;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b4532, 2.4));

  const loader = new GLTFLoader();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(2, 2);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const modelConfigs = getHeroModelsForViewport(window.innerWidth);
  const modelRoots = [];
  let hoveredRoot = null;
  let animationFrame = 0;
  let lastFrameTime = performance.now();
  let disposed = false;

  function resize() {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const aspect = width / height;

    renderer.setSize(width, height, false);
    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();

    for (const root of modelRoots) {
      const { config } = root.userData;
      root.position.set((config.x * 2 - 1) * aspect, 1 - config.y * 2, 0);
    }
    renderer.render(scene, camera);
  }

  function scheduleMotion() {
    if (animationFrame || disposed || document.visibilityState !== "visible") return;
    lastFrameTime = performance.now();
    animationFrame = requestAnimationFrame(renderMotion);
  }

  function renderMotion(time) {
    animationFrame = 0;
    const delta = Math.min((time - lastFrameTime) / 1000, 0.05);
    lastFrameTime = time;
    let keepAnimating = false;

    for (const root of modelRoots) {
      const isHovered = root === hoveredRoot;
      const targetScale = isHovered
        ? (reducedMotion.matches ? REDUCED_MOTION_SCALE : HOVER_SCALE)
        : 1;
      const scaleState = root.userData.scaleState;
      scaleState.current += (targetScale - scaleState.current)
        * Math.min(1, delta * SCALE_EASING);
      root.scale.setScalar(root.userData.baseScale * scaleState.current);

      if (isHovered && !reducedMotion.matches) {
        root.rotation.y += delta * ROTATION_SPEED;
        keepAnimating = true;
      }
      if (Math.abs(targetScale - scaleState.current) > 0.002) keepAnimating = true;
    }

    renderer.render(scene, camera);
    if (keepAnimating) animationFrame = requestAnimationFrame(renderMotion);
  }

  function setHoveredRoot(nextRoot) {
    if (hoveredRoot === nextRoot) return;
    hoveredRoot = nextRoot;
    stage.dataset.hoveredModel = nextRoot?.userData.config.id ?? "";
    scheduleMotion();
  }

  function onPointerMove(event) {
    if (!canHover.matches || !modelRoots.length) return;
    const rect = stage.getBoundingClientRect();
    const inside = event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom;
    if (!inside) {
      setHoveredRoot(null);
      return;
    }

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(modelRoots, true)[0];
    setHoveredRoot(hit?.object.userData.heroModelRoot ?? null);
  }

  async function loadModel(config) {
    const gltf = await loader.loadAsync(config.src);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    if (bounds.isEmpty()) throw new Error(`${config.id} has no visible geometry`);

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const longestEdge = Math.max(size.x, size.y, size.z);
    const root = new THREE.Group();
    const baseScale = (config.height * 2) / longestEdge;

    gltf.scene.position.sub(center);
    root.add(gltf.scene);
    root.rotation.set(...config.rotation);
    root.scale.setScalar(baseScale);
    root.userData = {
      baseScale,
      config,
      scaleState: { current: 1 },
    };
    root.traverse((child) => {
      child.userData.heroModelRoot = root;
    });
    scene.add(root);
    modelRoots.push(root);
  }

  const loadResults = await Promise.allSettled(modelConfigs.map(loadModel));
  if (!modelRoots.length) {
    const firstFailure = loadResults.find((result) => result.status === "rejected");
    throw firstFailure?.reason ?? new Error("No hero models loaded");
  }

  resize();
  stage.dataset.heroModelState = "ready";
  stage.classList.add("is-ready");

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", scheduleMotion);
  reducedMotion.addEventListener("change", scheduleMotion);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("visibilitychange", scheduleMotion);
    reducedMotion.removeEventListener("change", scheduleMotion);
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    const disposedTextures = new Set();
    scene.traverse((object) => {
      if (object.geometry && !disposedGeometries.has(object.geometry)) {
        disposedGeometries.add(object.geometry);
        object.geometry.dispose();
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || disposedMaterials.has(material)) continue;
        disposedMaterials.add(material);
        disposeMaterial(material, disposedTextures);
      }
    });
    renderer.dispose();
  }

  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) dispose();
  }, { once: true });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stage.dataset.heroModelState = "failed";
    stage.classList.remove("is-ready");
  }, { once: true });
}

const stage = document.querySelector("[data-hero-model-stage]");
if (stage) {
  stage.dataset.heroModelState = "loading";
  initHeroModels(stage).catch((error) => {
    stage.dataset.heroModelState = "failed";
    stage.replaceChildren();
    console.warn("Wanaka hero models could not load", error);
  });
}
