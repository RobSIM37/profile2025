import { STORAGE } from '../../consts/timesweeper.js';
import { getJSON, setJSON } from '../../lib/storage.js';

export function statsKey(W, H, M) {
  return `${STORAGE.statsPrefix}${W}x${H}x${M}`;
}

export function readStats(W, H, M) {
  return getJSON(statsKey(W, H, M), {}) || {};
}

export function writeStats(W, H, M, stats) {
  setJSON(statsKey(W, H, M), stats || {});
}

