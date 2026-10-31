import Phaser from 'phaser';

import './style.css';
import { gameConfig } from './game/config';
import { audio } from './game/systems/audio';

const game = new Phaser.Game(gameConfig);

// Browsers only allow audio after a gesture. Unlock on whichever comes first;
// audio.unlock() is idempotent, so the leftover listener is harmless.
const unlockAudio = (): void => audio.unlock();
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// Dev-only handle for headless smoke tests. Vite strips this branch from
// production builds.
if (import.meta.env.DEV) {
  (window as Window & { __coopGame?: Phaser.Game }).__coopGame = game;
}
