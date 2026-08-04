import { readFile, writeFile } from "node:fs/promises";

await import("./apply-template-card-review-fixes.mjs");
await import("./apply-preview-review-fixes.mjs");

const root = new URL("../", import.meta.url);
const pages = [
  "index.html",
  "404.html",
  "pricing/index.html",
  "privacy-policy/index.html",
  "terms-of-service/index.html",
];
const fontLinks = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&amp;display=swap">';

for (const page of pages) {
  const url = new URL(page, root);
  let html = await readFile(url, "utf8");
  html = html.replace(/\/_astro\/font-poppins\.css(?:\?v=\d+)?/g, "/_astro/font-poppins.css?v=3");
  if (!html.includes('rel="preconnect" href="https://fonts.googleapis.com"')) {
    html = html.replace('<link rel="stylesheet" href="/_astro/SiteFooter.5Tv4HviT.css">', `${fontLinks}<link rel="stylesheet" href="/_astro/SiteFooter.5Tv4HviT.css">`);
  }
  await writeFile(url, html);
}
