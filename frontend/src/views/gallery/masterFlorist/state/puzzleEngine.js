import { MF_DROP_ZONE_COUNT } from '../canvas/constants.js';

const DEFAULT_SLOT_COUNT = MF_DROP_ZONE_COUNT;

export const FLOWER_LIBRARY = [
  { code: 'y', name: 'Daisy', color: '#f9e678' },
  { code: 'p', name: 'Iris', color: '#b39deb' },
  { code: 'w', name: 'Lily', color: '#f4f2eb' },
  { code: 'o', name: 'Marigold', color: '#f4b270' },
  { code: 'r', name: 'Rose', color: '#f2857a' },
  { code: 'b', name: 'Violet', color: '#9aa7f7' },
];

export const FLOWER_CODES = FLOWER_LIBRARY.map((entry) => entry.code);

export const FLOWER_COLOR_BY_CODE = FLOWER_LIBRARY.reduce((acc, entry) => {
  acc[entry.code] = entry.color;
  acc[entry.code.toUpperCase()] = entry.color;
  return acc;
}, Object.create(null));

export function createPuzzle({ seed = Date.now(), mood = 'happy', slotCount } = {}) {
  const resolvedSlotCount = resolveSlotCount(mood, slotCount);
  const rng = makeSeededRandom(seed);
  const target = new Array(resolvedSlotCount).fill(null).map(() => randomFlowerCode(rng));

  return {
    id: `mf-puzzle-${seed}-${Math.random().toString(16).slice(2, 8)}`,
    seed,
    createdAt: Date.now(),
    mood,
    slotCount: resolvedSlotCount,
    target,
    solution: new Array(resolvedSlotCount).fill(null),
    history: [],
  };
}

export function evaluateGuess(puzzle, guessCodes = []) {
  if (!puzzle) {
    return { exactMatches: 0, partialMatches: 0, isMatch: false, guess: [] };
  }

  const slotCount = Math.max(0, Math.min(puzzle.slotCount ?? DEFAULT_SLOT_COUNT, DEFAULT_SLOT_COUNT));
  const normalizedGuess = normalizeGuessCodes(guessCodes, slotCount);
  const target = normalizeGuessCodes(puzzle.target, slotCount);

  const guessUsed = new Array(slotCount).fill(false);
  const targetUsed = new Array(slotCount).fill(false);
  let exactMatches = 0;
  let partialMatches = 0;

  for (let i = 0; i < slotCount; i += 1) {
    if (normalizedGuess[i] && normalizedGuess[i] === target[i]) {
      exactMatches += 1;
      guessUsed[i] = true;
      targetUsed[i] = true;
    }
  }

  for (let i = 0; i < slotCount; i += 1) {
    if (guessUsed[i]) continue;
    const guessCode = normalizedGuess[i];
    if (!guessCode) continue;
    for (let j = 0; j < slotCount; j += 1) {
      if (targetUsed[j]) continue;
      if (target[j] === guessCode) {
        partialMatches += 1;
        targetUsed[j] = true;
        break;
      }
    }
  }

  return {
    guess: normalizedGuess,
    exactMatches,
    partialMatches,
    isMatch: exactMatches === slotCount,
  };
}

export function describePuzzlePlain(puzzle) {
  if (!puzzle) return 'I need a bouquet, please.';
  const displayCodes = normalizeGuessCodes(puzzle.target, puzzle.slotCount).map((code) => code.toUpperCase());
  if (!displayCodes.length) {
    return 'I need a bouquet, please.';
  }
  return `Here is what I would like: ${displayCodes.join(' ')}`;
}

export function normalizeFlowerCode(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return FLOWER_CODES.includes(trimmed) ? trimmed : null;
}

export function normalizeGuessCodes(codes = [], length = DEFAULT_SLOT_COUNT) {
  const normalized = new Array(length).fill(null);
  for (let i = 0; i < length; i += 1) {
    normalized[i] = normalizeFlowerCode(codes[i]) ?? null;
  }
  return normalized;
}

export function buildGuessGridRows(codes = [], columnsPerRow = 3) {
  const rows = [];
  const normalized = normalizeGuessCodes(codes, Math.max(codes.length, columnsPerRow * Math.ceil(codes.length / columnsPerRow)));
  for (let i = 0; i < normalized.length; i += columnsPerRow) {
    rows.push(normalized.slice(i, i + columnsPerRow));
  }
  return rows;
}

function resolveSlotCount(mood, override) {
  if (Number.isFinite(override) && override > 0) {
    return Math.min(DEFAULT_SLOT_COUNT, Math.max(1, Math.floor(override)));
  }
  switch ((mood || '').toLowerCase()) {
    case 'angry':
      return DEFAULT_SLOT_COUNT;
    case 'neutral':
      return DEFAULT_SLOT_COUNT;
    case 'happy':
    default:
      return DEFAULT_SLOT_COUNT;
  }
}

function randomFlowerCode(rng) {
  const index = Math.floor(rng() * FLOWER_CODES.length);
  return FLOWER_CODES[index] || FLOWER_CODES[0];
}

function makeSeededRandom(seed) {
  let a = (Number.isFinite(seed) ? seed : Date.now()) >>> 0;
  if (a === 0) a = 0x1;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

