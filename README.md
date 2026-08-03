# Wanaka Homepage Preview

Public static preview of the Wanaka homepage redesign.

- Preview: https://li2698677688-eng.github.io/
- Generated from `apps/website`
- This repository contains deployment artifacts only; product source remains in the Wanaka monorepo.

## Homepage media optimization

- `npm run optimize` reapplies the staged-media markup to the current generated homepage.
- `npm test` verifies first-load behavior and media size budgets.
- `npm run media:audit` fails when an unreferenced media file larger than 100 KB is deployed.
- How-it-works stories use 960 px transparent VP9 WebM files in Chromium browsers.
- Safari and iOS keep the original WebP frames as a compatibility fallback; both paths load only near the viewport.

The matching source-level components should remain synchronized in the private Wanaka monorepo so a future build does not overwrite these deployment-artifact optimizations.
