import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outfile = fileURLToPath(new URL("../_astro/hero-models.js", import.meta.url));

await build({
  entryPoints: [fileURLToPath(new URL("./hero-models.entry.mjs", import.meta.url))],
  outfile,
  bundle: true,
  format: "esm",
  legalComments: "eof",
  minify: true,
  target: ["es2022"],
});

const output = await readFile(outfile, "utf8");
await writeFile(outfile, output
  .replace(/[\t ]+$/gm, "")
  .replace(/^ +\t/gm, "\t"));
