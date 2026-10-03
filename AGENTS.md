## Project

Single-page interactive CV for Hugo Piñango. Astro 7 (static output) with three React 19 islands. UI text is in Spanish.

- All CV content lives in `src/data/cv.ts`; components only render it.
- `src/components/LanyardBadge.tsx`: hero badge on a lanyard. Physics is in `src/lib/lanyard-sim.ts` (position-based dynamics, no DOM). In dev, `window.__lanyard.advance(seconds)` steps the simulation without `requestAnimationFrame`.
- `src/components/SkillPuzzle.tsx`: jigsaw of skill areas. Piece shapes come from `src/lib/jigsaw.ts`; each piece is filled with its area's gradient (`gradient` in `cv.ts`, drawn via `src/lib/gradient.ts`).
- `src/components/StoryBook.tsx`: 3D book. Page turns are driven by the registered custom property `--turn` in `book.css`; the component only decides which leaves are flipped.
- Page and puzzle content is sized in `em` relative to the page or cell width, so it scales as a unit. Keep new content in `em`.
- The three parts are full-screen `.screen` sections with scroll snapping (`global.css`). On viewports of at least 820 × 600 px the puzzle and the book measure the height left in their section and size themselves to fit; they add `.is-fit` when they do, and `index.astro` keys the section's fixed height off that class with `:has()`. Change the breakpoints in both places together (CSS media query and the constants in the components).
- `src/scripts/section-scroll.ts` turns each wheel or trackpad gesture into exactly one section change; CSS snapping alone bounces back on small wheel deltas.
- Astro's dev server can keep serving a stale scoped `<style>` from `index.astro` after edits. If computed styles do not match the file, restart the dev server.
- Without JS (`html.no-js`) the puzzle renders as cards and the book as a list of pages. Keep that fallback working.
- No animation or 3D libraries, and no test framework. Verify with `npx astro check` and `npm run build`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
