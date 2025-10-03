import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT, MF_DROP_ZONE_COUNT } from '../canvas/constants.js';
import {
  createChatSession,
  addCustomerPuzzleIntro,
  addCustomerResponse,
  addSystemMessage,
  recordPlayerGuess,
} from './chatEngine.js';
import { createPuzzle, evaluateGuess } from './puzzleEngine.js';
import { buildCustomerFeedback, buildCustomerAcceptance } from './dialogueEngine.js';

const STORAGE_PREFIX = 'mf:';
const SETTINGS_STORAGE_KEY = `${STORAGE_PREFIX}settings`;
const LONGEST_STREAK_STORAGE_KEY = `${STORAGE_PREFIX}longestStreak`;

const DEFAULT_VIEWPORT = {
  width: MF_CANVAS_WIDTH,
  height: MF_CANVAS_HEIGHT,
  displayWidth: MF_CANVAS_WIDTH,
  displayHeight: MF_CANVAS_HEIGHT,
  scaleX: 1,
  scaleY: 1,
  devicePixelRatio: 1,
};

const DEFAULT_SETTINGS = Object.freeze({
  footTraffic: 'steady',
  atmosphere: 'balanced',
});

const DEFAULT_STATS = Object.freeze({
  daysWithoutComplaint: 0,
  longestDaysWithoutComplaint: 0,
  lastComplaintTimestamp: null,
});

function createEmptySolution(length = MF_DROP_ZONE_COUNT) {
  return new Array(length).fill(null);
}

export function hasActiveMasterFloristCustomer(state) {
  return Boolean(state?.customerParade?.activeId);
}

export function createMasterFloristState() {
  const seed = Date.now();
  const settings = loadStoredSettings();
  const stats = loadStoredStats();
  const queue = createDefaultQueueState();

  const state = {
    seed,
    hoverStemId: null,
    pendingDrops: [],
    drag: null,
    clock: { tick: 0, elapsedMs: 0, deltaMs: 0 },
    viewport: { ...DEFAULT_VIEWPORT },
    puzzle: null,
    queue,
    activeCustomer: null,
    customerParade: null,
    customerUi: null,
    settings,
    stats,
    puzzleHistory: [],
    chatSession: null,
    _chatSyncedVersion: null,
    gameOver: false,
    gameOverMessage: '',
    onGameOver: null,
  };

  startMasterFloristPuzzle(state, { mood: 'happy', seed });
  return state;
}

export function resetMasterFloristState(state) {
  const freshSeed = Date.now();
  state.seed = freshSeed;
  state.hoverStemId = null;
  state.pendingDrops = [];
  state.drag = null;
  state.clock = { tick: 0, elapsedMs: 0, deltaMs: 0 };
  state.viewport = { ...DEFAULT_VIEWPORT };
  state.puzzleHistory = [];
  state.queue = createDefaultQueueState();
  state.activeCustomer = null;
  state.customerParade = null;
  state.gameOver = false;
  state.gameOverMessage = '';
  startMasterFloristPuzzle(state, { mood: 'happy', seed: freshSeed });
  if (!state.settings) {
    state.settings = loadStoredSettings();
  }
  if (!state.stats) {
    state.stats = loadStoredStats();
  } else {
    state.stats.daysWithoutComplaint = 0;
    state.stats.lastComplaintTimestamp = null;
    state.stats.longestDaysWithoutComplaint = Math.max(
      Number(state.stats.longestDaysWithoutComplaint) || 0,
      loadStoredLongestStreak(),
    );
  }
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

export function resetMasterFloristSolution(state) {
  if (!state?.puzzle) return;
  const slotCount = state.puzzle?.slotCount ?? MF_DROP_ZONE_COUNT;
  state.puzzle.solution = createEmptySolution(slotCount);
}

export function updateMasterFloristSolution(state, index, code) {
  if (!state?.puzzle) return;
  if (index < 0 || index >= state.puzzle.solution.length) return;
  if (typeof code === 'string' && code.length) {
    state.puzzle.solution[index] = code.toLowerCase();
  } else {
    state.puzzle.solution[index] = null;
  }
}

export function setMasterFloristDrag(state, drag) {
  if (!state) return;
  if (!hasActiveMasterFloristCustomer(state)) {
    state.drag = null;
    return;
  }
  state.drag = drag ? { ...drag } : null;
}

export function updateMasterFloristDrag(state, updates = {}) {
  if (!state?.drag) return;
  if (!hasActiveMasterFloristCustomer(state)) {
    state.drag = null;
    return;
  }
  Object.assign(state.drag, updates);
}

export function getMasterFloristSettings() {
  return loadStoredSettings();
}

export function setMasterFloristSettings(state, updates = {}) {
  const merged = {
    ...loadStoredSettings(),
    ...filterSettings(updates),
  };
  if (state) {
    state.settings = { ...merged };
  }
  persistSettings(merged);
  return merged;
}

export function updateMasterFloristStats(state, updates = {}) {
  if (!state) return;
  const baseline = state.stats ?? loadStoredStats();
  const next = {
    ...baseline,
    ...filterStats(updates),
  };

  if (next.longestDaysWithoutComplaint > loadStoredLongestStreak()) {
    persistLongestStreak(next.longestDaysWithoutComplaint);
  }

  state.stats = next;
}

export function clearMasterFloristStoredData() {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {}
  try {
    storage.removeItem(LONGEST_STREAK_STORAGE_KEY);
  } catch {}
}

export function submitMasterFloristGuess(state) {
  if (!state?.puzzle) return null;
  if (!canSubmitMasterFloristGuess(state)) return null;
  const slotCount = state.puzzle.slotCount ?? MF_DROP_ZONE_COUNT;
  const solution = Array.isArray(state.puzzle.solution)
    ? state.puzzle.solution.slice(0, slotCount)
    : [];

  const evaluation = evaluateGuess(state.puzzle, solution);
  const entry = {
    guess: evaluation.guess,
    evaluation,
    at: Date.now(),
  };

  if (!Array.isArray(state.puzzle.history)) {
    state.puzzle.history = [];
  }
  state.puzzle.history.push(entry);

  if (state.chatSession) {
    recordPlayerGuess(state.chatSession, {
      puzzle: state.puzzle,
      guessCodes: evaluation.guess,
      evaluation,
    });
    appendMasterFloristFeedback(state, evaluation);
  }

  syncMasterFloristChat(state);

  return evaluation;
}

export function syncMasterFloristChat(state) {
  const ui = state?.customerUi;
  const session = state?.chatSession;
  if (!ui || typeof ui.setEntries !== 'function' || !session) return;
  const version = session.version ?? 0;
  if (state._chatSyncedVersion === version) return;
  ui.setEntries(session.entries || []);
  state._chatSyncedVersion = version;
}

export function addMasterFloristSystemMessage(state, text, label) {
  if (!state?.chatSession) return;
  addSystemMessage(state.chatSession, text, { label });
  syncMasterFloristChat(state);
}

export function canSubmitMasterFloristGuess(state) {
  if (!state?.puzzle) return false;
  if (!hasActiveMasterFloristCustomer(state)) return false;
  const slotCount = state.puzzle.slotCount ?? Math.min(MF_DROP_ZONE_COUNT, state.puzzle.solution?.length ?? MF_DROP_ZONE_COUNT);
  const solution = state.puzzle.solution || [];
  return solution.slice(0, slotCount).every((code) => Boolean(code));
}

export function startMasterFloristPuzzle(state, { mood = 'happy', customer = null, seed = Date.now() } = {}) {
  if (!state || state.gameOver) return;
  if (!Array.isArray(state.puzzleHistory)) {
    state.puzzleHistory = [];
  }

  if (state.puzzle) {
    state.puzzleHistory.push({
      id: state.puzzle.id,
      solvedAt: Date.now(),
      history: state.puzzle.history || [],
    });
  }

  const puzzle = createMasterFloristPuzzle(seed, mood);
  const activeCustomer = customer ? { ...customer } : state.activeCustomer ? { ...state.activeCustomer } : null;
  state.puzzle = puzzle;
  state.hoverStemId = null;
  state.pendingDrops = [];
  state.drag = null;
  state.activeCustomer = activeCustomer;

  state.chatSession = createChatSession({ puzzle, customer: activeCustomer });
  addCustomerPuzzleIntro(state.chatSession, { puzzle, customer: activeCustomer });
  state._chatSyncedVersion = null;
  syncMasterFloristChat(state);
}

export function appendMasterFloristFeedback(state, evaluation) {
  if (!state?.chatSession || !state?.puzzle) return;
  const history = Array.isArray(state.puzzle.history) ? state.puzzle.history : [];
  const previousEntry = history.length >= 2 ? history[history.length - 2] : null;
  const previousEvaluation = previousEntry?.evaluation || null;
  const customer = state.activeCustomer || state.chatSession.customer || null;
  const payload = evaluation?.isMatch
    ? buildCustomerAcceptance({ puzzle: state.puzzle, evaluation, customer })
    : buildCustomerFeedback({
        puzzle: state.puzzle,
        evaluation,
        previousEvaluation,
        customer,
      });
  addCustomerResponse(state.chatSession, payload);
}

export function handleMasterFloristPuzzleSuccess(state) {
  if (!state) return;
  if (!state.stats) {
    state.stats = loadStoredStats();
  }
  const stats = state.stats;
  stats.daysWithoutComplaint = (Number(stats.daysWithoutComplaint) || 0) + 1;
  if (stats.daysWithoutComplaint > (Number(stats.longestDaysWithoutComplaint) || 0)) {
    stats.longestDaysWithoutComplaint = stats.daysWithoutComplaint;
    persistLongestStreak(stats.longestDaysWithoutComplaint);
  }
}

export function handleMasterFloristComplaint(state) {
  if (!state) return;
  if (!state.stats) {
    state.stats = loadStoredStats();
  }
  state.stats.daysWithoutComplaint = 0;
  state.stats.lastComplaintTimestamp = Date.now();
}

export function triggerMasterFloristGameOver(state, message) {
  if (!state || state.gameOver) return false;
  state.gameOver = true;
  state.gameOverMessage = message || 'The flower shop had to close due to too many complaints.';
  try {
    state.onGameOver?.(state.gameOverMessage);
  } catch (err) {
    console.error('Master Florist game over handler failed', err);
  }
  return true;
}

export function collapseMasterFloristSolution(solution = []) {
  return solution.filter((code) => code != null && code !== '');
}

export function isMasterFloristSolutionMatch(state) {
  if (!state?.puzzle) return false;
  const solution = state.puzzle.solution || [];
  const slotCount = state.puzzle.slotCount ?? solution.length;
  if (slotCount === 0) return false;
  if (solution.length < slotCount) return false;
  if (solution.slice(0, slotCount).some((code) => !code)) return false;
  const evaluation = evaluateGuess(state.puzzle, solution);
  return Boolean(evaluation?.isMatch);
}

export function createMasterFloristPuzzle(seed, mood = 'happy') {
  const puzzle = createPuzzle({ seed, mood });
  puzzle.solution = createEmptySolution(puzzle.slotCount);
  return puzzle;
}

function createDefaultQueueState() {
  return {
    entries: [],
    lastSpawnTimestamp: 0,
    pendingSeeds: [],
  };
}

function loadStoredSettings() {
  const storage = getLocalStorage();
  if (!storage) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...filterSettings(parsed),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(settings) {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    const payload = JSON.stringify(filterSettings(settings));
    storage.setItem(SETTINGS_STORAGE_KEY, payload);
  } catch {}
}

function filterSettings(source = {}) {
  const normalized = {};
  if (typeof source.footTraffic === 'string' && source.footTraffic.length) {
    normalized.footTraffic = source.footTraffic;
  }
  if (typeof source.atmosphere === 'string' && source.atmosphere.length) {
    normalized.atmosphere = source.atmosphere;
  }
  return normalized;
}

function loadStoredStats() {
  const longest = loadStoredLongestStreak();
  return {
    ...DEFAULT_STATS,
    longestDaysWithoutComplaint: longest,
  };
}

function filterStats(source = {}) {
  const normalized = {};
  if (Number.isFinite(source.daysWithoutComplaint)) {
    normalized.daysWithoutComplaint = Math.max(0, Number(source.daysWithoutComplaint));
  }
  if (Number.isFinite(source.longestDaysWithoutComplaint)) {
    normalized.longestDaysWithoutComplaint = Math.max(0, Number(source.longestDaysWithoutComplaint));
  }
  if (Number.isFinite(source.lastComplaintTimestamp) || source.lastComplaintTimestamp === null) {
    normalized.lastComplaintTimestamp =
      source.lastComplaintTimestamp == null ? null : Number(source.lastComplaintTimestamp);
  }
  return normalized;
}

function loadStoredLongestStreak() {
  const storage = getLocalStorage();
  if (!storage) return 0;
  try {
    const raw = storage.getItem(LONGEST_STREAK_STORAGE_KEY);
    if (!raw) return 0;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.floor(numeric);
  } catch {
    return 0;
  }
}

function persistLongestStreak(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    const safe = Math.max(0, Math.floor(Number(value) || 0));
    storage.setItem(LONGEST_STREAK_STORAGE_KEY, String(safe));
  } catch {}
}

function getLocalStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {}
  return null;
}




