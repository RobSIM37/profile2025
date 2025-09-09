import { buildCharSet, randomChar } from './characters.js';
import { createColumns } from './state.js';

export function createCanvasRenderer(userOptions = {}) {
  const defaults = {
    glyphSize: 16,
    colorHead: '#c8ffe3',
    colorTrail: '#52ffa1',
    fadeAlpha: 0.08, // legacy; not used when solid background is drawn each frame
    background: 'auto', // 'auto' uses computed body background; or any CSS color
    fontFamily: 'monospace',
    switchRate: 0.1, // chance a trail glyph changes when drawn
    speedMin: 8,
    speedMax: 18,
    trailMin: 8,
    trailMax: 24,
    dropsPerColumn: 1,
    minFade: 0.8,
    maxFade: 1.8,
    pausedWhenHidden: true,
    prefersReducedMotionStrategy: 'slow', // 'pause' | 'slow'
  };
  const opts = { ...defaults, ...userOptions };

  const dpr = () => (opts.dprAware === false ? 1 : window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.className = 'code-rain-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';
  const ctx = canvas.getContext('2d');

  let running = false;
  let rafId = 0;
  let lastT = 0;
  let charSet = buildCharSet();

  let geom = { width: 0, height: 0, glyphSize: opts.glyphSize };
  let grid = createColumns({ width: 1, height: 1, glyphSize: opts.glyphSize, speedMin: opts.speedMin, speedMax: opts.speedMax, trailMin: opts.trailMin, trailMax: opts.trailMax, dropsPerColumn: opts.dropsPerColumn, minFade: opts.minFade, maxFade: opts.maxFade });
  let bgColor = 'transparent';
  const pickDifferent = (prev) => {
    let ch = randomChar(charSet);
    if (charSet.length <= 1) return ch;
    // ensure visible change on each new drop
    let guard = 0;
    while (ch === prev && guard++ < 5) ch = randomChar(charSet);
    return ch;
  };

  function resize() {
    const pr = dpr();
    const width = Math.max(1, Math.floor(window.innerWidth));
    const height = Math.max(1, Math.floor(window.innerHeight));
    canvas.width = Math.floor(width * pr);
    canvas.height = Math.floor(height * pr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(pr, 0, 0, pr, 0, 0);

    geom = { width, height, glyphSize: opts.glyphSize };
    grid = createColumns({
      width,
      height,
      glyphSize: opts.glyphSize,
      speedMin: opts.speedMin,
      speedMax: opts.speedMax,
      trailMin: opts.trailMin,
      trailMax: opts.trailMax,
      dropsPerColumn: opts.dropsPerColumn,
      minFade: opts.minFade,
      maxFade: opts.maxFade,
    });

    ctx.font = `${opts.glyphSize}px ${opts.fontFamily}`;
    ctx.textBaseline = 'top';

    // Initialize per-drop head state
    for (const col of grid.columns) {
      for (const drop of col.drops) {
        drop.headChar = randomChar(charSet);
        drop.prevHeadRowI = null;
      }
    }

    // Resolve background color
    if (opts.background === 'auto') {
      bgColor = getComputedStyle(document.body).backgroundColor || '#000';
    } else {
      bgColor = opts.background;
    }
  }

  function drawFrame(dt) {
    const { width, height, glyphSize } = geom;

    // Solid background: clear previous frame to avoid visible cell artifacts
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const colW = glyphSize; // assume monospaced width equals size
    const rows = Math.floor(height / glyphSize);

    for (const col of grid.columns) {
      // Advance all drops and handle head char changes + resets
      for (const drop of col.drops) {
        drop.headRow += drop.speed * dt;
        const headRowI = Math.floor(drop.headRow);
        // Change head glyph when the head advances to a new row
        if (drop.prevHeadRowI !== headRowI) {
          drop.headChar = pickDifferent(drop.headChar);
          drop.prevHeadRowI = headRowI;
        }
        if (drop.headRow - drop.trail > rows) {
          // reset this drop above the screen via state helper
          grid.resetDrop(drop);
          drop.headChar = pickDifferent(drop.headChar);
        }
      }

      // Overtake: if two heads are within 1 row, drop the slower
      col.drops.sort((a, b) => a.headRow - b.headRow);
      for (let k = 0; k < col.drops.length - 1; ) {
        const a = col.drops[k];
        const b = col.drops[k + 1];
        if (b.headRow - a.headRow < 1) {
          const keepA = a.speed >= b.speed;
          col.drops.splice(keepA ? k + 1 : k, 1);
          continue;
        }
        k++;
      }

      // Top up to max drops
      while (col.drops.length < opts.dropsPerColumn) {
        const d = grid.newDrop();
        d.headChar = pickDifferent(undefined);
        col.drops.push(d);
      }

      // Draw all drops in this column
      const x = col.i * colW;
      for (const drop of col.drops) {
        const headRowI = Math.floor(drop.headRow);
        col.glyphs.set(headRowI, drop.headChar);
        for (let t = 0; t <= drop.trail; t++) {
          const row = headRowI - t;
          if (row < -drop.trail || row > rows) continue;
          if (t > 0 && Math.random() < opts.switchRate) col.glyphs.set(row, randomChar(charSet));
          const ch = col.glyphs.get(row) || randomChar(charSet);
          const f = 1 - t / (drop.trail + 1);
          const alpha = clamp01(Math.pow(easeOutCubic(f), drop.fadePow));
          ctx.fillStyle = t === 0 ? opts.colorHead : rgbaFromHex(opts.colorTrail, alpha * 0.9);
          ctx.fillText(ch, x, row * glyphSize);
        }
      }
    }
  }

  function loop(ts) {
    if (!running) return;
    if (!lastT) lastT = ts;
    const dt = Math.min(0.05, (ts - lastT) / 1000); // clamp to avoid huge jumps
    lastT = ts;
    if (!isHidden() || !opts.pausedWhenHidden) {
      drawFrame(dt);
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastT = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function destroy() {
    stop();
    window.removeEventListener('resize', resize);
    canvas.remove();
  }

  function mount(target = document.body) {
    target.appendChild(canvas);
    applyReducedMotionPolicy();
    resize();
    start();
    window.addEventListener('resize', resize);
  }

  function update(newOpts) {
    Object.assign(opts, newOpts);
    resize();
  }

  function applyReducedMotionPolicy() {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (mq.matches) {
        if (opts.prefersReducedMotionStrategy === 'pause') stop();
        else {
          // Slow: reduce speeds and trails
          opts.speedMin = 4; opts.speedMax = 8;
          opts.trailMin = 6; opts.trailMax = 12;
          opts.fadeAlpha = 0.12;
        }
      }
    };
    mq.addEventListener?.('change', apply);
    apply();
  }

  return { mount, start, stop, destroy, update, canvas };
}

function rgbaFromHex(hex, alpha) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function isHidden() {
  return document.hidden;
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
