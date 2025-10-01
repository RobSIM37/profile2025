import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT, MF_DROP_ZONE_COUNT } from '../canvas/constants.js';

const LEFT_FLOWER_CODES = ['r', 'o', 'y'];
const RIGHT_FLOWER_CODES = ['b', 'p', 'w'];
const SLOT_POSITIONS = [
  { x: 214 + 100, y: 78, stemOffsetX: 20 },
  { x: 397, y: 43 },
  { x: 580 - 100, y: 78, stemOffsetX: -20 },
  { x: 214 + 75 + 30, y: 168, stemOffsetX: 50 },
  { x: 397, y: 133 },
  { x: 580 - 75 - 30, y: 168, stemOffsetX: -50 },
];
const SLOT_DRAW_ORDER = [0, 2, 1, 3, 5, 4];
const SLOT_SIZE = { width: 166, height: 86 };
const DEFAULT_SLOT_CODES = ['r', 'o', 'y', 'b', 'p', 'w'];
const STEM_STYLES = {
  stroke: '#2d5230',
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

    const slots = prepareSlotStates();
    const vaseMetrics = getVaseMetrics();
    const hoverId = gameState?.hoverStemId || null;

    paintWorkbench();
    paintFlowerColumns();
    paintVaseLip(vaseMetrics);
    paintStemsLayer(slots, vaseMetrics);
    paintVaseBody(vaseMetrics);
    paintFlowersLayer(slots);
    paintEmptySlotPlaceholders(slots, hoverId);
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

  function prepareSlotStates() {
    const solution = gameState?.puzzle?.solution || [];

    return SLOT_POSITIONS.map((slot, index) => ({
      index,
      x: slot.x ?? 0,
      y: slot.y ?? 0,
      width: slot.width ?? SLOT_SIZE.width,
      height: slot.height ?? SLOT_SIZE.height,
      code: normalizeSlotCode(solution[index], index),
      stemOffsetX: slot.stemOffsetX ?? 0,
    }));
  }

  function paintStemsLayer(slots, vaseMetrics) {
    SLOT_DRAW_ORDER.forEach((slotIndex) => {
      const slot = slots[slotIndex];
      if (!slot || !slot.code) return;
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

  function paintEmptySlotPlaceholders(slots, hoverId) {
    slots.forEach((slot) => {
      if (!slot || slot.code) return;
      const rectRadius = 16;
      const isHover = hoverId === 'slot-' + slot.index;

      ctx.save();
      ctx.fillStyle = COLORS.slotFill;
      ctx.strokeStyle = isHover ? COLORS.slotStroke : COLORS.slotEmptyDash;
      ctx.setLineDash(isHover ? [] : [6, 6]);
      roundRect(ctx, slot.x, slot.y, slot.width, slot.height, rectRadius, true, true);
      ctx.fillStyle = COLORS.slotText;
      ctx.font = '500 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Slot ' + (slot.index + 1), slot.x + slot.width / 2, slot.y + slot.height / 2);
      ctx.restore();
    });
  }

  function getVaseMetrics() {
    const paddingX = 36;
    const columnWidth = 150;
    const columnGap = 28;
    const vaseWidth = MF_CANVAS_WIDTH - (paddingX * 2) - (columnWidth + columnGap) * 2;
    const baseX = paddingX + columnWidth + columnGap + vaseWidth / 2;
    const baseY = MF_CANVAS_HEIGHT - 16;

    const defaultBodyWidth = 218;
    const defaultBodyHeight = 272;
    const naturalWidth = vaseSprites.body?.naturalWidth || defaultBodyWidth;
    const naturalHeight = vaseSprites.body?.naturalHeight || defaultBodyHeight;
    const targetHeight = 220;
    const baseScale = Math.min(vaseWidth / naturalWidth, targetHeight / naturalHeight);
    const scale = baseScale * 1.35;

    const scaledWidth = naturalWidth * scale;
    const scaledHeight = naturalHeight * scale;
    const destX = baseX - scaledWidth / 2;
    const destY = baseY - scaledHeight;
    const lipNaturalHeight = vaseSprites.lip?.naturalHeight || 32;
    const lipHeight = lipNaturalHeight * scale;

    return {
      baseX,
      baseY,
      stemAnchorY: baseY - 12,
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