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
  assert.match(html, /_astro\/staged-media\.js/);
  assert.match(html, /_astro\/lazy-sections\.js/);
  assert.doesNotMatch(stagedMedia, /^const manifestPromise = fetch/m);
  assert.match(stagedMedia, /function getManifest\(\)/);
});

test("the how stories use the aggressive transparent videos with WebP fallback frames", async () => {
  const manifest = await readManifest();
  const stagedMedia = await read("_astro/staged-media.js");
  let totalVideoBytes = 0;

  assert.equal(manifest.version, 2);
  assert.equal(manifest.sequences.length, 4);
  for (const [index, sequence] of manifest.sequences.entries()) {
    const step = index + 1;
    assert.equal(sequence.video, `/home-v2/how-videos/${step}.webm`);
    assert.equal(sequence.framePrefix, `/home-v2/how-sequences/${step}/${step}_`);
    assert.equal(
      sequence.finalFrame,
      `/home-v2/how-sequences/${step}/${step}_00015.webp`,
    );

    const videoUrl = new URL(`..${sequence.video}`, import.meta.url);
    const videoHeader = (await readFile(videoUrl)).subarray(0, 4);
    assert.deepEqual(videoHeader, Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    totalVideoBytes += (await stat(videoUrl)).size;

    const frames = await readdir(new URL(`../home-v2/how-sequences/${step}/`, import.meta.url));
    assert.equal(
      frames.filter((file) => new RegExp(`^${step}_\\d{5}\\.webp$`).test(file)).length,
      16,
    );
  }

  assert.ok(totalVideoBytes < 1_500_000);
  assert.match(stagedMedia, /shouldUseWebpSequence/);
  assert.match(stagedMedia, /video\.canPlayType\('video\/webm; codecs="vp9"'\)/);
  assert.match(stagedMedia, /await loadSequenceVideo\(video, config\.video\)/);
  assert.match(stagedMedia, /frameImage\.decode\(\)/);
  assert.match(stagedMedia, /context\.drawImage\(frameImage/);
});

test("the media manifest describes responsive studio media and transparent sequences", async () => {
  const manifest = await readManifest();

  assert.equal(manifest.version, 2);
  for (const viewport of ["desktop", "mobile"]) {
    for (const phase of ["preview", "full"]) {
      assert.match(manifest.studio[viewport][phase].webm, /\.webm$/);
      assert.match(manifest.studio[viewport][phase].mp4, /\.mp4$/);
    }
  }
  assert.equal(manifest.sequences.length, 4);
  for (const sequence of manifest.sequences) {
    assert.equal(sequence.frameCount, 16);
    assert.match(sequence.poster, /\.jpg$/);
    assert.match(sequence.video, /\.webm$/);
    assert.match(sequence.framePrefix, /_$/);
    assert.match(sequence.finalFrame, /00015\.webp$/);
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
    assert.ok((await stat(new URL(`.${sequence.video}`, root))).size <= 500_000);
    assert.ok((await stat(new URL(`.${sequence.finalFrame}`, root))).size <= 700_000);
  }
});

test("sequence loading is staged near the viewport instead of one screen early", async () => {
  const howItWorks = await read("_astro/HowItWorks.astro_astro_type_script_index_0_lang.B4Q08uM8.js");

  assert.doesNotMatch(howItWorks, /rootMargin:`100% 0px`/);
  assert.match(howItWorks, /rootMargin:`25% 0px`/);
  assert.doesNotMatch(howItWorks, /new Image/);
});
