import { MF_DROP_ZONE_COUNT } from '../canvas/constants.js';

const DEFAULT_SLOT_COUNT = MF_DROP_ZONE_COUNT;

export const MASTER_FLORIST_DIFFICULTY_LEVELS = Object.freeze(['insane', 'hard', 'normal', 'easy']);
export const MASTER_FLORIST_DEFAULT_DIFFICULTY = 'normal';

const MASTER_FLORIST_DIFFICULTY_PENALTIES = Object.freeze({
  insane: 0,
  hard: 1,
  normal: 2,
  easy: 3,
});

const MOOD_BASE_SLOT_COUNT = Object.freeze({
  happy: 6,
  neutral: 5,
  angry: 4,
  complaint: 4,
});

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

export const FLOWER_NAME_BY_CODE = FLOWER_LIBRARY.reduce((acc, entry) => {
  acc[entry.code] = entry.name;
  acc[entry.code.toUpperCase()] = entry.name;
  return acc;
}, Object.create(null));

const WARM_CODES = new Set(['r', 'o', 'y']);
const COOL_CODES = new Set(['b', 'p', 'w']);

export const FLOWER_GROUP_BY_CODE = FLOWER_LIBRARY.reduce((acc, entry) => {
  const group = getFlowerGroup(entry.code);
  if (group) {
    acc[entry.code] = group;
    acc[entry.code.toUpperCase()] = group;
  }
  return acc;
}, Object.create(null));

export const FLOWER_GROUP_LABELS = Object.freeze({
  warm: 'warm',
  cool: 'cool',
});

const SLOT_COUNT_OPTIONS = Object.freeze({
  happy: [6, 5],
  neutral: [4, 3],
  angry: [2, 1],
  complaint: [2, 1],
  default: [MF_DROP_ZONE_COUNT],
});

export function createPuzzle({ seed = Date.now(), mood = 'happy', slotCount, difficulty = MASTER_FLORIST_DEFAULT_DIFFICULTY } = {}) {
  const normalizedSeed = Number.isFinite(seed) ? seed : Date.now();
  const rng = makeSeededRandom(normalizedSeed);
  const resolvedSlotCount = resolveSlotCount({ mood, override: slotCount, difficulty, rng });
  const target = new Array(resolvedSlotCount).fill(null).map(() => randomFlowerCode(rng));

  return {
    id: `mf-puzzle-${normalizedSeed}-${Math.random().toString(16).slice(2, 8)}`,
    seed: normalizedSeed,
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
    return { exactMatches: 0, partialMatches: 0, isMatch: false, guess: [], slotStates: [] };
  }

  const slotCount = Math.max(0, Math.min(puzzle.slotCount ?? DEFAULT_SLOT_COUNT, DEFAULT_SLOT_COUNT));
  const normalizedGuess = normalizeGuessCodes(guessCodes, slotCount);
  const target = normalizeGuessCodes(puzzle.target, slotCount);

  const guessUsed = new Array(slotCount).fill(false);
  const targetUsed = new Array(slotCount).fill(false);
  const slotStates = new Array(slotCount).fill('absent');
  let exactMatches = 0;
  let partialMatches = 0;

  for (let i = 0; i < slotCount; i += 1) {
    const guessCode = normalizedGuess[i];
    if (guessCode && guessCode === target[i]) {
      exactMatches += 1;
      guessUsed[i] = true;
      targetUsed[i] = true;
      slotStates[i] = 'exact';
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
        guessUsed[i] = true;
        slotStates[i] = 'misplaced';
        break;
      }
    }
    if (!guessUsed[i]) {
      slotStates[i] = 'absent';
    }
  }

  return {
    guess: normalizedGuess,
    exactMatches,
    partialMatches,
    isMatch: exactMatches === slotCount,
    slotStates,
  };
}

export function describePuzzlePlain(puzzle) {
  if (!puzzle) return 'I need a bouquet, please.';
  const displayCodes = normalizeGuessCodes(puzzle.target, puzzle.slotCount).map((code) => code?.toUpperCase?.() ?? '');
  const filtered = displayCodes.filter(Boolean);
  if (!filtered.length) {
    return 'I need a bouquet, please.';
  }
  return `Here is what I would like: ${filtered.join(' ')}`;
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
  const normalized = normalizeGuessCodes(
    codes,
    Math.max(codes.length, columnsPerRow * Math.ceil(codes.length / columnsPerRow)),
  );
  for (let i = 0; i < normalized.length; i += columnsPerRow) {
    rows.push(normalized.slice(i, i + columnsPerRow));
  }
  return rows;
}

export function getFlowerName(code) {
  return FLOWER_NAME_BY_CODE[code] || null;
}

export function getFlowerGroup(code) {
  if (!code) return null;
  const normalized = code.toLowerCase();
  if (WARM_CODES.has(normalized)) return 'warm';
  if (COOL_CODES.has(normalized)) return 'cool';
  return null;
}

function resolveSlotCount({ mood, override, difficulty, rng }) {
  if (Number.isFinite(override) && override > 0) {
    return Math.min(DEFAULT_SLOT_COUNT, Math.max(1, Math.floor(override)));
  }
  const key = typeof mood === 'string' ? mood.toLowerCase() : 'default';
  if (Object.prototype.hasOwnProperty.call(MOOD_BASE_SLOT_COUNT, key)) {
    const base = MOOD_BASE_SLOT_COUNT[key];
    const difficultyKey = typeof difficulty === 'string' ? difficulty.toLowerCase() : MASTER_FLORIST_DEFAULT_DIFFICULTY;
    const penalty =
      MASTER_FLORIST_DIFFICULTY_PENALTIES[difficultyKey] ??
      MASTER_FLORIST_DIFFICULTY_PENALTIES[MASTER_FLORIST_DEFAULT_DIFFICULTY];
    const resolved = base - penalty;
    return sanitizeSlotCount(Math.max(resolved, 1));
  }
  const options = SLOT_COUNT_OPTIONS[key] || SLOT_COUNT_OPTIONS.default;
  return pickFromOptions(options, rng);
}

function pickFromOptions(options, rng) {
  if (!Array.isArray(options) || options.length === 0) {
    return DEFAULT_SLOT_COUNT;
  }
  if (options.length === 1) {
    return sanitizeSlotCount(options[0]);
  }
  const randomSource = typeof rng === 'function' ? rng : Math.random;
  const index = Math.floor(randomSource() * options.length);
  const choice = options[Math.min(Math.max(index, 0), options.length - 1)];
  return sanitizeSlotCount(choice);
}

function sanitizeSlotCount(value) {
  if (!Number.isFinite(value)) return DEFAULT_SLOT_COUNT;
  return Math.min(DEFAULT_SLOT_COUNT, Math.max(1, Math.floor(value)));
}

function randomFlowerCode(rng) {
  const randomSource = typeof rng === 'function' ? rng : Math.random;
  const index = Math.floor(randomSource() * FLOWER_CODES.length);
  return FLOWER_CODES[Math.min(Math.max(index, 0), FLOWER_CODES.length - 1)] || FLOWER_CODES[0];
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