import { SLOT_POSITIONS, SLOT_SIZE, SOURCE_BOXES, SLOT_HITBOX_SCALE, SLOT_CLICK_BOUNDS } from '../state/slots.js';
import { hasActiveMasterFloristCustomer, updateMasterFloristSolution, setMasterFloristDrag, updateMasterFloristDrag } from '../state/store.js';

export function createMasterFloristCanvasController({ canvas, state, onStateChange, toCanvasPoint, onShowCustomer } = {}) {
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

    if (!hasActiveMasterFloristCustomer(state)) {
      setMasterFloristDrag(state, null);
      onStateChange?.();
      return;
    }

    const point = mapPointer(event);
    const showButton = state?.showButton;
    if (isPointInShowButton(showButton, point)) {
      return;
    }
    const source = findSourceBox(point.x, point.y);
    if (source) {
      const width = typeof source.width === 'number' && source.width > 0 ? source.width : SLOT_SIZE.width;
      const height = typeof source.height === 'number' && source.height > 0 ? source.height : SLOT_SIZE.height;
      setMasterFloristDrag(state, {
        pointerId: event.pointerId,
        origin: 'source',
        sourceColumn: source.column,
        sourceIndex: source.columnIndex,
        code: source.code,
        x: point.x,
        y: point.y,
        offsetX: width / 2,
        offsetY: height / 2,
        width,
        height,
      });
      announce('Picked up flower ' + source.code.toUpperCase());
      onStateChange?.();
    }
  }

  function handlePointerMove(event) {
    if (!hasActiveMasterFloristCustomer(state)) {
      let changed = false;
      if (state.hoverStemId != null) {
        state.hoverStemId = null;
        changed = true;
      }
      if (state.drag) {
        setMasterFloristDrag(state, null);
        changed = true;
      }
      if (changed) {
        onStateChange?.();
      }
      return;
    }

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

    if (!hasActiveMasterFloristCustomer(state)) {
      if (state.drag) {
        setMasterFloristDrag(state, null);
        onStateChange?.();
      }
      return;
    }

    const point = mapPointer(event);
    const showButton = state?.showButton;
    if (isPointInShowButton(showButton, point)) {
      if (showButton?.enabled) {
        onShowCustomer?.();
      }
      return;
    }

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
    if (!hasActiveMasterFloristCustomer(state)) {
      if (state.hoverStemId != null) {
        state.hoverStemId = null;
        onStateChange?.();
      }
      return;
    }
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
  const slotsPerRow = SLOT_POSITIONS.length / 2;
  for (let i = 0; i < SLOT_POSITIONS.length; i += 1) {
    const slot = SLOT_POSITIONS[i];
    const bounds = SLOT_CLICK_BOUNDS?.[i];
    if (!slot) continue;
    const baseWidth = slot.width ?? SLOT_SIZE.width;
    const baseHeight = slot.height ?? SLOT_SIZE.height;
    const width = bounds?.width ?? baseWidth * (SLOT_HITBOX_SCALE ?? 1);
    const height = bounds?.height ?? baseHeight;
    const offsetX = bounds?.offsetX ?? (baseWidth - width) / 2;
    const offsetY = bounds?.offsetY ?? 0;
    const left = (slot.x ?? 0) + offsetX;
    const top = (slot.y ?? 0) + offsetY;
    const right = left + width;
    const bottom = top + height;
    const columnIndex = slotsPerRow ? i % slotsPerRow : i;
    const rowIndex = slotsPerRow ? Math.floor(i / slotsPerRow) : 0;
    const lastColumn = slotsPerRow ? columnIndex === slotsPerRow - 1 : true;
    const totalRows = slotsPerRow ? Math.ceil(SLOT_POSITIONS.length / slotsPerRow) : 1;
    const lastRow = rowIndex === totalRows - 1;
    const withinX = x >= left && (lastColumn ? x <= right : x < right);
    const withinY = y >= top && (lastRow ? y <= bottom : y < bottom);
    if (withinX && withinY) {
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

function isPointInShowButton(button, point) {
  if (!button || !point) return false;
  const { x, y, width, height } = button;
  if (width == null || height == null) return false;
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}
