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

test("public pages load the global Roboto override and the homepage keeps its final scoped override", async () => {
  for (const page of pages) {
    const html = await read(page);
    const fontStylesheet = '<link rel="stylesheet" href="/_astro/font-poppins.css?v=3">';

    assert.match(html, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
    assert.match(html, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);
    assert.match(html, /fonts\.googleapis\.com\/css2\?family=Roboto:wght@100\.\.900&amp;display=swap/);

    if (page === "index.html") {
      assert.match(
        html,
    /font-poppins\.css\?v=3">\s*<link rel="stylesheet" href="\/_astro\/home-figma-redesign\.css\?v=8">\s*<\/head>/,
      );
    } else {
      assert.match(
        html,
        new RegExp(`${fontStylesheet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<\\/head>`),
      );
    }
  }
});

test("the global override changes only font family", async () => {
  const [css, homepageCss] = await Promise.all([
    read("_astro/font-poppins.css"),
    read("_astro/home-figma-redesign.css"),
  ]);

  assert.match(css, /font-family:\s*Roboto,\s*sans-serif\s*!important/);
  assert.doesNotMatch(css, /@import|fonts\.googleapis/);
  assert.doesNotMatch(css, /(?:font-size|font-weight|color|line-height|letter-spacing)\s*:/);
  assert.match(homepageCss, /\.wanaka-home-v3,\s*\.wanaka-home-v3 \*\s*\{[^}]*font-family:\s*"Roboto",\s*sans-serif\s*!important/s);
  assert.doesNotMatch(homepageCss, /font-family:\s*"?(?:Poppins|Inter|Noto Sans SC|Noto Serif SC|Georgia)"?/i);

  const [baseCss, footerCss] = await Promise.all([
    read("_astro/index.C3NnNlaP.css"),
    read("_astro/SiteFooter.5Tv4HviT.css"),
  ]);
  assert.doesNotMatch(baseCss, /@import|fonts\.googleapis/);
  assert.doesNotMatch(footerCss, /@import|fonts\.googleapis/);
});

test("the homepage optimizer preserves the global Roboto override", async () => {
  const optimizer = await read("scripts/optimize-homepage.mjs");

  assert.match(optimizer, /\/_astro\/font-poppins\.css\?v=3/);
});
