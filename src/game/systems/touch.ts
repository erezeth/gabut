import { requestPauseToggle } from './actions';

/** Live touch state for one player, read by {@link Player} next to the keys. */
export interface TouchPad {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export const touchPads: [TouchPad, TouchPad] = [
  { left: false, right: false, jump: false },
  { left: false, right: false, jump: false },
];

const PAD_KEYS = ['left', 'right', 'jump'] as const;

/**
 * Adds the mobile controls: one thumb pad per player, plus pause and fullscreen
 * buttons that work on any device. Desktop keyboards stay the primary input.
 */
export function installTouchControls(): void {
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'f' && !event.repeat) toggleFullscreen();
  });
  // A missed pointerup (tab switch, call) would otherwise leave a player walking.
  window.addEventListener('blur', resetTouchPads);

  // Desktop keeps the keyboard and the F key; only touch devices get overlays.
  if (!window.matchMedia('(pointer: coarse)').matches) return;

  const root = document.createElement('div');
  root.className = 'touch-ui';

  root.innerHTML = `<div class="system-buttons">
    <button type="button" class="system-button" data-action="pause" aria-label="Pause">II</button>
    <button type="button" class="system-button" data-action="fullscreen" aria-label="Fullscreen">⛶</button>
  </div>`;

  root.querySelector('[data-action="pause"]')?.addEventListener('click', requestPauseToggle);

  const fullscreenButton = root.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');
  if (fullscreenButton) {
    if (typeof document.documentElement.requestFullscreen === 'function') {
      fullscreenButton.addEventListener('click', toggleFullscreen);
    } else {
      fullscreenButton.remove();
    }
  }

  root.append(...touchPads.map(buildPad));

  const hint = document.createElement('div');
  hint.className = 'rotate-hint';
  hint.textContent = 'Rotate to landscape to play co-op';
  root.append(hint);

  document.body.append(root);
}

function buildPad(pad: TouchPad, index: number): HTMLElement {
  const element = document.createElement('div');
  element.className = 'touch-pad';
  element.dataset.player = String(index + 1);

  for (const key of PAD_KEYS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key === 'jump' ? 'touch-key touch-jump' : 'touch-key';
    button.textContent = key === 'left' ? '◀' : key === 'right' ? '▶' : '▲';
    button.setAttribute('aria-label', `Player ${index + 1} ${key}`);

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      setPad(pad, key, true, button);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
      button.addEventListener(type, () => setPad(pad, key, false, button));
    }

    element.append(button);
  }

  return element;
}

function setPad(pad: TouchPad, key: keyof TouchPad, down: boolean, button: HTMLElement): void {
  pad[key] = down;
  button.classList.toggle('is-down', down);
}

function resetTouchPads(): void {
  for (const button of document.querySelectorAll<HTMLElement>('.touch-key')) {
    button.classList.remove('is-down');
  }
  for (const pad of touchPads) {
    pad.left = false;
    pad.right = false;
    pad.jump = false;
  }
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen().catch(() => {});
  }
}
