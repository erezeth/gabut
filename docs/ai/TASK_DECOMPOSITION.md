# Task decomposition — current backlog

Forward-looking work only. Each work package has a goal, the files it touches,
steps, acceptance checks and the limits accepted on purpose. Finished tasks are
deleted from this file instead of being ticked off: git history (`git log`) is
the record. The most recent completed batch (2× render scale for sharp UI,
full-window canvas, touch controls, this folder) landed in `0e3c402`.

Ground rules, coordinate systems and the local build commands live in
[`README.md`](./README.md). Add a new task here before starting it; keep it to
one section and delete it when it ships.

Legend: `[ ]` todo · `[~]` accepted shortcut.

Last updated: 2026-11-01.

---

## Task 1 — Touch camera padding per level

**Goal:** the thumb pads must not hide gameplay. On touch, the shared camera
leaves room at the bottom of the screen so plates, spawns and the exit stay
above the pads.

**Files:** `src/game/systems/cameraView.ts` (the fix lives here),
`src/game/systems/camera.ts`, `src/game/scenes/LevelScene.ts`,
`src/game/constants.ts`, `tests/camera-view.test.ts`.

**Steps**

- [ ] Add a `bottomInset` option to `computeCameraView`; treat it as extra
      vertical padding below the pair and shrink the usable viewport height.
- [ ] Pass an inset from `LevelScene` only when `TOUCH` is true, sized from the
      CSS pad height converted back into design units.
- [ ] Keep the clamp-to-level maths in sync and test the inset case with a level
      whose floor sits at the level bottom.

**Acceptance:** on an 844 × 390 touch viewport, both spawns, every plate and the
exit on each shipped level sit above the pad row; desktop framing is unchanged.

**Accepted limits**

- [~] The inset shrinks the visible world, so wide levels zoom out slightly
  further on touch.

---

## Task 2 — Pixel-perfect integer render mode

**Goal:** remove the fractional CSS upscale left behind by `Scale.FIT`, so pixels
are an exact multiple on every window.

**Files:** `src/style.css`, `src/game/config.ts`, `src/main.ts`,
`docs/ai/README.md` (shortcut note).

**Steps**

- [ ] Add a resize handler that picks `scale = max(1, floor(min(vw / 16, vh / 9) / 30))`
      in design units and sizes the canvas with `Scale.NONE`.
- [ ] Fall back to the current fractional FIT when the floor would be 0 (small
      phones) so the game still fills the screen.
- [ ] Colour the letterbox area with the game background and re-check the
      fullscreen button and safe-area insets.
- [ ] Remove the `shortcut:` comment in `src/style.css` once this ships.

**Acceptance:** at 1280 × 720, 1366 × 768 and 1920 × 1080 the canvas is an exact
multiple of 960 × 540 with no uneven pixel widths; mobile landscape still fills
the height.

**Accepted limits**

- [~] Integer scaling means real letterboxing on non-16:9 windows; this is the
  trade-off the current shortcut avoids.

---

## Task 3 — Gamepad support

**Goal:** two wireless controllers work alongside the keyboard and touch pads,
without touching the movement rules.

**Files:** `src/game/systems/gamepad.ts` (new), `src/game/systems/input.ts`,
`src/game/entities/Player.ts`, `src/game/scenes/MenuScene.ts`,
`src/game/scenes/HudScene.ts`.

**Steps**

- [ ] Poll `navigator.getGamepads()` once per frame and write into the same
      per-player `PlayerInput` shape as `touch.ts` (left, right, jump).
- [ ] Map pad 0 → P1, pad 1 → P2; Start toggles the pause bridge in
      `actions.ts`; ignore pads the browser has not exposed yet.
- [ ] Show a small "P1 pad / P2 pad" indicator in the HUD only while a pad is
      connected, and let d-pad/left stick move menus.

**Acceptance:** with two pads connected, both players move and jump through a
level, Start pauses, and disconnecting a pad mid-level leaves the keyboard
working.

**Accepted limits**

- [~] No remapping UI; use the standard A/Cross and d-pad/left-stick layout.
- [~] Rumble is out of scope.

---

## Task 4 — Accessibility pass

**Goal:** the game is usable without relying on colour alone and readable at the
smallest text size.

**Files:** `src/game/constants.ts` (palette), `src/game/assets/textures.ts`
(door/plate/lever glyphs), `src/game/ui/theme.ts`, `src/game/scenes/HowToScene.ts`,
`src/game/systems/input.ts`.

**Steps**

- [ ] Add a non-colour cue to linked doors and plates: matching letter glyph on
      the door plus a shape difference for each link.
- [ ] Raise every 6 px HUD/footer string to the minimum size that stays legible
      at 1× render scale, and check contrast of muted text on the panel colour.
- [ ] Add keyboard remapping for both players (persisted like progress) and a
      reduced-motion option that disables camera shake and punch.

**Acceptance:** door links remain distinguishable in greyscale; every text pair
reaches 4.5:1 contrast; a remapped key survives reload and works in every scene.

**Accepted limits**

- [~] No full screen-reader narration of live gameplay; menus stay
  keyboard-navigable but the canvas is a single `aria-label` region.

---

## Task 5 — Portrait layout

**Goal:** replace the "rotate to landscape" hint with a layout that is actually
playable in portrait.

**Files:** `src/style.css`, `src/game/systems/touch.ts`,
`src/game/systems/cameraView.ts`, `docs/ai/README.md`.

**Steps**

- [ ] Stack the pads in the bottom half (P1 left column, P2 right column) so
      neither thumb crosses the other.
- [ ] Use the bottom inset from Task 1 to keep the level above the controls.
- [ ] Keep the rotate hint only for very narrow screens (< 360 px wide) where
      two pads cannot fit.

**Acceptance:** level 1 and 2 can be completed in portrait on a 390 × 844
viewport using only touch, with no overlapping controls.

**Accepted limits**

- [~] Co-op on a phone is inherently cramped; portrait remains a fallback, not
  the recommended mode.

---

## Task 6 — Bundle size and first load

**Goal:** the production entry chunk drops below Vite's 500 kB warning without
changing gameplay.

**Files:** `vite.config.ts`, `src/main.ts`, possibly `src/game/scenes/BootScene.ts`.

**Steps**

- [ ] Code-split Phaser behind a dynamic `import()` in `src/main.ts`, showing a
      static HTML loading state until the game boots.
- [ ] Verify the dev-only `window.__coopGame` handle still works with the async
      boot and that GitHub Pages serves the extra chunk with `base: './'`.

**Acceptance:** `npm run build` reports no chunk-size warning, the game still
boots from `dist/` under a subpath, and the production smoke test shows no
console errors.

**Accepted limits**

- [~] Total bytes stay roughly the same; only the critical path shrinks.

---

## Suggested order

1. Task 1 (touch camera padding) — biggest quality win on phones.
2. Task 2 (integer render) — closes the remaining sharpness gap.
3. Task 3 (gamepad) — new input source, reuses the touch plumbing.
4. Task 4 (accessibility) — palette and remap touch many files at once.
5. Task 5 (portrait) — depends on Task 1.
6. Task 6 (bundle) — polish, do last so it is measured against the final code.

Out of scope by design: online play, a level editor GUI and accounts. The game is
local co-op on one device.

---

## Verification recipes

Desktop:

1. `npm run dev`, open the printed URL at 1280 × 720.
2. Menu → `Enter` → level 1: sharp text, no stray frame, HUD footer shows
   `F FULLSCREEN`.
3. `F` enters fullscreen; `Esc` opens the pause overlay.

Touch (Chrome DevTools device toolbar, 844 × 390 landscape, DPR 2):

1. Pads appear for both players; hold to move, tap to jump.
2. `II` opens the pause overlay; tapping an entry resumes, retries or exits.
3. Rotate to portrait: banner appears, pads shrink.

Headless:

- Launch Chrome with `--headless=new --enable-unsafe-swiftshader
--remote-debugging-port=<port>`.
- `Emulation.setDeviceMetricsOverride` for the viewport, then
  `Emulation.setTouchEmulationEnabled` for touch.
- Drive pads with synthetic `PointerEvent`s on `.touch-key` and read player
  state through `window.__coopGame` (dev builds only).
- Production smoke: no `window.__coopGame`, no console errors, canvas matches
  `RENDER_WIDTH × RENDER_HEIGHT`.
