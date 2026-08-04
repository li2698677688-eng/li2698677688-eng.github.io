import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the Figma redesign stylesheet owns the page foundation and lower gradient", async () => {
  const html = await read("index.html");
  const css = await read("_astro/home-figma-redesign.css");

  assert.match(html, /home-figma-redesign\.css\?v=8/);
  assert.match(css, /--v3-bg:\s*#101012/);
  assert.match(css, /background-size:\s*32px 32px/);
  assert.match(css, /\.v3-ambient-gradient\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.v3-bottom-gradient\s*\{[^}]*display:\s*block[^}]*height:\s*1639px[^}]*opacity:\s*0\.26/s);
  assert.match(css, /\.v3-bottom-gradient\s*\{[^}]*bottom:\s*-200px/s);
  assert.match(css, /\.v3-bottom-gradient__layer\.is-base/);
  assert.match(css, /background:\s*#222b28/);
  assert.match(css, /background:\s*#a35c14/);
  assert.match(css, /background:\s*#73241d/);
  assert.match(css, /background:\s*#1c1c1c/);
});

test("the footer brand logo is enlarged to 1.2 times its original rendered size", async () => {
  const css = await read("_astro/home-figma-redesign.css");

  assert.match(css, /\.v3-footer__brand img\s*\{[^}]*width:\s*142\.8px[^}]*height:\s*33\.6px/s);
});

test("Studio and Templates match the new Figma layout while preserving behavior", async () => {
  const html = await read("index.html");
  const css = await read("_astro/home-figma-redesign.css");
  const worldShowcase = await read("_astro/world-showcase.CxtrUrBC.js");

  assert.match(html, /\/home-v3\/redesign\/build-with-ai\.webp/);
  assert.match(css, /\.v3-studio-proof[^}]*gap:\s*44px/s);
  assert.match(css, /\.v3-studio-shot\s*\{[^}]*aspect-ratio:\s*1120\s*\/\s*624/s);
  assert.match(css, /\.v3-templates[^}]*gap:\s*60px/s);
  assert.match(css, /\.v3-world-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*280px\)[^}]*gap:\s*32px/s);
  assert.match(css, /\.v3-world-card\s*\{[^}]*width:\s*280px[^}]*height:\s*238px/s);
  assert.match(css, /animation:\s*36s linear infinite v3-world-marquee/);
  assert.match(worldShowcase, /"data-cta":`world-card-play`/);
  assert.match(worldShowcase, /"data-cta":`world-card-remix`/);
});

test("Template cards use supplied avatars, varied authors, and the Figma play and like stats", async () => {
  const [html, css, worldShowcase] = await Promise.all([
    read("index.html"),
    read("_astro/home-figma-redesign.css"),
    read("_astro/world-showcase.CxtrUrBC.js"),
  ]);

  assert.match(html, /component-url="\/_astro\/world-showcase\.CxtrUrBC\.js\?v=4"/);
  assert.doesNotMatch(worldShowcase, /@alejandro|v3-world-card__tags/);
  assert.match(worldShowcase, /v3-world-card__stats/);
  assert.match(worldShowcase, /v3-world-card__stat/);
  assert.match(worldShowcase, /v3-world-card__author/);
  assert.match(worldShowcase, /\/home-v3\/redesign\/world-play\.svg/);
  assert.match(worldShowcase, /\/home-v3\/redesign\/world-like\.svg/);
  assert.match(worldShowcase, /\$\{e\.playCount\} likes and \$\{e\.likeCount\} plays/);
  assert.match(worldShowcase, /\/home-v3\/redesign\/world-like\.svg\?v=2/);
  assert.match(worldShowcase, /\/home-v3\/redesign\/world-play\.svg\?v=2/);
  assert.match(worldShowcase, /\/home-v3\/redesign\/avatars\/brody\.webp/);
  assert.match(worldShowcase, /@luciddreamer/);
  assert.match(worldShowcase, /@oyojee/);
  assert.match(worldShowcase, /className:`v3-world-marquee`,role:`region`,"aria-label":`Playable Wanaka worlds`/);
  assert.match(html, /class="v3-world-marquee" role="region" aria-label="Playable Wanaka worlds"/);
  assert.doesNotMatch(worldShowcase, /hero-wana-world\.png/);
  assert.match(css, /\.v3-world-card__stats\s*\{[^}]*left:\s*14\.5px[^}]*bottom:\s*13px[^}]*gap:\s*6px/s);
  assert.match(css, /\.v3-world-card__stat\s*\{[^}]*height:\s*28px[^}]*border-radius:\s*6px[^}]*backdrop-filter:\s*blur\(7\.61px\)/s);
  assert.match(css, /\.v3-world-card__stat img\s*\{[^}]*width:\s*16px[^}]*height:\s*16px/s);
  assert.match(css, /\.v3-world-card__stat img\s*\{[^}]*object-fit:\s*contain[^}]*object-position:\s*center/s);
  assert.match(css, /\.v3-world-card__hover\s*\{[^}]*align-items:\s*center[^}]*justify-content:\s*center/s);
  assert.match(css, /\.v3-world-card__action\s*\{[^}]*flex:\s*0 0 auto/s);
  assert.match(css, /\.v3-world-card__author img\s*\{[^}]*width:\s*24px[^}]*height:\s*24px/s);

  const avatarNames = [
    "brody.webp",
    "brody-alt.webp",
    "lucid-dreamer.webp",
    "lucid-dreamer-alt.webp",
    "oyojee.webp",
    "oyojee-alt.webp",
    "tuutikki.webp",
    "tuutikki-alt.webp",
    "div.webp",
    "sonoa.webp",
  ];
  for (const name of avatarNames) {
    const url = new URL(`../home-v3/redesign/avatars/${name}`, import.meta.url);
    const [contents, info] = await Promise.all([readFile(url), stat(url)]);
    assert.equal(contents.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(contents.subarray(8, 12).toString("ascii"), "WEBP");
    assert.ok(info.size <= 12_000, `${name} exceeds 12 KB`);
  }
});

test("the header uses one stable logo asset in both scroll states", async () => {
  const [html, css, polish] = await Promise.all([
    read("index.html"),
    read("_astro/home-figma-redesign.css"),
    read("_astro/home-polish.css"),
  ]);

  assert.match(html, /home-figma-redesign\.css\?v=8/);
  const logoMarkup = html.match(/<a class="v3-logo"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "";
  assert.equal((logoMarkup.match(/<img\b/g) ?? []).length, 1);
  assert.match(logoMarkup, /src="\/_astro\/logo-lockup\.HB5BFEbL\.png"/);
  assert.doesNotMatch(html, /v3-logo__(?:default|scrolled)|header-logo-scrolled\.png/);
  assert.match(polish, /\.v3-site-header\s*\{[^}]*background:\s*transparent[^}]*backdrop-filter:\s*none/s);
  assert.match(css, /\.v3-site-header\.is-scrolled\s*\{[^}]*width:\s*min\(1144px,\s*calc\(100% - 32px\)\)[^}]*height:\s*62px[^}]*padding:\s*12px[^}]*background:\s*rgba\(22,\s*19,\s*17,\s*0\.24\)[^}]*border-radius:\s*24px/s);
  assert.match(css, /\.v3-site-header\.is-scrolled\s*\{[^}]*backdrop-filter:\s*blur\(20px\)/s);
  assert.match(css, /\.v3-site-header \.v3-logo\s*\{[^}]*width:\s*162\.09px[^}]*height:\s*38px/s);
  assert.doesNotMatch(css, /\.v3-site-header\.is-scrolled \.v3-logo|v3-logo__(?:default|scrolled)/);
  assert.match(css, /\.v3-site-header\s*\{[^}]*width:\s*min\(1144px,\s*calc\(100% - 32px\)\)[^}]*height:\s*62px[^}]*padding:\s*12px[^}]*top:\s*12px[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)/s);
  assert.match(css, /\.v3-site-header\s*\{[^}]*transition:\s*background-color 180ms ease,\s*backdrop-filter 180ms ease,\s*-webkit-backdrop-filter 180ms ease/s);
  assert.doesNotMatch(css, /transition:\s*[\s\S]*?\b(?:width|height|top|padding|border-radius|transform)\s+220ms/);
});

test("Pricing uses the approved heading typography and removes the eyebrow before and after hydration", async () => {
  const [html, css, pricing] = await Promise.all([
    read("index.html"),
    read("_astro/home-figma-redesign.css"),
    read("_astro/home-pricing.Joootph-.js"),
  ]);

  assert.doesNotMatch(html, /home-pricing__heading"><p class="v3-eyebrow">PRICING<\/p>/);
  assert.doesNotMatch(pricing, /className:`v3-eyebrow`,children:`PRICING`/);
  assert.doesNotMatch(pricing, /"aria-label":e===`monthly`\?`Monthly`:`Yearly`/);
  assert.doesNotMatch(html, /<button[^>]+aria-label="(?:Monthly|Yearly)"/);
  assert.match(css, /\.home-pricing__heading\s*\{[^}]*max-width:\s*1120px/s);
  assert.match(css, /\.home-pricing__heading h2\s*\{[^}]*color:\s*#fff[^}]*font-family:\s*"Roboto",\s*sans-serif[^}]*font-size:\s*72px[^}]*font-weight:\s*500[^}]*line-height:\s*64px/s);
  assert.match(css, /\.home-pricing__heading > p:last-child\s*\{[^}]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)[^}]*font-family:\s*"Roboto",\s*sans-serif[^}]*font-size:\s*16px[^}]*font-weight:\s*400[^}]*line-height:\s*24px/s);
});

test("compiled Astro islands keep tag boundaries compact for hydration", async () => {
  const html = await read("index.html");
  const islands = html.match(/<astro-island\b[\s\S]*?<\/astro-island>/g) ?? [];

  assert.ok(islands.length >= 2);
  for (const island of islands) {
    assert.doesNotMatch(island, />\s+</);
  }
});

test("local previews use the existing curated fallbacks without noisy CORS requests", async () => {
  const [worldShowcase, pricing] = await Promise.all([
    read("_astro/world-showcase.CxtrUrBC.js"),
    read("_astro/home-pricing.Joootph-.js"),
  ]);

  const localHostGuard = /\[`localhost`,`127\.0\.0\.1`\]\.includes\(location\.hostname\)/;
  assert.match(worldShowcase, localHostGuard);
  assert.match(pricing, localHostGuard);
});

test("Everything is a static nine-card WebP grid and no longer boots the old scroll story", async () => {
  const html = await read("index.html");
  const css = await read("_astro/home-figma-redesign.css");
  const lazySections = await read("_astro/lazy-sections.js");

  assert.equal((html.match(/class="v3-everything-card"/g) ?? []).length, 9);
  assert.match(html, /Everything you need to turn imagination into a game/);
  assert.match(html, /Your complete game studio/);
  assert.doesNotMatch(html, /data-how-scroll-sequence|data-staged-sequence|data-how-prompt/);
  assert.doesNotMatch(lazySections, /#how|HowItWorks/);
  assert.match(lazySections, /#faq/);
  assert.match(css, /\.v3-everything-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.v3-everything-card\s*\{[^}]*background:\s*#1a1a1b/s);
  assert.doesNotMatch(css, /\.v3-everything-card\s*\{[^}]*background:\s*rgba\(/s);
  assert.match(css, /\.v3-everything-card img\s*\{[^}]*transition:\s*transform 320ms/s);
  assert.match(css, /\.v3-everything-card:hover img,[\s\S]*\.v3-everything-card:focus-within img\s*\{[^}]*transform:\s*scale\(1\.04\)/s);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.v3-everything-card img\s*\{[^}]*transition:\s*none/s);

  const expectedAssets = [
    "create-games-from-your-ideas.webp",
    "build-worlds-in-seconds.webp",
    "remix-endless-possibilities.webp",
    "bring-characters-to-life.webp",
    "design-your-game-ui.webp",
    "create-game-visuals-instantly.webp",
    "create-while-you-play.webp",
    "your-complete-game-studio.webp",
    "publish-your-worlds.webp",
  ];
  for (const asset of expectedAssets) {
    assert.match(html, new RegExp(`/home-v3/redesign/${asset}`));
  }
});

test("Community, FAQ, and final CTA use the approved Figma copy and assets", async () => {
  const html = await read("index.html");
  const css = await read("_astro/home-figma-redesign.css");

  assert.match(html, /Build alongside creators[\s\S]*making new worlds too\./);
  assert.match(html, /Share works in progress, find collaborators, swap tips, and join community playtests\./);
  assert.doesNotMatch(html, /CREATE OUT LOUD/);
  assert.match(html, /Frequently asked[\s\S]*questions/);
  assert.match(html, /Everything you need to know about creating games with Wanaka\./);
  assert.doesNotMatch(html, /See the full FAQ/);
  assert.match(html, /\/home-v3\/redesign\/your-turn\.webp/);
  assert.match(html, /\/home-v3\/redesign\/your-turn\.webp\?v=2/);
  assert.doesNotMatch(html, /v3-final-cta__overlay/);
  assert.match(css, /\.v3-final-cta\s*\{[^}]*padding:\s*100px 24px/s);
  assert.match(css, /\.v3-final-cta__panel\s*\{[^}]*aspect-ratio:\s*1120\s*\/\s*496[^}]*background:\s*transparent/s);
  assert.doesNotMatch(css, /\.v3-final-cta__overlay\s*\{/);
  assert.match(css, /\.v3-community h2\s*\{[^}]*line-height:\s*72px/s);
  assert.match(css, /\.v3-faq \.v3-section-heading h2\s*\{[^}]*line-height:\s*72px/s);
});

test("section-specific compiled heading rules cannot override responsive type scales", async () => {
  const css = await read("_astro/home-figma-redesign.css");

  assert.match(
    css,
    /@media \(width <= 1100px\)[\s\S]*\.v3-studio-proof \.v3-section-heading h2,[\s\S]*\.v3-templates \.v3-section-heading h2,[\s\S]*\.v3-faq \.v3-section-heading h2[^{]*\{[^}]*font-size:\s*clamp\(44px,\s*7vw,\s*64px\) !important/s,
  );
  assert.match(
    css,
    /@media \(width <= 680px\)[\s\S]*\.v3-studio-proof \.v3-section-heading h2,[\s\S]*\.v3-templates \.v3-section-heading h2,[\s\S]*\.v3-faq \.v3-section-heading h2[^{]*\{[^}]*font-size:\s*42px !important[^}]*line-height:\s*46px !important/s,
  );
});

test("all redesign raster assets are WebP files with explicit transfer budgets", async () => {
  const assets = [
    ["build-with-ai.webp", 500_000],
    ["create-games-from-your-ideas.webp", 180_000],
    ["build-worlds-in-seconds.webp", 180_000],
    ["remix-endless-possibilities.webp", 180_000],
    ["bring-characters-to-life.webp", 180_000],
    ["design-your-game-ui.webp", 180_000],
    ["create-game-visuals-instantly.webp", 180_000],
    ["create-while-you-play.webp", 180_000],
    ["your-complete-game-studio.webp", 180_000],
    ["publish-your-worlds.webp", 180_000],
    ["your-turn.webp", 350_000],
  ];

  for (const [name, budget] of assets) {
    const url = new URL(`../home-v3/redesign/${name}`, import.meta.url);
    const [contents, info] = await Promise.all([readFile(url), stat(url)]);
    assert.equal(contents.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(contents.subarray(8, 12).toString("ascii"), "WEBP");
    assert.ok(info.size <= budget, `${name} exceeds ${budget} bytes`);
  }
});
