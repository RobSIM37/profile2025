// Light Houses game engine: board model, moves, generator, seeding

export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seedStr = '') {
  const seed = xmur3(String(seedStr))();
  return mulberry32(seed);
}

export function levelToSize(level, maxSize = 9) {
  // Plateau lengths per size s using C(s,3) for s=3..maxSize
  const lengths = [];
  for (let s = 3; s <= maxSize; s++) lengths.push(nCr(s, 3));
  let cum = 0;
  for (let i = 0; i < lengths.length; i++) {
    cum += lengths[i];
    if (level <= cum) return 3 + i;
  }
  return maxSize;
}

export function nCr(n, r) {
  if (r > n) return 0;
  if (r === 0 || r === n) return 1;
  let num = 1, den = 1;
  for (let i = 1; i <= r; i++) {
    num *= n - (r - i);
    den *= i;
  }
  return Math.round(num / den);
}

export function intendedSteps(level, size) {
  return (size - 1) + Math.floor(0.8 * level);
}

export function makeBoard(size, fill = false) {
  const n = size * size;
  const arr = new Uint8Array(n);
  if (fill) arr.fill(1);
  return arr;
}

export function applyMove(board, size, idx) {
  const r = Math.floor(idx / size);
  const c = idx % size;
  toggle(board, size, r, c);
  toggle(board, size, r - 1, c);
  toggle(board, size, r + 1, c);
  toggle(board, size, r, c - 1);
  toggle(board, size, r, c + 1);
}

function toggle(board, size, r, c) {
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  const i = r * size + c;
  board[i] = board[i] ^ 1;
}

export function isSolved(board) {
  for (let i = 0; i < board.length; i++) if (board[i] === 0) return false;
  return true;
}

export function generate(size, level, seedStr) {
  const rng = rngFromSeed(seedStr || `lv:${level}:sz:${size}`);
  const board = makeBoard(size, false);
  const k = intendedSteps(level, size);
  const n = size * size;
  const used = new Set();
  while (used.size < Math.min(k, n)) {
    const idx = Math.floor(rng() * n);
    if (!used.has(idx)) {
      used.add(idx);
      applyMove(board, size, idx);
    }
  }
  return { board, movesApplied: Array.from(used) };
}

