import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the hero places the two supplied Spline consoles on opposite sides", async () => {
  const html = await read("index.html");
  const buildScript = await read("scripts/build-transparent-spline.mjs");

  assert.match(html, /class="v3-hero-spline is-left"/);
  assert.match(html, /class="v3-hero-spline is-right"/);
  assert.match(
    html,
    /data-spline-src="\/home-v2\/spline-scenes\/game-console\.html"/,
  );
  assert.match(
    html,
    /data-spline-src="\/home-v2\/spline-scenes\/modite-console\.html"/,
  );
  assert.match(buildScript, /gameconsole-C2J75pZy3HyB9XIr6qdhfb9q/);
  assert.match(buildScript, /moditeadventureldkgame-yudJHbgETLW1FY8UJ2SAgSvk/);
  assert.equal((html.match(/data-spline-scene/g) ?? []).length, 2);
});

test("the mirrored Spline canvases override their authored backgrounds with transparency", async () => {
  const gameConsole = await read("home-v2/spline-scenes/game-console.html");
  const moditeConsole = await read("home-v2/spline-scenes/modite-console.html");

  for (const scene of [gameConsole, moditeConsole]) {
    assert.match(scene, /background:\s*transparent/);
    assert.match(scene, /app\.setBackgroundColor\(['"]rgba\(0,0,0,0\)['"]\)/);
    assert.doesNotMatch(scene, /body\s*\{[^}]*background:\s*rgba\([^)]*,\s*1\)/s);
  }
});

test("exact transparent Spline posters cover the mirrored scenes during cold startup", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(
    html,
    /<source media="\(min-width: 1101px\)" srcset="\/home-v2\/spline-posters\/game-console.webp\?v=2">/,
  );
  assert.match(
    html,
    /<source media="\(min-width: 1101px\)" srcset="\/home-v2\/spline-posters\/modite-console.webp\?v=2">/,
  );
  assert.equal((html.match(/class="v3-hero-spline__poster"/g) ?? []).length, 2);
  assert.match(loader, /dataset\.splineRevealDelay/);
  assert.match(loader, /classList\.add\("is-live"\)/);
  assert.match(css, /is-left iframe[\s\S]*game-console-mask\.png/);
  assert.match(css, /is-right iframe[\s\S]*modite-console-mask\.png/);

  const posterBytes =
    (await stat(new URL("../home-v2/spline-posters/game-console.webp", import.meta.url))).size
    + (await stat(new URL("../home-v2/spline-posters/modite-console.webp", import.meta.url))).size;
  assert.ok(posterBytes <= 60_000, `Spline posters use ${posterBytes} bytes`);

  const maskBytes =
    (await stat(new URL("../home-v2/spline-posters/game-console-mask.png", import.meta.url))).size
    + (await stat(new URL("../home-v2/spline-posters/modite-console-mask.png", import.meta.url))).size;
  assert.ok(maskBytes <= 60_000, `Spline masks use ${maskBytes} bytes`);
});

test("Spline scenes do not block the initial response or load on small screens", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-spline\.css\?v=3">/);
  assert.match(html, /<script type="module" src="\/_astro\/hero-spline-loader\.js\?v=2"><\/script>/);
  assert.doesNotMatch(html, /<iframe[^>]+src="https:\/\/my\.spline\.design/);
  assert.match(loader, /requestIdleCallback/);
  assert.match(loader, /IntersectionObserver/);
  assert.match(loader, /matchMedia\("\(min-width: 1101px\)"\)/);
  assert.match(loader, /dataset\.splineSrc/);
  assert.match(loader, /iframe\.loading = "lazy"/);
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
