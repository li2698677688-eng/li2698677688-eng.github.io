import { readFile, writeFile } from "node:fs/promises";

const modulePath = new URL("../_astro/world-showcase.CxtrUrBC.js", import.meta.url);
let source = await readFile(modulePath, "utf8");

function replaceOnce(current, replacement, label) {
  if (source.includes(replacement)) return;
  const matches = source.split(current).length - 1;
  if (matches !== 1) throw new Error(`${label}: expected one source match, found ${matches}`);
  source = source.replace(current, replacement);
}

source = source.replaceAll("author:`@alejandro`", "author:`@curator`");

replaceOnce(
  "function x(e,t){let n=b.get(y(e.id))??b.get(y(e.name));return{...e,coverUrl:n??e.coverUrl,tags:[`remixable`],author:t%2==0?`@wanaka`:`@creator`}}",
  "var A=[{author:`@brody`,avatarUrl:`/home-v3/redesign/avatars/brody.webp`,playCount:`824K`,likeCount:`63K`},{author:`@luciddreamer`,avatarUrl:`/home-v3/redesign/avatars/lucid-dreamer.webp`,playCount:`1.2M`,likeCount:`96K`},{author:`@oyojee`,avatarUrl:`/home-v3/redesign/avatars/oyojee.webp`,playCount:`756K`,likeCount:`68K`},{author:`@tuutikki2202`,avatarUrl:`/home-v3/redesign/avatars/tuutikki.webp`,playCount:`918K`,likeCount:`81K`},{author:`@divbuilds`,avatarUrl:`/home-v3/redesign/avatars/div.webp`,playCount:`1.1M`,likeCount:`92K`},{author:`@sonoa`,avatarUrl:`/home-v3/redesign/avatars/sonoa.webp`,playCount:`689K`,likeCount:`57K`},{author:`@mossbyte`,avatarUrl:`/home-v3/redesign/avatars/brody-alt.webp`,playCount:`873K`,likeCount:`74K`},{author:`@orbitcat`,avatarUrl:`/home-v3/redesign/avatars/lucid-dreamer-alt.webp`,playCount:`947K`,likeCount:`86K`},{author:`@pixelnova`,avatarUrl:`/home-v3/redesign/avatars/oyojee-alt.webp`,playCount:`782K`,likeCount:`64K`},{author:`@emberplay`,avatarUrl:`/home-v3/redesign/avatars/tuutikki-alt.webp`,playCount:`1.3M`,likeCount:`110K`}];v=v.map((e,t)=>({...e,...A[t%A.length]}));function x(e,t){let n=b.get(y(e.id))??b.get(y(e.name));return{...e,coverUrl:n??e.coverUrl,...A[t%A.length]}}",
  "world author and engagement metadata",
);

const previousStatsMarkup = "}),(0,g.jsxs)(`div`,{className:`v3-world-card__stats`,\"aria-label\":`${e.playCount} plays and ${e.likeCount} likes`,children:[(0,g.jsxs)(`span`,{className:`v3-world-card__stat`,children:[(0,g.jsx)(`img`,{src:`/home-v3/redesign/world-play.svg`,alt:``,width:`16`,height:`16`,\"aria-hidden\":`true`}),(0,g.jsx)(`span`,{children:e.playCount})]}),(0,g.jsxs)(`span`,{className:`v3-world-card__stat`,children:[(0,g.jsx)(`img`,{src:`/home-v3/redesign/world-like.svg`,alt:``,width:`16`,height:`16`,\"aria-hidden\":`true`}),(0,g.jsx)(`span`,{children:e.likeCount})]})]}),(0,g.jsxs)(`div`,{className:`v3-world-card__hover`,children:";
const semanticStatsMarkup = "}),(0,g.jsxs)(`div`,{className:`v3-world-card__stats`,\"aria-label\":`${e.playCount} likes and ${e.likeCount} plays`,children:[(0,g.jsxs)(`span`,{className:`v3-world-card__stat`,children:[(0,g.jsx)(`img`,{src:`/home-v3/redesign/world-like.svg`,alt:``,width:`16`,height:`16`,\"aria-hidden\":`true`}),(0,g.jsx)(`span`,{children:e.playCount})]}),(0,g.jsxs)(`span`,{className:`v3-world-card__stat`,children:[(0,g.jsx)(`img`,{src:`/home-v3/redesign/world-play.svg`,alt:``,width:`16`,height:`16`,\"aria-hidden\":`true`}),(0,g.jsx)(`span`,{children:e.likeCount})]})]}),(0,g.jsxs)(`div`,{className:`v3-world-card__hover`,children:";
const statsMarkup = "}),(0,g.jsxs)(`div`,{className:`v3-world-card__stats`,\"aria-label\":`${e.playCount} likes and ${e.likeCount} plays`,children:[(0,g.jsxs)(`span`,{className:`v3-world-card__stat`,children:[(0,g.jsx)(`img`,{src:`/home-v3/redesign/world-like.svg?v=2`,alt:``,width:`16`,height:`16`,\"aria-hidden\":`true`}),(0,g.jsx)(`span`,{children:e.playCount})]}),(0,g.jsxs)(`span`,{className:`v3-world-card__stat`,children:[(0,g.jsx)(`img`,{src:`/home-v3/redesign/world-play.svg?v=2`,alt:``,width:`16`,height:`16`,\"aria-hidden\":`true`}),(0,g.jsx)(`span`,{children:e.likeCount})]})]}),(0,g.jsxs)(`div`,{className:`v3-world-card__hover`,children:";

if (source.includes(previousStatsMarkup)) {
  source = source.replace(previousStatsMarkup, statsMarkup);
}
if (source.includes(semanticStatsMarkup)) {
  source = source.replace(semanticStatsMarkup, statsMarkup);
}

replaceOnce(
  "}),(0,g.jsxs)(`div`,{className:`v3-world-card__hover`,children:",
  statsMarkup,
  "Figma like and play stats",
);

replaceOnce(
  "(0,g.jsxs)(`div`,{className:`v3-world-card__tags`,children:[(0,g.jsx)(`span`,{children:e.genre}),e.tags.map(e=>(0,g.jsx)(`span`,{children:e},e))]}),(0,g.jsx)(`p`,{children:e.author})",
  "(0,g.jsxs)(`div`,{className:`v3-world-card__author`,children:[(0,g.jsx)(`img`,{src:e.avatarUrl,alt:``,width:`24`,height:`24`,loading:`lazy`,decoding:`async`,\"aria-hidden\":`true`}),(0,g.jsx)(`span`,{children:e.author})]})",
  "author avatar row",
);

replaceOnce(
  "var g=n(),_=`/home-v2/hero-wana-world.png`,v=[",
  "var g=n(),_=`/home-v2/blastzone-brawl.webp`,v=[",
  "lightweight world-card fallback",
);

replaceOnce(
  'className:`v3-world-marquee`,"aria-label":`Playable Wanaka worlds`',
  'className:`v3-world-marquee`,role:`region`,"aria-label":`Playable Wanaka worlds`',
  "world marquee landmark semantics",
);

await writeFile(modulePath, source);
