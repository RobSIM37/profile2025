import { SLOT_POSITIONS, SLOT_DRAW_ORDER, SLOT_SIZE, DEFAULT_SLOT_CODES, SOURCE_BOXES, SOURCE_COLUMNS_META, SLOT_HITBOX_SCALE, SLOT_CLICK_BOUNDS } from '../state/slots.js';
import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from '../canvas/constants.js';
import { MASTER_FLORIST_LAYOUT } from '../state/layout.js';

const STEM_STYLES = {
  stroke: '#2d5230',
  width: 6,
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
    const drag = gameState?.drag || null;

    paintWorkbench();
    paintFlowerColumns(drag);
    paintVaseLip(vaseMetrics);
    paintStemsLayer(slots, vaseMetrics);
    paintVaseBody(vaseMetrics);
    paintDropTargets(slots, hoverId, drag);
    paintFlowersLayer(slots);
    paintDragPreview(drag);
    paintEmptySlotPlaceholders(slots);
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

    const benchConfig = MASTER_FLORIST_LAYOUT.bench || {};
    const benchHeight = benchConfig.height ?? 140;
    const benchY = MF_CANVAS_HEIGHT - benchHeight;
    const trimHeight = benchConfig.trimHeight ?? 4;
    const shadowHeight = benchConfig.shadowHeight ?? 6;

    if (backgroundSprite.ready) {
      ctx.drawImage(backgroundSprite.image, 0, 0, MF_CANVAS_WIDTH, benchY);
    } else {
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, MF_CANVAS_WIDTH, benchY);
    }

    ctx.fillStyle = COLORS.benchTop;
    ctx.fillRect(0, benchY, MF_CANVAS_WIDTH, benchHeight);
    ctx.fillRect(0, MF_CANVAS_HEIGHT - trimHeight, MF_CANVAS_WIDTH, trimHeight);

    ctx.fillStyle = COLORS.benchShadow;
    ctx.fillRect(0, benchY - shadowHeight, MF_CANVAS_WIDTH, shadowHeight);
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
      clickBounds: SLOT_CLICK_BOUNDS[index] || null,
    }));
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
    const meta = getFlowerMeta(drag.code);
    const color = meta.color || 'rgba(255, 255, 255, 0.45)';
    const hoverIndex = typeof hoverId === 'string' && hoverId.startsWith('slot-') ? Number(hoverId.slice(5)) : null;

    slots.forEach((slot) => {
      if (!slot) return;
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

  function paintDragPreview(drag) {
    if (!drag || drag.x == null || drag.y == null) return;
    const width = drag.width ?? SLOT_SIZE.width;
    const height = drag.height ?? SLOT_SIZE.height;
    const offsetX = drag.offsetX ?? width / 2;
    const offsetY = drag.offsetY ?? height / 2;
    const drawX = drag.x - offsetX;
    const drawY = drag.y - offsetY;
    ctx.save();
    ctx.globalAlpha = 0.75;
    drawSlotFlower(drag.code, drawX, drawY, width, height);
    ctx.restore();
  }

  function paintEmptySlotPlaceholders() {
    // Dev hitbox outlines disabled.
  }

  function getVaseMetrics() {
    const { sourceColumns, bench, vase } = MASTER_FLORIST_LAYOUT;
    const columnsMeta = SOURCE_COLUMNS_META;
    const columnDefs = sourceColumns?.columns ?? [];
    const benchConfig = bench || {};
    const vaseConfig = vase || {};

    const basePadding = benchConfig.basePadding ?? 16;
    const minWidth = vaseConfig.minWidth ?? 240;

    let leftBoundary = 0;
    let rightBoundary = MF_CANVAS_WIDTH;

    if (columnDefs.length && columnsMeta.length) {
      const fallbackLeft = columnsMeta[0];
      const fallbackRight = columnsMeta[columnsMeta.length - 1];
      const leftDef = columnDefs[0];
      const rightDef = columnDefs[columnDefs.length - 1];

      const leftMeta = leftDef ? columnsMeta.find((col) => col.id === leftDef.id) || fallbackLeft : fallbackLeft;
      const rightMeta = rightDef ? columnsMeta.find((col) => col.id === rightDef.id) || fallbackRight : fallbackRight;

      const leftGap = leftDef?.gapAfter ?? sourceColumns?.gapAfter ?? 0;
      const rightGap = rightDef?.gapBefore ?? sourceColumns?.gapBefore ?? 0;

      leftBoundary = (leftMeta?.x ?? 0) + (leftMeta?.width ?? 0) + leftGap;
      rightBoundary = (rightMeta?.x ?? MF_CANVAS_WIDTH) - rightGap;
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
    SOURCE_COLUMNS_META.forEach((column) => {
      const boxes = SOURCE_BOXES_BY_COLUMN[column.id] || [];
      if (!boxes.length) return;

      roundRect(ctx, column.x, column.y, column.width, column.height, 18, true, true, {
        fillStyle: COLORS.columnFill,
        strokeStyle: COLORS.columnStroke,
      });

      boxes.forEach((box) => {
        const hideFlower = Boolean(drag && drag.sourceColumn === box.column && drag.sourceIndex === box.columnIndex);
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
  image.src = new URL('../assets/background.png', import.meta.url).href;

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

