# Instructions for AI models

This folder is the entry point for any AI coding model working on Coop Puzzle.
Read this file first, then the relevant section of `TASK_DECOMPOSITION.md`.

## What this project is

A browser co-op puzzle platformer: two players, one keyboard or one touch
screen, five hand-made levels. Vite + TypeScript (strict) + Phaser 4, deployed
to GitHub Pages. There is no server, no backend and no external asset files.

## Ground rules

1. **Game rules stay out of Phaser.** Parsing, puzzle rules, camera maths,
   progress and jump timing live in plain modules (`src/game/level/`,
   `src/game/systems/`) with Vitest specs in `tests/`. Only scenes glue those
   modules to Phaser.
2. **No binary assets.** Every texture is drawn at boot in
   `src/game/assets/textures.ts`; every sound is synthesised in
   `src/game/systems/audio.ts`. Do not add image, font or audio files, and do
   not add a dependency for something the standard library or Phaser already
   does.
3. **TypeScript strict** with `noUncheckedIndexedAccess`. No `any`, no unused
   exports, no `@ts-ignore`.
4. **Small diffs.** Fix the root cause in the shared file instead of patching
   every caller. Do not refactor unrelated code in the same change.
5. **Comment the why, not the what.** One line per non-obvious decision. A
   known ceiling that was accepted on purpose is marked
   `shortcut: <ceiling>, <upgrade path>`.
6. **Copy is English** in code, UI and docs. The project owner speaks Indonesian;
   keep conversation in Indonesian if that is how they write.
7. **`window.__coopGame` is dev-only.** Vite strips the branch from production
   builds; never rely on it in shipped code.

## Coordinate systems

- Levels, UI layout and physics are all in **design units**: 480 × 270, one unit
  per original art pixel, `TILE_SIZE = 16`.
- The canvas renders at `RENDER_SCALE` (2×) that design size so text is
  rasterised readably instead of magnified. `GAME_WIDTH`/`GAME_HEIGHT` stay the
  design size; `RENDER_WIDTH`/`RENDER_HEIGHT` are the buffer size.
- Menu, level-select, how-to and HUD cameras call `zoomUiCamera(scene)`, so
  their layout code keeps using the 480 × 270 grid.
- The level camera is driven by `SharedCamera`, which multiplies its computed
  zoom by `RENDER_SCALE` and compensates Phaser's centred zoom when setting
  scroll. Keep both halves of that maths in sync; `tests/camera-scroll.test.ts`
  guards it.
- Text styles must go through `textStyle()` so they pick up the render-scale
  resolution.

## Verify before saying "done"

```bash
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

For anything visual, also run `npm run dev` and look at it at a desktop size
(1280 × 720) **and** a phone landscape size (844 × 390). Headless Chrome with
the DevTools Protocol is how this repo is smoke-tested; see the CDP recipes in
`TASK_DECOMPOSITION.md`.

## Known limits

- Co-op on one phone means two thumb pads on one screen; portrait only shows a
  "rotate to landscape" hint and smaller pads.
- Canvas scaling is fractional (`Scale.FIT`), so on window sizes that are not an
  exact multiple of 16:9 the upscale is not pixel-perfect. Fixing it properly
  needs an integer-scale layout with visible letterboxing.
- No gamepad support and no online play; both are out of scope for the local
  co-op design.
