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

  assert.doesNotMatch(html, /<source\s+src="\/home-v2\/studio-zuizhong\.mp4"/);
  assert.doesNotMatch(html, /\/home-v2\/how-sequences\//);
  assert.match(html, /data-staged-studio/);
  assert.match(html, /_astro\/staged-media\.js/);
});

test("the media manifest describes responsive preview, full, and sequence renditions", async () => {
  const manifest = await readManifest();

  assert.equal(manifest.version, 1);
  for (const viewport of ["desktop", "mobile"]) {
    for (const phase of ["preview", "full"]) {
      assert.match(manifest.studio[viewport][phase].webm, /\.webm$/);
      assert.match(manifest.studio[viewport][phase].mp4, /\.mp4$/);
    }
  }
  assert.equal(manifest.sequences.length, 4);
  for (const sequence of manifest.sequences) {
    assert.equal(sequence.frameCount, 16);
    for (const viewport of ["desktop", "mobile"]) {
      assert.match(sequence[viewport].webm, /\.webm$/);
      assert.match(sequence[viewport].mp4, /\.mp4$/);
    }
  }
});

test("generated media stays inside the agreed transfer budgets", async () => {
  const manifest = await readManifest();
  const limits = {
    desktop: { preview: 1_000_000, fullWebm: 3_500_000, fullMp4: 4_500_000 },
    mobile: { preview: 600_000, fullWebm: 2_000_000, fullMp4: 2_800_000 },
  };

  for (const viewport of ["desktop", "mobile"]) {
    const studio = manifest.studio[viewport];
    assert.ok((await stat(new URL(`.${studio.preview.webm}`, root))).size <= limits[viewport].preview);
    assert.ok((await stat(new URL(`.${studio.preview.mp4}`, root))).size <= limits[viewport].preview);
    assert.ok((await stat(new URL(`.${studio.full.webm}`, root))).size <= limits[viewport].fullWebm);
    assert.ok((await stat(new URL(`.${studio.full.mp4}`, root))).size <= limits[viewport].fullMp4);
  }

  for (const sequence of manifest.sequences) {
    assert.ok((await stat(new URL(`.${sequence.poster}`, root))).size <= 100_000);
    for (const viewport of ["desktop", "mobile"]) {
      const limit = viewport === "desktop" ? 1_200_000 : 700_000;
      assert.ok((await stat(new URL(`.${sequence[viewport].webm}`, root))).size <= limit);
      assert.ok((await stat(new URL(`.${sequence[viewport].mp4}`, root))).size <= limit);
    }
  }
});

test("sequence loading is staged near the viewport instead of one screen early", async () => {
  const howItWorks = await read("_astro/HowItWorks.astro_astro_type_script_index_0_lang.B4Q08uM8.js");

  assert.doesNotMatch(howItWorks, /rootMargin:`100% 0px`/);
  assert.match(howItWorks, /rootMargin:`25% 0px`/);
  assert.doesNotMatch(howItWorks, /new Image/);
});
