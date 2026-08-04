import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  "/Users/lihongfei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json",
);
const sharp = require("sharp");

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = "/Users/lihongfei/Desktop/网站动效/头像";
const outputRoot = path.join(projectRoot, "home-v3/redesign/avatars");

const avatars = [
  ["Brody.png", "brody.webp"],
  ["Brody-1.png", "brody-alt.webp"],
  ["Lucid Dreamer Records.png", "lucid-dreamer.webp"],
  ["Lucid Dreamer Records-1.png", "lucid-dreamer-alt.webp"],
  ["Oyojee.png", "oyojee.webp"],
  ["Oyojee-1.png", "oyojee-alt.webp"],
  ["Tuutikki2202.png", "tuutikki.webp"],
  ["Tuutikki2202-1.png", "tuutikki-alt.webp"],
  ["div.png", "div.webp"],
  ["sonoa.png", "sonoa.webp"],
];

const icons = [
  ["https://www.figma.com/api/mcp/asset/8c0c648f-ba5e-4427-b420-ed41e05ec957.svg", "world-like.svg"],
  ["https://www.figma.com/api/mcp/asset/986ed51a-69ee-47ee-921d-8b91ef4ff694.svg", "world-play.svg"],
];

await mkdir(outputRoot, { recursive: true });

for (const [sourceName, outputName] of avatars) {
  await sharp(path.join(sourceRoot, sourceName))
    .resize(48, 48, { fit: "cover" })
    .webp({ quality: 88, alphaQuality: 100, smartSubsample: true })
    .toFile(path.join(outputRoot, outputName));
}

for (const [url, outputName] of icons) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download ${outputName}: ${response.status}`);
  const contents = Buffer.from(await response.arrayBuffer());
  if (!contents.toString("utf8", 0, 200).includes("<svg")) {
    throw new Error(`${outputName} was not an SVG response`);
  }
  await writeFile(path.join(projectRoot, "home-v3/redesign", outputName), contents);
}
