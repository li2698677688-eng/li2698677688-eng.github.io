# Homepage Spline placement — design QA

## Evidence

- Source visual truth: `/var/folders/w0/2wrr63gx75j434jhp945lbjw0000gn/T/codex-clipboard-0ca3eade-15e4-4811-b095-9665ec63166e.png`
- Final implementation: `artifacts/hero-spline-transparent-1280x720.png`
- Cold-start implementation: `artifacts/hero-spline-cold-start-1280x720.png`
- Combined comparison: `artifacts/hero-spline-transparent-comparison.jpg`
- Mobile implementation: `artifacts/hero-spline-mobile-390x720.png`
- Source pixels: 3696 × 1374.
- Implementation pixels and CSS viewport: 1265 × 712 content capture inside a 1280 × 720 browser viewport at 1× density.
- Comparison normalization: the source was proportionally reduced and centered inside a 1265 × 712 field; the implementation remained at its native 1265 × 712 capture size.
- State: both mirrored Spline scenes loaded and reported `ready`, their real-time silhouette masks applied, no modal or menu open.

## Findings

No actionable P0, P1, or P2 differences remain for the requested change.

- Fonts and typography: unchanged from the existing Wanaka implementation. Poppins remains the final global font override; the complete hero-title state and wrapping were verified in the browser.
- Spacing and layout rhythm: the two scene slots occupy opposite 19% side rails at 1280 px, with 30–45 px clearance from the central prompt region. Their 566 px height follows the tall placement rectangles in the source without changing the center content layout.
- Colors and visual tokens: the Wanaka background, type, input, and button tokens are unchanged. The authored white/pink and purple scene panels are removed; both consoles now sit directly on the existing Wanaka background.
- Image quality and asset fidelity: both visible consoles come from the exact supplied Spline scenes. The public exports are mirrored with transparent canvas backgrounds, and generated foreground-instance masks remove the scenes' remaining full-frame light/post-processing layers without redrawing either console. Two 60 KB combined transparent WebP captures cover cold startup before crossfading to the masked live iframes.
- Copy and content: homepage copy, navigation, prompt, suggestions, and Studio content are unchanged.
- Responsiveness: a real 390 px iframe viewport rendered the mobile homepage with the Spline stage hidden and zero Spline iframes created. Desktop page width remained within the viewport with no horizontal overflow.
- Interaction and accessibility: the “Cozy city builder” suggestion still fills the prompt with “A cozy city builder on floating islands”. Both Spline iframes have descriptive titles and are removed when the desktop breakpoint no longer matches. Browser console check returned zero errors or warnings.

Focused-region comparison was not necessary: the white/pink and purple panels are large, high-contrast regions that remain clearly legible in the normalized full-view comparison, alongside both consoles and the complete center hero.

## Comparison history

1. First browser pass — `artifacts/hero-spline-iteration-1.png`
   - Earlier findings: the left console was outside the narrow responsive camera crop, while the right console was oversized and clipped.
   - Fix: render each remote scene at its authored export viewport, then scale and center that fixed viewport inside the side rail.
2. Second browser pass — `artifacts/hero-spline-iteration-2.png`
   - Earlier findings: both consoles were visible, but their scale overpowered the central hero and the side panels were too wide.
   - Fix: reduce the side rails from 23vw to 19vw, inset them responsively, scale the left scene to 0.46 and the right scene to 1.10, and strengthen edge masking.
3. Final browser pass — `artifacts/hero-spline-desktop-1280x720.png`
   - Post-fix evidence: both consoles are fully identifiable, balanced on opposite sides, clear of the center prompt, and aligned to the annotated side zones.
4. Cold-start browser pass — `artifacts/hero-spline-cold-start-1280x720.png`
   - Online cold-start finding: Spline's first iframe reported `load` before its canvas painted, briefly exposing only the authored background color.
   - Fix: show exact lightweight scene captures immediately and reveal each live scene only after its measured paint window. At 900 ms both consoles were visible while both iframes were still loading; after 15 seconds both scenes were live and the stage reported `ready`.
5. Transparent-background pass — `artifacts/hero-spline-transparent-1280x720.png`
   - User finding: the left white/pink panel and right purple panel remained visibly rectangular around the consoles.
   - Fix: mirror each supplied Spline export with a transparent canvas, create a foreground mask from the exact console render, apply the mask to both the startup poster and live iframe, and remove the previous broad radial scene mask.
   - Post-fix evidence: the combined comparison shows both rectangular panels absent while the console imagery, scale, side placement, and center hero remain intact.

## Follow-up polish

- No remaining P0, P1, P2, or P3 findings for the requested background-removal change.

## Implementation checklist

- [x] Remove the six GLB hero props and Three.js runtime chain.
- [x] Place the two supplied Spline scenes on the left and right.
- [x] Defer desktop scene loading until the hero is visible and the browser is idle.
- [x] Cover mirrored-scene cold startup with exact scene posters and crossfade to the live models.
- [x] Remove the left white/pink panel and right purple panel from both poster and live states.
- [x] Avoid creating either WebGL scene on screens at or below 1100 px.
- [x] Preserve center content, prompt behavior, and responsive layout.
- [x] Pass automated tests, media audit, browser console, interaction, and visual comparison checks.

final result: passed
