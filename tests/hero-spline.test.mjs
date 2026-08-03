import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the hero places the two supplied Spline consoles on opposite sides", async () => {
  const html = await read("index.html");

  assert.match(html, /class="v3-hero-spline is-left"/);
  assert.match(html, /class="v3-hero-spline is-right"/);
  assert.match(
    html,
    /data-spline-src="https:\/\/my\.spline\.design\/gameconsole-C2J75pZy3HyB9XIr6qdhfb9q\/"/,
  );
  assert.match(
    html,
    /data-spline-src="https:\/\/my\.spline\.design\/moditeadventureldkgame-yudJHbgETLW1FY8UJ2SAgSvk\/"/,
  );
  assert.equal((html.match(/data-spline-scene/g) ?? []).length, 2);
});

test("exact Spline posters cover the remote scenes during cold startup", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");

  assert.match(
    html,
    /<source media="\(min-width: 1101px\)" srcset="\/home-v2\/spline-posters\/game-console.webp">/,
  );
  assert.match(
    html,
    /<source media="\(min-width: 1101px\)" srcset="\/home-v2\/spline-posters\/modite-console.webp">/,
  );
  assert.equal((html.match(/class="v3-hero-spline__poster"/g) ?? []).length, 2);
  assert.match(loader, /dataset\.splineRevealDelay/);
  assert.match(loader, /classList\.add\("is-live"\)/);

  const posterBytes =
    (await stat(new URL("../home-v2/spline-posters/game-console.webp", import.meta.url))).size
    + (await stat(new URL("../home-v2/spline-posters/modite-console.webp", import.meta.url))).size;
  assert.ok(posterBytes <= 60_000, `Spline posters use ${posterBytes} bytes`);
});

test("Spline scenes do not block the initial response or load on small screens", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-spline\.css\?v=2">/);
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
