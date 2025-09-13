import { STORAGE, DEFAULT_FUSE_MS } from '../../consts/timesweeper.js';
import { getJSON, setJSON } from '../../lib/storage.js';

export function readFuse() {
  return getJSON(STORAGE.customFuseKey, {}) || {};
}

export function writeFuse(obj) {
  setJSON(STORAGE.customFuseKey, obj || {});
}

export function startingFuseMs(difficulty, bestMs) {
  if (difficulty === 'Custom') {
    const f = readFuse();
    const mm = Math.max(0, (f.mm | 0));
    const ss = Math.max(0, Math.min(59, (f.ss | 0)));
    return Math.max(1000, (mm * 60 + ss) * 1000);
  }
  const fallback = DEFAULT_FUSE_MS[difficulty] ?? DEFAULT_FUSE_MS.Easy;
  const best = (typeof bestMs === 'number' && isFinite(bestMs) && bestMs > 0) ? bestMs : fallback;
  return best;
}

