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
    /data-spline-src="\/home-v2\/spline-scenes\/game-transparent\.js\?v=1"/,
  );
  assert.equal((html.match(/data-spline-scene/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-spline-src="https:\/\/my\.spline\.design/);
  assert.match(scene, /Mirrored from https:\/\/my\.spline\.design\/game-QnLgzQ729ZbpMexECRHUEk7n\//);
  assert.match(scene, /export async function mountSpline\(canvas\)/);
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
  assert.match(css, /\.v3-hero-spline canvas\s*\{[^}]*width:\s*110%[^}]*height:\s*110%/s);
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

test("the page owns wheel scrolling while mouse parallax is capped at ten degrees", async () => {
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(loader, /const MAX_PARALLAX_DEGREES = 10;/);
  assert.match(loader, /hero\.addEventListener\("pointermove", handlePointerMove/);
  assert.match(loader, /hero\.addEventListener\("pointerleave", resetParallax/);
  assert.match(loader, /Math\.max\(-1, Math\.min\(1,/);
  assert.match(loader, /--spline-rotate-x/);
  assert.match(loader, /--spline-rotate-y/);
  assert.doesNotMatch(loader, /addEventListener\(["']wheel["']/);
  assert.match(loader, /document\.createElement\("canvas"\)/);
  assert.match(loader, /canvas\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(loader, /await import\(scene\.dataset\.splineSrc\)/);
  assert.match(loader, /application\.dispose\(\)/);
  assert.doesNotMatch(loader, /createElement\("iframe"\)/);
  assert.match(css, /\.v3-hero-spline\.is-live canvas\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /rotateX\(var\(--spline-rotate-x\)\)/);
  assert.match(css, /rotateY\(var\(--spline-rotate-y\)\)/);
});

test("Spline scenes do not block the initial response or load on small screens", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-spline\.css\?v=5">/);
  assert.match(html, /<script type="module" src="\/_astro\/hero-spline-loader\.js\?v=4"><\/script>/);
  assert.doesNotMatch(html, /<iframe[^>]+src="https:\/\/my\.spline\.design|<canvas[^>]+data-spline/);
  assert.match(loader, /requestIdleCallback/);
  assert.match(loader, /IntersectionObserver/);
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
