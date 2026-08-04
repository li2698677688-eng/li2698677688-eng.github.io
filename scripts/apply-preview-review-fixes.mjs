import { readFile, writeFile } from "node:fs/promises";

const htmlPath = new URL("../index.html", import.meta.url);
const pricingPath = new URL("../_astro/home-pricing.Joootph-.js", import.meta.url);
let html = await readFile(htmlPath, "utf8");
let pricing = await readFile(pricingPath, "utf8");

const staticTitle = '<div id="create-title"><h1 class="v3-hero-title" aria-label="Build a playable 3D game with AI."><span class="v3-hero-title__line">Build a playable 3D game with AI.</span></h1></div>';
const animatedTitle = '<div id="create-title"><h1 class="v3-hero-title" aria-label="Build a playable 3D game with AI."><span class="v3-hero-title__line" aria-hidden="true"><span class="v3-hero-title__measure" data-testid="hero-title-measure">Build a playable 3D game with AI.<i class="v3-hero-title__cursor" aria-hidden="true"></i></span><span class="v3-hero-title__typed" data-testid="hero-title-visible">Build a playable 3D game with AI.<i class="v3-hero-title__cursor" aria-hidden="true"></i></span></span></h1></div>';
html = html.replace(staticTitle, animatedTitle);

const dualLogo = '<a class="v3-logo" href="/" aria-label="Wanaka home"><img class="v3-logo__default" src="/_astro/logo-lockup.HB5BFEbL.png" alt="Wanaka" width="431" height="84"><img class="v3-logo__scrolled" src="/home-v3/redesign/header-logo-scrolled.png" alt="" width="273" height="64" aria-hidden="true"></a>';
const singleLogo = '<a class="v3-logo" href="/" aria-label="Wanaka home"><img src="/_astro/logo-lockup.HB5BFEbL.png" alt="Wanaka" width="431" height="84"></a>';
html = html.replace(dualLogo, singleLogo);

html = html
  .replace('<span class="v3-final-cta__overlay" aria-hidden="true"></span>', "")
  .replace('<header class="home-pricing__heading"><p class="v3-eyebrow">PRICING</p><h2>Start making games for free</h2>', '<header class="home-pricing__heading"><h2>Start making games for free</h2>')
  .replace('class="v3-world-marquee" aria-label="Playable Wanaka worlds"', 'class="v3-world-marquee" role="region" aria-label="Playable Wanaka worlds"')
  .replaceAll(' aria-label="Monthly"', "")
  .replaceAll(' aria-label="Yearly"', "")
  .replace(/\/_astro\/hero-native\.js(?:\?v=\d+)?/g, "/_astro/hero-native.js?v=3")
  .replace(/\/_astro\/top-gallery\.js(?:\?v=\d+)?/g, "/_astro/top-gallery.js?v=2")
  .replace(/\/_astro\/home-figma-redesign\.css(?:\?v=\d+)?/g, "/_astro/home-figma-redesign.css?v=8")
  .replace(/component-url="\/_astro\/home-pricing\.Joootph-\.js(?:\?v=\d+)?"/g, 'component-url="/_astro/home-pricing.Joootph-.js?v=3"')
  .replace(/component-url="\/_astro\/world-showcase\.CxtrUrBC\.js(?:\?v=\d+)?"/g, 'component-url="/_astro/world-showcase.CxtrUrBC.js?v=4"')
  .replace(/src="\/_astro\/staged-media\.js(?:\?v=\d+)?"/g, 'src="/_astro/staged-media.js?v=7"');

pricing = pricing
  .replaceAll('(0,S.jsx)(`p`,{className:`v3-eyebrow`,children:`PRICING`}),', "")
  .replaceAll(',"aria-label":e===`monthly`?`Monthly`:`Yearly`', "");

if ((html.match(/<a class="v3-logo"[^>]*>[\s\S]*?<\/a>/)?.[0].match(/<img\b/g) ?? []).length !== 1) {
  throw new Error("The header must contain exactly one logo image");
}
if (pricing.includes('className:`v3-eyebrow`,children:`PRICING`')) {
  throw new Error("The compiled pricing eyebrow was not removed");
}

await Promise.all([
  writeFile(htmlPath, html),
  writeFile(pricingPath, pricing),
]);
