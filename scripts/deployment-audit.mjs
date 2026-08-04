import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionRoots = ["_astro", "home-v2", "home-v3"];
const textExtensions = new Set([".css", ".html", ".js", ".json", ".mjs", ".svg", ".xml"]);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function normalizePublicPath(value) {
  const clean = value.split(/[?#]/, 1)[0];
  return clean.startsWith("/") ? clean.slice(1) : clean;
}

const allFiles = await walk(root);
const deployable = new Set(allFiles.map((file) => path.relative(root, file).split(path.sep).join("/")));
const reachable = new Set();
const queue = allFiles
  .filter((file) => [".html", ".xml"].includes(path.extname(file)) || path.basename(file) === "robots.txt")
  .map((file) => path.relative(root, file).split(path.sep).join("/"));

while (queue.length) {
  const relative = queue.shift();
  if (reachable.has(relative) || !deployable.has(relative)) continue;
  reachable.add(relative);
  if (!textExtensions.has(path.extname(relative)) && path.basename(relative) !== "robots.txt") continue;

  const source = await readFile(path.join(root, relative), "utf8");
  const references = new Set();
  for (const match of source.matchAll(/\/(?:_astro|home-v2|home-v3)\/[^\s"'`()<>?#]+/g)) {
    references.add(normalizePublicPath(match[0]));
  }
  if (relative.startsWith("_astro/") && relative.endsWith(".js")) {
    for (const match of source.matchAll(/["'`](\.\.?\/[^"'`]+)["'`]/g)) {
      references.add(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
    }
  }
  for (const reference of references) {
    if (deployable.has(reference) && !reachable.has(reference)) queue.push(reference);
  }
}

const productionFiles = [...deployable].filter((file) => productionRoots.some((directory) => file.startsWith(`${directory}/`)));
const unused = [];
for (const file of productionFiles) {
  if (!reachable.has(file)) unused.push({ file, bytes: (await stat(path.join(root, file))).size });
}
unused.sort((a, b) => b.bytes - a.bytes || a.file.localeCompare(b.file));

console.log(JSON.stringify({
  deployableBytes: await productionFiles.reduce(async (total, file) => (await total) + (await stat(path.join(root, file))).size, Promise.resolve(0)),
  productionFiles: productionFiles.length,
  unusedBytes: unused.reduce((total, file) => total + file.bytes, 0),
  unusedFiles: unused,
}, null, 2));

if (unused.length) {
  console.error(`Deployment audit failed: ${unused.length} production files are unreachable.`);
  process.exitCode = 1;
}
