import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
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
  assert.match(html, /_astro\/staged-media\.js\?v=5/);
  assert.match(html, /_astro\/lazy-sections\.js/);
  assert.doesNotMatch(stagedMedia, /^const manifestPromise = fetch/m);
  assert.match(stagedMedia, /function getManifest\(\)/);
  assert.match(stagedMedia, /media-manifest\.json\?v=5/);
});

test("the how stories use transparent WebM on every browser without sequence fallbacks", async () => {
  const manifest = await readManifest();
  const stagedMedia = await read("_astro/staged-media.js");
  let totalVideoBytes = 0;

  assert.equal(manifest.version, 5);
  assert.equal(manifest.sequences.length, 4);
  for (const [index, sequence] of manifest.sequences.entries()) {
    const step = index + 1;
    assert.equal(sequence.video, `/home-v2/how-videos/${step}.webm`);
    assert.equal(Object.hasOwn(sequence, "framePrefix"), false);
    assert.equal(Object.hasOwn(sequence, "finalFrame"), false);

    const videoUrl = new URL(`..${sequence.video}`, import.meta.url);
    const videoHeader = (await readFile(videoUrl)).subarray(0, 4);
    assert.deepEqual(videoHeader, Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    totalVideoBytes += (await stat(videoUrl)).size;
  }

  const legacyFrames = await readdir(new URL("../home-v2/how-sequences/", import.meta.url), {
    recursive: true,
  }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  assert.ok(totalVideoBytes < 1_000_000);
  assert.deepEqual(legacyFrames, []);
  assert.match(stagedMedia, /await loadSequenceVideo\(video, config\.video\)/);
  assert.doesNotMatch(stagedMedia, /shouldUseWebpSequence|isDesktopSafari|isAppleTouchDevice/);
  assert.doesNotMatch(stagedMedia, /how-sequences|frameImage|context\.drawImage/);
});

test("the media manifest uses the supplied high-resolution Studio video and transparent sequences", async () => {
  const manifest = await readManifest();

  assert.equal(manifest.version, 5);
  assert.equal(manifest.studio.poster, "/home-v2/staged/studio-zuizhong-poster.jpg");
  assert.equal(manifest.studio.video, "/home-v2/staged/studio-zuizhong.mp4");
  assert.equal(Object.hasOwn(manifest.studio, "desktop"), false);
  assert.equal(Object.hasOwn(manifest.studio, "mobile"), false);
  assert.equal(manifest.sequences.length, 4);
  for (const sequence of manifest.sequences) {
    assert.equal(sequence.frameCount, 16);
    assert.match(sequence.poster, /\.jpg$/);
    assert.match(sequence.video, /\.webm$/);
    assert.equal(Object.hasOwn(sequence, "framePrefix"), false);
    assert.equal(Object.hasOwn(sequence, "finalFrame"), false);
  }
});

test("generated media stays inside the agreed transfer budgets", async () => {
  const manifest = await readManifest();
  const studioVideo = await stat(new URL(`.${manifest.studio.video}`, root));
  const studioPoster = await stat(new URL(`.${manifest.studio.poster}`, root));
  assert.ok(studioVideo.size <= 2_300_000);
  assert.ok(studioPoster.size <= 180_000);

  for (const sequence of manifest.sequences) {
    assert.ok((await stat(new URL(`.${sequence.poster}`, root))).size <= 100_000);
    assert.ok((await stat(new URL(`.${sequence.video}`, root))).size <= 350_000);
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

test("sequence loading is staged near the viewport instead of one screen early", async () => {
  const howItWorks = await read("_astro/HowItWorks.astro_astro_type_script_index_0_lang.B4Q08uM8.js");

  assert.doesNotMatch(howItWorks, /rootMargin:`100% 0px`/);
  assert.match(howItWorks, /rootMargin:`25% 0px`/);
  assert.doesNotMatch(howItWorks, /new Image/);
});
