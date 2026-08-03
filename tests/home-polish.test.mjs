import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the hero glass surfaces use standards-based background blur", async () => {
  const html = await read("index.html");
  const css = await read("_astro/home-polish.css");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/home-polish\.css\?v=1">/);
  assert.match(css, /\.v3-prompt\s*\{[^}]*-webkit-backdrop-filter:\s*blur\(20px\)[^}]*backdrop-filter:\s*blur\(20px\)/s);
  assert.match(css, /\.v3-prompt-suggestions button\s*\{[^}]*-webkit-backdrop-filter:\s*blur\(16px\)[^}]*backdrop-filter:\s*blur\(16px\)/s);
});

test("the fixed header is clear at the top and restores glass after any scroll", async () => {
  const html = await read("index.html");
  const css = await read("_astro/home-polish.css");
  const script = await read("_astro/header-scroll-state.js");

  assert.match(html, /<script type="module" src="\/_astro\/header-scroll-state\.js\?v=1"><\/script>/);
  assert.match(css, /\.v3-site-header\s*\{[^}]*background:\s*transparent[^}]*backdrop-filter:\s*none/s);
  assert.match(css, /\.v3-site-header\.is-scrolled\s*\{[^}]*background:\s*#0003[^}]*backdrop-filter:\s*blur\(20px\)/s);
  assert.match(script, /window\.scrollY > 0/);
  assert.match(script, /classList\.toggle\("is-scrolled", isScrolled\)/);
  assert.match(script, /addEventListener\("scroll", updateHeader/);
});

test("the desktop hero trims excess top and bottom whitespace", async () => {
  const css = await read("_astro/home-polish.css");

  assert.match(css, /@media \(width > 1100px\)[\s\S]*\.v3-hero\s*\{[^}]*min-height:\s*clamp\(600px, calc\(86svh - 68px\), 720px\)[^}]*padding:\s*64px 24px 56px/s);
});
