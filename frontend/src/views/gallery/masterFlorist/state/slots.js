import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from '../canvas/constants.js';

const PADDING_X = 36;
const COLUMN_WIDTH = 150;
const COLUMN_TOP = 160;
const COLUMN_BOTTOM = MF_CANVAS_HEIGHT - 44;
const COLUMN_HEIGHT = COLUMN_BOTTOM - COLUMN_TOP;
const BOX_GAP = 16;
const BOXES_PER_COLUMN = 3;
const BOX_WIDTH = COLUMN_WIDTH - BOX_GAP * 2;
const BOX_HEIGHT = (COLUMN_HEIGHT - BOX_GAP * (BOXES_PER_COLUMN + 1)) / BOXES_PER_COLUMN;

const LEFT_CODES = ['r', 'o', 'y'];
const RIGHT_CODES = ['b', 'p', 'w'];

const COLUMN_CONFIGS = [
  {
    id: 'left',
    x: PADDING_X,
    y: COLUMN_TOP,
    width: COLUMN_WIDTH,
    height: COLUMN_HEIGHT,
    codes: LEFT_CODES,
  },
  {
    id: 'right',
    x: MF_CANVAS_WIDTH - PADDING_X - COLUMN_WIDTH,
    y: COLUMN_TOP,
    width: COLUMN_WIDTH,
    height: COLUMN_HEIGHT,
    codes: RIGHT_CODES,
  },
];

export const SOURCE_BOXES = COLUMN_CONFIGS.flatMap(({ id: columnId, x, y, codes }) =>
  codes.map((code, index) => ({
    column: columnId,
    columnIndex: index,
    code,
    x: x + BOX_GAP,
    y: y + BOX_GAP + index * (BOX_HEIGHT + BOX_GAP),
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  })),
);

export const SOURCE_COLUMNS_META = COLUMN_CONFIGS.map(({ codes, ...meta }) => meta);

export const SLOT_SIZE = { width: 166, height: 86 };

export const SLOT_HITBOX_SCALE = 0.5;

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
