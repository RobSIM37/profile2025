import { SLOT_POSITIONS, SLOT_SIZE, SOURCE_BOXES, SLOT_HITBOX_SCALE } from '../state/slots.js';
import { updateMasterFloristSolution, setMasterFloristDrag, updateMasterFloristDrag } from '../state/store.js';

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
    setMasterFloristDrag(state, null);
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
    if (state.drag) return;

    const point = mapPointer(event);
    const source = findSourceBox(point.x, point.y);
    if (source) {
      setMasterFloristDrag(state, {
        pointerId: event.pointerId,
        origin: 'source',
        sourceColumn: source.column,
        sourceIndex: source.columnIndex,
        code: source.code,
        x: point.x,
        y: point.y,
        offsetX: point.x - source.x,
        offsetY: point.y - source.y,
        width: source.width,
        height: source.height,
      });
      announce('Picked up flower ' + source.code.toUpperCase());
      onStateChange?.();
    }
  }

  function handlePointerMove(event) {
    const point = mapPointer(event);
    const hoverIndex = findSlotIndex(point.x, point.y);
    state.hoverStemId = hoverIndex != null ? 'slot-' + hoverIndex : null;

    if (state.drag && (state.drag.pointerId == null || state.drag.pointerId === event.pointerId)) {
      updateMasterFloristDrag(state, { x: point.x, y: point.y });
      onStateChange?.();
      return;
    }

    onStateChange?.();
  }

  function handlePointerUp(event) {
    canvas.releasePointerCapture?.(event.pointerId);
    const point = mapPointer(event);
    const slotIndex = findSlotIndex(point.x, point.y);
    const drag = state.drag;

    if (drag && (drag.pointerId == null || drag.pointerId === event.pointerId)) {
      if (slotIndex != null) {
        updateMasterFloristSolution(state, slotIndex, drag.code);
        announce('Placed flower in slot ' + (slotIndex + 1));
      } else {
        announce('Placement cancelled');
      }
      setMasterFloristDrag(state, null);
      onStateChange?.();
      return;
    }

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
    const baseWidth = slot.width ?? SLOT_SIZE.width;
    const baseHeight = slot.height ?? SLOT_SIZE.height;
    const width = baseWidth * (SLOT_HITBOX_SCALE ?? 1);
    const height = baseHeight;
    const left = (slot.x ?? 0) + (baseWidth - width) / 2;
    const top = slot.y ?? 0;
    const right = left + width;
    const bottom = top + height;
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return i;
    }
  }
  return null;
}

function findSourceBox(x, y) {
  if (x == null || y == null) return null;
  for (let i = 0; i < SOURCE_BOXES.length; i += 1) {
    const box = SOURCE_BOXES[i];
    const width = box.width ?? 0;
    const height = box.height ?? 0;
    const left = box.x ?? 0;
    const top = box.y ?? 0;
    const right = left + width;
    const bottom = top + height;
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return box;
    }
  }
  return null;
}
