import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

function pngDimensions(bytes) {
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("the homepage uses all six Figma prop images around the hero content", async () => {
  const html = await read("index.html");
  const props = [...html.matchAll(/data-hero-prop="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(props, ["controller", "barn", "axe", "fence", "barrel", "shovel"]);
  assert.match(html, /<link rel="stylesheet" href="\/_astro\/hero-art\.css\?v=1">/);
  assert.match(html, /class="v3-hero-art" data-hero-art aria-hidden="true"/);
  assert.equal((html.match(/figma-props-sprite\.png/g) ?? []).length, 5);
  assert.equal((html.match(/figma-prop-controller\.png/g) ?? []).length, 1);
  assert.doesNotMatch(html, /hero-model|\.glb|three|<canvas[^>]+hero/i);
});

test("the hero reproduces the Figma background and desktop prop coordinates", async () => {
  const css = await read("_astro/hero-art.css");

  assert.match(css, /--figma-frame-width:\s*1920/);
  assert.match(css, /--figma-frame-height:\s*1300/);
  assert.match(css, /#222b28/);
  assert.match(css, /#a35c14/);
  assert.match(css, /#73241d/);
  assert.match(css, /blur\(220px\)/);
  assert.match(css, /linear-gradient\(to bottom,\s*rgba\(22,\s*19,\s*17,\s*0\),\s*#161311\)/);
  assert.match(css, /radial-gradient\(circle at 1\.5px 1\.5px,\s*#ebe1d714 1\.5px,\s*transparent 0\)/);
  assert.match(css, /background-size:\s*32px 32px/);
  assert.match(css, /--x:\s*1448/);
  assert.match(css, /--x:\s*214/);
  assert.match(css, /--x:\s*1630/);
  assert.match(css, /--rotation:\s*35\.17deg/);
  assert.match(css, /--sprite-left:\s*-306\.8%/);
  assert.match(css, /--sprite-top:\s*-354\.56%/);
});

test("the committed Figma images are exact lightweight PNG assets", async () => {
  const controller = new URL("../home-v2/hero-art/figma-prop-controller.png", import.meta.url);
  const sprite = new URL("../home-v2/hero-art/figma-props-sprite.png", import.meta.url);
  const controllerBytes = await readFile(controller);
  const spriteBytes = await readFile(sprite);

  assert.deepEqual(pngDimensions(controllerBytes), { width: 658, height: 658 });
  assert.deepEqual(pngDimensions(spriteBytes), { width: 1103, height: 1426 });
  assert.ok((await stat(controller)).size + (await stat(sprite)).size < 1_300_000);
});

test("prop hover is CSS-only and the Three.js build dependency is gone", async () => {
  const css = await read("_astro/hero-art.css");
  const packageJson = JSON.parse(await read("package.json"));

  assert.match(css, /\.v3-hero-prop:hover/);
  assert.match(css, /scale\(1\.08\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.equal(packageJson.devDependencies?.three, undefined);
  assert.equal(packageJson.devDependencies?.esbuild, undefined);
  assert.equal(packageJson.scripts?.["build:hero-models"], undefined);
});
