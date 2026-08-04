import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    contains(value) {
      return values.has(value);
    },
    toggle(value, force) {
      if (force) values.add(value);
      else values.delete(value);
    },
  };
}

function makeSlide(index) {
  const image = {
    dataset: index === 0 ? {} : { src: `/home-v2/top-gallery/${index + 1}.webp` },
    src: index === 0 ? "/home-v2/top-gallery/1.webp" : "",
    decode: async () => {},
  };
  return {
    classList: makeClassList(index === 0 ? ["is-active"] : []),
    image,
    querySelector() {
      return image;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
  };
}

test("the copied homepage replaces Spline with exactly six local hero images", async () => {
  const html = await read("index.html");

  assert.equal((html.match(/data-top-gallery-slide/g) ?? []).length, 6);
  assert.match(html, /<script type="module" src="\/_astro\/top-gallery\.js\?v=2"><\/script>/);
  assert.match(html, /<link rel="preload" as="image" href="\/home-v2\/top-gallery\/1\.webp" type="image\/webp" fetchpriority="high">/);
  assert.match(html, /src="\/home-v2\/top-gallery\/1\.webp"[^>]*fetchpriority="high"[^>]*loading="eager"/);
  for (let index = 2; index <= 6; index += 1) {
    assert.match(html, new RegExp(`data-src="/home-v2/top-gallery/${index}\\.webp"`));
  }
  assert.doesNotMatch(html, /\/home-v2\/top-gallery\/\d+\.jpg/);
  assert.doesNotMatch(html, /data-spline|@splinetool|hero-spline-loader|game-transparent/);
});

test("all six supplied gallery images are real WebP files within the optimized budget", async () => {
  let totalBytes = 0;
  for (let index = 1; index <= 6; index += 1) {
    const imageUrl = new URL(`../home-v2/top-gallery/${index}.webp`, import.meta.url);
    const [info, contents] = await Promise.all([stat(imageUrl), readFile(imageUrl)]);
    totalBytes += info.size;
    assert.equal(contents.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(contents.subarray(8, 12).toString("ascii"), "WEBP");
    assert.ok(info.size <= 330_000, `top-gallery/${index}.webp is larger than 330 KB`);
  }
  assert.ok(totalBytes <= 1_250_000, "the six-image gallery is larger than 1.25 MB");
});

test("the hero follows the Figma 1920 by 800 artwork and lower content position", async () => {
  const html = await read("index.html");
  const css = await read("_astro/top-gallery.css");
  const redesign = await read("_astro/home-figma-redesign.css");
  const heroScript = await read("_astro/hero-native.js");

  assert.match(html, /<link rel="stylesheet" href="\/_astro\/top-gallery\.css\?v=3">/);
  assert.match(html, /<script type="module" src="\/_astro\/hero-native\.js\?v=3"><\/script>/);
  assert.match(html, /data-testid="hero-title-measure">Build a playable 3D game with AI\./);
  assert.match(html, /data-testid="hero-title-visible">Build a playable 3D game with AI\./);
  assert.match(heroScript, /const TITLES = \[/);
  assert.match(heroScript, /Turn one sentence into a playable world\./);
  assert.match(heroScript, /Create, direct, and share your own game\./);
  assert.match(heroScript, /async function animateTitle\(\)/);
  assert.match(heroScript, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.v3-hero\s*\{[^}]*margin-top:\s*-68px/s);
  assert.match(css, /\.v3-top-gallery\s*\{[^}]*height:\s*800px/s);
  assert.match(css, /\.v3-top-gallery::after\s*\{[^}]*height:\s*400px[^}]*linear-gradient\(180deg, rgba\(22, 19, 17, 0\) 0%, #161311 100%\)/s);
  assert.match(redesign, /\.v3-top-gallery::after\s*\{[^}]*#101012 100%/s);
  assert.match(redesign, /\.v3-hero-title__typed\s*\{[^}]*text-shadow:\s*0 4px 8px rgba\(0, 0, 0, 0\.4\)/s);
  assert.match(css, /@media \(width > 1100px\)[\s\S]*\.v3-hero\s*\{[^}]*height:\s*855px[^}]*min-height:\s*855px/s);
  assert.match(css, /@media \(width > 1100px\)[\s\S]*\.v3-hero__content\s*\{[^}]*top:\s*555px/s);
  assert.match(css, /\.v3-prompt\s*\{[^}]*border:\s*1px solid rgba\(255, 255, 255, 0\.1\)[^}]*backdrop-filter:\s*blur\(20px\)/s);
});

test("image attachments grow the prompt and push every following section down", async () => {
  const html = await read("index.html");
  const css = await read("_astro/home-figma-redesign.css");
  const heroScript = await read("_astro/hero-native.js");

  assert.match(html, /<script type="module" src="\/_astro\/hero-native\.js\?v=3"><\/script>/);
  assert.match(heroScript, /const hero = form\?\.closest\("\.v3-hero"\)/);
  assert.match(heroScript, /hero\?\.classList\.toggle\("has-prompt-attachments", hasAttachments\)/);
  assert.match(css, /\.v3-prompt\.has-attachments\s*\{[^}]*min-height:\s*212px[^}]*height:\s*auto/s);
  assert.match(css, /@media \(width > 1100px\)[\s\S]*\.v3-hero\.has-prompt-attachments\s*\{[^}]*height:\s*947px[^}]*min-height:\s*947px/s);
  assert.match(css, /@media \(820px < width <= 1100px\)[\s\S]*\.v3-hero\.has-prompt-attachments\s*\{[^}]*height:\s*947px[^}]*min-height:\s*947px/s);
});

test("the top ambient gradient stays hidden while the approved lower gradient is restored", async () => {
  const css = await read("_astro/top-gallery.css");
  const redesign = await read("_astro/home-figma-redesign.css");

  assert.match(
    css,
    /\.v3-ambient-gradient,\s*\.v3-bottom-gradient\s*\{[^}]*display:\s*none/s,
  );
  assert.match(redesign, /\.v3-ambient-gradient\s*\{[^}]*display:\s*none/s);
  assert.match(redesign, /\.v3-bottom-gradient\s*\{[^}]*display:\s*block/s);
});

test("desktop navigation and sign-in text use pure white at 80 percent opacity", async () => {
  const css = await read("_astro/top-gallery.css");

  assert.match(
    css,
    /\.v3-desktop-nav a,\s*\.v3-header-actions\s*>\s*a:first-child\s*\{[^}]*color:\s*rgba\(255, 255, 255, 0\.8\)/s,
  );
});

test("the gallery protects the LCP image, then preloads one slide ahead and pauses on reduced motion", async () => {
  const { createTopGalleryController } = await import("../_astro/top-gallery.js");
  const slides = Array.from({ length: 6 }, (_, index) => makeSlide(index));
  const rootElement = { dataset: {} };
  const scheduled = [];
  const cleared = [];
  const controller = createTopGalleryController({
    root: rootElement,
    slides,
    intervalMs: 4800,
    setTimer(callback, delay) {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    clearTimer(timer) {
      cleared.push(timer);
    },
  });

  await controller.start();
  assert.equal(slides[1].image.src, "");
  await controller.preloadNext();
  assert.equal(slides[1].image.src, "/home-v2/top-gallery/2.webp");
  assert.equal(scheduled[0].delay, 4800);

  await scheduled[0].callback();
  assert.equal(controller.getIndex(), 1);
  assert.equal(rootElement.dataset.activeSlide, "2");
  assert.equal(slides[1].classList.contains("is-active"), true);
  assert.equal(slides[2].image.src, "/home-v2/top-gallery/3.webp");

  controller.pause();
  assert.ok(cleared.length > 0);

  const reducedScheduled = [];
  const reducedController = createTopGalleryController({
    root: { dataset: {} },
    slides: Array.from({ length: 6 }, (_, index) => makeSlide(index)),
    reducedMotion: true,
    setTimer(callback) {
      reducedScheduled.push(callback);
      return reducedScheduled.length;
    },
    clearTimer() {},
  });
  await reducedController.start();
  assert.equal(reducedScheduled.length, 0);
});
