import { createCanvasRenderer } from './canvasRenderer.js';

const STORAGE_KEY = 'coderain:options';

let controller = null;
let state = {
  enabled: true,
  options: {},
  defaults: {},
};

function loadStoredOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return typeof obj === 'object' && obj ? obj : {};
  } catch {
    return {};
  }
}

function persistOptions(opts) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(opts || {})); } catch {}
}

export function mountCodeRain(options = {}) {
  // Allow a friendlier alias: `flicker` -> `switchRate`
  const opts = { ...options };
  if (typeof opts.flicker === 'number' && !('switchRate' in opts)) {
    opts.switchRate = opts.flicker;
  }
  // Accept misspelling alias: `dropsPerCoulm` -> `dropsPerColumn`
  if (typeof opts.dropsPerCoulm === 'number' && !('dropsPerColumn' in opts)) {
    opts.dropsPerColumn = opts.dropsPerCoulm;
  }
  // Merge any stored preferences on top of provided defaults
  const stored = loadStoredOptions();
  const merged = { ...opts, ...stored };
  controller = createCanvasRenderer(merged);
  controller.mount(document.body);
  state.options = { ...state.options, ...merged };
  state.defaults = { ...opts };
  state.enabled = true;
  persistOptions(state.options);
  return controller;
}

export function getOptions() {
  return { ...state.options };
}

export function setOptions(partial) {
  const next = { ...state.options, ...partial };
  // Guardrails / clamps for performance and sanity
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  if (typeof next.glyphSize === 'number' && isFinite(next.glyphSize)) {
    next.glyphSize = Math.round(clamp(next.glyphSize, 12, 64));
  }
  if (typeof next.dropsPerColumn === 'number' && isFinite(next.dropsPerColumn)) {
    next.dropsPerColumn = Math.round(clamp(next.dropsPerColumn, 1, 8));
  }
  if (typeof next.speedMin === 'number') next.speedMin = clamp(next.speedMin, 1, 60);
  if (typeof next.speedMax === 'number') next.speedMax = clamp(next.speedMax, 1, 60);
  if (next.speedMax < next.speedMin) next.speedMax = next.speedMin;
  if (typeof next.trailMin === 'number') next.trailMin = clamp(next.trailMin, 1, 120);
  if (typeof next.trailMax === 'number') next.trailMax = clamp(next.trailMax, 1, 120);
  if (next.trailMax < next.trailMin) next.trailMax = next.trailMin;
  if (typeof next.switchRate === 'number') next.switchRate = clamp(next.switchRate, 0, 1);
  if (typeof next.minFade === 'number') next.minFade = clamp(next.minFade, 0.1, 4);
  if (typeof next.maxFade === 'number') next.maxFade = clamp(next.maxFade, 0.1, 4);
  if (next.maxFade < next.minFade) next.maxFade = next.minFade;

  state.options = next;
  if (controller) controller.update(state.options);
  persistOptions(state.options);
}

export function setEnabled(enabled) {
  state.enabled = !!enabled;
  if (!controller) return;
  if (state.enabled) {
    controller.canvas.style.display = 'block';
    controller.start();
  } else {
    controller.stop();
    controller.canvas.style.display = 'none';
  }
}

export function getEnabled() {
  return !!state.enabled;
}

export function resetOptions() {
  if (!state.defaults) return;
  setOptions({ ...state.defaults });
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function getDefaults() {
  return { ...state.defaults };
}
