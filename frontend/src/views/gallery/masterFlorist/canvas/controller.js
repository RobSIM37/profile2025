import { SLOT_POSITIONS, SLOT_SIZE } from '../state/slots.js';
import { updateMasterFloristSolution } from '../state/store.js';

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
    const hoverIndex = findSlotIndex(point.x, point.y);
    state.hoverStemId = hoverIndex != null ? 'slot-' + hoverIndex : null;
    onStateChange?.();
  }

  function handlePointerUp(event) {
    canvas.releasePointerCapture?.(event.pointerId);
    const point = mapPointer(event);
    const slotIndex = findSlotIndex(point.x, point.y);
    let handled = false;

    if (slotIndex != null && Array.isArray(state?.puzzle?.solution)) {
      const current = state.puzzle.solution[slotIndex];
      if (current != null) {
        updateMasterFloristSolution(state, slotIndex, null);
        handled = true;
        announce('Removed flower from slot ' + (slotIndex + 1));
      }
    }

    if (!handled) {
      state.pendingDrops.push({ x: point.x, y: point.y, at: Date.now() });
    }

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

function findSlotIndex(x, y) {
  if (x == null || y == null) return null;
  for (let i = 0; i < SLOT_POSITIONS.length; i += 1) {
    const slot = SLOT_POSITIONS[i];
    if (!slot) continue;
    const width = slot.width ?? SLOT_SIZE.width;
    const height = slot.height ?? SLOT_SIZE.height;
    const left = slot.x ?? 0;
    const top = slot.y ?? 0;
    const right = left + width;
    const bottom = top + height;
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return i;
    }
  }
  return null;
}
