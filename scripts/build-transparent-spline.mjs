import { mkdir, writeFile } from "node:fs/promises";

const outputDirectory = new URL("../home-v2/spline-scenes/", import.meta.url);
const scenes = [
  {
    output: "game-console.html",
    source: "https://my.spline.design/gameconsole-C2J75pZy3HyB9XIr6qdhfb9q/",
  },
  {
    output: "modite-console.html",
    source: "https://my.spline.design/moditeadventureldkgame-yudJHbgETLW1FY8UJ2SAgSvk/",
  },
];

function replaceExactlyOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected exactly one match`);
  }
  return source.replace(pattern, replacement);
}

function makeTransparent(source, sourceUrl) {
  if (source.length < 100_000 || source.length > 10_000_000) {
    throw new Error(`${sourceUrl}: unexpected export size ${source.length}`);
  }
  if (!source.includes("new Application(canvas)") || !source.includes("app.start([")) {
    throw new Error(`${sourceUrl}: unsupported Spline export structure`);
  }
  if (!source.includes("https://unpkg.com/@splinetool/runtime@")) {
    throw new Error(`${sourceUrl}: expected the official Spline runtime`);
  }

  let transparent = replaceExactlyOnce(
    source,
    /background:\s*rgba\([^;]+\);/g,
    "background: transparent;",
    `${sourceUrl} body background`,
  );
  transparent = replaceExactlyOnce(
    transparent,
    /\.then\(onLoad\);/g,
    ".then(() => { app.setBackgroundColor('rgba(0,0,0,0)'); onLoad(); });",
    `${sourceUrl} runtime background`,
  );
  return transparent
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

await mkdir(outputDirectory, { recursive: true });

for (const scene of scenes) {
  const response = await fetch(scene.source, {
    headers: { "user-agent": "Wanaka-Spline-Mirror/1.0" },
  });
  if (!response.ok) throw new Error(`${scene.source}: HTTP ${response.status}`);

  const source = await response.text();
  const transparent = makeTransparent(source, scene.source);
  await writeFile(new URL(scene.output, outputDirectory), transparent);
  console.log(`${scene.output}: ${transparent.length} bytes`);
}
