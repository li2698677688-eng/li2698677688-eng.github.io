import { mkdir, writeFile } from "node:fs/promises";

const sourceUrl = "https://my.spline.design/game-QnLgzQ729ZbpMexECRHUEk7n/";
const outputDirectory = new URL("../home-v2/spline-scenes/", import.meta.url);
const outputFile = new URL("game-transparent.js", outputDirectory);

function makeTransparent(source) {
  if (source.length < 100_000 || source.length > 10_000_000) {
    throw new Error(`${sourceUrl}: unexpected export size ${source.length}`);
  }
  if (!source.includes("new Application(canvas)") || !source.includes("app.start([")) {
    throw new Error(`${sourceUrl}: unsupported Spline export structure`);
  }
  const runtimeUrl = source.match(/https:\/\/unpkg\.com\/@splinetool\/runtime@[^"']+\/build\/runtime\.js/)?.[0];
  if (!runtimeUrl) {
    throw new Error(`${sourceUrl}: expected the official Spline runtime`);
  }

  const startMarker = "app.start([";
  const endMarker = "]).then(onLoad);";
  const arrayStart = source.indexOf(startMarker) + "app.start(".length;
  const arrayEnd = source.indexOf(endMarker, arrayStart) + 1;
  if (arrayStart < "app.start(".length || arrayEnd <= arrayStart) {
    throw new Error(`${sourceUrl}: scene data could not be extracted`);
  }
  const sceneData = source.slice(arrayStart, arrayEnd);

  return `// Mirrored from ${sourceUrl}; the Spline scene background alpha is removed at runtime.
import { Application } from "${runtimeUrl}";
import { createSplineCameraParallax } from "/_astro/spline-camera-parallax.js?v=1";

export async function mountSpline(canvas) {
  const app = new Application(canvas);
  await app.start(${sceneData});
  app._scene.activePage.bgColor.a = 0;
  app._renderer.setClearColor(app._scene.activePage.bgColor, 0);
  app._renderer.setClearAlpha(0);
  app._requestRenderAutoMode();
  const cameraParallax = createSplineCameraParallax(app);
  return {
    setCameraParallax: cameraParallax.setCameraParallax,
    dispose() {
      cameraParallax.dispose();
      app.dispose();
    },
  };
}
`;
}

const response = await fetch(sourceUrl, {
  headers: { "user-agent": "Wanaka-Spline-Transparent-Mirror/1.0" },
});
if (!response.ok) throw new Error(`${sourceUrl}: HTTP ${response.status}`);

const source = await response.text();
const transparent = makeTransparent(source);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, transparent);
console.log(`game-transparent.js: ${transparent.length} bytes`);
