import { MASTER_FLORIST_LAYOUT } from './layout.js';

export const SLOT_SIZE = { width: 166, height: 86 };

export const SLOT_HITBOX_SCALE = 0.5;

const EMPTY_DISABLED_SLOTS = Object.freeze([]);

const DISABLED_SLOT_MAP = Object.freeze({
  5: Object.freeze([4]),
  4: Object.freeze([3, 5]),
  3: Object.freeze([0, 1, 2]),
  2: Object.freeze([0, 1, 2, 4]),
  1: Object.freeze([0, 1, 2, 3, 5]),
});

export function getDisabledSlotsForLength(length) {
  const key = Number.isFinite(length) ? Math.max(0, Math.floor(length)) : 0;
  return DISABLED_SLOT_MAP[key] || EMPTY_DISABLED_SLOTS;
}

export function isSlotDisabledForLength(length, index) {
  if (!Number.isFinite(length) || length <= 0) {
    return true;
  }
  if (!Number.isInteger(index) || index < 0) {
    return true;
  }
  const disabled = getDisabledSlotsForLength(length);
  return disabled.includes(index);
}

export function getEnabledSlotsForLength(length) {
  const disabled = new Set(getDisabledSlotsForLength(length));
  const totalSlots = SLOT_POSITIONS.length;
  const enabled = [];
  for (let i = 0; i < totalSlots; i += 1) {
    if (!disabled.has(i)) {
      enabled.push(i);
    }
  }
  return enabled;
}

export const SLOT_POSITIONS = [
  { x: 314, y: 78, stemOffsetX: 50 },
  { x: 397, y: 43 },
  { x: 480, y: 78, stemOffsetX: -50 },
  { x: 319, y: 168, stemOffsetX: 20 },
  { x: 397, y: 133 },
  { x: 475, y: 168, stemOffsetX: -20 },
];

export const SLOT_CLICK_BOUNDS = [
  { width: 83, height: SLOT_SIZE.height, offsetX: 41.5, offsetY: 0 },
  { width: 83, height: SLOT_SIZE.height, offsetX: 41.5, offsetY: 0 },
  { width: 83, height: SLOT_SIZE.height, offsetX: 41.5, offsetY: 0 },
  { width: 83, height: SLOT_SIZE.height + 6, offsetX: 36.5, offsetY: -6 },
  { width: 83, height: SLOT_SIZE.height + 6, offsetX: 41.5, offsetY: -6 },
  { width: 83, height: SLOT_SIZE.height + 6, offsetX: 46.5, offsetY: -6 },
];

export const SLOT_DRAW_ORDER = [0, 2, 1, 3, 5, 4];

export const DEFAULT_SLOT_CODES = ['r', 'o', 'y', 'b', 'p', 'w'];

const SOURCE_COLUMNS_CONFIG = MASTER_FLORIST_LAYOUT.sourceColumns || {};
const COLUMN_DEFS = SOURCE_COLUMNS_CONFIG.columns || [];
const DEFAULT_COLUMN_TOP = SOURCE_COLUMNS_CONFIG.top ?? 0;
const DEFAULT_COLUMN_BOTTOM = SOURCE_COLUMNS_CONFIG.bottom ?? DEFAULT_COLUMN_TOP;
const DEFAULT_COLUMN_HEIGHT = Math.max(DEFAULT_COLUMN_BOTTOM - DEFAULT_COLUMN_TOP, 0);
const DEFAULT_GAP_Y = SOURCE_COLUMNS_CONFIG.gapY ?? 0;
const DEFAULT_PADDING_X = SOURCE_COLUMNS_CONFIG.paddingX ?? 0;
const DEFAULT_GAP_BEFORE = SOURCE_COLUMNS_CONFIG.gapBefore ?? 0;
const DEFAULT_GAP_AFTER = SOURCE_COLUMNS_CONFIG.gapAfter ?? 0;

const SOURCE_CONTAINER_CONFIG = SOURCE_COLUMNS_CONFIG.container || null;
const DEFAULT_CONTAINER_TOP = SOURCE_CONTAINER_CONFIG?.y ?? DEFAULT_COLUMN_TOP;
const DEFAULT_CONTAINER_HEIGHT =
  SOURCE_CONTAINER_CONFIG?.height ??
  Math.max(
    (SOURCE_CONTAINER_CONFIG?.bottom ?? SOURCE_COLUMNS_CONFIG.bottom ?? DEFAULT_COLUMN_BOTTOM) -
      DEFAULT_CONTAINER_TOP,
    0,
  );

export const SOURCE_CONTAINER = SOURCE_CONTAINER_CONFIG
  ? {
      x: SOURCE_CONTAINER_CONFIG.x ?? 0,
      y: SOURCE_CONTAINER_CONFIG.y ?? DEFAULT_CONTAINER_TOP,
      width: SOURCE_CONTAINER_CONFIG.width ?? 0,
      height: SOURCE_CONTAINER_CONFIG.height ?? DEFAULT_CONTAINER_HEIGHT,
      paddingX: SOURCE_CONTAINER_CONFIG.paddingX ?? 0,
      paddingY: SOURCE_CONTAINER_CONFIG.paddingY ?? 0,
      cornerRadius: SOURCE_CONTAINER_CONFIG.cornerRadius ?? 24,
    }
  : null;

export const SOURCE_BOXES = COLUMN_DEFS.flatMap((column) => {
  const codes = Array.isArray(column.codes) ? column.codes : [];
  if (!codes.length) return [];
  const columnTop = column.y ?? DEFAULT_COLUMN_TOP;
  const columnHeight = column.height ?? DEFAULT_COLUMN_HEIGHT;
  const gapY = column.gapY ?? DEFAULT_GAP_Y;
  const padX = column.paddingX ?? DEFAULT_PADDING_X;
  const availableHeight = Math.max(columnHeight - gapY * (codes.length + 1), 0);
  const boxHeight = codes.length ? availableHeight / codes.length : 0;
  const boxWidth = Math.max(column.width - padX * 2, 0);

  return codes.map((code, index) => ({
    column: column.id,
    columnIndex: index,
    code,
    x: column.x + padX,
    y: columnTop + gapY + index * (boxHeight + gapY),
    width: boxWidth,
    height: boxHeight,
  }));
});

export const SOURCE_COLUMNS_META = COLUMN_DEFS.map((column) => ({
  id: column.id,
  x: column.x,
  y: column.y ?? DEFAULT_COLUMN_TOP,
  width: column.width,
  height: column.height ?? DEFAULT_COLUMN_HEIGHT,
  gapBefore: column.gapBefore ?? DEFAULT_GAP_BEFORE,
  gapAfter: column.gapAfter ?? DEFAULT_GAP_AFTER,
}));
