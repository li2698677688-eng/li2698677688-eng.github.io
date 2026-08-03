import { readFile, writeFile } from "node:fs/promises";

const htmlPath = new URL("../index.html", import.meta.url);
const howPath = new URL("../_astro/HowItWorks.astro_astro_type_script_index_0_lang.B4Q08uM8.js", import.meta.url);

function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected exactly one match`);
  }
  return source.replace(pattern, replacement);
}

let html = await readFile(htmlPath, "utf8");

const splineStageMarkup =
  '<div class="v3-hero-spline-stage" data-spline-stage data-spline-stage-state="idle"><div class="v3-hero-spline" data-spline-scene data-spline-state="idle" data-spline-delay="0" data-spline-reveal-delay="1200" data-spline-src="/home-v2/spline-scenes/game-transparent.js?v=1"></div></div>';

html = html.replace(
  /<div class="v3-hero-spline-stage" data-spline-stage[\s\S]*?<\/div><\/div><div class="v3-hero__content">/,
  `${splineStageMarkup}<div class="v3-hero__content">`,
);

if (!html.includes("/_astro/hero-spline.css")) {
  html = replaceOnce(
    html,
    '<link rel="stylesheet" href="/_astro/staged-media.css">',
    '<link rel="stylesheet" href="/_astro/staged-media.css"><link rel="stylesheet" href="/_astro/hero-spline.css?v=5">',
    "hero Spline stylesheet",
  );
}

if (!html.includes("/_astro/font-poppins.css?v=1")) {
  html = replaceOnce(
    html,
    "</head>",
    '<link rel="stylesheet" href="/_astro/font-poppins.css?v=1"></head>',
    "global Poppins stylesheet",
  );
}

if (!html.includes("data-spline-stage")) {
  html = replaceOnce(
    html,
    '<section class="v3-hero" id="create" aria-labelledby="create-title"><div class="v3-hero__content">',
    `<section class="v3-hero" id="create" aria-labelledby="create-title">${splineStageMarkup}<div class="v3-hero__content">`,
    "hero Spline stage",
  );
}

if (!html.includes("/_astro/hero-spline-loader.js")) {
  html = replaceOnce(
    html,
    '<script type="module" src="/_astro/hero-native.js"></script>',
    '<script type="module" src="/_astro/hero-native.js"></script><script type="module" src="/_astro/hero-spline-loader.js?v=4"></script>',
    "hero Spline loader",
  );
}

if (!html.includes("/_astro/staged-media.js")) {
  html = replaceOnce(
    html,
    '<link rel="stylesheet" href="/_astro/index.C3NnNlaP.css">',
    '<link rel="stylesheet" href="/_astro/index.C3NnNlaP.css"><link rel="stylesheet" href="/_astro/staged-media.css">',
    "staged media stylesheet",
  );

  html = replaceOnce(
    html,
    /<astro-island[^>]+component-url="\/_astro\/create-hero\.DcpJeU3z\.js"[^>]+>/,
    "",
    "hero island opening tag",
  );
  html = replaceOnce(
    html,
    /<\/section><!--astro:end--><\/astro-island><section id="studio"/,
    '</section><script type="module" src="/_astro/hero-native.js"></script><section id="studio"',
    "hero island closing tag",
  );
  html = replaceOnce(
    html,
    '<span class="v3-hero-title__typed" data-testid="hero-title-visible"><i class="v3-hero-title__cursor" aria-hidden="true"></i></span>',
    '<span class="v3-hero-title__typed" data-testid="hero-title-visible">Build a playable 3D game with AI.<i class="v3-hero-title__cursor" aria-hidden="true"></i></span>',
    "static hero title",
  );
  html = replaceOnce(
    html,
    '<span class="sr-only">0<!-- -->/<!-- -->280<!-- --> characters</span>',
    '<span class="sr-only" data-prompt-count>0/280 characters</span>',
    "hero prompt counter",
  );

  const suggestions = [
    ["Cozy city builder", "A cozy city builder on floating islands"],
    ["Multiplayer obstacle course", "A multiplayer obstacle course in space"],
    ["Space survival adventure", "A survival adventure on an alien ocean"],
  ];
  for (const [label, prompt] of suggestions) {
    html = replaceOnce(
      html,
      `<button type="button">${label}</button>`,
      `<button type="button" data-prompt-suggestion="${prompt}">${label}</button>`,
      `hero suggestion ${label}`,
    );
  }

  html = replaceOnce(
    html,
    /<div class="v3-studio-shot__viewport" data-media-slot="studio-showcase" data-media-kind="animation"><video[^>]+><source src="\/home-v2\/studio-zuizhong\.mp4" type="video\/mp4"><\/video><\/div>/,
    '<div class="v3-studio-shot__viewport" data-media-slot="studio-showcase" data-media-kind="animation" data-staged-studio><picture class="staged-media-picture"><source media="(max-width: 899px)" data-srcset="/home-v2/staged/studio-v3-poster-540.jpg"><img data-src="/home-v2/staged/studio-v3-poster-720.jpg" alt="Wanaka Studio building a playable 3D island" decoding="async"></picture><video class="staged-studio-video is-preview" aria-label="Wanaka Studio preview" muted playsinline loop preload="none" data-studio-preview></video><video class="staged-studio-video is-full" aria-label="Wanaka Studio building a playable 3D island" muted playsinline loop preload="none" data-studio-full></video></div>',
    "studio staged video",
  );

  for (let step = 1; step <= 4; step += 1) {
    const sequencePattern = new RegExp(
      `<div class="([^"]*v3-process-sequence-stage[^"]*)"([^>]*)data-how-sequence-frame-prefix="/home-v2/how-sequences/${step}/${step}_"[^>]*><img class="v3-process-sequence__fallback"[^>]*alt="([^"]+)"[^>]*data-how-sequence-fallback><canvas[^>]*data-how-sequence-canvas><\\/canvas><\\/div>`,
    );
    const match = html.match(sequencePattern);
    if (!match) throw new Error(`sequence ${step}: expected exactly one match`);
    const [, classes, extraAttributes, alt] = match;
    const replacement = `<div class="${classes}"${extraAttributes}data-media-id="how-${step}" data-how-sequence-frame-count="16"><img class="v3-process-sequence__fallback" data-sequence-fallback-step="${step}" alt="${alt}" decoding="async" data-how-sequence-fallback><video class="v3-process-sequence__video staged-sequence-video" muted playsinline preload="none" aria-hidden="true" data-staged-sequence></video></div>`;
    html = html.replace(sequencePattern, replacement);
  }

  html = replaceOnce(
    html,
    '<script type="module" src="/_astro/HowItWorks.astro_astro_type_script_index_0_lang.B4Q08uM8.js"></script>',
    '<script type="module" src="/_astro/staged-media.js?v=4"></script><script type="module" src="/_astro/lazy-sections.js"></script>',
    "staged media runtime",
  );
}

html = html.replaceAll(' src="/home-v2/staged/studio-poster-720.jpg"', ' data-src="/home-v2/staged/studio-poster-720.jpg"');
html = html.replaceAll('/_astro/hero-spline.css?v=1', '/_astro/hero-spline.css?v=4');
html = html.replaceAll('/_astro/hero-spline.css?v=2', '/_astro/hero-spline.css?v=4');
html = html.replaceAll('/_astro/hero-spline.css?v=3', '/_astro/hero-spline.css?v=4');
html = html.replaceAll('/_astro/hero-spline.css?v=4', '/_astro/hero-spline.css?v=5');
html = html.replaceAll('/_astro/hero-spline-loader.js?v=1', '/_astro/hero-spline-loader.js?v=4');
html = html.replaceAll('/_astro/hero-spline-loader.js?v=2', '/_astro/hero-spline-loader.js?v=4');
html = html.replaceAll('/_astro/hero-spline-loader.js?v=3', '/_astro/hero-spline-loader.js?v=4');
html = html.replaceAll(' srcset="/home-v2/staged/studio-poster-540.jpg"', ' data-srcset="/home-v2/staged/studio-poster-540.jpg"');
html = html.replaceAll('/home-v2/staged/studio-poster-720.jpg', '/home-v2/staged/studio-v3-poster-720.jpg');
html = html.replaceAll('/home-v2/staged/studio-poster-540.jpg', '/home-v2/staged/studio-v3-poster-540.jpg');
html = html.replaceAll('src="/_astro/staged-media.js?v=3"', 'src="/_astro/staged-media.js?v=4"');
html = html.replaceAll('src="/_astro/staged-media.js"', 'src="/_astro/staged-media.js?v=4"');
html = html.replace(/ src="(\/home-v2\/staged\/how-[1-4]-poster\.jpg)"/g, ' data-src="$1"');
for (let step = 1; step <= 4; step += 1) {
  html = html.replaceAll(
    ` data-src="/home-v2/staged/how-${step}-poster.jpg"`,
    ` data-sequence-fallback-step="${step}"`,
  );
}
html = html.replaceAll(
  'class="v3-process-sequence__canvas staged-sequence-video"',
  'class="v3-process-sequence__video staged-sequence-video"',
);
if (!html.includes('/_astro/lazy-sections.js')) {
  html = replaceOnce(
    html,
    '<script type="module" src="/_astro/staged-media.js?v=4"></script><script type="module" src="/_astro/HowItWorks.astro_astro_type_script_index_0_lang.B4Q08uM8.js"></script>',
    '<script type="module" src="/_astro/staged-media.js?v=4"></script><script type="module" src="/_astro/lazy-sections.js"></script>',
    "lazy section runtime",
  );
}
html = html.replace('<script type="module" src="/_astro/Faq.astro_astro_type_script_index_0_lang.7dHmyes1.js"></script>', "");

await writeFile(htmlPath, html);

let how = await readFile(howPath, "utf8");
if (how.includes("new Image")) {
  const start = how.indexOf("var An=Array.from");
  const end = how.indexOf(",jn=An.find", start);
  if (start < 0 || end < 0) throw new Error("HowItWorks sequence loader was not found");
  const replacement = 'var An=Array.from(document.querySelectorAll(`[data-how-scroll-sequence]`)).map(t=>{let n=t.querySelector(`[data-media-id^="how-"]`),r=Number(n?.dataset.howSequenceFrameCount??16),i=window.WanakaStagedMedia?.createSequence(n,r);return i?{story:t,stage:n,image:i.poster,canvas:i.video,step:t.dataset.howScrollSequence??`0`,frameCount:r,frames:[],render:i.render,preload:i.preload,showFallback:i.showFallback}:null}).filter(t=>t!==null)';
  how = `${how.slice(0, start)}${replacement}${how.slice(end)}`;
}
how = how.replace("rootMargin:`100% 0px`", "rootMargin:`25% 0px`");
await writeFile(howPath, how);
