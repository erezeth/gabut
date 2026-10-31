# Coop Puzzle

Two players, one keyboard. A local co-op puzzle platformer that runs in the browser.

> Status: **M0 — scaffold**. The render pipeline, tooling and deploy are in place; gameplay
> arrives in M1.

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

## Controls (planned for M1)

| Player | Move        | Jump                 |
| ------ | ----------- | -------------------- |
| P1     | `A` / `D`   | `W` or `Space`       |
| P2     | `←` / `→`   | `↑` or `Enter`       |

`R` restarts the current level.

## Stack

- **Phaser 4** — scenes, cameras and arcade physics.
- **TypeScript** in `strict` mode, plus `noUncheckedIndexedAccess`.
- **Vite** for the dev server and static build.
- **Vitest** for the pure game logic (level parsing, puzzle rules).
- **ESLint + Prettier**, GitHub Actions CI, GitHub Pages deploy.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve dist/ locally
npm run typecheck
npm run lint
npm test
npm run format
```

## Project layout

```
src/
  main.ts                 entry point
  style.css               page shell around the canvas
  game/
    config.ts             Phaser game config (480x270, Scale.FIT, arcade physics)
    constants.ts          internal resolution, tile size, palette
    scenes/               Boot, Menu, LevelSelect, Level, Hud (M1+)
    entities/             Player, Crate, Door, PressurePlate, Lever (M2+)
    level/                parser + level data (M3+)
    systems/              input keymaps, shared camera, audio (M1+)
    util/                 framework-free helpers, covered by unit tests
tests/                    Vitest specs for pure logic
```

## Design decisions

- **480×270 internal resolution, `Scale.FIT` + `pixelArt`.** One world unit equals one
  art pixel; the canvas is upscaled by the browser, so no asset ever needs to be re-exported
  at a different size.
- **Shared camera with auto-zoom, not split-screen.** Puzzle levels have to be readable as a
  whole so the two players can plan out loud. Split-screen stays an optional stretch goal.
- **Levels are data, not code.** ASCII maps are parsed into a `LevelState`; all puzzle rules
  are plain functions that can be unit-tested without Phaser.
- **Keyboard is mapped in one place** (`systems/input.ts`) so two players never compete for
  the same key and the UI can be remapped later.

## Roadmap

- [x] **M0** — scaffold, CI, deploy pipeline
- [ ] **M1** — two-player controller, tile collision, camera auto-zoom
- [ ] **M2** — pressure plates, doors, crates, levers (+ unit tests)
- [ ] **M3** — ASCII level parser, 5 levels, respawn/restart
- [ ] **M4** — menu, level select, progress in `localStorage`, HUD, pause
- [ ] **M5** — juice, sound effects, pixel art pass, GIF in this README
- [ ] **M6** — deploy to GitHub Pages, playtest with two people on one keyboard

## Deploying

The build uses a relative base path, so it works on GitHub Pages under any repository name.
Push to `main` and `.github/workflows/deploy.yml` builds and publishes `dist/` automatically.
Enable it once in **Settings → Pages → Source: GitHub Actions**.

## Credits

Placeholder visuals are flat rectangles. The pixel art pass in M5 will use free assets from
[Kenney](https://kenney.nl/), credited here when added.
