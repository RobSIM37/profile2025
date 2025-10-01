import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from '../canvas/constants.js';

const SOURCE_AREA_TOP = 160;
const SOURCE_AREA_BOTTOM = MF_CANVAS_HEIGHT - 44;

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
  },
  sourceColumns: {
    top: SOURCE_AREA_TOP,
    bottom: SOURCE_AREA_BOTTOM,
    gapY: 16,
    paddingX: 16,
    gapBefore: 0,
    gapAfter: 0,
    columns: [
      {
        id: 'left',
        x: 36,
        width: 150,
        gapAfter: 28,
        codes: ['r', 'o', 'y'],
      },
      {
        id: 'right',
        x: MF_CANVAS_WIDTH - 36 - 150,
        width: 150,
        gapBefore: 28,
        codes: ['b', 'p', 'w'],
      },
    ],
  },
};
