import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the hero stages six lightweight GLB props around the central content", async () => {
  const { HERO_MODELS } = await import("../scripts/hero-models.config.mjs");
  const ids = HERO_MODELS.map((model) => model.id);
  let totalBytes = 0;

  assert.deepEqual(ids, [
    "mailbox",
    "watering-can",
    "hand-tool-left",
    "crate",
    "barrel",
    "hand-tool-right",
  ]);
  assert.equal(new Set(HERO_MODELS.map((model) => model.src)).size, HERO_MODELS.length);
  assert.equal(HERO_MODELS.filter((model) => model.x < 0.5).length, 3);
  assert.equal(HERO_MODELS.filter((model) => model.x > 0.5).length, 3);

  for (const model of HERO_MODELS) {
    assert.match(model.src, /^\/home-v2\/hero-models\/[a-z0-9-]+\.glb$/);
    assert.ok(model.x >= 0 && model.x <= 1);
    assert.ok(model.y >= 0 && model.y <= 1);
    assert.ok(model.height >= 0.12 && model.height <= 0.24);

    const file = new URL(`..${model.src}`, import.meta.url);
    assert.equal((await readFile(file)).subarray(0, 4).toString("ascii"), "glTF");
    totalBytes += (await stat(file)).size;
  }

  assert.ok(totalBytes <= 180_000, `hero GLBs use ${totalBytes} bytes`);
});

test("the first response defers the Three.js bundle until the hero is idle", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-models-loader.js");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-models\.css\?v=1">/);
  assert.match(html, /data-hero-model-stage/);
  assert.match(html, /<script type="module" src="\/_astro\/hero-models-loader\.js\?v=2"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]+src="\/_astro\/hero-models\.js/);
  assert.match(loader, /requestIdleCallback/);
  assert.match(loader, /IntersectionObserver/);
  assert.match(loader, /import\("\/\_astro\/hero-models\.js\?v=2"\)/);
});

test("hero GLBs share one event-driven WebGL scene with hover and motion safeguards", async () => {
  const source = await read("scripts/hero-models.entry.mjs");

  assert.match(source, /new THREE\.WebGLRenderer/);
  assert.match(source, /new THREE\.Raycaster/);
  assert.match(source, /const HOVER_SCALE = 1\.12/);
  assert.match(source, /rotation\.y \+=/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /Math\.min\(window\.devicePixelRatio, 1\.5\)/);
  assert.match(source, /document\.visibilityState/);
  assert.match(source, /renderer\.dispose\(\)/);
});

test("hero materials use a targeted vivid color grade instead of a full-canvas filter", async () => {
  const source = await read("scripts/hero-models.entry.mjs");
  const css = await read("_astro/hero-models.css");

  assert.match(source, /const VIVID_SATURATION = 1\.42/);
  assert.match(source, /const VIVID_BRIGHTNESS = 1\.08/);
  assert.match(source, /const VIVID_CONTRAST = 1\.06/);
  assert.match(source, /material\.onBeforeCompile/);
  assert.match(source, /outgoingLight = clamp\(vividColor/);
  assert.match(source, /material\.customProgramCacheKey/);
  assert.doesNotMatch(css, /filter:\s*(?:saturate|brightness|contrast)/);
});

test("mobile keeps only three decorative models and avoids hover-only animation", async () => {
  const { getHeroModelsForViewport } = await import("../scripts/hero-models.config.mjs");
  const source = await read("scripts/hero-models.entry.mjs");
  const mobileModels = getHeroModelsForViewport(390);
  const desktopModels = getHeroModelsForViewport(1440);

  assert.equal(mobileModels.length, 3);
  assert.equal(desktopModels.length, 6);
  assert.ok(mobileModels.every((model) => model.mobile));
  assert.match(source, /matchMedia\("\(hover: hover\) and \(pointer: fine\)"\)/);
});
