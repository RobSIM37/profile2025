import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from '../canvas/constants.js';

const SOURCE_AREA_TOP = 160;
const SOURCE_AREA_BOTTOM = MF_CANVAS_HEIGHT - 44;
const SOURCE_CONTAINER_MARGIN_RIGHT = 36;
const SOURCE_CONTAINER_PADDING_X = 5;
const SOURCE_CONTAINER_PADDING_Y = 5;
const SOURCE_COLUMN_GAP = 5;
const SOURCE_COLUMN_WIDTH = 130;
const SOURCE_CONTAINER_WIDTH =
  SOURCE_CONTAINER_PADDING_X * 2 + SOURCE_COLUMN_WIDTH * 2 + SOURCE_COLUMN_GAP;
const SOURCE_CONTAINER_HEIGHT = SOURCE_AREA_BOTTOM - SOURCE_AREA_TOP;
const SOURCE_CONTAINER_X =
  MF_CANVAS_WIDTH - SOURCE_CONTAINER_MARGIN_RIGHT - SOURCE_CONTAINER_WIDTH;
const SOURCE_COLUMN_LEFT_X = SOURCE_CONTAINER_X + SOURCE_CONTAINER_PADDING_X;
const SOURCE_COLUMN_RIGHT_X =
  SOURCE_COLUMN_LEFT_X + SOURCE_COLUMN_WIDTH + SOURCE_COLUMN_GAP;

export const MASTER_FLORIST_LAYOUT = {
  bench: {
    height: 140,
    shadowHeight: 6,
    trimHeight: 4,
    basePadding: 16,
  },
  vase: {
    targetHeight: 220,
    scaleMultiplier: 1.35,
    stemAnchorOffset: 12,
    minWidth: 240,
    area: {
      left: 214,
      right: MF_CANVAS_WIDTH - 214,
    },
  },
  sourceColumns: {
    top: SOURCE_AREA_TOP,
    bottom: SOURCE_AREA_BOTTOM,
    gapY: 5,
    paddingX: 0,
    gapBefore: 0,
    gapAfter: 0,
    container: {
      x: SOURCE_CONTAINER_X,
      y: SOURCE_AREA_TOP,
      width: SOURCE_CONTAINER_WIDTH,
      height: SOURCE_CONTAINER_HEIGHT,
      paddingX: SOURCE_CONTAINER_PADDING_X,
      paddingY: SOURCE_CONTAINER_PADDING_Y,
      cornerRadius: 24,
    },
    columns: [
      {
        id: 'left',
        x: SOURCE_COLUMN_LEFT_X,
        width: SOURCE_COLUMN_WIDTH,
        codes: ['r', 'o', 'y'],
      },
      {
        id: 'right',
        x: SOURCE_COLUMN_RIGHT_X,
        width: SOURCE_COLUMN_WIDTH,
        codes: ['b', 'p', 'w'],
      },
    ],
  },
};
