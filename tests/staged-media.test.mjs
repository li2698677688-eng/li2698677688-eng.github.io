import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function readManifest() {
  return JSON.parse(await read("home-v2/media-manifest.json"));
}

test("the first response does not directly request homepage video or WebP sequences", async () => {
  const html = await read("index.html");
  const stagedMedia = await read("_astro/staged-media.js");

  assert.doesNotMatch(html, /<source\s+src="\/home-v2\/studio-zuizhong\.mp4"/);
  assert.doesNotMatch(html, /\/home-v2\/how-sequences\//);
  assert.doesNotMatch(html, /\ssrc="\/home-v2\/staged\/[^\"]+-poster\.jpg"/);
  assert.doesNotMatch(html, /<script[^>]+src="\/_astro\/(?:HowItWorks|Faq)[^"]+\.js"/);
  assert.match(html, /data-staged-studio/);
  assert.match(html, /_astro\/staged-media\.js\?v=7/);
  assert.match(html, /_astro\/lazy-sections\.js/);
  assert.doesNotMatch(stagedMedia, /^const manifestPromise = fetch/m);
  assert.match(stagedMedia, /function getManifest\(\)/);
  assert.match(stagedMedia, /media-manifest\.json\?v=7/);
});

test("the new Everything grid cannot boot or request the archived How story media", async () => {
  const html = await read("index.html");
  const lazySections = await read("_astro/lazy-sections.js");
  const stagedMedia = await read("_astro/staged-media.js");
  const manifest = await readManifest();

  assert.equal((html.match(/class="v3-everything-card"/g) ?? []).length, 9);
  assert.doesNotMatch(html, /data-how-|data-staged-sequence|\/home-v2\/how-videos\//);
  assert.doesNotMatch(lazySections, /#how|HowItWorks/);
  assert.match(lazySections, /#faq/);
  assert.doesNotMatch(stagedMedia, /createSequence|data-staged-sequence|how-videos|how-\$\{step\}/);
  assert.doesNotMatch(JSON.stringify(manifest), /how-videos|how-[1-4]-poster/);
});

test("the media manifest contains only the active high-resolution Studio video", async () => {
  const manifest = await readManifest();

  assert.equal(manifest.version, 7);
  assert.equal(manifest.studio.poster, "/home-v2/staged/studio-zuizhong-poster.jpg");
  assert.equal(manifest.studio.video, "/home-v3/redesign/studio-demo-hd.mp4");
  assert.equal(Object.hasOwn(manifest.studio, "desktop"), false);
  assert.equal(Object.hasOwn(manifest.studio, "mobile"), false);
  assert.equal(Object.hasOwn(manifest, "sequences"), false);
});

test("generated media stays inside the agreed transfer budgets", async () => {
  const manifest = await readManifest();
  const studioVideo = await stat(new URL(`.${manifest.studio.video}`, root));
  const studioPoster = await stat(new URL(`.${manifest.studio.poster}`, root));
  assert.ok(studioVideo.size <= 1_800_000);
  assert.ok(studioPoster.size <= 180_000);

});

test("retired Spline and How story assets are absent from the production package", async () => {
  const retired = [
    "_astro/HowItWorks.astro_astro_type_script_index_0_lang.B4Q08uM8.js",
    "_astro/hero-spline-loader.js",
    "_astro/hero-spline.css",
    "_astro/spline-camera-parallax.js",
    "home-v2/spline-scenes/game-transparent.js",
    "home-v2/hero-wana-world.png",
    "home-v3/redesign/header-logo-scrolled.png",
    ...[1, 2, 3, 4].flatMap((step) => [
      `home-v2/how-videos/${step}.webm`,
      `home-v2/staged/how-${step}-poster.jpg`,
    ]),
  ];

  for (const file of retired) {
    await assert.rejects(stat(new URL(`../${file}`, import.meta.url)), { code: "ENOENT" });
  }
});

test("the Studio player loads one clear rendition instead of showing a blurry preview first", async () => {
  const html = await read("index.html");
  const stagedMedia = await read("_astro/staged-media.js");

  assert.equal((html.match(/data-studio-video/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-studio-preview|data-studio-full|is-preview|is-full/);
  assert.match(stagedMedia, /await loadVideo\(video, manifest\.studio\.video\)/);
  assert.doesNotMatch(stagedMedia, /loadRendition|preferredFormat|formatOrder|config\.preview|config\.full/);
});

test("only the FAQ enhancement remains in the lower-section lazy loader", async () => {
  const lazySections = await read("_astro/lazy-sections.js");

  assert.equal((lazySections.match(/importWhenNear\(/g) ?? []).length, 2);
  assert.match(lazySections, /importWhenNear\("#faq"/);
  assert.doesNotMatch(lazySections, /HowItWorks|"#how"/);
});
