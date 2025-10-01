import { MF_CANVAS_WIDTH, MF_DROP_ZONE_COUNT } from './constants.js';

export function createMasterFloristCanvasController({ canvas, state, onStateChange, toCanvasPoint } = {}) {
  if (!canvas) throw new Error('createMasterFloristCanvasController requires a canvas element.');
  const listeners = [];

  function mapPointer(event) {
    if (typeof toCanvasPoint === 'function') {
      return toCanvasPoint(event);
    }
    return { x: event.offsetX, y: event.offsetY };
  }

  function mount() {
    bind(canvas, 'pointerdown', handlePointerDown);
    bind(canvas, 'pointermove', handlePointerMove);
    bind(canvas, 'pointerup', handlePointerUp);
    bind(canvas, 'pointerleave', handlePointerLeave);
    bind(canvas, 'keydown', handleKeyDown);
    canvas.setAttribute('aria-live', 'polite');
  }

  function unmount() {
    listeners.splice(0).forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });
  }

  function reset() {
    state.hoverStemId = null;
    state.pendingDrops = [];
    announce('Workbench cleared.');
    onStateChange?.();
  }

  function bind(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push({ target, type, handler, options });
  }

  function handlePointerDown(event) {
    canvas.focus();
    canvas.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    const point = mapPointer(event);
    state.hoverStemId = inferStemFromPoint(point.x, point.y);
    onStateChange?.();
  }

  function handlePointerUp(event) {
    canvas.releasePointerCapture?.(event.pointerId);
    const point = mapPointer(event);
    state.pendingDrops.push({ x: point.x, y: point.y, at: Date.now() });
    onStateChange?.();
  }

  function handlePointerLeave() {
    state.hoverStemId = null;
    onStateChange?.();
  }

  function handleKeyDown(event) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  function announce(message) {
    canvas.setAttribute('data-announce', String(message));
  }

  return { mount, unmount, reset };
}

function inferStemFromPoint(x, y) {
  if (x == null || y == null) return null;
  const zoneWidth = MF_CANVAS_WIDTH / MF_DROP_ZONE_COUNT;
  const index = Math.max(0, Math.min(MF_DROP_ZONE_COUNT - 1, Math.floor(x / zoneWidth)));
  return `slot-${index}`;
}