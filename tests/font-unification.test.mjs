import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pages = [
  "index.html",
  "404.html",
  "pricing/index.html",
  "privacy-policy/index.html",
  "terms-of-service/index.html",
];

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("every public page loads the global Poppins font override last", async () => {
  for (const page of pages) {
    const html = await read(page);
    const fontStylesheet = '<link rel="stylesheet" href="/_astro/font-poppins.css?v=1">';

    assert.match(html, new RegExp(`${fontStylesheet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/head>`));
  }
});

test("the global override changes only font family", async () => {
  const css = await read("_astro/font-poppins.css");

  assert.match(css, /font-family:\s*Poppins,\s*sans-serif\s*!important/);
  assert.doesNotMatch(css, /(?:font-size|font-weight|color|line-height|letter-spacing)\s*:/);
});

test("the homepage optimizer preserves the global Poppins override", async () => {
  const optimizer = await read("scripts/optimize-homepage.mjs");

  assert.match(optimizer, /\/_astro\/font-poppins\.css\?v=1/);
});
