import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the hero uses a local transparent mirror of the supplied Spline game", async () => {
  const html = await read("index.html");
  const scene = await read("home-v2/spline-scenes/game-transparent.js");

  assert.match(html, /class="v3-hero-spline"/);
  assert.match(
    html,
    /data-spline-src="\/home-v2\/spline-scenes\/game-transparent\.js\?v=4"/,
  );
  assert.equal((html.match(/data-spline-scene/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-spline-src="https:\/\/my\.spline\.design/);
  assert.match(scene, /Mirrored from https:\/\/my\.spline\.design\/game-QnLgzQ729ZbpMexECRHUEk7n\//);
  assert.match(scene, /export async function mountSpline\(canvas\)/);
  assert.match(scene, /spline-camera-parallax\.js\?v=3/);
  assert.match(scene, /app\._renderer\.setClearAlpha\(0\)/);
  assert.match(scene, /app\._scene\.activePage\.bgColor\.a = 0/);
  assert.doesNotMatch(scene, /app\._renderer\.setClearColor =/);
  assert.doesNotMatch(scene, /app\.setBackgroundColor\(['"]rgba\(0,0,0,0\)['"]\)/);
  assert.doesNotMatch(scene, /<!DOCTYPE html>|<iframe/);
});

test("the transparent Spline fills the hero stage without side-specific masks", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(loader, /dataset\.splineRevealDelay/);
  assert.match(loader, /classList\.add\("is-live"\)/);
  assert.match(css, /\.v3-hero-spline\s*\{[^}]*inset:\s*0/s);
  assert.match(css, /\.v3-hero-spline canvas\s*\{[^}]*top:\s*0[^}]*left:\s*0[^}]*width:\s*100%[^}]*height:\s*100%/s);
  assert.doesNotMatch(css, /mask-image|spline-posters|\.is-left|\.is-right/);
  assert.doesNotMatch(html, /class="v3-hero-spline__poster"/);
});

test("the transparent scene preserves the original dark-page hero treatment", async () => {
  const css = await read("_astro/hero-spline.css");

  assert.doesNotMatch(css, /\[data-spline-stage-state="ready"\]\s*\+\s*\.v3-hero__content/);
  assert.doesNotMatch(css, /color:\s*#140e10/);
  assert.doesNotMatch(css, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)/);
  assert.doesNotMatch(css, /\.v3-hero__content::before|radial-gradient/);
});

test("the page owns wheel scrolling while mouse parallax is capped at five degrees", async () => {
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");
  const scene = await read("home-v2/spline-scenes/game-transparent.js");

  assert.match(loader, /const MAX_PARALLAX_DEGREES = 5;/);
  assert.match(loader, /hero\.addEventListener\("pointermove", handlePointerMove/);
  assert.match(loader, /hero\.addEventListener\("pointerleave", resetParallax/);
  assert.match(loader, /Math\.max\(-1, Math\.min\(1,/);
  assert.match(loader, /const pitchDegrees = normalizedY \* MAX_PARALLAX_DEGREES;/);
  assert.match(loader, /application\?\.setCameraParallax\(yawDegrees, pitchDegrees\)/);
  assert.match(scene, /createSplineCameraParallax/);
  assert.doesNotMatch(loader, /--spline-rotate-x|--spline-rotate-y/);
  assert.doesNotMatch(loader, /addEventListener\(["']wheel["']/);
  assert.match(loader, /document\.createElement\("canvas"\)/);
  assert.match(loader, /canvas\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(loader, /await import\(scene\.dataset\.splineSrc\)/);
  assert.match(loader, /application\.dispose\(\)/);
  assert.doesNotMatch(loader, /createElement\("iframe"\)/);
  assert.match(css, /\.v3-hero-spline\.is-live canvas\s*\{[^}]*pointer-events:\s*none/s);
  assert.doesNotMatch(css, /perspective\(|rotateX\(|rotateY\(|--spline-rotate/);
});

test("Spline parallax changes the real camera orbit and returns to its baseline", async () => {
  const { createSplineCameraParallax } = await import("../_astro/spline-camera-parallax.js");
  const frames = new Map();
  let nextFrameId = 0;
  let yawRadians = 0;
  let pitchRadians = 0;
  let updateCount = 0;
  let stopDampingCount = 0;
  let renderCount = 0;
  let projectionUpdateCount = 0;
  let matrixWorldUpdateCount = 0;
  const camera = {
    zoom: 1,
    position: { x: 20, y: 30, z: 40 },
    matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    updateMatrixWorld() {
      matrixWorldUpdateCount += 1;
    },
    updateProjectionMatrix() {
      projectionUpdateCount += 1;
    },
  };
  const orbit = {
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
    target: { x: 10, y: 15, z: 25 },
    rotateLeft(value) {
      yawRadians += value;
    },
    rotateUp(value) {
      pitchRadians += value;
    },
    update() {
      updateCount += 1;
    },
    stopDamping() {
      stopDampingCount += 1;
    },
  };
  const mesh = {
    isMesh: true,
    visible: true,
    geometry: {
      boundingBox: {
        min: { x: -100, y: -50, z: -25 },
        max: { x: 100, y: 50, z: 25 },
      },
      computeBoundingBox() {},
    },
    matrixWorld: {
      elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 50, 60, 70, 1],
    },
  };
  const requestFrame = (callback) => {
    const id = ++nextFrameId;
    frames.set(id, callback);
    return id;
  };
  const cancelFrame = (id) => frames.delete(id);
  const flushFrames = () => {
    let remaining = 240;
    while (frames.size && remaining > 0) {
      const [id, callback] = frames.entries().next().value;
      frames.delete(id);
      callback();
      remaining -= 1;
    }
    assert.ok(remaining > 0, "camera parallax animation settles");
  };
  const controller = createSplineCameraParallax(
    {
      _camera: camera,
      _controls: { orbitControls: orbit },
      _scene: {
        activePage: {
          updateMatrixWorld() {},
          traverse(callback) {
            callback(mesh);
          },
        },
      },
      _requestRenderAutoMode() {
        renderCount += 1;
      },
    },
    { requestFrame, cancelFrame },
  );

  assert.equal(camera.zoom, 2, "the real camera doubles the scene size");
  assert.deepEqual(camera.position, { x: -280, y: 30, z: 40 }, "the camera shifts left along its local horizontal axis");
  assert.deepEqual(orbit.target, { x: 50, y: 60, z: 70 }, "the orbit target is the rendered model center");
  assert.equal(matrixWorldUpdateCount, 1);
  assert.equal(projectionUpdateCount, 1);

  controller.setCameraParallax(25, -30);
  flushFrames();
  const yawDegrees = yawRadians * 180 / Math.PI;
  const pitchDegrees = pitchRadians * 180 / Math.PI;
  assert.ok(Math.abs(Math.hypot(yawDegrees, pitchDegrees) - 5) < 0.0001, "total camera offset is clamped to 5 degrees");
  assert.ok(Math.abs(yawDegrees / pitchDegrees - 25 / -30) < 0.0001, "camera direction follows the pointer vector");
  assert.equal(orbit.enableZoom, false);
  assert.equal(orbit.enablePan, false);
  assert.equal(orbit.enableRotate, false);
  assert.equal(updateCount, stopDampingCount);
  assert.ok(renderCount > 1, "the real Spline renderer receives each eased camera frame");

  controller.setCameraParallax(0, 0);
  flushFrames();
  assert.ok(Math.abs(yawRadians) < 0.0001, "yaw returns to the exported camera view");
  assert.ok(Math.abs(pitchRadians) < 0.0001, "pitch returns to the exported camera view");
  controller.dispose();
  assert.equal(frames.size, 0);
});

test("Spline camera framing stays enlarged without over-cropping narrow desktop ratios", async () => {
  const { createSplineCameraParallax } = await import("../_astro/spline-camera-parallax.js");
  const camera = {
    aspect: 1.34,
    zoom: 1,
    position: { x: 0, y: 0, z: 0 },
    matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    updateMatrixWorld() {},
    updateProjectionMatrix() {},
  };
  const orbit = {
    target: { x: 0, y: 0, z: 0 },
    rotateLeft() {},
    rotateUp() {},
    update() {},
    stopDamping() {},
  };
  const mesh = {
    isMesh: true,
    visible: true,
    geometry: {
      boundingBox: {
        min: { x: -400, y: 300, z: 500 },
        max: { x: 100, y: 700, z: 800 },
      },
      computeBoundingBox() {},
    },
    matrixWorld: {
      elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    },
  };
  const controller = createSplineCameraParallax({
    _camera: camera,
    _controls: { orbitControls: orbit },
    _scene: {
      activePage: {
        updateMatrixWorld() {},
        traverse(callback) {
          callback(mesh);
        },
      },
    },
  });

  assert.equal(camera.zoom, 1.15);
  assert.deepEqual(camera.position, { x: -300, y: 0, z: 0 });
  assert.deepEqual(orbit.target, { x: -150, y: 500, z: 650 });
  controller.dispose();
});

test("the above-fold Spline is module-preloaded and mounts immediately on desktop", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(html, /<link rel="modulepreload" href="\/home-v2\/spline-scenes\/game-transparent\.js\?v=4">/);
  assert.match(html, /<link rel="modulepreload" href="https:\/\/unpkg\.com\/@splinetool\/runtime@1\.12\.98\/build\/runtime\.js" crossorigin>/);
  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-spline\.css\?v=8">/);
  assert.match(html, /<script type="module" src="\/_astro\/hero-spline-loader\.js\?v=7"><\/script>/);
  assert.match(html, /data-spline-reveal-delay="0"/);
  assert.doesNotMatch(html, /<iframe[^>]+src="https:\/\/my\.spline\.design|<canvas[^>]+data-spline/);
  assert.doesNotMatch(loader, /requestIdleCallback|IntersectionObserver/);
  assert.match(loader, /loadScenes\(\);/);
  assert.match(loader, /matchMedia\("\(min-width: 1101px\)"\)/);
  assert.match(loader, /dataset\.splineSrc/);
  assert.match(loader, /activeApplications = new Map\(\)/);
  assert.match(css, /@media \(width <= 1100px\)/);
  assert.match(css, /\.v3-hero-spline-stage\s*\{[^}]*display:\s*none/s);

  const localHeroBytes =
    (await stat(new URL("../_astro/hero-spline.css", import.meta.url))).size
    + (await stat(new URL("../_astro/hero-spline-loader.js", import.meta.url))).size;
  assert.ok(localHeroBytes <= 8_000, `local Spline shell uses ${localHeroBytes} bytes`);
});

test("the retired Three.js and GLB hero chain is absent", async () => {
  const html = await read("index.html");
  const packageJson = JSON.parse(await read("package.json"));

  assert.doesNotMatch(html, /hero-models|data-hero-model-stage/);
  assert.equal(packageJson.devDependencies?.three, undefined);
  assert.equal(packageJson.devDependencies?.esbuild, undefined);
  assert.equal(packageJson.scripts?.["build:hero-models"], undefined);
});

test("the retired Spline mirrors and QA artifacts stay absent", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const retiredPaths = [
    "../home-v2/spline-scenes/game-transparent.html",
    "../home-v2/spline-posters/",
    "../artifacts/",
    "../scripts/build-spline-poster-assets.py",
    "../scripts/remove-spline-background.swift",
    "../design-qa.md",
  ];

  assert.equal(packageJson.scripts?.["build:spline-scenes"], "node scripts/build-transparent-spline.mjs");
  for (const path of retiredPaths) {
    await assert.rejects(stat(new URL(path, import.meta.url)), { code: "ENOENT" });
  }
});
