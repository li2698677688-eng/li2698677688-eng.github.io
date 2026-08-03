import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the hero uses the supplied Spline game as one full-stage scene", async () => {
  const html = await read("index.html");

  assert.match(html, /class="v3-hero-spline"/);
  assert.match(
    html,
    /data-spline-src="https:\/\/my\.spline\.design\/game-QnLgzQ729ZbpMexECRHUEk7n\/"/,
  );
  assert.equal((html.match(/data-spline-scene/g) ?? []).length, 1);
  assert.doesNotMatch(html, /spline-scenes\/(?:game|modite)-console\.html/);
});

test("the supplied Spline fills the hero stage without side-specific masks", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(loader, /dataset\.splineRevealDelay/);
  assert.match(loader, /classList\.add\("is-live"\)/);
  assert.match(css, /\.v3-hero-spline\s*\{[^}]*inset:\s*0/s);
  assert.match(css, /\.v3-hero-spline iframe\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/s);
  assert.doesNotMatch(css, /mask-image|spline-posters|\.is-left|\.is-right/);
  assert.doesNotMatch(html, /class="v3-hero-spline__poster"/);
});

test("the hero switches to readable light-canvas controls only when Spline is ready", async () => {
  const css = await read("_astro/hero-spline.css");

  assert.match(css, /\[data-spline-stage-state="ready"\]\s*\+\s*\.v3-hero__content h1\s*\{[^}]*color:\s*#140e10/s);
  assert.match(css, /\[data-spline-stage-state="ready"\][\s\S]*\.v3-prompt\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /\[data-spline-stage-state="ready"\][\s\S]*\.v3-prompt textarea::placeholder\s*\{[^}]*rgba\(20,\s*14,\s*16,\s*0\.48\)/s);
  assert.doesNotMatch(css, /\.v3-hero__content::before|radial-gradient/);
});

test("Spline scenes do not block the initial response or load on small screens", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-spline\.css\?v=4">/);
  assert.match(html, /<script type="module" src="\/_astro\/hero-spline-loader\.js\?v=3"><\/script>/);
  assert.doesNotMatch(html, /<iframe[^>]+src="https:\/\/my\.spline\.design/);
  assert.match(loader, /requestIdleCallback/);
  assert.match(loader, /IntersectionObserver/);
  assert.match(loader, /matchMedia\("\(min-width: 1101px\)"\)/);
  assert.match(loader, /dataset\.splineSrc/);
  assert.match(loader, /iframe\.loading = "lazy"/);
  assert.match(loader, /iframe\.title = scene\.dataset\.splineTitle/);
  assert.doesNotMatch(loader, /iframe\.tabIndex = -1/);
  assert.match(css, /@media \(width <= 1100px\)/);
  assert.match(css, /\.v3-hero-spline-stage\s*\{[^}]*display:\s*none/s);

  const localHeroBytes =
    (await stat(new URL("../_astro/hero-spline.css", import.meta.url))).size
    + (await stat(new URL("../_astro/hero-spline-loader.js", import.meta.url))).size;
  assert.ok(localHeroBytes <= 7_000, `local Spline shell uses ${localHeroBytes} bytes`);
});

test("the retired Three.js and GLB hero chain is absent", async () => {
  const html = await read("index.html");
  const packageJson = JSON.parse(await read("package.json"));

  assert.doesNotMatch(html, /hero-models|data-hero-model-stage/);
  assert.equal(packageJson.devDependencies?.three, undefined);
  assert.equal(packageJson.devDependencies?.esbuild, undefined);
  assert.equal(packageJson.scripts?.["build:hero-models"], undefined);
});

test("the retired Spline mirrors and QA artifacts are not deployed", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const retiredPaths = [
    "../home-v2/spline-scenes/",
    "../home-v2/spline-posters/",
    "../artifacts/",
    "../scripts/build-transparent-spline.mjs",
    "../scripts/build-spline-poster-assets.py",
    "../scripts/remove-spline-background.swift",
    "../design-qa.md",
  ];

  assert.equal(packageJson.scripts?.["build:spline-scenes"], undefined);
  for (const path of retiredPaths) {
    await assert.rejects(stat(new URL(path, import.meta.url)), { code: "ENOENT" });
  }
});
