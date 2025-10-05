import {
  SLOT_POSITIONS,
  SLOT_SIZE,
  SOURCE_BOXES,
  SLOT_HITBOX_SCALE,
  SLOT_CLICK_BOUNDS,
  isSlotDisabledForLength,
} from '../state/slots.js';
import {
  hasActiveMasterFloristCustomer,
  updateMasterFloristSolution,
  setMasterFloristDrag,
  updateMasterFloristDrag,
  isMasterFloristHandoffActive,
  adjustSpeechBubbleIndex,
  loadSpeechBubbleEntrySolution,
  setSpeechBubbleHover,
} from '../state/store.js';

const FLOWER_KEY_BINDINGS = Object.freeze({
  a: 'r',
  s: 'o',
  d: 'y',
  j: 'b',
  k: 'p',
  l: 'w',
});
const CLEAR_KEY_LAST = 'h';
const CLEAR_KEY_ALL = ' ';

const FLOWER_NAME_BY_CODE = Object.freeze({
  r: 'rose',
  o: 'marigold',
  y: 'daisy',
  b: 'violet',
  p: 'iris',
  w: 'lily',
});

export function createMasterFloristCanvasController({
  canvas,
  state,
  onStateChange,
  toCanvasPoint,
  onShowCustomer,
  onToggleLoop,
} = {}) {
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
    bind(canvas, 'wheel', handleWheel, { passive: false });
    const keyTarget = canvas?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (keyTarget) {
      bind(keyTarget, 'keydown', handleKeyDown, { passive: false });
    }
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

  function isInteractionLocked() {
    const status = state?.handoffAnimation?.status;
    return isMasterFloristHandoffActive(state) || status === 'completed';
  }

  function isLoopPaused() {
    return state?.loopRunning === false;
  }

  function handlePointerDown(event) {
    const point = mapPointer(event);
    const bubbleResult = handleSpeechBubblePointerDown(point);
    if (bubbleResult.handled) {
      if (bubbleResult.changed) {
        onStateChange?.();
      }
      event.preventDefault();
      return;
    }

    const arrangementOffsetY = state?.arrangementOffsetY ?? 0;
    const arrangementPoint = { x: point.x, y: point.y - arrangementOffsetY };
    const loopButton = state?.loopButton;
    const targetsLoopButton = isPointInLoopButton(loopButton, arrangementPoint);

    if (!targetsLoopButton && isInteractionLocked()) {
      return;
    }

    if (!targetsLoopButton && isLoopPaused()) {
      return;
    }

    canvas.focus();
    canvas.setPointerCapture?.(event.pointerId);

    if (targetsLoopButton) {
      return;
    }

    if (state.drag) return;

    if (!hasActiveMasterFloristCustomer(state)) {
      setMasterFloristDrag(state, null);
      onStateChange?.();
      return;
    }

    const showButton = state?.showButton;
    if (isPointInShowButton(showButton, arrangementPoint)) {
      return;
    }

    const solution = state?.puzzle?.solution;
    const slotCount = resolveActiveSlotLimit();
    const slotIndex = findSlotIndex(arrangementPoint.x, arrangementPoint.y, slotCount);
    if (Array.isArray(solution) && slotIndex != null) {
      const slot = SLOT_POSITIONS[slotIndex] || {};
      const slotValue = solution[slotIndex];
      if (slotValue) {
        const baseWidth = slot?.width ?? SLOT_SIZE.width;
        const baseHeight = slot?.height ?? SLOT_SIZE.height;
        updateMasterFloristSolution(state, slotIndex, null);
        setMasterFloristDrag(state, {
          pointerId: event.pointerId,
          origin: 'slot',
          slotIndex,
          code: slotValue,
          x: point.x,
          y: point.y,
          offsetX: baseWidth / 2,
          offsetY: baseHeight / 2,
          width: baseWidth,
          height: baseHeight,
        });
        announce('Picked up flower from slot ' + (slotIndex + 1));
        onStateChange?.();
        return;
      }
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
    const point = mapPointer(event);
    const hoverChanged = updateSpeechBubbleHover(point);

    if (isInteractionLocked()) {
      if (hoverChanged) {
        onStateChange?.();
      }
      return;
    }

    if (isLoopPaused()) {
      let changed = hoverChanged;
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

    if (!hasActiveMasterFloristCustomer(state)) {
      let changed = hoverChanged;
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

    const arrangementOffsetY = state?.arrangementOffsetY ?? 0;
    const arrangementPoint = { x: point.x, y: point.y - arrangementOffsetY };
    const slotCount = resolveActiveSlotLimit();
    const hoverIndex = findSlotIndex(arrangementPoint.x, arrangementPoint.y, slotCount);
    const nextHoverId = hoverIndex != null ? 'slot-' + hoverIndex : null;
    let changed = hoverChanged;

    if (state.hoverStemId !== nextHoverId) {
      state.hoverStemId = nextHoverId;
      changed = true;
    }

    if (state.drag && (state.drag.pointerId == null || state.drag.pointerId === event.pointerId)) {
      updateMasterFloristDrag(state, { x: point.x, y: point.y });
      changed = true;
      onStateChange?.();
      return;
    }

    if (changed) {
      onStateChange?.();
    }
  }
  function handlePointerUp(event) {
    canvas.releasePointerCapture?.(event.pointerId);
    const point = mapPointer(event);
    const arrangementOffsetY = state?.arrangementOffsetY ?? 0;
    const arrangementPoint = { x: point.x, y: point.y - arrangementOffsetY };
    const loopButton = state?.loopButton;
    const targetsLoopButton = isPointInLoopButton(loopButton, arrangementPoint);

    if (!targetsLoopButton && isInteractionLocked()) {
      return;
    }

    if (targetsLoopButton) {
      onToggleLoop?.();
      return;
    }

    if (isLoopPaused()) {
      return;
    }

    if (!hasActiveMasterFloristCustomer(state)) {
      if (state.drag) {
        setMasterFloristDrag(state, null);
        onStateChange?.();
      }
      return;
    }

    const showButton = state?.showButton;
    if (isPointInShowButton(showButton, arrangementPoint)) {
      if (showButton?.enabled) {
        onShowCustomer?.();
      }
      return;
    }

    const slotCount = resolveActiveSlotLimit();
    const slotIndex = findSlotIndex(arrangementPoint.x, arrangementPoint.y, slotCount);
    const drag = state.drag;

    if (drag && (drag.pointerId == null || drag.pointerId === event.pointerId)) {
      if (drag.origin === 'slot') {
        const originIndex = drag.slotIndex;
        const solution = state?.puzzle?.solution || [];
        if (slotIndex == null) {
          updateMasterFloristSolution(state, originIndex, drag.code);
          announce('Placement cancelled');
        } else if (slotIndex === originIndex) {
          announce('Removed flower from slot ' + (slotIndex + 1));
        } else {
          const targetCode = solution[slotIndex] || null;
          updateMasterFloristSolution(state, slotIndex, null);
          updateMasterFloristSolution(state, slotIndex, drag.code);
          if (targetCode) {
            updateMasterFloristSolution(state, originIndex, targetCode);
            announce('Swapped flowers between slots ' + (originIndex + 1) + ' and ' + (slotIndex + 1));
          } else {
            announce('Moved flower to slot ' + (slotIndex + 1));
          }
        }
        setMasterFloristDrag(state, null);
        onStateChange?.();
        return;
      }

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
      state.pendingDrops.push({ x: arrangementPoint.x, y: arrangementPoint.y, at: Date.now() });
    }

    onStateChange?.();
  }

  function handlePointerLeave() {
    const hoverChanged = setSpeechBubbleHover(state, false);
    if (!hasActiveMasterFloristCustomer(state) || isLoopPaused()) {
      let changed = hoverChanged;
      if (state.hoverStemId != null) {
        state.hoverStemId = null;
        changed = true;
      }
      if (changed) {
        onStateChange?.();
      }
      return;
    }

    let changed = hoverChanged;
    if (state.hoverStemId != null) {
      state.hoverStemId = null;
      changed = true;
    }
    if (changed) {
      onStateChange?.();
    }
  }
  function handleKeyDown(event) {
    const key = typeof event.key === 'string' ? event.key : '';
    const normalized = key.length === 1 ? key.toLowerCase() : key.toLowerCase();
    const isSpaceKey = key === CLEAR_KEY_ALL || event.code === 'Space' || normalized === 'space' || normalized === 'spacebar';

    if (isLoopPaused()) {
      return;
    }

    if (isSpaceKey) {
      event.preventDefault();
    }

    const target = event.target;
    if (target && typeof target.closest === 'function') {
      const editable = target.closest('input, textarea, [contenteditable="true"], [role="textbox"]');
      if (editable) {
        return;
      }
    }
    if (event.defaultPrevented && !isSpaceKey && normalized !== 'enter') {
      return;
    }

    if (!hasActiveMasterFloristCustomer(state) || isInteractionLocked()) {
      return;
    }
    if (state.drag) {
      return;
    }
    if (!state?.puzzle?.solution || !Array.isArray(state.puzzle.solution)) {
      return;
    }

    const slotLimit = resolveActiveSlotLimit();
    if (slotLimit <= 0) {
      return;
    }

    const solution = state.puzzle.solution;
    let handled = false;

    const isLeftShiftKey =
      event.code === 'ShiftLeft' || (normalized === 'shift' && Number(event.location) === 1);

    if (normalized === CLEAR_KEY_LAST) {
      handled = clearLastSlot(solution, slotLimit);
      if (handled) {
        announce('Removed last flower from arrangement.');
      }
    } else if (isSpaceKey) {
      handled = clearAllSlots(solution, slotLimit);
      if (handled) {
        announce('Cleared arrangement.');
      }
    } else if (
      normalized === 'enter' ||
      (isLeftShiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !event.repeat)
    ) {
      event.preventDefault();
      const showButton = state?.showButton;
      if (showButton?.enabled) {
        onShowCustomer?.();
        handled = true;
      }
    } else {
      const flowerCode = FLOWER_KEY_BINDINGS[normalized];
      if (flowerCode) {
        handled = addFlowerByCode(solution, slotLimit, flowerCode);
        if (handled) {
          const flowerName = FLOWER_NAME_BY_CODE[flowerCode] || 'flower';
          announce(`Added ${flowerName} to arrangement.`);
        }
      }
    }

    if (handled) {
      onStateChange?.();
    }
  }

  function resolveActiveSlotLimit() {
    if (!state?.puzzle) return 0;
    const solution = state.puzzle.solution;
    if (!Array.isArray(solution)) return 0;
    const rawLimit = Number.isFinite(state.puzzle.slotCount) ? Math.max(0, Math.floor(state.puzzle.slotCount)) : solution.length;
    return Math.max(0, Math.min(solution.length, rawLimit));
  }

  function clearLastSlot(solution, limit) {
    if (!Array.isArray(solution)) {
      return false;
    }
    const slotCount = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : resolveActiveSlotLimit();
    if (slotCount <= 0) {
      return false;
    }
    for (let i = solution.length - 1; i >= 0; i -= 1) {
      if (isSlotDisabledForLength(slotCount, i)) {
        continue;
      }
      if (solution[i] != null) {
        updateMasterFloristSolution(state, i, null);
        return true;
      }
    }
    return false;
  }

  function clearAllSlots(solution /* , limit */) {
    if (!Array.isArray(solution)) {
      return false;
    }
    let cleared = false;
    for (let i = 0; i < solution.length; i += 1) {
      if (solution[i] != null) {
        updateMasterFloristSolution(state, i, null);
        cleared = true;
      }
    }
    return cleared;
  }

  function addFlowerByCode(solution, limit, code) {
    if (!Array.isArray(solution)) {
      return false;
    }
    const slotCount = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : resolveActiveSlotLimit();
    if (slotCount <= 0) {
      return false;
    }
    for (let i = 0; i < solution.length; i += 1) {
      if (isSlotDisabledForLength(slotCount, i)) {
        continue;
      }
      if (solution[i] == null) {
        updateMasterFloristSolution(state, i, code);
        return true;
      }
    }
    return false;
  }

  function announce(message) {
    canvas.setAttribute('data-announce', String(message));
  }

  function handleWheel(event) {
    if (!event) return;
    const bubble = state?.speechBubble;
    if (!bubble?.bodyBounds) return;
    const point = mapPointer(event);
    if (!isPointInButton(bubble.bodyBounds, point)) return;
    const deltaY = event.deltaY;
    if (!Number.isFinite(deltaY) || deltaY === 0) return;
    const changed = adjustSpeechBubbleIndex(state, deltaY > 0 ? 1 : -1, { userAdjusted: true });
    if (changed) {
      onStateChange?.();
    }
    event.preventDefault();
  }

  function handleSpeechBubblePointerDown(point) {
    const bubble = state?.speechBubble;
    if (!bubble?.bodyBounds) {
      const hoverChanged = setSpeechBubbleHover(state, false);
      return { handled: false, changed: hoverChanged };
    }
    const inBody = isPointInButton(bubble.bodyBounds, point);
    if (!inBody) {
      const hoverChanged = setSpeechBubbleHover(state, false);
      return { handled: false, changed: hoverChanged };
    }
    const gridBounds = bubble.gridBounds;
    const inGrid = gridBounds && isPointInButton(gridBounds, point);
    const hoverChanged = setSpeechBubbleHover(state, inGrid);
    if (inGrid) {
      const loaded = loadSpeechBubbleEntrySolution(state, bubble.activeIndex, { userAdjusted: true });
      return { handled: true, changed: hoverChanged || loaded };
    }
    return { handled: true, changed: hoverChanged };
  }

  function updateSpeechBubbleHover(point) {
    const bubble = state?.speechBubble;
    if (!bubble?.bodyBounds) {
      return setSpeechBubbleHover(state, false);
    }
    const inBody = isPointInButton(bubble.bodyBounds, point);
    if (!inBody) {
      return setSpeechBubbleHover(state, false);
    }
    const gridBounds = bubble.gridBounds;
    const inGrid = gridBounds && isPointInButton(gridBounds, point);
    return setSpeechBubbleHover(state, inGrid);
  }

  return { mount, unmount, reset };
}

function findSlotIndex(x, y, slotCount) {
  if (x == null || y == null) return null;
  const limit = Number.isFinite(slotCount) ? Math.max(0, Math.floor(slotCount)) : 0;
  if (limit <= 0) return null;
  const slotsPerRow = SLOT_POSITIONS.length / 2;
  for (let i = 0; i < SLOT_POSITIONS.length; i += 1) {
    if (isSlotDisabledForLength(limit, i)) continue;
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

function isPointInButton(button, point) {
  if (!button || !point) return false;
  const { x, y, width, height } = button;
  if (width == null || height == null) return false;
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

function isPointInShowButton(button, point) {
  return isPointInButton(button, point);
}

function isPointInLoopButton(button, point) {
  return isPointInButton(button, point);
}






























