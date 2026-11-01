/**
 * One-way bridge from DOM chrome (mobile buttons) into the active HUD. Keeping
 * it to a single callback avoids a general event bus for two buttons.
 */
let pauseHandler: (() => void) | undefined;

export function setPauseHandler(handler: (() => void) | undefined): void {
  pauseHandler = handler;
}

export function requestPauseToggle(): void {
  pauseHandler?.();
}
