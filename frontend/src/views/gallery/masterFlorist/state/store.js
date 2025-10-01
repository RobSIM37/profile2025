import { getCustomerLineup } from '../assets/customers/lineup.js';
import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT, MF_DROP_ZONE_COUNT } from '../canvas/constants.js';
import { DEFAULT_SLOT_CODES } from './slots.js';

const DEFAULT_VIEWPORT = {
  width: MF_CANVAS_WIDTH,
  height: MF_CANVAS_HEIGHT,
  displayWidth: MF_CANVAS_WIDTH,
  displayHeight: MF_CANVAS_HEIGHT,
  scaleX: 1,
  scaleY: 1,
  devicePixelRatio: 1,
};

const FLOWER_CODES = ['d', 'p', 'w', 'o', 'r', 'b'];

export function createMasterFloristState() {
  const seed = Date.now();
  return {
    seed,
    customers: getCustomerLineup(),
    benchSlots: buildBenchSlots(),
    hoverStemId: null,
    pendingDrops: [],
    clock: { tick: 0, elapsedMs: 0, deltaMs: 0 },
    viewport: { ...DEFAULT_VIEWPORT },
    puzzle: createMasterFloristPuzzle(seed),
  };
}

export function resetMasterFloristState(state) {
  const freshSeed = Date.now();
  state.seed = freshSeed;
  state.customers = getCustomerLineup();
  state.benchSlots.forEach((slot) => {
    slot.stemId = null;
  });
  state.hoverStemId = null;
  state.pendingDrops = [];
  state.clock = { tick: 0, elapsedMs: 0, deltaMs: 0 };
  state.viewport = { ...DEFAULT_VIEWPORT };
  state.puzzle = createMasterFloristPuzzle(freshSeed);
}

export function updateMasterFloristClock(state, info = {}) {
  if (!state || !state.clock) return;
  state.clock.tick = info.tick ?? state.clock.tick;
  state.clock.elapsedMs = info.elapsedMs ?? state.clock.elapsedMs;
  state.clock.deltaMs = info.deltaMs ?? state.clock.deltaMs;
}

export function updateMasterFloristViewport(state, metrics = {}) {
  if (!state || !state.viewport) return;
  state.viewport = {
    ...state.viewport,
    ...metrics,
  };
}

export function updateMasterFloristSolution(state, index, code) {
  if (!state?.puzzle) return;
  if (index < 0 || index >= state.puzzle.solution.length) return;
  state.puzzle.solution[index] = typeof code === 'string' && code.length ? code : null;
}

export function collapseMasterFloristSolution(solution = []) {
  return solution.filter((code) => code != null && code !== '');
}

export function isMasterFloristSolutionMatch(state) {
  if (!state?.puzzle) return false;
  const { target, solution } = state.puzzle;
  const collapsed = collapseMasterFloristSolution(solution);
  if (collapsed.length !== target.length) return false;
  return target.every((code, idx) => code === collapsed[idx]);
}

export function createMasterFloristPuzzle(seed) {
  const random = makeSeededRandom(seed);
  const maxLength = Math.min(MF_DROP_ZONE_COUNT, FLOWER_CODES.length);
  const length = 2 + Math.floor(random() * Math.max(1, maxLength - 1));
  const target = [];
  for (let i = 0; i < length; i += 1) {
    const code = FLOWER_CODES[Math.floor(random() * FLOWER_CODES.length)];
    target.push(code);
  }
  return {
    target,
    solution: DEFAULT_SLOT_CODES.slice(0, MF_DROP_ZONE_COUNT),
  };
}

function buildBenchSlots() {
  return new Array(MF_DROP_ZONE_COUNT).fill(null).map((_, index) => ({
    id: `slot-${index}`,
    stemId: null,
  }));
}

function makeSeededRandom(seed) {
  const fallback = typeof seed === 'number' && Number.isFinite(seed) ? seed : Date.now();
  return mulberry32((fallback >>> 0) || 0x1);
}

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}