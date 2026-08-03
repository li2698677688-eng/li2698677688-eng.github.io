import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaRoot = path.join(root, "home-v2");
const reportOnly = process.argv.includes("--report");
const mediaExtensions = new Set([".glb", ".jpg", ".jpeg", ".png", ".svg", ".webp", ".mp4", ".webm"]);
const sourceExtensions = new Set([".html", ".css", ".js", ".mjs", ".json", ".md", ".xml"]);
const ignoredDirectories = new Set([".git", "node_modules"]);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const allFiles = await walk(root);
const sourceFiles = allFiles.filter((file) => {
  const relative = path.relative(root, file);
  const [topLevel] = relative.split(path.sep);
  return !["scripts", "tests"].includes(topLevel)
    && sourceExtensions.has(path.extname(file).toLowerCase());
});
const sources = await Promise.all(sourceFiles.map(async (file) => ({
  file,
  text: await readFile(file, "utf8"),
})));
const mediaManifest = JSON.parse(
  await readFile(path.join(mediaRoot, "media-manifest.json"), "utf8"),
);
const sequencePrefixes = (mediaManifest.sequences ?? [])
  .map((sequence) => sequence.framePrefix)
  .filter((prefix) => typeof prefix === "string" && prefix.length > 0);
const mediaFiles = allFiles.filter((file) => file.startsWith(`${mediaRoot}${path.sep}`)
  && mediaExtensions.has(path.extname(file).toLowerCase()));

const orphaned = [];
let mediaBytes = 0;
for (const file of mediaFiles) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  const publicPath = `/${relative}`;
  const size = (await stat(file)).size;
  mediaBytes += size;
  const referenced = sources.some(({ file: sourceFile, text }) => sourceFile !== file
    && (text.includes(publicPath) || text.includes(relative)))
    || sequencePrefixes.some((prefix) => publicPath.startsWith(prefix));
  if (!referenced) orphaned.push({ path: relative, size });
}

orphaned.sort((left, right) => right.size - left.size || left.path.localeCompare(right.path));
const largeOrphans = orphaned.filter((file) => file.size > 100_000);
console.log(JSON.stringify({
  mediaBytes,
  mediaFiles: mediaFiles.length,
  orphanedBytes: orphaned.reduce((total, file) => total + file.size, 0),
  orphanedFiles: orphaned,
}, null, 2));

if (!reportOnly && largeOrphans.length) {
  console.error(`Media audit failed: ${largeOrphans.length} unreferenced files exceed 100 KB.`);
  process.exitCode = 1;
}
