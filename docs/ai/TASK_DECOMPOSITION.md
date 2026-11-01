# Task decomposition

One section per work package. Each task lists goal, files, steps, acceptance
checks and the limits that were accepted on purpose. Status is updated when the
change lands on `main`.

Legend: `[x]` done · `[ ]` todo · `[~]` accepted shortcut / not doing.

---

## Task 1 — Sharp UI (blurry text)

**Goal:** text and HUD elements look crisp on a 1080p-or-larger screen.

**Cause:** the canvas was rendered at 480 × 270 and CSS-upscaled ~2×. Text was
rasterised at 6–16 px, so anti-aliased glyph edges were magnified into soft
blobs; only the flat-coloured pixel art survived the upscale.

**Files:** `src/game/constants.ts`, `src/game/config.ts`,
`src/game/ui/theme.ts`, `src/game/systems/camera.ts`,
`src/game/scenes/{Menu,LevelSelect,HowTo,Hud,Level}Scene.ts`,
`tests/camera-scroll.test.ts`.

**Steps**

- [x] Add `RENDER_SCALE = 2` with `RENDER_WIDTH`/`RENDER_HEIGHT`; use them as the
      Phaser canvas size.
- [x] Keep `GAME_WIDTH`/`GAME_HEIGHT` as the 480 × 270 design grid so levels and
      layouts are untouched.
- [x] Zoom every UI camera with `zoomUiCamera(scene)` and give `textStyle()` a
      `resolution` equal to the render scale.
- [x] Pass `RENDER_SCALE` to `SharedCamera`; scale the applied zoom and keep the
      scroll compensation in render pixels. Shake intensity scales too; punch-in
      became relative to the current zoom.
- [x] Add a regression test: same visible world with and without the 2× buffer.

**Acceptance:** `Menu`, `Level select`, `How to play` and the in-game HUD render
sharp at 1280 × 720; camera framing on the finale is unchanged; all tests pass.

**Accepted limits**

- [~] CSS upscale is fractional because `Scale.FIT` fits the window. Text is
  rasterised at 2× so it still reads sharply; truly pixel-perfect output needs
  integer scaling, which would add letterbox bars on most windows.

---

## Task 2 — Fullscreen / stray black margins on desktop

**Goal:** the game uses the whole window and offers real fullscreen.

**Steps**

- [x] `#game` is `position: fixed; inset: 0` and the page background matches the
      game's dark backdrop, so leftover letterboxing reads as a frame instead of a
      black border.
- [x] `installTouchControls()` installs a global `F` shortcut that toggles the
      Fullscreen API.
- [x] Mobile gets an on-screen fullscreen button (desktop uses `F`, keeping the
      UI clean).
- [x] HUD footer and How-to screen document `F`.

**Acceptance:** at 1280 × 720 (16:9) the canvas fills the window exactly; `F`
and the mobile button enter and leave fullscreen; no hidden UI is covered.

**Accepted limits**

- [~] On non-16:9 windows one axis is letterboxed. Cropping instead would hide
  the level edges that the shared camera is framing.
- [~] iOS Safari has no Fullscreen API on iPhone; the button removes itself.

---

## Task 3 — Mobile support

**Goal:** the same level/co-op rules playable on a phone or tablet, no new
dependency.

**Files:** `src/game/systems/touch.ts` (new),
`src/game/systems/actions.ts` (new), `src/game/systems/input.ts`,
`src/game/entities/Player.ts`, `src/game/scenes/HudScene.ts`,
`src/main.ts`, `src/style.css`.

**Steps**

- [x] `touch.ts` builds two thumb pads (left / right / jump) with Pointer Events,
      showing them only when `(pointer: coarse)` matches.
- [x] Pad state lives in `touchPads`, injected into `PlayerInput` next to the
      keys; `Player.update` ORs both sources so coyote time and the jump buffer
      work unchanged.
- [x] Missed `pointerup` is handled: `pointercancel`, `pointerleave` and window
      `blur` all release the pads.
- [x] Pause has no Esc key on touch, so a small `actions.ts` bridge calls the
      HUD's pause toggle. The pause overlay itself is already mouse/touch driven.
- [x] HUD hides keyboard-only footer hints and says "SOUND ON/OFF" on touch.
- [x] Portrait shows a rotate hint and shrinks the pads; safe-area insets are
      respected; `touch-action: none` stops the page from scrolling.

**Acceptance:** at 844 × 390 with touch emulation: pads visible, P1 moves and
jumps from synthetic pointer events, pause button opens the pause overlay and
resumes, no console errors.

**Accepted limits**

- [~] Two players share one small screen; the pads cover the level corners. A
  phone-sized co-op layout would need per-level camera padding.
- [~] No gamepad support; wireless gamepads would be the next input source.
- [~] Portrait play is not supported properly, only hinted.

---

## Task 4 — AI instructions folder

**Goal:** a model picking up the repo cold can work without re-discovering the
conventions.

**Steps**

- [x] `docs/ai/README.md`: project shape, ground rules, coordinate systems,
      verification commands, known limits.
- [x] `docs/ai/TASK_DECOMPOSITION.md`: this file, one section per work package.

**Acceptance:** the rules above match the actual scripts and file layout in
`package.json` and `src/`.

---

## Verification recipes

Desktop (1280 × 720):

1. `npm run dev`
2. Open `http://localhost:5173/`, check the menu, then `Enter` into level 1.
3. Confirm sharp text, no black frame, HUD footer lists `F FULLSCREEN`.

Touch (844 × 390, DPR 2, touch emulation):

1. Chrome DevTools → device toolbar → landscape phone.
2. Pads appear for both players; press-and-hold moves, tap jumps.
3. `II` opens the pause overlay; tapping an entry resumes/retries.
4. Rotate to portrait: banner appears, pads shrink.

Headless, if a browser is available:

- Launch Chrome with `--headless=new --enable-unsafe-swiftshader
--remote-debugging-port=<port>`.
- `Emulation.setDeviceMetricsOverride` for the viewport, then
  `Emulation.setTouchEmulationEnabled` for mobile.
- Drive pads by dispatching `PointerEvent` on `.touch-key` and read player
  positions through `window.__coopGame` (dev build only).

## Follow-ups not scheduled

- [ ] Integer-scale render mode for pixel-perfect upscaling.
- [ ] Gamepad input via the Gamepad API.
- [ ] Per-level touch camera padding so pads cover less of the play area.
- [ ] Localisation pass (UI is English by design).
