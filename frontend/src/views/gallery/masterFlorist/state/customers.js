import { MF_CANVAS_WIDTH } from '../canvas/constants.js';
import { MASTER_FLORIST_LAYOUT } from './layout.js';
import {
  resetMasterFloristSolution,
  startMasterFloristPuzzle,
  handleMasterFloristPuzzleSuccess,
  handleMasterFloristComplaint,
} from './store.js';

const ACTIVE_IDLE_MS = 0;
const ACTIVE_TALK_MS = 5_000;
const TALK_TOGGLE_MS = 150;
const QUEUE_ADVANCE_DELAY_RANGE = [1_000, 5_000];
const QUEUE_SETTLE_EPSILON = 1.5;
const WALK_SPEED = 320; // px per second
const WALK_BOB_TRIGGER_MS = 500;
const WALK_BOB_DURATION_MS = 250;
const WALK_BOB_OFFSET_PX = 8;
const SPAWN_INTERVAL_MS = 900;
const MAX_VISIBLE_CUSTOMERS = 5;
const BASE_PERSONAL_SPACE = 140;
const MIN_PERSONAL_SPACE = 52;
const PERSONAL_SPACE_STEP = 12;
const ADVANCE_ANIM_FRAMES = 10;

const MOOD_SEQUENCE = ['happy', 'neutral', 'angry', 'complaint'];

const FOOT_TRAFFIC_INTERVALS = {
  relaxed: 1500,
  steady: SPAWN_INTERVAL_MS,
  brisk: 600,
};

const FOOT_TRAFFIC_SPAWN_CHANCE = {
  relaxed: 0.12,
  steady: 0.22,
  brisk: 0.35,
};

const ATMOSPHERE_PROFILES = {
  soothing: {
    queue: { happy: 24000, neutral: 20000, angry: Number.POSITIVE_INFINITY },
  },
  balanced: {
    queue: { happy: 16000, neutral: 14000, angry: Number.POSITIVE_INFINITY },
  },
  tense: {
    queue: { happy: 10000, neutral: 8000, angry: Number.POSITIVE_INFINITY },
  },
};

const DEFAULT_ATMOSPHERE_PROFILE = ATMOSPHERE_PROFILES.balanced;

const VASE_AREA = MASTER_FLORIST_LAYOUT?.vase?.area || { left: 220, right: MF_CANVAS_WIDTH - 220 };
const VASE_LEFT = VASE_AREA.left ?? 220;
const VASE_RIGHT = VASE_AREA.right ?? (MF_CANVAS_WIDTH - 220);
const ACTIVE_ANCHOR_X = VASE_LEFT * 0.75;
const QUEUE_START_X = (VASE_LEFT + VASE_RIGHT) / 2;
const SPAWN_X = MF_CANVAS_WIDTH + 220;
const EXIT_X = -260;

export function initializeCustomerParade(state, { spriteLibrary, chat } = {}) {
  if (!state || !spriteLibrary) return;

  const entries = spriteLibrary.paradeEntries || [];
  if (!Array.isArray(entries) || entries.length === 0) {
    console.warn('Master Florist: no customer frames available for parade preview.');
    return;
  }

  state.customerParade = {
    spriteLibrary,
    chat,
    rootState: state,
    sourceEntries: entries,
    pendingEntries: entries.slice(),
    actors: [],
    queue: [],
    activeId: null,
    pendingActiveId: null,
    elapsedMs: 0,
    spawnCooldownMs: 0,
    spawnIntervalMs: SPAWN_INTERVAL_MS,
    spawnAccumulatorMs: 0,
    queueSpacingBase: BASE_PERSONAL_SPACE,
    queueSpacingMin: MIN_PERSONAL_SPACE,
    queueSpacingStep: PERSONAL_SPACE_STEP,
    mouthToggleMs: TALK_TOGGLE_MS,
    maxVisible: Math.min(MAX_VISIBLE_CUSTOMERS, entries.length + 1),
    queueDirty: true,
    queueSpacingSnapshot: BASE_PERSONAL_SPACE,
  };

  const footTrafficLabel = state?.settings?.footTraffic;
  state.customerParade.spawnIntervalMs = resolveFootTrafficInterval(footTrafficLabel);
  state.customerParade.atmosphere = resolveAtmosphereProfile(state?.settings?.atmosphere);

  spawnCustomer(state.customerParade);
  promoteNext(state.customerParade);
}

export function updateCustomerParade(state, info = {}) {
  const parade = state?.customerParade;
  if (!parade || !parade.spriteLibrary) return;

  const deltaMs = Number(info?.deltaMs) || 0;
  if (deltaMs <= 0) return;

  parade.elapsedMs += deltaMs;
  maybeSpawnCustomer(parade, deltaMs);
  ensureQueueStocked(parade);
  applyQueueLayout(parade);

  for (let i = parade.actors.length - 1; i >= 0; i -= 1) {
    const actor = parade.actors[i];
    advanceActor(parade, actor, deltaMs);
    if (actor.remove) {
      dropActor(parade, actor, i);
    }
  }

  if (!parade.activeId && !parade.pendingActiveId) {
    promoteNext(parade);
  }

}

export function disposeCustomerParade(state) {
  if (!state?.customerParade) return;
  state.customerParade.actors?.splice(0);
  state.customerParade.queue?.splice(0);
  state.customerParade.activeId = null;
  state.customerParade.pendingActiveId = null;
  state.customerParade.rootState = null;
  state.customerParade = null;
}

function resetWalkBob(actor) {
  if (!actor) return;
  actor.bobOffset = 0;
  actor.bobTimerMs = 0;
  actor.bobActiveMs = 0;
  actor.bobIsActive = false;
}

function updateWalkBob(actor, deltaMs) {
  if (!actor) return;
  if (actor.pose !== 'walking') {
    resetWalkBob(actor);
    return;
  }
  actor.bobTimerMs += deltaMs;
  if (actor.bobIsActive) {
    actor.bobActiveMs += deltaMs;
    if (actor.bobActiveMs >= WALK_BOB_DURATION_MS) {
      actor.bobIsActive = false;
      actor.bobActiveMs = 0;
      actor.bobTimerMs = 0;
      actor.bobOffset = 0;
    } else {
      actor.bobOffset = WALK_BOB_OFFSET_PX;
    }
  } else if (actor.bobTimerMs >= WALK_BOB_TRIGGER_MS) {
    actor.bobIsActive = true;
    actor.bobActiveMs = 0;
    actor.bobOffset = WALK_BOB_OFFSET_PX;
  } else {
    actor.bobOffset = 0;
  }
}

function computeQueueSpacing(parade, countOverride) {
  const base = parade?.queueSpacingBase ?? BASE_PERSONAL_SPACE;
  const min = parade?.queueSpacingMin ?? MIN_PERSONAL_SPACE;
  const step = parade?.queueSpacingStep ?? PERSONAL_SPACE_STEP;
  const count = Math.max(countOverride ?? (Array.isArray(parade?.queue) ? parade.queue.length : 0), 1);
  return Math.max(min, base - Math.max(0, count - 1) * step);
}

function getQueueAnchor(parade, index, spacingOverride) {
  const spacing = spacingOverride ?? computeQueueSpacing(parade);
  return QUEUE_START_X + spacing * Math.max(index, 0);
}

function createQueueState(anchorX = SPAWN_X, personalSpace = BASE_PERSONAL_SPACE) {
  return {
    mode: 'waiting',
    elapsedMs: 0,
    delayMs: randomBetween(QUEUE_ADVANCE_DELAY_RANGE),
    anchorX,
    targetX: anchorX,
    personalSpace,
    leaderId: null,
    leader: null,
    justAdvancedFrames: 0,
  };
}

function ensureQueueState(actor, anchorX, personalSpace) {
  if (!actor || typeof actor !== 'object') return null;
  if (!actor.queue || typeof actor.queue !== 'object') {
    actor.queue = createQueueState(anchorX ?? SPAWN_X, personalSpace ?? BASE_PERSONAL_SPACE);
  }
  const queue = actor.queue;
  if (anchorX != null) {
    queue.anchorX = anchorX;
  }
  if (personalSpace != null) {
    queue.personalSpace = personalSpace;
  }
  return actor.queue;
}

function resolveLeader(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  if (candidate.remove) return null;
  if (
    candidate.state === 'queued' ||
    candidate.state === 'entering' ||
    (candidate.state === 'advancing' && !candidate.pendingActive)
  ) {
    return candidate;
  }
  return null;
}

function updateFollowerTarget(parade, actor, spacingOverride, anchorOverride) {
  if (!actor) {
    return { queue: null, spacing: BASE_PERSONAL_SPACE, anchor: SPAWN_X, targetX: SPAWN_X };
  }

  const queue = ensureQueueState(actor);
  const index = typeof actor.queueIndex === 'number'
    ? actor.queueIndex
    : (Array.isArray(parade?.queue) ? parade.queue.indexOf(actor) : -1);
  const spacingBase = spacingOverride ?? queue.personalSpace ?? parade?.queueSpacingSnapshot ?? computeQueueSpacing(parade);
  const spacing = Number.isFinite(spacingBase) ? spacingBase : BASE_PERSONAL_SPACE;
  const anchorIndex = index >= 0 ? index : 0;
  const anchor = anchorOverride ?? getQueueAnchor(parade, anchorIndex, spacing);
  queue.anchorX = anchor;
  queue.personalSpace = spacing;

  const leader = resolveLeader(actor.followCustomer);
  if (actor.followCustomer && !leader) {
    actor.followCustomer = null;
  }
  queue.leader = leader;
  queue.leaderId = leader ? leader.id : null;

  const aheadX = leader ? leader.x : QUEUE_START_X;
  const desiredX = leader ? aheadX + spacing : QUEUE_START_X;
  const targetX = Math.max(anchor, desiredX);
  queue.targetX = targetX;

  return { queue, spacing, anchor, targetX };
}

function nextEntry(parade) {
  if (!parade) return null;

  const source = Array.isArray(parade.sourceEntries) ? parade.sourceEntries : [];
  if (!Array.isArray(parade.pendingEntries) || parade.pendingEntries.length === 0) {
    parade.pendingEntries = source.slice();
  }

  if (!Array.isArray(parade.pendingEntries) || parade.pendingEntries.length === 0) {
    return null;
  }

  return parade.pendingEntries.shift() || null;
}

function canSpawnAnother(parade) {
  if (!parade) return false;
  if (!Array.isArray(parade.queue)) parade.queue = [];
  const activeCount = (parade.activeId ? 1 : 0) + (parade.pendingActiveId ? 1 : 0);
  const total = parade.queue.length + activeCount;
  const max = parade.maxVisible || MAX_VISIBLE_CUSTOMERS;
  return total < max;
}

function spawnCustomer(parade) {
  if (!parade) return;
  if (!Array.isArray(parade.queue)) {
    parade.queue = [];
  }
  if (!canSpawnAnother(parade)) return;
  const entry = nextEntry(parade);
  if (!entry) return;
  const actor = createActor(entry);
  updateActorMoodFrames(parade, actor);
  actor.pose = 'walking';
  actor.x = SPAWN_X;
  actor.queueIndex = parade.queue.length;
  const spacing = computeQueueSpacing(parade, actor.queueIndex + 1);
  const anchor = getQueueAnchor(parade, actor.queueIndex, spacing);
  const tail = parade.queue.length > 0 ? parade.queue[parade.queue.length - 1] : null;
  actor.followCustomer = tail && !tail.remove ? tail : null;
  const { queue, targetX } = updateFollowerTarget(parade, actor, spacing, anchor);
  queue.mode = 'advancing';
  queue.elapsedMs = 0;
  queue.justAdvancedFrames = ADVANCE_ANIM_FRAMES;
  actor.state = 'advancing';
  actor.pendingActive = false;
  actor.targetX = targetX;
  parade.actors.push(actor);
  parade.queue.push(actor);
  parade.queueDirty = true;
}

function ensureQueueStocked(parade) {
  if (!parade) return;
  if (!Array.isArray(parade.queue)) {
    parade.queue = [];
  }
  const activeCount = (parade.activeId ? 1 : 0) + (parade.pendingActiveId ? 1 : 0);
  if (parade.queue.length + activeCount > 0) return;
  spawnCustomer(parade);
}

function maybeSpawnCustomer(parade, deltaMs) {
  if (!parade) return;
  if (!canSpawnAnother(parade)) return;
  const chance = getFootTrafficChance(parade);
  if (chance <= 0) return;
  const probability = chance * (deltaMs / 1000);
  if (Math.random() < probability) {
    spawnCustomer(parade);
  }
}

function applyQueueLayout(parade) {
  if (!parade) return;
  if (!Array.isArray(parade.queue)) {
    parade.queue = [];
  }
  parade.queue = parade.queue.filter((actor) => actor && typeof actor === 'object' && !actor.remove);
  const spacing = computeQueueSpacing(parade);
  parade.queueSpacingSnapshot = spacing;
  parade.queueDirty = false;
  parade.queue.forEach((actor, index) => {
    const follow = index > 0 ? parade.queue[index - 1] : null;
    actor.followCustomer = follow && !follow.remove ? follow : null;
    actor.queueIndex = index;
    const anchor = getQueueAnchor(parade, index, spacing);
    updateFollowerTarget(parade, actor, spacing, anchor);
    if (actor.state === 'entering') {
      actor.targetX = anchor;
    }
  });
}

function slideActorTowards(actor, targetX, deltaMs) {
  const currentX = actor.x ?? SPAWN_X;
  const step = actor.speed * (deltaMs / 1000);
  if (step <= 0) {
    return false;
  }
  const delta = targetX - currentX;
  if (Math.abs(delta) <= step) {
    actor.x = targetX;
    return true;
  }
  actor.x = currentX + Math.sign(delta) * step;
  return false;
}

function startQueueAdvance(actor) {
  const queue = ensureQueueState(actor);
  queue.mode = 'advancing';
  queue.elapsedMs = 0;
  if (queue.targetX == null) {
    queue.targetX = queue.anchorX;
  }
  queue.justAdvancedFrames = ADVANCE_ANIM_FRAMES;
  actor.targetX = queue.targetX;
  actor.pose = 'walking';
  resetWalkBob(actor);
}

function updateQueued(parade, actor, deltaMs) {
  if (!parade || !Array.isArray(parade.queue)) return;
  const { queue, targetX } = updateFollowerTarget(parade, actor);
  const index = typeof actor.queueIndex === 'number' ? actor.queueIndex : parade.queue.indexOf(actor);
  if (index < 0) return;
  actor.targetX = targetX;
  maybeDecayQueueMood(parade, actor, deltaMs);

  if (queue.mode !== 'advancing') {
    queue.elapsedMs += deltaMs;
    if (queue.elapsedMs >= queue.delayMs) {
      startQueueAdvance(actor);
    } else {
      if (actor.pose !== 'idle') {
        actor.pose = 'idle';
        resetWalkBob(actor);
      }
      return;
    }
  }

  const completed = slideActorTowards(actor, targetX, deltaMs);
  updateWalkBob(actor, deltaMs);
  if (completed || Math.abs(actor.x - targetX) <= QUEUE_SETTLE_EPSILON) {
    actor.x = targetX;
    if (queue.justAdvancedFrames > 0) {
      queue.justAdvancedFrames -= 1;
      queue.elapsedMs = 0;
      actor.pose = 'walking';
    } else {
      queue.mode = 'waiting';
      queue.elapsedMs = 0;
      queue.delayMs = randomBetween(QUEUE_ADVANCE_DELAY_RANGE);
      queue.targetX = targetX;
      actor.pose = 'idle';
      resetWalkBob(actor);
    }
  }
}

function createActor(entry) {
  const id = [entry.sheet, entry.mood, Date.now(), Math.random().toString(16).slice(2, 6)].join('-');
  const frames = entry.frames;
  const template = frames.idle || frames.walking || frames.talking;
  const width = template?.width ?? 180;
  const height = template?.height ?? 300;
  const moodStageIndex = Math.max(0, MOOD_SEQUENCE.indexOf(entry.mood));

  return {
    id,
    sheet: entry.sheet,
    mood: entry.mood,
    frames,
    width,
    height,
    pose: 'walking',
    state: 'entering',
    x: SPAWN_X,
    targetX: SPAWN_X,
    speed: WALK_SPEED,
    timeInState: 0,
    mouthTimer: 0,
    talkElapsed: 0,
    pendingActive: false,
    chatAnnounced: false,
    queueIndex: null,
    followCustomer: null,
    queue: createQueueState(),
    bobOffset: 0,
    bobTimerMs: 0,
    bobActiveMs: 0,
    bobIsActive: false,
    seed: Date.now(),
    moodStageIndex,
    queueMoodTimer: 0,
    activeMoodTimer: 0,
    lastExactMatches: 0,
  };
}

function layoutQueue(parade, soft) {
  applyQueueLayout(parade);
}

function advanceActor(parade, actor, deltaMs) {
  if (!actor || typeof actor !== 'object') return;
  actor.timeInState += deltaMs;

  if (actor.state === 'advancing' && !actor.pendingActive) {
    const { targetX } = updateFollowerTarget(parade, actor);
    actor.targetX = targetX;
  }

  switch (actor.state) {
    case 'entering':
    case 'advancing':
    case 'departing':
      updateWalkBob(actor, deltaMs);
      moveTowardsTarget(parade, actor, deltaMs);
      break;
    case 'queued':
      updateQueued(parade, actor, deltaMs);
      break;
    case 'activeIdle':
      if (actor.timeInState >= ACTIVE_IDLE_MS) {
        startActiveTalking(parade, actor);
      }
      break;
    case 'activeTalking':
      updateActiveTalking(parade, actor, deltaMs);
      break;
    default:
      break;
  }
}

function moveTowardsTarget(parade, actor, deltaMs) {
  const deltaSeconds = deltaMs / 1000;
  const distance = actor.targetX - actor.x;
  const step = actor.speed * deltaSeconds;

  if (Math.abs(distance) <= step) {
    actor.x = actor.targetX;
    handleArrival(parade, actor);
  } else {
    actor.x += Math.sign(distance) * step;
  }
}

function handleArrival(parade, actor) {
  actor.timeInState = 0;

  if (actor.state === 'entering') {
    actor.state = 'queued';
    actor.pose = 'idle';
    resetQueuePose(actor);
    ensureQueueState(actor, actor.x);
    return;
  }

  if (actor.state === 'advancing') {
    if (actor.pendingActive) {
      actor.pendingActive = false;
      beginActiveIdle(parade, actor);
    } else {
      actor.state = 'queued';
      resetQueuePose(actor);
    }
    return;
  }

  if (actor.state === 'departing') {
    actor.remove = true;
  }
}

function beginActiveIdle(parade, actor) {
  parade.activeId = actor.id;
  resetWalkBob(actor);
  actor.queueIndex = null;
  parade.pendingActiveId = null;
  actor.state = 'activeIdle';
  actor.pose = 'idle';
  actor.timeInState = 0;
  actor.talkElapsed = 0;
  actor.mouthTimer = 0;
  actor.queueMoodTimer = 0;
  actor.activeMoodTimer = 0;
  actor.lastExactMatches = 0;
  announceFrames(parade, actor);
  if (parade.rootState) {
    const mood = getActorMood(actor);
    startMasterFloristPuzzle(parade.rootState, {
      mood,
      customer: { id: actor.id, sheet: actor.sheet, mood },
      seed: actor.seed || Date.now(),
    });
    advanceCalendarCounters(parade.rootState);
  }

  startActiveTalking(parade, actor);
}

function startActiveTalking(parade, actor) {
  actor.state = 'activeTalking';
  resetWalkBob(actor);
  actor.pose = 'talking';
  actor.timeInState = 0;
  actor.talkElapsed = 0;
  actor.mouthTimer = 0;
}

function updateActiveTalking(parade, actor, deltaMs) {
  actor.talkElapsed += deltaMs;
  actor.mouthTimer += deltaMs;

  if (actor.mouthTimer >= parade.mouthToggleMs) {
    actor.mouthTimer = 0;
    actor.pose = actor.pose === 'talking' ? 'idle' : 'talking';
  }

  if (actor.talkElapsed >= ACTIVE_TALK_MS) {
    actor.state = 'activeIdle';
    actor.pose = 'idle';
    actor.timeInState = 0;
    actor.talkElapsed = 0;
    actor.mouthTimer = 0;
  }
}

function beginDeparture(parade, actor) {
  parade.activeId = null;
  resetWalkBob(actor);
  actor.queueIndex = null;
  actor.state = 'departing';
  actor.pose = 'walking';
  actor.targetX = EXIT_X;
  actor.timeInState = 0;
  if (parade.rootState) {
    resetMasterFloristSolution(parade.rootState);
    parade.rootState.drag = null;
    parade.rootState.hoverStemId = null;
    parade.rootState.pendingDrops = [];
  }
}

function promoteNext(parade) {
  if (parade.activeId || parade.pendingActiveId) return;
  if (!Array.isArray(parade.queue) || parade.queue.length === 0) return;
  const actor = parade.queue.shift();
  if (!actor) return;
  actor.queueIndex = null;
  actor.followCustomer = null;
  actor.pendingActive = true;
  actor.state = 'advancing';
  actor.pose = 'walking';
  actor.targetX = ACTIVE_ANCHOR_X;
  actor.timeInState = 0;
  resetWalkBob(actor);
  parade.pendingActiveId = actor.id;
  parade.queueDirty = true;
}

function dropActor(parade, actor, index) {
  parade.actors.splice(index, 1);
  if (Array.isArray(parade.queue)) {
    parade.queue = parade.queue.filter((entry) => entry !== actor);
    parade.queueDirty = true;
  }

  if (parade.activeId === actor.id) {
    parade.activeId = null;
  }
  if (parade.pendingActiveId === actor.id) {
    parade.pendingActiveId = null;
  }
}

function resetQueuePose(actor) {
  const queue = ensureQueueState(actor, actor.x);
  resetWalkBob(actor);
  queue.mode = 'waiting';
  queue.elapsedMs = 0;
  queue.delayMs = randomBetween(QUEUE_ADVANCE_DELAY_RANGE);
  queue.targetX = actor.x;
  queue.justAdvancedFrames = 0;
  actor.pose = 'idle';
}

function announceFrames(parade, actor) {
  if (actor.chatAnnounced) return;
  const chat = parade.chat;
  if (!chat?.appendMessage) return;

  const walking = actor.frames.walking?.fileName || 'n/a';
  const idle = actor.frames.idle?.fileName || 'n/a';
  const talking = actor.frames.talking?.fileName || 'n/a';
  const text = 'Customer ' + actor.sheet + ' (' + actor.mood + ') -> walking: ' + walking + ', idle: ' + idle + ', talking: ' + talking;
  try {
    chat.appendMessage('system', text, 'Sprites');
  } catch {}
  actor.chatAnnounced = true;
}

export function handleMasterFloristGuessResult(state, evaluation = {}) {
  const parade = state?.customerParade;
  if (!parade) return;
  const actor = getActiveActor(parade);
  if (!actor) return;

  const exactMatches = Number(evaluation?.exactMatches) || 0;
  const previousBest = Number(actor.lastExactMatches) || 0;
  const progress = exactMatches > previousBest;
  actor.lastExactMatches = Math.max(previousBest, exactMatches);

  if (evaluation?.isMatch) {
    handleMasterFloristPuzzleSuccess(state);
    beginDeparture(parade, actor);
    return;
  }

  applyActiveMistake(parade, actor, { progress });
}

function maybeDecayQueueMood(parade, actor, deltaMs) {
  if (!parade?.atmosphere || deltaMs <= 0) return;
  if (actor.pendingActive) return;
  const mood = getActorMood(actor);
  const thresholds = parade.atmosphere.queue || {};
  const threshold = thresholds[mood];
  if (!Number.isFinite(threshold) || threshold <= 0) return;
  actor.queueMoodTimer = (actor.queueMoodTimer || 0) + deltaMs;
  if (actor.queueMoodTimer >= threshold) {
    actor.queueMoodTimer = 0;
    stepActorMood(parade, actor, { reason: 'The customer is getting impatient while waiting.' });
  }
}

function applyActiveMistake(parade, actor, { progress } = {}) {
  if (progress && Math.random() < 0.5) {
    return;
  }
  stepActorMood(parade, actor, { reason: 'The customer is getting frustrated with the guesses.', isActive: true });
}

function stepActorMood(parade, actor, { reason, isActive } = {}) {
  if (!actor) return false;
  const currentIndex = actor.moodStageIndex ?? Math.max(0, MOOD_SEQUENCE.indexOf(actor.mood ?? 'happy'));
  if (currentIndex >= MOOD_SEQUENCE.length - 1) {
    handleCustomerComplaint(parade, actor, { reason, isActive });
    return false;
  }

  const nextIndex = Math.min(currentIndex + 1, MOOD_SEQUENCE.length - 1);
  actor.moodStageIndex = nextIndex;
  actor.mood = getActorMood(actor);
  updateActorMoodFrames(parade, actor);

  if (actor.mood === 'complaint') {
    handleCustomerComplaint(parade, actor, { reason, isActive });
  } else {
    // keep silent per updated requirements
  }
  return true;
}

function handleCustomerComplaint(parade, actor, { reason, isActive } = {}) {
  if (!parade) return;
  handleMasterFloristComplaint(parade.rootState);

  if (isActive) {
    beginDeparture(parade, actor);
  } else {
    actor.state = 'departing';
    actor.pose = 'walking';
    actor.targetX = EXIT_X;
    actor.timeInState = 0;
    resetWalkBob(actor);
    actor.queueIndex = null;
    parade.queueDirty = true;
  }
  actor.complained = true;
  if (parade.pendingActiveId === actor.id) {
    parade.pendingActiveId = null;
  }
}

function getActorMood(actor) {
  const index = Math.max(0, Math.min(MOOD_SEQUENCE.length - 1, actor?.moodStageIndex ?? MOOD_SEQUENCE.indexOf(actor?.mood ?? 'happy')));
  return MOOD_SEQUENCE[index];
}

function getActiveActor(parade) {
  if (!parade?.activeId) return null;
  return parade.actors?.find((actor) => actor && actor.id === parade.activeId) || null;
}

function resolveFootTrafficInterval(label) {
  const key = (label || '').toLowerCase();
  return FOOT_TRAFFIC_INTERVALS[key] || SPAWN_INTERVAL_MS;
}

function resolveAtmosphereProfile(label) {
  const key = (label || '').toLowerCase();
  const base = ATMOSPHERE_PROFILES[key] || DEFAULT_ATMOSPHERE_PROFILE;
  return {
    label: key && ATMOSPHERE_PROFILES[key] ? key : 'balanced',
    queue: { ...base.queue },
  };
}

function getFootTrafficChance(parade) {
  const key = (parade?.rootState?.settings?.footTraffic || '').toLowerCase();
  return FOOT_TRAFFIC_SPAWN_CHANCE[key] ?? FOOT_TRAFFIC_SPAWN_CHANCE.steady;
}

function updateActorMoodFrames(parade, actor) {
  if (!parade?.spriteLibrary || !actor) return;
  const library = parade.spriteLibrary;
  const mood = getActorMood(actor);
  const sheet = actor.sheet;
  if (!sheet) return;
  const walking = library.getFrame?.(sheet, mood, 'walking');
  const idle = library.getFrame?.(sheet, mood, 'idle');
  const talking = library.getFrame?.(sheet, mood, 'talking');
  if (walking && idle && talking) {
    actor.frames = { walking, idle, talking };
  }
}

function advanceCalendarCounters(rootState) {
  const calendar = rootState?.calendarDisplay;
  const setDigits = calendar?.setDigits;
  if (typeof setDigits !== 'function') return;

  calendar.daysRaw = (calendar?.daysRaw ?? 0) + 1;
  const displayDays = calendar.daysRaw % 100;

  calendar.longestRaw = Math.max(calendar?.longestRaw ?? 0, calendar.daysRaw);
  const displayLongest = calendar.longestRaw % 100;

  calendar.daysDisplay = displayDays;
  calendar.mostDisplay = displayLongest;

  setDigits('days', toDigitPair(displayDays));
  setDigits('most', toDigitPair(displayLongest));
}

function toDigitPair(value) {
  const normalized = Math.max(0, Math.floor(Number(value) || 0)) % 100;
  return [Math.floor(normalized / 10), normalized % 10];
}

function randomBetween(range) {
  const [min, max] = range;
  if (!Number.isFinite(min)) return 0;
  if (!Number.isFinite(max) || max <= min) return min;
  return min + Math.random() * (max - min);
}

