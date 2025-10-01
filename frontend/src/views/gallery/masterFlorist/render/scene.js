import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT, MF_DROP_ZONE_COUNT } from '../canvas/constants.js';

const LEFT_FLOWER_CODES = ['d', 'p', 'w'];
const RIGHT_FLOWER_CODES = ['o', 'r', 'b'];
const FLOWER_LABELS = {
  d: 'Daisy',
  p: 'Iris',
  w: 'Lily',
  o: 'Marigold',
  r: 'Rose',
  b: 'Violet',
};

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
  vaseBody: '#b1d5e8',
  vaseLip: '#6f9db2',
};

export function createMasterFloristRenderer({ canvas, state } = {}) {
  if (!canvas) throw new Error('createMasterFloristRenderer requires a canvas element.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to obtain 2d context for Master Florist.');

  const gameState = state || null;

  function render() {
    clear();
    paintWorkbench();
    paintFlowerColumns();
    paintSlots();
    paintVase();
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

  function paintWorkbench() {
    ctx.save();
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT);

    const benchHeight = 140;
    const benchY = MF_CANVAS_HEIGHT - benchHeight;

    ctx.fillStyle = COLORS.benchTop;
    ctx.fillRect(0, benchY, MF_CANVAS_WIDTH, benchHeight);

    ctx.fillStyle = COLORS.benchShadow;
    ctx.fillRect(0, benchY - 6, MF_CANVAS_WIDTH, 6);
    ctx.restore();
  }

  function paintSlots() {
    const solution = gameState?.puzzle?.solution || [];
    const hoverId = gameState?.hoverStemId || null;

    const paddingX = 36;
    const columnWidth = 150;
    const columnGap = 28;
    const slotAreaX = paddingX + columnWidth + columnGap;
    const slotAreaWidth = MF_CANVAS_WIDTH - (slotAreaX * 2);
    const slotGap = 14;
    const totalGap = slotGap * (MF_DROP_ZONE_COUNT - 1);
    const slotWidth = (slotAreaWidth - totalGap) / MF_DROP_ZONE_COUNT;
    const slotHeight = 86;
    const slotY = 48;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = '600 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < MF_DROP_ZONE_COUNT; i += 1) {
      const x = slotAreaX + i * (slotWidth + slotGap);
      const y = slotY;
      const rectHover = hoverId === 'slot-' + i;
      const rectRadius = 16;

      ctx.save();
      ctx.fillStyle = COLORS.slotFill;
      ctx.strokeStyle = rectHover ? COLORS.slotStroke : COLORS.slotEmptyDash;
      ctx.setLineDash(rectHover ? [] : [6, 6]);
      roundRect(ctx, x, y, slotWidth, slotHeight, rectRadius, true, true);
      ctx.restore();

      const code = typeof solution[i] === 'string' && solution[i].length ? solution[i].toUpperCase() : null;
      if (code) {
        ctx.fillStyle = COLORS.slotText;
        ctx.font = '700 28px "Segoe UI", sans-serif';
        ctx.fillText(code, x + slotWidth / 2, y + slotHeight / 2);
      } else {
        ctx.fillStyle = COLORS.slotText;
        ctx.font = '500 14px "Segoe UI", sans-serif';
        ctx.fillText('Slot ' + (i + 1), x + slotWidth / 2, y + slotHeight / 2);
      }
    }

    ctx.restore();
  }

  function paintFlowerColumns() {
    const paddingX = 36;
    const columnWidth = 150;
    const columnTop = 160;
    const columnBottom = MF_CANVAS_HEIGHT - 44;
    const columnHeight = columnBottom - columnTop;

    ctx.save();
    drawFlowerColumn(paddingX, columnTop, columnWidth, columnHeight, LEFT_FLOWER_CODES);
    drawFlowerColumn(MF_CANVAS_WIDTH - paddingX - columnWidth, columnTop, columnWidth, columnHeight, RIGHT_FLOWER_CODES);
    ctx.restore();
  }

  function drawFlowerColumn(x, y, width, height, codes) {
    ctx.save();
    roundRect(ctx, x, y, width, height, 18, true, true, { fillStyle: COLORS.columnFill, strokeStyle: COLORS.columnStroke });

    const boxGap = 16;
    const boxHeight = (height - boxGap * (codes.length + 1)) / codes.length;
    const boxWidth = width - boxGap * 2;

    codes.forEach((code, index) => {
      const bx = x + boxGap;
      const by = y + boxGap + index * (boxHeight + boxGap);
      drawFlowerBox(bx, by, boxWidth, boxHeight, code);
    });

    ctx.restore();
  }

  function drawFlowerBox(x, y, width, height, code) {
    ctx.save();
    roundRect(ctx, x, y, width, height, 14, true, true, { fillStyle: 'rgba(255, 255, 255, 0.65)', strokeStyle: 'rgba(0, 0, 0, 0.15)' });

    ctx.fillStyle = COLORS.columnText;
    ctx.font = '600 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(FLOWER_LABELS[code] || code.toUpperCase(), x + width / 2, y + height * 0.3);

    ctx.font = '700 36px "Segoe UI", sans-serif';
    ctx.fillText(code.toUpperCase(), x + width / 2, y + height * 0.68);
    ctx.restore();
  }

  function paintVase() {
    const paddingX = 36;
    const columnWidth = 150;
    const columnGap = 28;
    const vaseWidth = MF_CANVAS_WIDTH - (paddingX * 2) - (columnWidth + columnGap) * 2;
    const vaseHeight = 220;
    const vaseX = paddingX + columnWidth + columnGap + vaseWidth / 2;
    const vaseBaseY = MF_CANVAS_HEIGHT - 36;

    ctx.save();
    ctx.fillStyle = COLORS.vaseBody;
    ctx.beginPath();
    ctx.moveTo(vaseX - vaseWidth * 0.25, vaseBaseY);
    ctx.lineTo(vaseX - vaseWidth * 0.18, vaseBaseY - vaseHeight * 0.6);
    ctx.quadraticCurveTo(vaseX - vaseWidth * 0.2, vaseBaseY - vaseHeight * 0.9, vaseX, vaseBaseY - vaseHeight);
    ctx.quadraticCurveTo(vaseX + vaseWidth * 0.2, vaseBaseY - vaseHeight * 0.9, vaseX + vaseWidth * 0.18, vaseBaseY - vaseHeight * 0.6);
    ctx.lineTo(vaseX + vaseWidth * 0.25, vaseBaseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.vaseLip;
    const lipWidth = vaseWidth * 0.4;
    const lipHeight = 18;
    ctx.beginPath();
    ctx.ellipse(vaseX, vaseBaseY - vaseHeight + lipHeight / 2, lipWidth / 2, lipHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

  render();

  return { render, dispose };
}