
const KEY_MAX = 'lighthouses:maxLevel';
const KEY_LAST = 'lighthouses:lastLevel';
const KEY_SEED = 'lighthouses:lastSeed';

export function loadProgress() {
  const maxLevel = Number(localStorage.getItem(KEY_MAX) || '1') || 1;
  const lastLevel = Number(localStorage.getItem(KEY_LAST) || String(maxLevel)) || maxLevel;
  const lastSeed = localStorage.getItem(KEY_SEED) || '';
  return { maxLevel, lastLevel, lastSeed };
}

export function saveMaxLevel(n) {
  try { localStorage.setItem(KEY_MAX, String(n)); } catch {}
}

export function saveLastLevel(n) {
  try { localStorage.setItem(KEY_LAST, String(n)); } catch {}
}

export function saveLastSeed(seed) {
  try { localStorage.setItem(KEY_SEED, String(seed)); } catch {}
}

export const keys = { KEY_MAX, KEY_LAST, KEY_SEED };
