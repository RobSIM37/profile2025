import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT, MF_DROP_ZONE_COUNT } from '../canvas/constants.js';

const LEFT_FLOWER_CODES = ['r', 'o', 'y'];
const RIGHT_FLOWER_CODES = ['b', 'p', 'w'];
const SLOT_POSITIONS = [
  { x: 214 + 100, y: 78, stemOffsetX: 50 },
  { x: 397, y: 78 },
  { x: 580 - 100, y: 78, stemOffsetX: -50 },
  { x: 214 + 75, y: 188, stemOffsetX: 50 },
  { x: 397, y: 188 },
  { x: 580 - 75, y: 188, stemOffsetX: -50 },
];
const SLOT_SIZE = { width: 166, height: 86 };
const DEFAULT_SLOT_CODES = ['r', 'o', 'y', 'b', 'p', 'w'];
const STEM_STYLES = {
  stroke: '#2d5230',
  fill: '#58a464',
  width: 6,
};
const FLOWER_LABELS = {
  d: 'Daisy',
  p: 'Iris',
  w: 'Lily',
  o: 'Marigold',
  r: 'Rose',
  b: 'Violet',
  y: 'Daisy',
};

const FLOWER_DEFS = [
  { code: 'd', color: '#f9e678', src: '../assets/flowers/daisy.png' },
  { code: 'y', color: '#f9e678', src: '../assets/flowers/daisy.png' },
  { code: 'p', color: '#b39deb', src: '../assets/flowers/iris.png' },
  { code: 'w', color: '#f4f2eb', src: '../assets/flowers/lily.png' },
  { code: 'o', color: '#f4b270', src: '../assets/flowers/marigold.png' },
  { code: 'r', color: '#f2857a', src: '../assets/flowers/rose.png' },
  { code: 'b', color: '#9aa7f7', src: '../assets/flowers/violet.png' },
];

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

const vaseSprites = createVaseSprites();
const flowerSprites = createFlowerSprites();
const backgroundSprite = createBackgroundSprite();

export function createMasterFloristRenderer({ canvas, state } = {}) {
  if (!canvas) throw new Error('createMasterFloristRenderer requires a canvas element.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to obtain 2d context for Master Florist.');

  const gameState = state || null;

  function render() {
    clear();
    paintWorkbench();
    paintFlowerColumns();
    paintVase();
    paintSlots();
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

    if (backgroundSprite.ready) {
      ctx.drawImage(backgroundSprite.image, 0, 0, MF_CANVAS_WIDTH, benchY);
    } else {
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, MF_CANVAS_WIDTH, benchY);
    }

    ctx.fillStyle = COLORS.benchTop;
    ctx.fillRect(0, benchY, MF_CANVAS_WIDTH, benchHeight);
    ctx.fillRect(0, MF_CANVAS_HEIGHT - 4, MF_CANVAS_WIDTH, 4);

    ctx.fillStyle = COLORS.benchShadow;
    ctx.fillRect(0, benchY - 6, MF_CANVAS_WIDTH, 6);
    ctx.restore();
  }

  function paintSlots() {
    const solution = gameState?.puzzle?.solution || [];
    const hoverId = gameState?.hoverStemId || null;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const vaseBase = getVaseBasePoint();

    for (let i = 0; i < MF_DROP_ZONE_COUNT; i += 1) {
      const slot = SLOT_POSITIONS[i];
      if (!slot) continue;

      const width = slot.width ?? SLOT_SIZE.width;
      const height = slot.height ?? SLOT_SIZE.height;
      const x = slot.x ?? 0;
      const y = slot.y ?? 0;
      const code = normalizeSlotCode(solution[i], i);

      if (code) {
        drawStem(ctx, x, y, width, height, vaseBase, slot.stemOffsetX || 0);
        drawSlotFlower(code, x, y, width, height);
        continue;
      }

      ctx.save();
      ctx.fillStyle = COLORS.slotFill;
      const rectHover = hoverId === 'slot-' + i;
      ctx.strokeStyle = rectHover ? COLORS.slotStroke : COLORS.slotEmptyDash;
      ctx.setLineDash(rectHover ? [] : [6, 6]);
      const rectRadius = 16;
      roundRect(ctx, x, y, width, height, rectRadius, true, true);
      ctx.fillStyle = COLORS.slotText;
      ctx.font = '500 14px "Segoe UI", sans-serif';
      ctx.fillText('Slot ' + (i + 1), x + width / 2, y + height / 2);
      ctx.restore();
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
    const meta = flowerSprites.meta[code];
    const fillColor = meta?.color || 'rgba(255, 255, 255, 0.65)';
    roundRect(ctx, x, y, width, height, 14, true, true, { fillStyle: fillColor, strokeStyle: 'rgba(0, 0, 0, 0.18)' });

    const img = flowerSprites.images[code];
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

    ctx.restore();
  }

  function drawSlotFlower(code, x, y, width, height) {
    ctx.save();
    const img = flowerSprites.images[code];
    const padding = 10;

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

  function paintVase() {
    const paddingX = 36;
    const columnWidth = 150;
    const columnGap = 28;
    const vaseWidth = MF_CANVAS_WIDTH - (paddingX * 2) - (columnWidth + columnGap) * 2;
    const vaseX = paddingX + columnWidth + columnGap + vaseWidth / 2;
    const vaseBaseY = MF_CANVAS_HEIGHT - 16;

    if (!vaseSprites.ready) {
      paintFallbackVase(vaseX, vaseBaseY, vaseWidth);
      return;
    }

    const { lip, body } = vaseSprites;
    const naturalWidth = body.naturalWidth || 1;
    const naturalHeight = body.naturalHeight || 1;
    const targetHeight = 220;
    const scale = Math.min(vaseWidth / naturalWidth, targetHeight / naturalHeight);
    const scaledWidth = naturalWidth * scale * 1.25;
    const scaledHeight = naturalHeight * scale * 1.25;
    const destX = vaseX - scaledWidth / 2;
    const destY = vaseBaseY - scaledHeight;
    const lipHeight = (lip.naturalHeight || 1) * scale * 1.25;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lip, destX, destY, scaledWidth, lipHeight);
    ctx.drawImage(body, destX, destY, scaledWidth, scaledHeight);
    ctx.restore();
  }

  function paintFallbackVase(vaseX, vaseBaseY, vaseWidth) {
    const vaseHeight = 220;

    ctx.save();
    ctx.fillStyle = '#b1d5e8';
    ctx.beginPath();
    ctx.moveTo(vaseX - vaseWidth * 0.25, vaseBaseY);
    ctx.lineTo(vaseX - vaseWidth * 0.18, vaseBaseY - vaseHeight * 0.6);
    ctx.quadraticCurveTo(vaseX - vaseWidth * 0.2, vaseBaseY - vaseHeight * 0.9, vaseX, vaseBaseY - vaseHeight);
    ctx.quadraticCurveTo(vaseX + vaseWidth * 0.2, vaseBaseY - vaseHeight * 0.9, vaseX + vaseWidth * 0.18, vaseBaseY - vaseHeight * 0.6);
    ctx.lineTo(vaseX + vaseWidth * 0.25, vaseBaseY);
    ctx.closePath();
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

function drawStem(ctx, x, y, width, height, vaseBase, offsetX = 0) {
  const stemX = x + width / 2;
  const stemStartY = y + height;
  const stemEndX = vaseBase.x + offsetX;
  const stemEndY = vaseBase.y;

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

function getVaseBasePoint() {
  const paddingX = 36;
  const columnWidth = 150;
  const columnGap = 28;
  const vaseWidth = MF_CANVAS_WIDTH - (paddingX * 2) - (columnWidth + columnGap) * 2;
  const vaseX = paddingX + columnWidth + columnGap + vaseWidth / 2;
  const vaseBaseY = MF_CANVAS_HEIGHT - 16;
  return { x: vaseX, y: vaseBaseY - 12 };
}

function createBackgroundSprite() {
  const image = new Image();
  image.decoding = 'async';
  image.src = new URL('../assets/background.png', import.meta.url).href;

  let ready = false;
  image.addEventListener('load', () => {
    ready = true;
  }, { once: true });

  return { image, get ready() { return ready; } };
}

function normalizeSlotCode(value, index) {
  if (typeof value === 'string') {
    const code = value.toLowerCase();
    if (code === 'n') {
      return null;
    }
    if (code.length) {
      return code;
    }
  } else if (value) {
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
    images[code] = img;
    meta[code] = { color };
  });

  return { images, meta };
}
