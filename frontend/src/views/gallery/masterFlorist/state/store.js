import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT, MF_DROP_ZONE_COUNT } from '../canvas/constants.js';
import {
  createChatSession,
  addCustomerPuzzleIntro,
  addCustomerResponse,
  addSystemMessage,
  recordPlayerGuess,
} from './chatEngine.js';
import { createPuzzle, evaluateGuess, normalizeGuessCodes, MASTER_FLORIST_DEFAULT_DIFFICULTY, MASTER_FLORIST_DIFFICULTY_LEVELS } from './puzzleEngine.js';
import { buildCustomerFeedback, buildCustomerAcceptance } from './dialogueEngine.js';
import { isSlotDisabledForLength, getEnabledSlotsForLength } from './slots.js';

const STORAGE_PREFIX = 'mf:';
const SETTINGS_STORAGE_KEY = `${STORAGE_PREFIX}settings`;
const LONGEST_STREAK_STORAGE_KEY = `${STORAGE_PREFIX}longestStreak`;
const DAY_ADVANCE_INTERVAL_MS = 30_000;
const MAX_CALENDAR_DISPLAY_VALUE = 99;

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
  footTraffic: 'relaxed',
  atmosphere: 'soothing',
  difficulty: MASTER_FLORIST_DEFAULT_DIFFICULTY,
});

const DEFAULT_STATS = Object.freeze({
  daysWithoutComplaint: 0,
  longestDaysWithoutComplaint: 0,
  lastComplaintTimestamp: null,
});
const HANDOFF_ANIMATION_DURATION_MS = 1_500;

export const MASTER_FLORIST_COMPLAINT_GAME_OVER_THRESHOLD = 20;


function createEmptySolution(length = MF_DROP_ZONE_COUNT) {
  return new Array(length).fill(null);
}

function createHandoffAnimationState(status = 'idle') {
  return {
    status,
    elapsed: 0,
    duration: HANDOFF_ANIMATION_DURATION_MS,
    progress: status === 'completed' ? 1 : 0,
  };
}

function createHandoffArrangementSnapshot(state, actorId = null) {
  const puzzle = state?.puzzle || null;
  const slotCount = getPuzzleSlotLimit(puzzle);
  const rawSolution = Array.isArray(puzzle?.solution) ? puzzle.solution : [];
  const normalizedSolution = rawSolution.slice(0, MF_DROP_ZONE_COUNT).map((entry) => normalizeSolutionEntry(entry));
  return {
    actorId,
    solution: normalizedSolution,
    slotCount,
    puzzleId: puzzle?.id ?? null,
    createdAt: Date.now(),
  };
}

function createMasterFloristTimers() {
  return {
    dayCounterMs: 0,
    dayIntervalMs: DAY_ADVANCE_INTERVAL_MS,
    gameElapsedMs: 0,
  };
}

function resetMasterFloristTimers(state) {
  if (!state) return;
  state.timers = createMasterFloristTimers();
}

function ensureMasterFloristTimers(state) {
  if (!state) return createMasterFloristTimers();
  if (!state.timers) {
    resetMasterFloristTimers(state);
  }
  return state.timers;
}

function createCalendarCounters() {
  return {
    daysSince: 0,
    longestDays: 0,
  };
}

function resetMasterFloristCalendar(state) {
  if (!state) return;
  state.calendar = createCalendarCounters();
  updateCalendarDaysDisplay(state, 0);
  updateCalendarLongestDisplay(state, 0);
}

function ensureCalendarCounters(state) {
  if (!state) return createCalendarCounters();
  if (!state.calendar) {
    state.calendar = createCalendarCounters();
  }
  return state.calendar;
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
    complaintDepartures: 0,
    chatSession: null,
    _chatSyncedVersion: null,
    gameOver: false,
    gameOverMessage: '',
    arrangementOffsetY: 0,
    handoffAnimation: createHandoffAnimationState(),
    handoffSnapshot: null,
    calendar: null,
    timers: null,
    solveTestTimerStart: null,
    onGameOver: null,
  };

  resetMasterFloristCalendar(state);
  resetMasterFloristTimers(state);
  resetSpeechBubbleState(state);

  startMasterFloristPuzzle(state, { mood: 'happy', seed, announce: false });
  return state;
}

export function resetMasterFloristState(state) {
  const freshSeed = Date.now();
  state.seed = freshSeed;
  state.hoverStemId = null;
  state.pendingDrops = [];
  state.drag = null;
  state.arrangementOffsetY = 0;
  resetMasterFloristHandoff(state);
  resetSpeechBubbleState(state);
  state.clock = { tick: 0, elapsedMs: 0, deltaMs: 0 };
  state.viewport = { ...DEFAULT_VIEWPORT };
  state.puzzleHistory = [];
  state.queue = createDefaultQueueState();
  state.activeCustomer = null;
  state.customerParade = null;
  state.complaintDepartures = 0;
  state.gameOver = false;
  state.gameOverMessage = '';
  state.solveTestTimerStart = null;
  resetMasterFloristCalendar(state);
  resetMasterFloristTimers(state);
  startMasterFloristPuzzle(state, { mood: 'happy', seed: freshSeed, announce: false });
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
  state.puzzle.solution = createEmptySolution(MF_DROP_ZONE_COUNT);
}

export function updateMasterFloristSolution(state, index, code) {
  if (!state?.puzzle) return;
  const solution = state.puzzle.solution;
  if (!Array.isArray(solution)) return;
  if (index < 0 || index >= solution.length) return;

  const slotLimit = getPuzzleSlotLimit(state.puzzle);
  const normalized = normalizeSolutionEntry(code);
  if (!normalized) {
    solution[index] = null;
    return;
  }

  if (normalized === 'n') {
    solution[index] = null;
    return;
  }

  if (isSlotDisabledForLength(slotLimit, index)) {
    return;
  }

  const currentValue = solution[index];
  const filledSlots = collapseMasterFloristSolution(solution, slotLimit).length;
  const currentIsFilled = isFilledSolutionEntry(currentValue);
  if (!currentIsFilled && filledSlots >= slotLimit) {
    return;
  }
  solution[index] = normalized;
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
  const slotCount = getPuzzleSlotLimit(state.puzzle);
  const solution = Array.isArray(state.puzzle.solution) ? state.puzzle.solution : [];
  const chatGuess = normalizeGuessCodes(solution, MF_DROP_ZONE_COUNT);
  const collapsed = collapseMasterFloristSolution(solution, slotCount);
  const guess = collapsed.slice(0, slotCount);
  while (guess.length < slotCount) {
    guess.push(null);
  }

  const previousEntry = Array.isArray(state.puzzle?.history) && state.puzzle.history.length
    ? state.puzzle.history[state.puzzle.history.length - 1]
    : null;
  const previousGuess = Array.isArray(previousEntry?.guess)
    ? previousEntry.guess
    : Array.isArray(previousEntry?.evaluation?.guess)
      ? previousEntry.evaluation.guess
      : null;
  if (Array.isArray(previousGuess) && areGuessArraysEqual(previousGuess, guess)) {
    return null;
  }

  const evaluation = evaluateGuess(state.puzzle, guess);
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
    const guessEntry = recordPlayerGuess(state.chatSession, {
      puzzle: state.puzzle,
      guessCodes: evaluation.guess,
      evaluation,
      displayGuess: chatGuess,
    });
    appendMasterFloristFeedback(state, { evaluation, guessEntry });
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
  const slotCount = getPuzzleSlotLimit(state.puzzle);
  const solution = state.puzzle.solution || [];
  const filled = collapseMasterFloristSolution(solution, slotCount).length;
  return filled >= slotCount && slotCount > 0;
}

export function startMasterFloristPuzzle(
  state,
  { mood = 'happy', customer = null, seed = Date.now(), announce = Boolean(customer) } = {},
) {
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

  const difficulty = state?.settings?.difficulty ?? MASTER_FLORIST_DEFAULT_DIFFICULTY;
  const puzzle = createMasterFloristPuzzle({ seed, mood, difficulty });
  const activeCustomer = customer ? { ...customer } : state.activeCustomer ? { ...state.activeCustomer } : null;
  state.puzzle = puzzle;
  const slotLimit = getPuzzleSlotLimit(puzzle);
  if (slotLimit === 6) {
    state.solveTestTimerStart = Date.now();
  } else {
    state.solveTestTimerStart = null;
  }
  state.hoverStemId = null;
  state.pendingDrops = [];
  state.drag = null;
  state.arrangementOffsetY = 0;
  resetMasterFloristHandoff(state);
  resetSpeechBubbleState(state);
  state.activeCustomer = activeCustomer;
  state.showButton = null;

  state.chatSession = createChatSession({ puzzle, customer: activeCustomer });
  let introEntry = null;
  if (announce && activeCustomer) {
    introEntry = addCustomerPuzzleIntro(state.chatSession, { puzzle, customer: activeCustomer });
  }
  state._chatSyncedVersion = null;
  syncMasterFloristChat(state);
  if (introEntry) {
    appendSpeechBubbleIntro(state, introEntry, puzzle);
  }
}


export function appendMasterFloristFeedback(state, { evaluation, guessEntry } = {}) {
  if (!state?.chatSession || !state?.puzzle || !evaluation) return null;
  const history = Array.isArray(state.puzzle.history) ? state.puzzle.history : [];
  const previousEntry = history.length >= 2 ? history[history.length - 2] : null;
  const previousEvaluation = previousEntry?.evaluation || null;
  const customer = state.activeCustomer || state.chatSession.customer || null;
  const payload = evaluation.isMatch
    ? buildCustomerAcceptance({ puzzle: state.puzzle, evaluation, previousEvaluation, customer })
    : buildCustomerFeedback({
        puzzle: state.puzzle,
        evaluation,
        previousEvaluation,
        customer,
      });
  const customerEntry = addCustomerResponse(state.chatSession, payload);
  appendSpeechBubbleTurn(state, {
    evaluation,
    customerEntry,
    guessEntry,
    puzzle: state.puzzle,
  });
  return customerEntry;
}


export function handleMasterFloristPuzzleSuccess(state) {
  if (!state) return;
  if (state.solveTestTimerStart != null && getPuzzleSlotLimit(state.puzzle) === 6) {
    const elapsed = Date.now() - state.solveTestTimerStart;
    state.solveTestTimerStart = null;
  }
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

  resetMasterFloristDayCounter(state);
  const timers = ensureMasterFloristTimers(state);
  if (timers) {
    timers.dayCounterMs = 0;
  }

  state.complaintDepartures = (Number(state.complaintDepartures) || 0) + 1;
  if (!state.gameOver && state.complaintDepartures >= MASTER_FLORIST_COMPLAINT_GAME_OVER_THRESHOLD) {
    triggerMasterFloristGameOver(state, 'Too many customers have left dissatisfied.');
  }
}

function resetMasterFloristDayCounter(state) {
  const counters = ensureCalendarCounters(state);
  counters.daysSince = 0;
  updateCalendarDaysDisplay(state, counters.daysSince);
}

function updateCalendarDaysDisplay(state, value) {
  const calendar = state?.calendarDisplay;
  const normalized = Math.max(0, Math.floor(Math.abs(Number(value) || 0)));
  if (calendar?.setDigits) {
    calendar.setDigits('days', toDigitPair(normalized));
  }
  if (calendar) {
    calendar.daysRaw = normalized;
    calendar.daysDisplay = normalized % 100;
  }
}

function updateCalendarLongestDisplay(state, value) {
  const calendar = state?.calendarDisplay;
  const normalized = Math.max(0, Math.floor(Math.abs(Number(value) || 0)));
  if (calendar?.setDigits) {
    calendar.setDigits('most', toDigitPair(normalized));
  }
  if (calendar) {
    calendar.longestRaw = normalized;
    calendar.mostDisplay = normalized % 100;
  }
}

function incrementMasterFloristDay(state) {
  const counters = ensureCalendarCounters(state);
  const previousDays = counters.daysSince;
  const previousLongest = counters.longestDays;
  const nextDays = Math.max(0, previousDays) + 1;
  counters.daysSince = nextDays;
  updateCalendarDaysDisplay(state, nextDays);

  if (nextDays > previousLongest) {
    counters.longestDays = nextDays;
    updateCalendarLongestDisplay(state, counters.longestDays);
  }

  if (!state?.gameOver && previousLongest < MAX_CALENDAR_DISPLAY_VALUE && counters.longestDays >= MAX_CALENDAR_DISPLAY_VALUE) {
    triggerMasterFloristGameOver(state, 'Congratulations! The Most Days calendar reached 99. You beat Master Florist!');
  }
}

export function advanceMasterFloristTimers(state, deltaMs = 0) {
  if (!state || state.gameOver) return;
  const ms = Math.max(0, Number(deltaMs) || 0);
  const timers = ensureMasterFloristTimers(state);
  timers.gameElapsedMs += ms;

  if (ms <= 0) {
    return;
  }

  const interval = Number.isFinite(timers.dayIntervalMs) && timers.dayIntervalMs > 0
    ? timers.dayIntervalMs
    : DAY_ADVANCE_INTERVAL_MS;
  timers.dayCounterMs += ms;

  while (timers.dayCounterMs >= interval) {
    timers.dayCounterMs -= interval;
    incrementMasterFloristDay(state);
    if (state.gameOver) {
      timers.dayCounterMs = 0;
      break;
    }
  }
}

function appendGameTimeToMessage(state, baseMessage) {
  const timers = ensureMasterFloristTimers(state);
  const formatted = formatMasterFloristDuration(timers?.gameElapsedMs ?? 0);
  const message = typeof baseMessage === 'string' && baseMessage.trim().length
    ? baseMessage.trim()
    : 'The flower shop had to close due to too many complaints.';
  return `${message}
Total game time: ${formatted}`;
}

function formatMasterFloristDuration(ms) {
  const safeMs = Math.max(0, Math.floor(Number(ms) || 0));
  let totalSeconds = safeMs / 1000;
  let hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;
  let minutes = Math.floor(totalSeconds / 60);
  totalSeconds -= minutes * 60;
  let seconds = Math.round(totalSeconds * 100) / 100;
  if (seconds >= 60) {
    seconds -= 60;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes -= 60;
    hours += 1;
  }
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = seconds.toFixed(2).padStart(5, '0');
  return `${hours}h ${minutesStr}m ${secondsStr}s`;
}

function toDigitPair(value) {
  const normalized = Math.max(0, Math.floor(Math.abs(Number(value) || 0))) % 100;
  return [Math.floor(normalized / 10), normalized % 10];
}


export function startMasterFloristHandoffAnimation(state, options = {}) {
  if (!state) return null;
  const actorId = options?.actorId ?? null;
  const snapshot = createHandoffArrangementSnapshot(state, actorId);
  state.handoffSnapshot = snapshot;
  state.handoffAnimation = {
    status: 'running',
    elapsed: 0,
    duration: HANDOFF_ANIMATION_DURATION_MS,
    progress: 0,
  };
  state.hoverStemId = null;
  state.pendingDrops = [];
  state.drag = null;
  state.showButton = null;
  return snapshot;
}

export function advanceMasterFloristHandoff(state, deltaMs = 0) {
  if (!state) return 0;
  if (!state.handoffAnimation) {
    state.handoffAnimation = createHandoffAnimationState();
  }
  const animation = state.handoffAnimation;
  if (animation.status !== 'running') {
    return Number(animation.progress) || 0;
  }
  const duration = animation.duration > 0 ? animation.duration : HANDOFF_ANIMATION_DURATION_MS;
  animation.elapsed += Math.max(0, deltaMs || 0);
  const progress = duration > 0 ? Math.min(animation.elapsed / duration, 1) : 1;
  animation.progress = progress;
  if (progress >= 1) {
    animation.progress = 1;
    animation.status = 'completed';
  }
  return animation.progress;
}

export function isMasterFloristHandoffActive(state) {
  return state?.handoffAnimation?.status === 'running';
}

export function resetMasterFloristHandoff(state) {
  if (!state) return;
  state.handoffAnimation = createHandoffAnimationState();
  state.handoffSnapshot = null;
}


export function triggerMasterFloristGameOver(state, message) {
  if (!state || state.gameOver) return false;
  const finalMessage = appendGameTimeToMessage(state, message);
  state.gameOver = true;
  state.gameOverMessage = finalMessage;
  try {
    state.onGameOver?.(finalMessage);
  } catch (err) {
    console.error('Master Florist game over handler failed', err);
  }
  return true;
}

export function collapseMasterFloristSolution(solution = [], limit = MF_DROP_ZONE_COUNT) {
  if (!Array.isArray(solution) || limit <= 0) return [];
  const collapsed = [];
  for (let i = 0; i < solution.length && collapsed.length < limit; i += 1) {
    if (isSlotDisabledForLength(limit, i)) continue;
    const entry = solution[i];
    if (!isFilledSolutionEntry(entry)) continue;
    collapsed.push(normalizeSolutionEntry(entry));
  }
  return collapsed;
}

function areGuessArraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i] ?? null;
    const b = right[i] ?? null;
    if (a !== b) {
      return false;
    }
  }
  return true;
}

export function isMasterFloristSolutionMatch(state) {
  if (!state?.puzzle) return false;
  const slotCount = getPuzzleSlotLimit(state.puzzle);
  if (slotCount <= 0) return false;
  const solution = state.puzzle.solution || [];
  const collapsed = collapseMasterFloristSolution(solution, slotCount);
  if (collapsed.length < slotCount) return false;
  const guess = collapsed.slice(0, slotCount);
  const evaluation = evaluateGuess(state.puzzle, guess);
  return Boolean(evaluation?.isMatch);
}

export function createMasterFloristPuzzle({ seed, mood = 'happy', difficulty } = {}) {
  const puzzle = createPuzzle({ seed, mood, difficulty });
  puzzle.solution = createEmptySolution(MF_DROP_ZONE_COUNT);
  return puzzle;
}

function getPuzzleSlotLimit(puzzle) {
  const raw = Number.isFinite(puzzle?.slotCount) ? Math.floor(puzzle.slotCount) : MF_DROP_ZONE_COUNT;
  if (raw <= 0) return 0;
  return Math.min(MF_DROP_ZONE_COUNT, Math.max(0, raw));
}

function normalizeSolutionEntry(value) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  if (value == null) return null;
  return String(value).trim().toLowerCase();
}

function isFilledSolutionEntry(value) {
  const normalized = normalizeSolutionEntry(value);
  if (!normalized) return false;
  return normalized !== 'n';
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
  if (typeof source.difficulty === 'string' && source.difficulty.length) {
    const normalizedDifficulty = source.difficulty.toLowerCase();
    if (MASTER_FLORIST_DIFFICULTY_LEVELS.includes(normalizedDifficulty)) {
      normalized.difficulty = normalizedDifficulty;
    }
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

function createSpeechBubbleState() {
  return {
    entries: [],
    activeIndex: 0,
    hoverGrid: false,
    followLatest: true,
    bodyBounds: null,
    gridBounds: null,
  };
}

function ensureSpeechBubbleState(state) {
  if (!state) return createSpeechBubbleState();
  if (!state.speechBubble) {
    state.speechBubble = createSpeechBubbleState();
  }
  return state.speechBubble;
}

export function resetSpeechBubbleState(state) {
  if (!state) return;
  state.speechBubble = createSpeechBubbleState();
}

export function setSpeechBubbleIndex(state, index, { userAdjusted = false } = {}) {
  const bubble = ensureSpeechBubbleState(state);
  const entries = bubble.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    const previousFollow = bubble.followLatest;
    bubble.activeIndex = 0;
    bubble.followLatest = true;
    return !previousFollow;
  }
  const lastIndex = entries.length - 1;
  const numericIndex = Number.isFinite(index) ? Math.floor(index) : bubble.activeIndex;
  const target = Math.max(0, Math.min(lastIndex, numericIndex));
  const changed = bubble.activeIndex !== target;
  bubble.activeIndex = target;
  if (userAdjusted) {
    bubble.followLatest = target === lastIndex;
  } else if (target === lastIndex) {
    bubble.followLatest = true;
  }
  return changed;
}

export function adjustSpeechBubbleIndex(state, delta, { userAdjusted = false } = {}) {
  if (!Number.isFinite(delta) || delta === 0) return false;
  const bubble = ensureSpeechBubbleState(state);
  if (!Array.isArray(bubble.entries) || bubble.entries.length === 0) {
    return false;
  }
  const lastIndex = bubble.entries.length - 1;
  const step = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
  const target = Math.max(0, Math.min(lastIndex, bubble.activeIndex + step));
  return setSpeechBubbleIndex(state, target, { userAdjusted });
}

export function setSpeechBubbleHover(state, hovering) {
  const bubble = ensureSpeechBubbleState(state);
  const next = Boolean(hovering);
  if (bubble.hoverGrid === next) {
    return false;
  }
  bubble.hoverGrid = next;
  return true;
}

export function loadSpeechBubbleEntrySolution(state, index, { userAdjusted = false } = {}) {
  const bubble = ensureSpeechBubbleState(state);
  if (!Array.isArray(bubble.entries) || bubble.entries.length === 0) {
    return setSpeechBubbleIndex(state, index, { userAdjusted });
  }
  const lastIndex = bubble.entries.length - 1;
  const numericIndex = Number.isFinite(index) ? Math.floor(index) : bubble.activeIndex;
  const target = Math.max(0, Math.min(lastIndex, numericIndex));
  const entry = bubble.entries[target] || null;
  const indexChanged = setSpeechBubbleIndex(state, target, { userAdjusted });
  const puzzle = state?.puzzle;
  if (!puzzle || !entry || entry.kind !== 'turn') {
    return indexChanged;
  }
  if (entry.puzzleId && puzzle.id && entry.puzzleId !== puzzle.id) {
    return indexChanged;
  }
  if (!Array.isArray(entry.guessCodes) || entry.guessCodes.length === 0) {
    return indexChanged;
  }
  const solution = puzzle.solution;
  if (!Array.isArray(solution) || solution.length === 0) {
    return indexChanged;
  }
  const slotCount = getPuzzleSlotLimit(puzzle);
  if (slotCount <= 0) {
    return indexChanged;
  }
  const normalized = normalizeGuessCodes(entry.guessCodes, slotCount);
  const enabledSlots = getEnabledSlotsForLength(slotCount);
  const mapped = new Array(solution.length).fill(null);
  for (let i = 0; i < enabledSlots.length; i += 1) {
    const slotIndex = enabledSlots[i];
    if (slotIndex < mapped.length) {
      mapped[slotIndex] = i < normalized.length ? normalized[i] : null;
    }
  }
  let changed = false;
  for (let i = 0; i < solution.length; i += 1) {
    const nextValue = mapped[i] ?? null;
    if (solution[i] !== nextValue) {
      solution[i] = nextValue;
      changed = true;
    }
  }
  state.pendingDrops = [];
  state.drag = null;
  state.hoverStemId = null;
  return changed || indexChanged;
}

function pushSpeechBubbleEntry(bubble, entry) {
  if (!bubble || !entry) return;
  const wasFollowing = bubble.followLatest !== false && bubble.activeIndex >= bubble.entries.length - 1;
  bubble.entries.push(entry);
  if (bubble.followLatest || wasFollowing) {
    bubble.activeIndex = bubble.entries.length - 1;
    bubble.followLatest = true;
  }
}

function appendSpeechBubbleIntro(state, entry, puzzle) {
  if (!state || !entry) return;
  const formatted = formatSpeechBubbleEntry({ entry, kind: 'intro', puzzle });
  if (!formatted) return;
  const bubble = ensureSpeechBubbleState(state);
  pushSpeechBubbleEntry(bubble, formatted);
  if (Array.isArray(bubble.entries) && bubble.entries.length) {
    setSpeechBubbleIndex(state, bubble.entries.length - 1);
  }
}

function appendSpeechBubbleTurn(state, { evaluation, customerEntry, guessEntry, puzzle } = {}) {
  if (!state || !customerEntry) return;
  const formatted = formatSpeechBubbleEntry({
    entry: customerEntry,
    kind: 'turn',
    puzzle,
    evaluation,
    guessEntry,
  });
  if (!formatted) return;
  const bubble = ensureSpeechBubbleState(state);
  pushSpeechBubbleEntry(bubble, formatted);
  if (Array.isArray(bubble.entries) && bubble.entries.length) {
    setSpeechBubbleIndex(state, bubble.entries.length - 1);
  }
}

function formatSpeechBubbleEntry({ entry, kind, puzzle, evaluation, guessEntry } = {}) {
  if (!entry) return null;
  const text = deriveSpeechEntryText(entry);
  const segments = cloneSpeechEntrySegments(entry);
  const targetPuzzle = puzzle || null;
  const slotCount = getPuzzleSlotLimit(targetPuzzle);
  const effectiveGuessLength = slotCount > 0 ? slotCount : MF_DROP_ZONE_COUNT;

  const payload = {
    id: entry.id || `mf-speech-${Math.random().toString(16).slice(2, 8)}`,
    kind: kind || 'turn',
    text,
    segments,
    puzzleId: targetPuzzle?.id ?? null,
    slotCount,
    createdAt: Date.now(),
  };

  if (evaluation) {
    payload.evaluation = {
      exactMatches: Number(evaluation.exactMatches) || 0,
      partialMatches: Number(evaluation.partialMatches) || 0,
      isMatch: Boolean(evaluation.isMatch),
      slotStates: Array.isArray(evaluation.slotStates) ? [...evaluation.slotStates] : [],
    };
    const guessSource = Array.isArray(evaluation.guess)
      ? evaluation.guess
      : Array.isArray(guessEntry?.meta?.guess)
        ? guessEntry.meta.guess
        : null;
    const normalizedGuess = guessSource ? normalizeGuessCodes(guessSource, effectiveGuessLength) : null;
    payload.guessCodes = slotCount > 0 && normalizedGuess ? normalizedGuess.slice(0, slotCount) : null;
  } else {
    payload.evaluation = null;
    payload.guessCodes = null;
  }

  const displaySource = Array.isArray(guessEntry?.meta?.displayGuess) && guessEntry.meta.displayGuess.length
    ? guessEntry.meta.displayGuess
    : payload.guessCodes;

  payload.displayGuess = displaySource ? normalizeGuessCodes(displaySource, MF_DROP_ZONE_COUNT) : null;

  return payload;
}

function deriveSpeechEntryText(entry) {
  if (!entry) return '';
  if (typeof entry.text === 'string' && entry.text.trim().length) {
    return entry.text.trim();
  }
  if (Array.isArray(entry.segments) && entry.segments.length) {
    return entry.segments
      .map((segment) => (typeof segment?.text === 'string' ? segment.text : ''))
      .join('')
      .trim();
  }
  return '';
}

function cloneSpeechEntrySegments(entry) {
  if (!entry || !Array.isArray(entry.segments)) {
    return [];
  }
  return entry.segments
    .map((segment) => {
      const text = typeof segment?.text === 'string' ? segment.text : '';
      if (!text.length) return null;
      const token = typeof segment?.token === 'string' ? segment.token : 'plain';
      return { text, token };
    })
    .filter(Boolean);
}

function getLocalStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {}
  return null;
}











