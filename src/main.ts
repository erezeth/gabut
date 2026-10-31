import Phaser from 'phaser';

import './style.css';
import { gameConfig } from './game/config';

const game = new Phaser.Game(gameConfig);

// Dev-only handle so the headless smoke test can read game state. Vite strips
// this branch from production builds.
if (import.meta.env.DEV) {
  (window as Window & { __coopGame?: Phaser.Game }).__coopGame = game;
}
