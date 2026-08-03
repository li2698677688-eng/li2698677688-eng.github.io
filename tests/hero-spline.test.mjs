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

test("Spline scenes do not block the initial response or load on small screens", async () => {
  const html = await read("index.html");
  const loader = await read("_astro/hero-spline-loader.js");
  const css = await read("_astro/hero-spline.css");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-spline\.css\?v=1">/);
  assert.match(html, /<script type="module" src="\/_astro\/hero-spline-loader\.js\?v=1"><\/script>/);
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
