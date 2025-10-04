import {
  SLOT_POSITIONS,
  SLOT_DRAW_ORDER,
  SLOT_SIZE,
  DEFAULT_SLOT_CODES,
  SOURCE_BOXES,
  SOURCE_COLUMNS_META,
  SLOT_CLICK_BOUNDS,
  SOURCE_CONTAINER,
  getDisabledSlotsForLength,
} from '../state/slots.js';
import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from '../canvas/constants.js';
import { MASTER_FLORIST_LAYOUT } from '../state/layout.js';
import { hasActiveMasterFloristCustomer, canSubmitMasterFloristGuess, advanceMasterFloristHandoff } from '../state/store.js';

const STEM_STYLES = {
  stroke: '#2d5230',
  width: 6,
};
const FLOWER_DEFS = [
  { code: 'y', color: '#f9e678', src: '../assets/flowers/daisy.png' },
  { code: 'p', color: '#b39deb', src: '../assets/flowers/iris.png' },
  { code: 'w', color: '#f4f2eb', src: '../assets/flowers/lily.png' },
  { code: 'o', color: '#f4b270', src: '../assets/flowers/marigold.png' },
  { code: 'r', color: '#f2857a', src: '../assets/flowers/rose.png' },
  { code: 'b', color: '#9aa7f7', src: '../assets/flowers/violet.png' },
];

const FLOWER_META_BY_CODE = FLOWER_DEFS.reduce((acc, def) => {
  const entry = { ...def };
  const lower = def.code.toLowerCase();
  acc[lower] = entry;
  acc[def.code.toUpperCase()] = entry;
  return acc;
}, Object.create(null));

const COLORS = {
  background: '#f6f1ed',
  benchTop: '#d9c7b8',
  benchShadow: 'rgba(0, 0, 0, 0.08)',
  slotFill: 'rgba(255, 255, 255, 0.16)',
  slotStroke: 'rgba(255, 255, 255, 0.55)',
  slotEmptyDash: 'rgba(255, 255, 255, 0.35)',
  slotText: '#3a2a21',
  columnFill: 'rgba(39, 32, 27, 0.12)',
  columnStroke: 'rgba(39, 32, 27, 0.25)',
  columnText: '#443128',
};

const CALENDAR_META = {
  daysSince: { file: '../assets/calendar/days-since-calendar.png', width: 500, height: 346 },
  mostDays: { file: '../assets/calendar/most-days-calendar.png', width: 500, height: 346 },
};

const CALENDAR_NUMBER_META = [
  { value: 0, file: '../assets/calendar/numbers/calendar_number_0.png', width: 90, height: 129 },
  { value: 1, file: '../assets/calendar/numbers/calendar_number_1.png', width: 91, height: 129 },
  { value: 2, file: '../assets/calendar/numbers/calendar_number_2.png', width: 90, height: 129 },
  { value: 3, file: '../assets/calendar/numbers/calendar_number_3.png', width: 90, height: 129 },
  { value: 4, file: '../assets/calendar/numbers/calendar_number_4.png', width: 90, height: 129 },
  { value: 5, file: '../assets/calendar/numbers/calendar_number_5.png', width: 90, height: 129 },
  { value: 6, file: '../assets/calendar/numbers/calendar_number_6.png', width: 91, height: 128 },
  { value: 7, file: '../assets/calendar/numbers/calendar_number_7.png', width: 91, height: 128 },
  { value: 8, file: '../assets/calendar/numbers/calendar_number_8.png', width: 90, height: 128 },
];

const CALENDAR_CARD_ANCHORS = Object.freeze({
  days: [0.30, 0.70],
  most: [0.30, 0.70],
});

const CALENDAR_LAYOUT = Object.freeze({
  width: 165,
  gap: 24,
  offsetX: 30,
  offsetY: -110,
});

const CALENDAR_TRANSITION_MS = 450;
const CALENDAR_DROP_PX = 40;

const SHOW_CUSTOMERS = true;
const SHOW_BUTTON_SIZE = { width: 180, height: 52 };
let showButtonPosition = { x: 0, y: 0 };
const HANDOFF_TARGET = Object.freeze({
  centerX: ((MASTER_FLORIST_LAYOUT?.vase?.area?.left ?? 214) * 0.75) - 40,
  offsetY: 95,
  height: 120,
});
const HANDOFF_CARRY_OFFSET = Object.freeze({ x: -80, y: 20 });
const ARRANGEMENT_LIFT_DURATION_MS = 650;
const ARRANGEMENT_LIFT_DISTANCE = MF_CANVAS_HEIGHT;

const vaseSprites = createVaseSprites();
const flowerSprites = createFlowerSprites();
const backgroundSprite = createBackgroundSprite();
const calendarSprites = createCalendarSprites();
const calendarNumberSprites = createCalendarNumberSprites();

export function createMasterFloristRenderer({ canvas, state } = {}) {
  if (!canvas) throw new Error('createMasterFloristRenderer requires a canvas element.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to obtain 2d context for Master Florist.');

  const gameState = state || null;
  const initialHasActiveCustomer = hasActiveMasterFloristCustomer(gameState);
  const arrangementLift = createArrangementLiftState(initialHasActiveCustomer);
  let lastHasActiveCustomer = initialHasActiveCustomer;
  let lastPuzzleId = gameState?.puzzle?.id || null;

  if (gameState) {
    gameState.arrangementOffsetY = arrangementLift.offset;
  }
  const initialDaysValue = Math.max(0, Math.floor(Number(gameState?.calendar?.daysSince) || 0));
  const initialMostValue = Math.max(0, Math.floor(Number(gameState?.calendar?.longestDays) || 0));
  const initialDaysDigits = toDigitPair(initialDaysValue);
  const initialMostDigits = toDigitPair(initialMostValue);
  const calendarDisplayState = createCalendarDisplayState({
    days: initialDaysDigits,
    most: initialMostDigits,
  });
  queueCalendarDigitUpdate(calendarDisplayState.days, initialDaysDigits);
  queueCalendarDigitUpdate(calendarDisplayState.most, initialMostDigits);

  if (gameState) {
    gameState.calendarDisplay = {
      state: calendarDisplayState,
      setDigits(kind, nextDigits = []) {
        const entry = kind === 'most' ? calendarDisplayState.most : calendarDisplayState.days;
        if (!entry) return;
        const digitsArray = normalizeDigitInput(nextDigits);
        queueCalendarDigitUpdate(entry, digitsArray);
      },
      daysRaw: initialDaysValue,
      longestRaw: initialMostValue,
      daysDisplay: initialDaysValue % 100,
      mostDisplay: initialMostValue % 100,
    };
  }

  function render() {
    clear();

    const parade = gameState?.customerParade || null;
    const actors = Array.isArray(parade?.actors) ? parade.actors : [];
    const hasActiveCustomer = hasActiveMasterFloristCustomer(gameState);
    const slots = hasActiveCustomer ? prepareSlotStates() : [];
    const vaseMetrics = getVaseMetrics();
    const hoverId = hasActiveCustomer ? gameState?.hoverStemId || null : null;
    const drag = hasActiveCustomer ? gameState?.drag || null : null;

    const deltaMs = typeof gameState?.clock?.deltaMs === "number" ? gameState.clock.deltaMs : 16;
    const currentPuzzleId = gameState?.puzzle?.id || null;
    if (hasActiveCustomer) {
      if (!lastHasActiveCustomer) {
        startArrangementLift(arrangementLift);
      } else if (currentPuzzleId && currentPuzzleId !== lastPuzzleId) {
        startArrangementLift(arrangementLift);
      }
    }

    const arrangementOffsetRaw = advanceArrangementLift(arrangementLift, hasActiveCustomer, deltaMs);
    const arrangementOffsetY = hasActiveCustomer ? arrangementOffsetRaw : 0;
    if (gameState) {
      gameState.arrangementOffsetY = arrangementOffsetY;
    }
    const handoffStatus = gameState?.handoffAnimation?.status || 'idle';
    const handoffProgress = advanceMasterFloristHandoff(gameState, deltaMs);
    const isHandoffRunning = handoffStatus === 'running';
    const easedHandoffProgress = isHandoffRunning ? easeInOutCubic(handoffProgress) : 0;
    const showArrangementOnBench = handoffStatus === 'idle' || handoffStatus === 'running';
    const allowHandoffTransforms = isHandoffRunning;
    advanceCalendarAnimations(calendarDisplayState, deltaMs);

    paintBackground();
    paintCalendars();
    if (SHOW_CUSTOMERS) {
      paintCustomers(actors, { handoffStatus, vaseMetrics });
    }
    paintWorkbench();
    paintFlowerColumns(drag);

    if (!hasActiveCustomer) {
      if (gameState) {
        gameState.showButton = null;
      }
      lastHasActiveCustomer = hasActiveCustomer;
      lastPuzzleId = currentPuzzleId;
      return;
    }

    const allowInteractions = handoffStatus === 'idle';

    ctx.save();
    ctx.translate(0, arrangementOffsetY);

    if (!showArrangementOnBench) {
      ctx.restore();
      lastHasActiveCustomer = hasActiveCustomer;
      lastPuzzleId = currentPuzzleId;
      return;
    }

    if (allowHandoffTransforms) {
      applyHandoffTransform(vaseMetrics, easedHandoffProgress);
    }

    paintVaseLip(vaseMetrics);
    paintStemsLayer(slots, vaseMetrics);
    paintVaseBody(vaseMetrics);
    if (allowInteractions) {
      paintDropTargets(slots, hoverId, drag);
    }
    paintFlowersLayer(slots);
    if (allowInteractions) {
      paintDragPreview(drag, arrangementOffsetY);
    }
    paintEmptySlotPlaceholders(slots);
    if (allowInteractions) {
      paintShowCustomerButton();
    } else if (gameState) {
      gameState.showButton = null;
    }

    ctx.restore();

    lastHasActiveCustomer = hasActiveCustomer;
    lastPuzzleId = currentPuzzleId;
  }

  function dispose() {
    clear();
  }

  function clear() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function getBenchMetrics() {
    const benchConfig = MASTER_FLORIST_LAYOUT.bench || {};
    const benchHeight = benchConfig.height ?? 140;
    const benchY = MF_CANVAS_HEIGHT - benchHeight;
    return {
      benchHeight,
      benchY,
      trimHeight: benchConfig.trimHeight ?? 4,
      shadowHeight: benchConfig.shadowHeight ?? 6,
    };
  }

  function paintBackground() {
    const { benchY } = getBenchMetrics();

    ctx.save();
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT);

    if (backgroundSprite.ready) {
      ctx.drawImage(backgroundSprite.image, 0, 0, MF_CANVAS_WIDTH, benchY);
    } else {
      ctx.fillRect(0, 0, MF_CANVAS_WIDTH, benchY);
    }

    ctx.restore();
  }

  function paintCalendars() {
    const daysSprite = calendarSprites.daysSince;
    const mostSprite = calendarSprites.mostDays;
    if (!daysSprite.ready || !mostSprite.ready) return;

    const { benchY } = getBenchMetrics();
    const { width, gap, offsetX, offsetY } = CALENDAR_LAYOUT;
    const scale = width / daysSprite.width;
    const displayHeight = daysSprite.height * scale;
    const centerY = (benchY / 2) + offsetY;
    const totalWidth = width * 2 + gap;
    const centerX = (MF_CANVAS_WIDTH * 0.75) - 550;
    const startX = centerX - totalWidth / 2 + offsetX;
    const top = centerY - displayHeight / 2;

    const daysX = startX + width + gap + 30;
    const daysY = top;
    const mostX = daysX;
    const mostY = top + 120;

    ctx.save();
    ctx.drawImage(daysSprite.image, daysX, daysY, width, displayHeight);
    ctx.drawImage(mostSprite.image, mostX, mostY, width, displayHeight);
    ctx.restore();

    paintCalendarDigits({
      originX: daysX,
      originY: daysY,
      width,
      height: displayHeight,
      stateEntry: calendarDisplayState.days,
      anchors: CALENDAR_CARD_ANCHORS.days,
    });

    paintCalendarDigits({
      originX: mostX,
      originY: mostY,
      width,
      height: displayHeight,
      stateEntry: calendarDisplayState.most,
      anchors: CALENDAR_CARD_ANCHORS.most,
    });
  }

  function paintCustomers(actors = [], options = {}) {
    const handoffStatusForActors = options?.handoffStatus || 'idle';
    const carriedVaseMetrics = options?.vaseMetrics || null;
    if (!Array.isArray(actors) || actors.length === 0) {
      return;
    }

    const { benchY } = getBenchMetrics();
    const defaultOverlap = 7;
    const activeId = gameState?.customerParade?.activeId || null;
    const activeActor = actors.find((actor) => actor && actor.id === activeId) || null;
    const others = actors
      .filter((actor) => !actor || actor.id !== activeId)
      .slice()
      .sort((a, b) => {
        const depthA = Number(a?.depth) || 0;
        const depthB = Number(b?.depth) || 0;
        if (depthA !== depthB) {
          return depthB - depthA;
        }
        const idA = a?.id || '';
        const idB = b?.id || '';
        if (idA === idB) return 0;
        return idA < idB ? -1 : 1;
      });

    const drawOrder = activeActor ? [...others, activeActor] : others;

    drawOrder.forEach((actor) => {
      const frame = selectActorFrame(actor);
      if (!frame) return;
      const img = frame.image;
      if (!img || !img.complete || img.naturalWidth === 0) {
        return;
      }
      const width = frame.width || img.naturalWidth;
      const height = frame.height || img.naturalHeight;
      const bobOffset = actor?.bobOffset || 0;
      const actorOverlap = Number.isFinite(actor?.overlap) ? Number(actor.overlap) : defaultOverlap;
      const top = benchY - height + actorOverlap + bobOffset;
      const left = (actor?.x ?? 0) - width / 2;

      ctx.save();
      ctx.drawImage(img, left, top, width, height);
      ctx.restore();

      const actorMetrics = { top, left, width, height, overlap: actorOverlap };
      if (shouldPaintCarriedArrangement(actor, handoffStatusForActors)) {
        paintCarriedArrangementForActor(actor, actorMetrics, carriedVaseMetrics);
      }

      if (actor?.mood === 'complaint') {
        drawComplaintIndicator(left + width / 2, top - 10);
      }
    });
  }

  function selectActorFrame(actor) {
    if (!actor?.frames) return null;
    const pose = actor.pose || 'idle';
    return (
      actor.frames[pose] ||
      actor.frames.idle ||
      actor.frames.walking ||
      actor.frames.talking ||
      null
    );
  }
  function paintWorkbench() {
    const { benchHeight, benchY, trimHeight, shadowHeight } = getBenchMetrics();

    ctx.save();
    ctx.fillStyle = COLORS.benchTop;
    ctx.fillRect(0, benchY, MF_CANVAS_WIDTH, benchHeight);
    ctx.fillRect(0, MF_CANVAS_HEIGHT - trimHeight, MF_CANVAS_WIDTH, trimHeight);

    ctx.fillStyle = COLORS.benchShadow;
    ctx.fillRect(0, benchY - shadowHeight, MF_CANVAS_WIDTH, shadowHeight);
    ctx.restore();
  }

  function paintShowCustomerButton() {
    const enabled = canSubmitMasterFloristGuess(gameState);
    const { benchY } = getBenchMetrics();
    const width = SHOW_BUTTON_SIZE.width;
    const height = SHOW_BUTTON_SIZE.height;
    const defaultX = (MF_CANVAS_WIDTH - width) / 2 - 325;
    const defaultY = benchY - height - 24 + 100;
    const x = gameState?.showButton?.x ?? defaultX;
    const y = gameState?.showButton?.y ?? defaultY;

    ctx.save();
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, width, height, 16, true, true, {
      fillStyle: enabled ? '#40ADD3' : 'rgba(64, 173, 211, 0.45)',
      strokeStyle: enabled ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.15)',
    });

    ctx.fillStyle = enabled ? '#ffffff' : 'rgba(255,255,255,0.65)';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Show Customer', x + width / 2, y + height / 2);
    ctx.restore();

    gameState.showButton = { x, y, width, height, enabled };
  }

  function applyHandoffTransform(metrics, progress) {
    if (!metrics || progress <= 0) return;
    const target = getHandoffTargetMetrics(metrics);
    if (!target) return;
    const baseX = lerp(metrics.baseX, target.baseX, progress);
    const baseY = lerp(metrics.baseY, target.baseY, progress);
    const scale = lerp(1, target.scale, progress);

    ctx.translate(baseX, baseY);
    ctx.scale(scale, scale);
    ctx.translate(-metrics.baseX, -metrics.baseY);
  }

  function getHandoffTargetMetrics(metrics) {
    if (!metrics) return null;
    const targetHeight = HANDOFF_TARGET.height;
    const scale = metrics.scaledHeight > 0 ? targetHeight / metrics.scaledHeight : 1;
    const baseX = HANDOFF_TARGET.centerX;
    const baseY = metrics.baseY - (HANDOFF_TARGET.offsetY ?? 0);
    return { baseX, baseY, scale, height: targetHeight };
  }

  function shouldPaintCarriedArrangement(actor, handoffStatus) {
    if (!actor?.carryArrangement) return false;
    if (handoffStatus === 'running') return false;
    const carryState = actor?.state;
    if (carryState !== 'departing' && !actor?.pendingDeparture) return false;
    const solution = actor.carryArrangement.solution;
    return Array.isArray(solution) && solution.some((code) => code);
  }

  function paintCarriedArrangementForActor(actor, metrics, vaseMetrics) {
    const arrangement = actor?.carryArrangement;
    if (!arrangement || !vaseMetrics) return;
    const solution = Array.isArray(arrangement.solution) ? arrangement.solution : [];
    const slotCount = Number.isFinite(arrangement.slotCount) ? arrangement.slotCount : solution.length;
    if (!slotCount) return;
    const slots = prepareSlotStates(solution, slotCount);
    const offsetX = Number.isFinite(arrangement.offsetX) ? arrangement.offsetX : HANDOFF_CARRY_OFFSET.x;
    const offsetY = Number.isFinite(arrangement.offsetY) ? arrangement.offsetY : HANDOFF_CARRY_OFFSET.y;
    const actorCenterX = actor?.x ?? 0;
    const actorBaseY = metrics.top + metrics.height - metrics.overlap;
    const baseX = actorCenterX + offsetX;
    const baseY = actorBaseY + offsetY;
    const referenceHeight = vaseMetrics.scaledHeight || HANDOFF_TARGET.height;
    const scale = Number.isFinite(arrangement.scale)
      ? arrangement.scale
      : HANDOFF_TARGET.height / Math.max(referenceHeight, Number.EPSILON);

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(scale, scale);
    ctx.translate(-vaseMetrics.baseX, -vaseMetrics.baseY);

    paintVaseLip(vaseMetrics);
    paintStemsLayer(slots, vaseMetrics);
    paintVaseBody(vaseMetrics);
    paintFlowersLayer(slots);

    ctx.restore();
  }

  function drawComplaintIndicator(centerX, baseY) {
    const width = 66;
    const height = 102;
    const radius = 24;
    const x = centerX - width / 2;
    const y = baseY - height;

    ctx.save();
    roundRect(ctx, x, y, width, height, radius, true, true, {
      fillStyle: '#d93a54',
      strokeStyle: 'rgba(0,0,0,0.3)',
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', centerX, y + height / 2);
    ctx.restore();
  }

  function getActiveSlotLimit() {
    const raw = Number.isFinite(gameState?.puzzle?.slotCount) ? Math.floor(gameState.puzzle.slotCount) : SLOT_POSITIONS.length;
    if (raw <= 0) return 0;
    return Math.min(SLOT_POSITIONS.length, Math.max(0, raw));
  }

  function prepareSlotStates(solutionOverride = null, slotLimitOverride = null) {
    const solution = Array.isArray(solutionOverride) ? solutionOverride : gameState?.puzzle?.solution || [];
    const rawLimit = Number.isFinite(slotLimitOverride) ? slotLimitOverride : getActiveSlotLimit();
    const slotLimit = Math.max(0, Math.floor(rawLimit));
    const disabledSet = new Set(getDisabledSlotsForLength(slotLimit));

    return SLOT_POSITIONS.map((slot, index) => {
      const baseWidth = slot?.width ?? SLOT_SIZE.width;
      const baseHeight = slot?.height ?? SLOT_SIZE.height;
      const entry = index < solution.length ? solution[index] : null;
      const isDisabled = slotLimit <= 0 || disabledSet.has(index);
      const code = isDisabled ? null : normalizeSlotCode(entry, index);
      return {
        index,
        x: slot?.x ?? 0,
        y: slot?.y ?? 0,
        width: baseWidth,
        height: baseHeight,
        code,
        stemOffsetX: slot?.stemOffsetX ?? 0,
        clickBounds: SLOT_CLICK_BOUNDS[index] || null,
        isWithinActiveRange: !isDisabled,
        isDisabled,
      };
    });
  }

  function paintStemsLayer(slots, vaseMetrics) {
    SLOT_DRAW_ORDER.forEach((slotIndex) => {
      const slot = slots[slotIndex];
      if (!slot || !slot.code) return;
      if (slot.index === 3 || slot.index === 5) return;
      drawStem(ctx, slot, vaseMetrics);
    });
  }

  function paintFlowersLayer(slots) {
    SLOT_DRAW_ORDER.forEach((slotIndex) => {
      const slot = slots[slotIndex];
      if (!slot || !slot.code) return;
      drawSlotFlower(slot.code, slot.x, slot.y, slot.width, slot.height);
    });
  }

  function paintDropTargets(slots, hoverId, drag) {
    if (!drag) return;
    const slotLimit = getActiveSlotLimit();
    if (slotLimit <= 0) return;
    const filledSlots = slots.reduce((count, slot) => {
      if (!slot || !slot.isWithinActiveRange) return count;
      return slot.code ? count + 1 : count;
    }, 0);
    if (filledSlots >= slotLimit) return;
    const meta = getFlowerMeta(drag.code);
    const color = meta.color || 'rgba(255, 255, 255, 0.45)';
    const hoverIndex = typeof hoverId === 'string' && hoverId.startsWith('slot-') ? Number(hoverId.slice(5)) : null;

    slots.forEach((slot) => {
      if (!slot) return;
      if (!slot.isWithinActiveRange) return;
      if (slot.code != null && slot.code !== '') return;
      const bounds = slot.clickBounds || SLOT_CLICK_BOUNDS?.[slot.index] || {};
      const width = bounds.width ?? slot.width;
      const height = bounds.height ?? slot.height;
      const left = slot.x + (bounds.offsetX ?? (slot.width - width) / 2);
      const top = slot.y + (bounds.offsetY ?? 0);
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const radius = Math.min(width, height) * 0.45;
      const isActive = slot.index === hoverIndex;

      ctx.save();

      ctx.globalAlpha = isActive ? 0.5 : 0.25;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.globalAlpha = isActive ? 0.8 : 0.5;
      ctx.lineWidth = isActive ? 5 : 4;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(radius - 1.5, 0), 0, Math.PI * 2);
      ctx.globalAlpha = isActive ? 0.9 : 0.6;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.restore();
    });
  }

  function paintDragPreview(drag, arrangementOffsetY = 0) {
    if (!drag || drag.x == null || drag.y == null) return;
    const width = drag.width ?? SLOT_SIZE.width;
    const height = drag.height ?? SLOT_SIZE.height;
    const offsetX = drag.offsetX ?? width / 2;
    const offsetY = drag.offsetY ?? height / 2;
    const drawX = drag.x - offsetX;
    const drawY = drag.y - offsetY - arrangementOffsetY;
    ctx.save();
    ctx.globalAlpha = 0.75;
    drawSlotFlower(drag.code, drawX, drawY, width, height);
    ctx.restore();
  }

  function paintEmptySlotPlaceholders() {
    // Dev hitbox outlines disabled.
  }

  function createArrangementLiftState(initialActive) {
    return {
      running: Boolean(initialActive),
      elapsed: 0,
      progress: 0,
      offset: ARRANGEMENT_LIFT_DISTANCE,
    };
  }

  function startArrangementLift(lift) {
    if (!lift) return;
    lift.running = true;
    lift.elapsed = 0;
    lift.progress = 0;
    lift.offset = ARRANGEMENT_LIFT_DISTANCE;
  }

  function advanceArrangementLift(lift, hasActiveCustomer, deltaMs) {
    if (!lift) return 0;
    if (!hasActiveCustomer) {
      lift.running = false;
      lift.elapsed = 0;
      lift.progress = 0;
      lift.offset = ARRANGEMENT_LIFT_DISTANCE;
      return lift.offset;
    }

    if (lift.running) {
      lift.elapsed += deltaMs;
    } else if (lift.progress < 1) {
      lift.running = true;
      lift.elapsed += deltaMs;
    }

    const progress = Math.min(Math.max(lift.elapsed / ARRANGEMENT_LIFT_DURATION_MS, 0), 1);
    lift.progress = progress;
    const eased = easeOutCubic(progress);
    lift.offset = (1 - eased) * ARRANGEMENT_LIFT_DISTANCE;
    if (progress >= 1) {
      lift.running = false;
      lift.elapsed = ARRANGEMENT_LIFT_DURATION_MS;
      lift.offset = 0;
    }
    return lift.offset;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutCubic(t) {
    const clamped = Math.min(Math.max(t, 0), 1);
    if (clamped < 0.5) {
      return 4 * clamped * clamped * clamped;
    }
    const inv = -2 * clamped + 2;
    return 1 - (inv * inv * inv) / 2;
  }

  function easeOutCubic(t) {
    const clamped = Math.min(Math.max(t, 0), 1);
    return 1 - Math.pow(1 - clamped, 3);
  }

  function createCalendarDisplayState(initial = {}) {
    const makeEntry = (values = []) => ({
      digits: normalizeDigitInput(values),
      transitions: [],
    });
    return {
      days: makeEntry(initial.days),
      most: makeEntry(initial.most),
    };
  }

  function queueCalendarDigitUpdate(entry, nextDigits = []) {
    if (!entry) return;
    const digits = entry.digits || (entry.digits = []);
    const transitions = entry.transitions || (entry.transitions = []);
    const normalized = normalizeDigitInput(nextDigits);

    const onesIndex = Math.max(0, normalized.length - 1);

    for (let i = 0; i < normalized.length; i += 1) {
      const nextValue = normalized[i];
      const currentValue = digits[i];
      const isOnesSlot = i === onesIndex;
      const normalizedOnes = normalized[onesIndex] ?? 0;
      const shouldAnimate = nextValue !== currentValue && (isOnesSlot || normalizedOnes === 0);

      if (!shouldAnimate) {
        digits[i] = nextValue;
        transitions[i] = null;
        continue;
      }

      transitions[i] = currentValue != null ? {
        value: currentValue,
        elapsed: 0,
        anchorIndex: i,
      } : null;
      digits[i] = nextValue;
    }

    digits.length = normalized.length;
    transitions.length = normalized.length;
  }

  function normalizeDigitInput(value) {
    if (Array.isArray(value)) {
      if (value.length >= 2) {
        return [sanitizeDigit(value[0]), sanitizeDigit(value[1])];
      }
      const ones = sanitizeDigit(value[0]);
      return [0, ones];
    }
    return toDigitPair(value);
  }

  function sanitizeDigit(input) {
    const numeric = Math.max(0, Math.floor(Math.abs(Number(input) || 0)));
    return numeric % 10;
  }

  function toDigitPair(value) {
    const normalized = Math.max(0, Math.floor(Math.abs(Number(value) || 0))) % 100;
    return [Math.floor(normalized / 10), normalized % 10];
  }

  function advanceCalendarAnimations(state, deltaMs = 0) {
    if (!state || deltaMs <= 0) return;
    Object.values(state).forEach((entry) => {
      if (!entry || !Array.isArray(entry.transitions)) return;
      entry.transitions = entry.transitions.filter((transition) => {
        if (!transition) return false;
        transition.elapsed = (transition.elapsed || 0) + deltaMs;
        return transition.elapsed < CALENDAR_TRANSITION_MS;
      });
    });
  }

  function paintCalendarDigits({ originX, originY, width, height, stateEntry, anchors = [0.5, 0.5] }) {
    if (!stateEntry) return;

    const digits = Array.isArray(stateEntry.digits) ? stateEntry.digits : [];
    const transitions = Array.isArray(stateEntry.transitions) ? stateEntry.transitions : [];
    const NUMBER_SCALE = 0.5;
    const OFFSET_Y = 30;

    const resolvedDigits = digits.slice(0, 2).map((value) => {
      const spriteInfo = calendarNumberSprites.getDigitSprite?.(value);
      return spriteInfo;
    });

    const digitWidths = resolvedDigits.map((info) => ((info?.sprite?.width || 0) * NUMBER_SCALE));
    const digitHeights = resolvedDigits.map((info) => ((info?.sprite?.height || 0) * NUMBER_SCALE));
    const maxHeight = digitHeights.length ? Math.max(...digitHeights) : 0;

    const baseY = originY + height / 2 - maxHeight / 2 + OFFSET_Y;

    const slotCount = Math.max(resolvedDigits.length, anchors.length);
    for (let index = 0; index < slotCount; index += 1) {
      const anchor = Number.isFinite(anchors[index]) ? anchors[index] : (slotCount > 1 ? index / (slotCount - 1) : 0.5);
      const slotCenterX = originX + width * anchor;

      const spriteInfo = resolvedDigits[index];
      if (!spriteInfo?.sprite?.ready) continue;
      const spriteWidth = (spriteInfo.sprite.width || 0) * NUMBER_SCALE;
      const spriteHeight = (spriteInfo.sprite.height || 0) * NUMBER_SCALE;
      const drawX = slotCenterX - spriteWidth / 2;
      const drawY = baseY + (maxHeight - spriteHeight) / 2;
      drawCalendarDigit(spriteInfo, drawX, drawY, spriteWidth, spriteHeight, { opacity: 1 });
    }

    const transitionCount = transitions.length;
    for (let index = 0; index < transitionCount; index += 1) {
      const transition = transitions[index];
      if (!transition) continue;
      const prevInfo = calendarNumberSprites.getDigitSprite?.(transition.value);
      if (!prevInfo?.sprite?.ready) continue;

      const anchorIndex = transition.anchorIndex ?? index;
      const anchor = Number.isFinite(anchors[anchorIndex]) ? anchors[anchorIndex] : (slotCount > 1 ? anchorIndex / (slotCount - 1) : 0.5);
      const slotCenterX = originX + width * anchor;

      const spriteWidth = (prevInfo.sprite.width || 0) * NUMBER_SCALE;
      const spriteHeight = (prevInfo.sprite.height || 0) * NUMBER_SCALE;
      const progress = Math.min(Math.max((transition.elapsed || 0) / CALENDAR_TRANSITION_MS, 0), 1);
      const fadeProgress = progress * progress;
      const opacity = 1 - fadeProgress;
      const drop = CALENDAR_DROP_PX * progress;
      const drawX = slotCenterX - spriteWidth / 2;
      const drawY = baseY + (maxHeight - spriteHeight) / 2 + drop;
      drawCalendarDigit(prevInfo, drawX, drawY, spriteWidth, spriteHeight, { opacity });
    }
  }

  function drawCalendarDigit(info, x, y, width, height, options = {}) {
    if (!info?.sprite?.ready) return;
    const { sprite, invert180 } = info;
    const opacity = Number.isFinite(options.opacity) ? options.opacity : 1;

    ctx.save();
    ctx.globalAlpha *= opacity;
    if (invert180) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(sprite.image, -width / 2, -height / 2, width, height);
    } else {
      ctx.drawImage(sprite.image, x, y, width, height);
    }
    ctx.restore();
  }

  function getVaseMetrics() {
    const { sourceColumns, bench, vase } = MASTER_FLORIST_LAYOUT;
    const columnsMeta = SOURCE_COLUMNS_META;
    const columnDefs = sourceColumns?.columns ?? [];
    const benchConfig = bench || {};
    const vaseConfig = vase || {};

    const basePadding = benchConfig.basePadding ?? 16;
    const minWidth = vaseConfig.minWidth ?? 240;

    const areaConfig = vaseConfig?.area || null;

    let leftBoundary = typeof areaConfig?.left === 'number' ? areaConfig.left : null;
    let rightBoundary = typeof areaConfig?.right === 'number' ? areaConfig.right : null;

    if ((leftBoundary == null || rightBoundary == null) && areaConfig) {
      const width = typeof areaConfig.width === 'number' ? areaConfig.width : null;
      const center = typeof areaConfig.center === 'number' ? areaConfig.center : null;
      if (width != null) {
        if (leftBoundary == null && center != null) {
          leftBoundary = center - width / 2;
        }
        if (rightBoundary == null && center != null) {
          rightBoundary = center + width / 2;
        }
        if (leftBoundary == null && rightBoundary != null) {
          leftBoundary = rightBoundary - width;
        }
        if (rightBoundary == null && leftBoundary != null) {
          rightBoundary = leftBoundary + width;
        }
      }
    }

    if (leftBoundary == null || rightBoundary == null) {
      let fallbackLeft = 0;
      let fallbackRight = MF_CANVAS_WIDTH;

      if (columnDefs.length && columnsMeta.length) {
        const fallbackLeftMeta = columnsMeta[0];
        const fallbackRightMeta = columnsMeta[columnsMeta.length - 1];
        const leftDef = columnDefs[0];
        const rightDef = columnDefs[columnDefs.length - 1];

        const leftMeta = leftDef ? columnsMeta.find((col) => col.id === leftDef.id) || fallbackLeftMeta : fallbackLeftMeta;
        const rightMeta = rightDef ? columnsMeta.find((col) => col.id === rightDef.id) || fallbackRightMeta : fallbackRightMeta;

        const leftGap = leftDef?.gapAfter ?? sourceColumns?.gapAfter ?? 0;
        const rightGap = rightDef?.gapBefore ?? sourceColumns?.gapBefore ?? 0;

        fallbackLeft = (leftMeta?.x ?? 0) + (leftMeta?.width ?? 0) + leftGap;
        fallbackRight = (rightMeta?.x ?? MF_CANVAS_WIDTH) - rightGap;
      }

      leftBoundary = leftBoundary ?? fallbackLeft;
      rightBoundary = rightBoundary ?? fallbackRight;
    }

    leftBoundary = Math.max(0, leftBoundary);
    rightBoundary = Math.min(MF_CANVAS_WIDTH, rightBoundary);

    if (rightBoundary - leftBoundary < minWidth) {
      const center = (leftBoundary + rightBoundary) / 2 || MF_CANVAS_WIDTH / 2;
      leftBoundary = center - minWidth / 2;
      rightBoundary = center + minWidth / 2;
    }

    const vaseWidth = Math.max(rightBoundary - leftBoundary, minWidth);
    const baseX = leftBoundary + vaseWidth / 2;
    const baseY = MF_CANVAS_HEIGHT - basePadding;

    const defaultBodyWidth = 218;
    const defaultBodyHeight = 272;
    const naturalWidth = vaseSprites.body?.naturalWidth || defaultBodyWidth;
    const naturalHeight = vaseSprites.body?.naturalHeight || defaultBodyHeight;
    const targetHeight = vaseConfig.targetHeight ?? 220;
    const baseScale = Math.min(vaseWidth / naturalWidth, targetHeight / naturalHeight);
    const scaleMultiplier = vaseConfig.scaleMultiplier ?? 1.35;
    const scale = baseScale * scaleMultiplier;

    const scaledWidth = naturalWidth * scale;
    const scaledHeight = naturalHeight * scale;
    const destX = baseX - scaledWidth / 2;
    const destY = baseY - scaledHeight;
    const lipNaturalHeight = vaseSprites.lip?.naturalHeight || 32;
    const lipHeight = lipNaturalHeight * scale;
    const stemAnchorOffset = vaseConfig.stemAnchorOffset ?? 12;

    return {
      baseX,
      baseY,
      stemAnchorY: baseY - stemAnchorOffset,
      scaledWidth,
      scaledHeight,
      destX,
      destY,
      lipHeight,
      scale,
    };
  }

  function paintVaseLip(metrics) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (vaseSprites.ready) {
      ctx.drawImage(vaseSprites.lip, metrics.destX, metrics.destY, metrics.scaledWidth, metrics.lipHeight);
    } else {
      ctx.fillStyle = '#6f9db2';
      ctx.beginPath();
      ctx.ellipse(metrics.baseX, metrics.destY + metrics.lipHeight / 2, metrics.scaledWidth / 2, metrics.lipHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function paintVaseBody(metrics) {
    if (vaseSprites.ready) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(vaseSprites.body, metrics.destX, metrics.destY, metrics.scaledWidth, metrics.scaledHeight);
      ctx.restore();
    } else {
      paintFallbackVaseBody(metrics);
    }
  }

  function paintFallbackVaseBody(metrics) {
    const { baseX, baseY, scaledWidth, scaledHeight, destY } = metrics;

    ctx.save();
    ctx.fillStyle = '#b1d5e8';
    ctx.beginPath();
    ctx.moveTo(baseX - scaledWidth * 0.25, baseY);
    ctx.lineTo(baseX - scaledWidth * 0.18, baseY - scaledHeight * 0.6);
    ctx.quadraticCurveTo(baseX - scaledWidth * 0.2, destY, baseX, destY);
    ctx.quadraticCurveTo(baseX + scaledWidth * 0.2, destY, baseX + scaledWidth * 0.18, baseY - scaledHeight * 0.6);
    ctx.lineTo(baseX + scaledWidth * 0.25, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const SOURCE_BOXES_BY_COLUMN = SOURCE_BOXES.reduce((acc, box) => {
    (acc[box.column] ||= []).push(box);
    return acc;
  }, {});

  function paintFlowerColumns(drag) {
    const columnEntries = SOURCE_COLUMNS_META.map((column) => ({
      column,
      boxes: SOURCE_BOXES_BY_COLUMN[column.id] || [],
    })).filter((entry) => entry.boxes.length);

    if (!columnEntries.length) {
      return;
    }

    if (SOURCE_CONTAINER) {
      const { x, y, width, height, cornerRadius } = SOURCE_CONTAINER;
      roundRect(ctx, x, y, width, height, cornerRadius ?? 18, true, true, {
        fillStyle: COLORS.columnFill,
        strokeStyle: COLORS.columnStroke,
      });
    } else {
      columnEntries.forEach(({ column }) => {
        roundRect(ctx, column.x, column.y, column.width, column.height, 18, true, true, {
          fillStyle: COLORS.columnFill,
          strokeStyle: COLORS.columnStroke,
        });
      });
    }

    columnEntries.forEach(({ boxes }) => {
      boxes.forEach((box) => {
        const hideFlower = Boolean(
          drag && drag.sourceColumn === box.column && drag.sourceIndex === box.columnIndex,
        );
        drawFlowerBox(box.x, box.y, box.width, box.height, box.code, { hideFlower });
      });
    });
  }

  function getFlowerMeta(code) {
    if (!code) return {};
    const key = typeof code === 'string' ? code.toLowerCase() : code;
    return FLOWER_META_BY_CODE[key] || {};
  }

  function drawFlowerBox(x, y, width, height, code, options = {}) {
    const { hideFlower = false } = options;
    const meta = getFlowerMeta(code);
    const fillColor = meta.color || 'rgba(255, 255, 255, 0.65)';

    ctx.save();
    roundRect(ctx, x, y, width, height, 14, true, true, { fillStyle: fillColor, strokeStyle: 'rgba(0, 0, 0, 0.18)' });

    if (!hideFlower) {
      const normalizedCode = typeof code === 'string' ? code.toLowerCase() : code;
      const img = flowerSprites.images[normalizedCode];
      if (img && img.complete && img.naturalWidth > 0) {
        const padding = 12;
        const availableWidth = width - padding * 2;
        const availableHeight = height - padding * 2;
        const scale = Math.min(availableWidth / img.naturalWidth, availableHeight / img.naturalHeight);
        const drawWidth = img.naturalWidth * scale;
        const drawHeight = img.naturalHeight * scale;
        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawSlotFlower(code, x, y, width, height) {
    ctx.save();
    const normalizedCode = typeof code === 'string' ? code.toLowerCase() : '';
    const img = flowerSprites.images[normalizedCode];

    if (img && img.complete && img.naturalWidth > 0) {
      const baseScale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
      const scaleFactor = baseScale * 1.8 * 0.75;
      const drawWidth = img.naturalWidth * scaleFactor;
      const drawHeight = img.naturalHeight * scaleFactor;
      const drawX = x + (width - drawWidth) / 2;
      const drawY = y + (height - drawHeight) / 2;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawStem(ctx, slot, vaseMetrics) {
    const stemX = slot.x + slot.width / 2;
    const stemStartY = slot.y + slot.height;
    const stemEndX = vaseMetrics.baseX + (slot.stemOffsetX || 0);
    const stemEndY = vaseMetrics.stemAnchorY;

    ctx.save();
    ctx.strokeStyle = STEM_STYLES.stroke;
    ctx.lineWidth = STEM_STYLES.width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(stemX, stemStartY);
    ctx.lineTo(stemEndX, stemEndY);
    ctx.stroke();

    ctx.restore();
  }

  render();

  return { render, dispose };
}

function createBackgroundSprite() {
  const image = new Image();
  image.decoding = 'async';
  image.src = new URL('../assets/backgrounds/background.png', import.meta.url).href;

  let ready = false;
  image.addEventListener('load', () => {
    ready = true;
  }, { once: true });

  return { image, get ready() { return ready; } };
}

function normalizeSlotCode(value, index) {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const code = value.toLowerCase();
    if (code === 'n') {
      return null;
    }
    if (code.length) {
      return code;
    }
  } else if (value !== undefined) {
    return String(value);
  }
  return DEFAULT_SLOT_CODES[index] || null;
}

function createVaseSprites() {
  const lip = new Image();
  const body = new Image();
  lip.decoding = 'async';
  body.decoding = 'async';
  lip.src = new URL('../assets/flowers/vaseLip.png', import.meta.url).href;
  body.src = new URL('../assets/flowers/vase.png', import.meta.url).href;

  let loaded = 0;
  let ready = false;

  function markReady() {
    loaded += 1;
    if (loaded >= 2) {
      ready = true;
    }
  }

  lip.addEventListener('load', markReady, { once: true });
  body.addEventListener('load', markReady, { once: true });

  return {
    lip,
    body,
    get ready() {
      return ready;
    },
  };
}

function createFlowerSprites() {
  const images = {};
  const meta = {};

  FLOWER_DEFS.forEach(({ code, color, src }) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = new URL(src, import.meta.url).href;
    const lower = code.toLowerCase();
    const upper = code.toUpperCase();
    images[lower] = img;
    images[upper] = img;
    meta[lower] = { color };
    meta[upper] = meta[lower];
  });

  return { images, meta };
}

function roundRect(context, x, y, width, height, radius, fill, stroke, styles = {}) {
  const r = Math.min(radius, width / 2, height / 2);
  context.save();
  if (styles.fillStyle) context.fillStyle = styles.fillStyle;
  if (styles.strokeStyle) context.strokeStyle = styles.strokeStyle;

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();

  if (fill) context.fill();
  if (stroke) context.stroke();
  context.restore();
}

function createCalendarSprites() {
  const sprites = {};
  Object.entries(CALENDAR_META).forEach(([key, meta]) => {
    sprites[key] = createCalendarSprite(meta);
  });
  return sprites;
}

function createCalendarSprite(meta) {
  const image = new Image();
  image.decoding = 'async';
  image.src = new URL(meta.file, import.meta.url).href;

  let ready = image.complete && image.naturalWidth > 0;
  if (!ready) {
    image.addEventListener('load', () => {
      ready = true;
    }, { once: true });
  }

  return {
    image,
    width: meta.width,
    height: meta.height,
    get ready() {
      return ready;
    },
  };
}

function createCalendarNumberSprites() {
  const map = new Map();
  CALENDAR_NUMBER_META.forEach((meta) => {
    map.set(meta.value, createCalendarNumberSprite(meta));
  });

  return {
    getDigitSprite(value) {
      if (value == null) return null;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return null;
      if (numeric === 9) {
        const six = map.get(6);
        if (!six) return null;
        return { sprite: six, invert180: true };
      }
      const sprite = map.get(numeric);
      if (!sprite) return null;
      return { sprite, invert180: false };
    },
  };
}

function createCalendarNumberSprite(meta) {
  const image = new Image();
  image.decoding = 'async';
  image.src = new URL(meta.file, import.meta.url).href;

  let ready = image.complete && image.naturalWidth > 0;
  if (!ready) {
    image.addEventListener('load', () => {
      ready = true;
    }, { once: true });
  }

  return {
    image,
    width: meta.width,
    height: meta.height,
    get ready() {
      return ready;
    },
  };
}





