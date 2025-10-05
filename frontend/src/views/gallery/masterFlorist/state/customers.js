import { MF_CANVAS_WIDTH } from '../canvas/constants.js';
import { MASTER_FLORIST_LAYOUT } from './layout.js';
import {
  resetMasterFloristSolution,
  startMasterFloristPuzzle,
  handleMasterFloristPuzzleSuccess,
  startMasterFloristHandoffAnimation,
  resetMasterFloristHandoff,
  handleMasterFloristComplaint,
  triggerMasterFloristGameOver,
  MASTER_FLORIST_COMPLAINT_GAME_OVER_THRESHOLD,
} from './store.js';

const ACTIVE_IDLE_MS = 0;
const ACTIVE_TALK_MS = 1_500;
const TALK_TOGGLE_MS = 150;
const QUEUE_ADVANCE_DELAY_RANGE = [1_000, 5_000];
const QUEUE_SETTLE_EPSILON = 1.5;
const WALK_SPEED = 320; // px per second
const WALK_BOB_TRIGGER_MS = 500;
const WALK_BOB_DURATION_MS = 250;
const WALK_BOB_OFFSET_PX = 8;
const SPAWN_INTERVAL_MS = 900;
const BASE_PERSONAL_SPACE = 140;
const MIN_PERSONAL_SPACE = 52;
const PERSONAL_SPACE_STEP = 12;
const ADVANCE_ANIM_FRAMES = 10;

const GAME_OVER_MESSAGE = 'The flower shop had to close due to too many complaints.';
const MOOD_SEQUENCE = ['happy', 'neutral', 'angry', 'complaint'];

const BASE_QUEUE_MOOD_THRESHOLDS_MS = Object.freeze({
  happy: 120_000,
  neutral: 80_000,
  angry: 40_000,
});

const FOOT_TRAFFIC_INTERVALS = {
  relaxed: 1500,
  steady: SPAWN_INTERVAL_MS,
  brisk: 600,
};

const FOOT_TRAFFIC_SPAWN_CHANCE = {
  relaxed: 0.04,
  steady: 0.06,
  brisk: 0.08,
};

const FOOT_TRAFFIC_PATIENCE_MULTIPLIERS = Object.freeze({
  relaxed: 1.2,
  steady: 1,
  brisk: 0.8,
});

const ATMOSPHERE_PROFILES = Object.freeze({
  soothing: {
    queue: { happy: 1.25, neutral: 1.15, angry: 1.05 },
  },
  balanced: {
    queue: { happy: 1, neutral: 1, angry: 1 },
  },
  tense: {
    queue: { happy: 0.85, neutral: 0.8, angry: 0.75 },
  },
});

const DEFAULT_ATMOSPHERE_PROFILE = ATMOSPHERE_PROFILES.balanced;

const ACTIVE_CUSTOMER_QUEUE_MULTIPLIER = 1.75;

const VASE_AREA = MASTER_FLORIST_LAYOUT?.vase?.area || { left: 220, right: MF_CANVAS_WIDTH - 220 };
const VASE_LEFT = VASE_AREA.left ?? 220;
const VASE_RIGHT = VASE_AREA.right ?? (MF_CANVAS_WIDTH - 220);
const ACTIVE_ANCHOR_X = VASE_LEFT * 0.75;
const QUEUE_START_X = (VASE_LEFT + VASE_RIGHT) / 2;
const SPAWN_X = MF_CANVAS_WIDTH + 220;
const EXIT_X = -260;

function hasReachedComplaintDepartureLimit(parade) {
  const rootState = parade?.rootState;
  if (!rootState) return false;
  const count = Number(rootState.complaintDepartures) || 0;
  return count >= MASTER_FLORIST_COMPLAINT_GAME_OVER_THRESHOLD;
}

export function initializeCustomerParade(state, { spriteLibrary, chat } = {}) {
  if (!state || !spriteLibrary) return;

  const sheetList = Array.isArray(spriteLibrary.sheetList) ? spriteLibrary.sheetList : [];
  if (!sheetList.length) {
    console.warn('Master Florist: no customer frames available for parade preview.');
    return;
  }

  state.customerParade = {
    spriteLibrary,
    chat,
    rootState: state,
    actors: [],
    queue: [],
    activeId: null,
    pendingActiveId: null,
    elapsedMs: 0,
    spawnCooldownMs: 0,
    spawnGapMs: 2_000,
    spawnIntervalMs: SPAWN_INTERVAL_MS,
    spawnAccumulatorMs: 0,
    queueSpacingBase: BASE_PERSONAL_SPACE,
    queueSpacingMin: MIN_PERSONAL_SPACE,
    queueSpacingStep: PERSONAL_SPACE_STEP,
    mouthToggleMs: TALK_TOGGLE_MS,
    maxVisible: Number.POSITIVE_INFINITY,
    queueDirty: true,
    queueSpacingSnapshot: BASE_PERSONAL_SPACE,
    grabBag: [],
    activeSheets: new Set(),
    gameOver: false,
    depthCounter: 0,
  };

  const footTrafficLabel = state?.settings?.footTraffic;
  state.customerParade.spawnIntervalMs = resolveFootTrafficInterval(footTrafficLabel);
  state.customerParade.footTrafficPatienceMultiplier = resolveFootTrafficPatienceMultiplier(footTrafficLabel);
  state.customerParade.atmosphere = resolveAtmosphereProfile(state?.settings?.atmosphere, footTrafficLabel);
  state.customerParade.debugMoodDecayLog = Boolean(state?.settings?.debugMoodDecayLog);
  state.customerParade.moodDecayEvents = state.customerParade.debugMoodDecayLog ? [] : null;

  const bag = populateGrabBag(state.customerParade);
  if (bag.length === 0) {
    state.customerParade.gameOver = true;
    triggerMasterFloristGameOver(state, GAME_OVER_MESSAGE);
    return;
  }

  spawnCustomer(state.customerParade);
  promoteNext(state.customerParade);
  checkForCustomerExhaustion(state.customerParade);
}

export function updateCustomerParade(state, info = {}) {
  const parade = state?.customerParade;
  if (!parade || !parade.spriteLibrary) return;
  if (parade.gameOver) return;

  const deltaMs = Number(info?.deltaMs) || 0;
  if (deltaMs <= 0) return;

  parade.elapsedMs += deltaMs;
  parade.spawnCooldownMs = Math.max(0, (parade.spawnCooldownMs || 0) - deltaMs);
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

function canSpawnAnother(parade) {
  if (!parade || parade.gameOver) return false;
  if (!Array.isArray(parade.queue)) parade.queue = [];
  const bag = ensureGrabBag(parade);
  return bag.length > 0;
}

function spawnCustomer(parade) {
  if (!parade) return;
  if (!Array.isArray(parade.queue)) {
    parade.queue = [];
  }
  if (!canSpawnAnother(parade)) return;
  const entry = createRandomEntry(parade);
  if (!entry) {
    checkForCustomerExhaustion(parade);
    return;
  }
  const actor = createActor(entry);
  actor.depth = (parade.depthCounter || 0) + 1;
  parade.depthCounter = actor.depth;
  updateActorMoodFrames(parade, actor);
  markSheetActive(parade, actor.sheet);
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
  parade.spawnCooldownMs = parade.spawnGapMs ?? 0;
}

function ensureQueueStocked(parade) {
  if (!parade) return;
  if (!Array.isArray(parade.queue)) {
    parade.queue = [];
  }
  const activeCount = (parade.activeId ? 1 : 0) + (parade.pendingActiveId ? 1 : 0);
  if (parade.queue.length + activeCount > 0) return;
  if (!canSpawnAnother(parade)) {
    checkForCustomerExhaustion(parade);
    return;
  }
  spawnCustomer(parade);
}

function maybeSpawnCustomer(parade, deltaMs) {
  if (!parade) return;
  if (parade.spawnCooldownMs > 0) return;
  if (!canSpawnAnother(parade)) {
    checkForCustomerExhaustion(parade);
    return;
  }
  const chance = getFootTrafficChance(parade);
  if (chance <= 0) return;
  const probability = chance * (deltaMs / 1000);
  if (Math.random() < probability) {
    spawnCustomer(parade);
    parade.spawnCooldownMs = parade.spawnGapMs ?? 0;
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
  const initialMood = entry.mood;
  const moodStageIndex = Math.max(0, MOOD_SEQUENCE.indexOf(initialMood));

  return {
    id,
    sheet: entry.sheet,
    mood: initialMood,
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
    requestPresented: false,
    pendingDeparture: false,
    dropDepthOnDeparture: false,
    rejoinOnDeparture: false,
    finalComplaint: false,
    depth: null,
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
      actor.pose = 'walking';
      updateWalkBob(actor, deltaMs);
      moveTowardsTarget(parade, actor, deltaMs);
      break;
    case 'queued':
      updateQueued(parade, actor, deltaMs);
      break;
    case 'activeIdle':
      if (!actor.requestPresented && actor.timeInState >= ACTIVE_IDLE_MS) {
        startActiveTalking(parade, actor);
      }
      maybeDecayActiveMood(parade, actor, deltaMs);
      break;
    case 'activeTalking':
      updateActiveTalking(parade, actor, deltaMs);
      maybeDecayActiveMood(parade, actor, deltaMs);
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
  actor.requestPresented = false;
  actor.pendingDeparture = false;
  actor.rejoinOnDeparture = false;
  announceFrames(parade, actor);
  if (parade.rootState) {
    const mood = getActorMood(actor);
    startMasterFloristPuzzle(parade.rootState, {
      mood,
      customer: { id: actor.id, sheet: actor.sheet, mood },
      seed: actor.seed || Date.now(),
    });
  }

  startActiveTalking(parade, actor);
}

function startActiveTalking(parade, actor) {
  if (!actor || actor.requestPresented) {
    return;
  }
  actor.state = 'activeTalking';
  resetWalkBob(actor);
  actor.pose = 'talking';
  actor.timeInState = 0;
  actor.talkElapsed = 0;
  actor.mouthTimer = 0;
  actor.activeMoodTimer = 0;
}

function updateActiveTalking(parade, actor, deltaMs) {
  actor.talkElapsed += deltaMs;
  actor.mouthTimer += deltaMs;

  if (actor.mouthTimer >= parade.mouthToggleMs) {
    actor.mouthTimer = 0;
    actor.pose = actor.pose === 'talking' ? 'idle' : 'talking';
  }

  if (actor.talkElapsed >= ACTIVE_TALK_MS) {
    actor.requestPresented = true;
    actor.state = 'activeIdle';
    actor.pose = 'idle';
    actor.timeInState = 0;
    actor.talkElapsed = 0;
    actor.mouthTimer = 0;
    if (actor.pendingDeparture) {
      actor.pendingDeparture = false;
      beginDeparture(parade, actor);
    }
  }
}

function brieflyTalk(parade, actor) {
  if (!actor || actor.mood === 'complaint' || actor.state === 'departing') return;
  actor.state = 'activeTalking';
  actor.pose = 'talking';
  actor.timeInState = 0;
  actor.talkElapsed = 0;
  actor.mouthTimer = 0;
  actor.activeMoodTimer = 0;
  actor.requestPresented = true;
}

function detachFromQueue(parade, actor) {
  if (!parade?.queue || !Array.isArray(parade.queue)) return;
  const beforeLength = parade.queue.length;
  parade.queue = parade.queue.filter((entry) => entry && entry !== actor);
  if (parade.queue.length !== beforeLength) {
    parade.queueDirty = true;
  }
}

function beginDeparture(parade, actor) {
  if (!actor) return;
  releaseSheet(parade, actor.sheet);
  if (actor.rejoinOnDeparture && actor.sheet) {
    returnCustomerToGrabBag(parade, actor.sheet);
    actor.rejoinOnDeparture = false;
  }
  parade.activeId = null;
  detachFromQueue(parade, actor);
  resetWalkBob(actor);
  actor.queueIndex = null;
  actor.state = 'departing';
  actor.pose = 'walking';
  actor.targetX = EXIT_X;
  actor.timeInState = 0;
  actor.dropDepthOnDeparture = false;
  updateActorMoodFrames(parade, actor);
  if (parade.rootState) {
    resetMasterFloristSolution(parade.rootState);
    resetMasterFloristHandoff(parade.rootState);
    parade.rootState.arrangementOffsetY = 0;
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
  actor.carryArrangement = null;
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
  if (actor) { delete actor.carryArrangement; }
  releaseSheet(parade, actor?.sheet);
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
  checkForCustomerExhaustion(parade);
}

function resetQueuePose(actor) {
  if (!actor) return;
  actor.carryArrangement = null;
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
  actor.lastExactMatches = Math.max(previousBest, exactMatches);

  if (evaluation?.isMatch) {
    const carrySnapshot = startMasterFloristHandoffAnimation(state, { actorId: actor.id });
    actor.carryArrangement = carrySnapshot;
    handleMasterFloristPuzzleSuccess(state);
    actor.rejoinOnDeparture = true;
    actor.pendingDeparture = true;
    brieflyTalk(parade, actor);
    return;
  }

  brieflyTalk(parade, actor);
}

function maybeDecayQueueMood(parade, actor, deltaMs) {
  if (!parade?.atmosphere || deltaMs <= 0) return;
  if (!actor || actor.pendingActive) return;
  const mood = getActorMood(actor);
  if (mood === 'complaint') return;
  const thresholds = parade.atmosphere.queue || {};
  const threshold = thresholds[mood];
  if (!Number.isFinite(threshold) || threshold <= 0) return;
  actor.queueMoodTimer = (actor.queueMoodTimer || 0) + deltaMs;
  actor.activeMoodTimer = 0;
  if (actor.queueMoodTimer >= threshold) {
    actor.queueMoodTimer = 0;
    stepActorMood(parade, actor, { reason: 'The customer is getting impatient while waiting.' });
  }
}

function maybeDecayActiveMood(parade, actor, deltaMs) {
  if (!parade?.atmosphere || deltaMs <= 0) return;
  if (!actor || actor.state === 'departing') return;
  const mood = getActorMood(actor);
  if (mood === 'complaint') return;
  const thresholds = parade.atmosphere.active || {};
  const threshold = thresholds[mood];
  if (!Number.isFinite(threshold) || threshold <= 0) return;
  actor.activeMoodTimer = (actor.activeMoodTimer || 0) + deltaMs;
  if (actor.activeMoodTimer >= threshold) {
    actor.activeMoodTimer = 0;
    stepActorMood(parade, actor, {
      reason: 'The customer is losing patience while being served.',
      isActive: true,
    });
  }
}

function stepActorMood(parade, actor, { reason, isActive } = {}) {
  if (!actor) return false;
  const currentIndex = actor.moodStageIndex ?? Math.max(0, MOOD_SEQUENCE.indexOf(actor.mood ?? 'happy'));
  const previousMood = MOOD_SEQUENCE[Math.min(currentIndex, MOOD_SEQUENCE.length - 1)] || getActorMood(actor);
  if (currentIndex >= MOOD_SEQUENCE.length - 1) {
    handleCustomerComplaint(parade, actor, { reason, isActive });
    return false;
  }

  const nextIndex = Math.min(currentIndex + 1, MOOD_SEQUENCE.length - 1);
  actor.moodStageIndex = nextIndex;
  const nextMood = getActorMood(actor);
  actor.mood = nextMood;
  actor.queueMoodTimer = 0;
  actor.activeMoodTimer = 0;
  updateActorMoodFrames(parade, actor);
  logMoodDecayEvent(parade, actor, {
    from: previousMood,
    to: nextMood,
    reason,
    context: isActive ? 'active' : 'queue',
  });

  if (nextMood === 'complaint') {
    handleCustomerComplaint(parade, actor, { reason, isActive });
  }
  return true;
}

function handleCustomerComplaint(parade, actor, { reason, isActive } = {}) {
  if (!parade) return;
  handleMasterFloristComplaint(parade.rootState);
  if (!actor) return;

  actor.rejoinOnDeparture = false;
  releaseSheet(parade, actor.sheet);

  const reachedComplaintLimit = hasReachedComplaintDepartureLimit(parade);
  if (reachedComplaintLimit) {
    parade.gameOver = true;
    actor.dropDepthOnDeparture = false;
    actor.finalComplaint = true;
    actor.pose = 'idle';
    actor.state = 'activeIdle';
    actor.pendingDeparture = false;
    const currentX = Number.isFinite(actor.x) ? actor.x : ACTIVE_ANCHOR_X;
    actor.targetX = currentX;
    actor.queueIndex = null;
    parade.activeId = actor.id;
    parade.pendingActiveId = null;
    if (Array.isArray(parade.queue)) {
      parade.queue = parade.queue.filter((entry) => entry && entry.id !== actor.id);
    }
    parade.queueDirty = true;
    return;
  }

  actor.pose = 'walking';

  if (isActive) {
    actor.dropDepthOnDeparture = false;
    actor.pendingDeparture = false;
    beginDeparture(parade, actor);
    parade.queueDirty = true;
  } else {
    detachFromQueue(parade, actor);
    actor.state = 'departing';
    actor.pose = 'walking';
    actor.targetX = EXIT_X;
    actor.timeInState = 0;
    resetWalkBob(actor);
    actor.queueIndex = null;
    actor.dropDepthOnDeparture = false;
    updateActorMoodFrames(parade, actor);
    parade.queueDirty = true;
  }
  if (parade.pendingActiveId === actor.id) {
    parade.pendingActiveId = null;
  }
}

function logMoodDecayEvent(parade, actor, { from, to, reason, context } = {}) {
  if (!parade?.debugMoodDecayLog) return;
  const entry = {
    timestamp: Date.now(),
    actorId: actor?.id ?? null,
    sheet: actor?.sheet ?? null,
    from: from || null,
    to: to || null,
    reason: reason || null,
    context: context || actor?.state || null,
  };
  if (Array.isArray(parade.moodDecayEvents)) {
    parade.moodDecayEvents.push(entry);
  }
  try {
    console.debug(
      '[MasterFlorist][Mood]',
      entry.actorId,
      `${entry.from} -> ${entry.to}`,
      entry.context,
      entry.reason || '',
    );
  } catch {}
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

function resolveAtmosphereProfile(label, footTrafficLabel) {
  const key = (label || '').toLowerCase();
  const base = ATMOSPHERE_PROFILES[key] || DEFAULT_ATMOSPHERE_PROFILE;
  const queueMultipliers = base.queue || {};
  const footMultiplier = resolveFootTrafficPatienceMultiplier(footTrafficLabel);
  const queue = Object.create(null);

  for (const moodKey of Object.keys(BASE_QUEUE_MOOD_THRESHOLDS_MS)) {
    const baseMs = BASE_QUEUE_MOOD_THRESHOLDS_MS[moodKey];
    const moodMultiplier = queueMultipliers[moodKey] ?? 1;
    queue[moodKey] = Math.round(baseMs * moodMultiplier * footMultiplier);
  }

  return {
    label: key && ATMOSPHERE_PROFILES[key] ? key : 'balanced',
    queue,
    active: buildActiveMoodThresholds(queue),
  };
}

function resolveFootTrafficPatienceMultiplier(label) {
  const key = (label || '').toLowerCase();
  return FOOT_TRAFFIC_PATIENCE_MULTIPLIERS[key] ?? FOOT_TRAFFIC_PATIENCE_MULTIPLIERS.steady;
}

function buildActiveMoodThresholds(queueThresholds) {
  const active = Object.create(null);
  if (!queueThresholds) return active;
  for (const moodKey of Object.keys(queueThresholds)) {
    const baseMs = queueThresholds[moodKey];
    active[moodKey] = Math.round(baseMs * ACTIVE_CUSTOMER_QUEUE_MULTIPLIER);
  }
  return active;
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

  const frames = { ...(actor.frames || {}) };

  const applyMoodFrames = (label, { override } = { override: false }) => {
    if (!label) return;
    const walking = library.getFrame?.(sheet, label, 'walking');
    const idle = library.getFrame?.(sheet, label, 'idle');
    const talking = library.getFrame?.(sheet, label, 'talking');
    if (walking && (override || !frames.walking)) frames.walking = walking;
    if (idle && (override || !frames.idle)) frames.idle = idle;
    if (talking && (override || !frames.talking)) frames.talking = talking;
  };

  if (mood === 'complaint') {
    applyMoodFrames('angry');
    actor.pose = 'walking';
  }
  applyMoodFrames(mood, { override: true });

  actor.frames = frames;
}

function getFramesForMood(library, sheetName, mood) {
  if (!library || !sheetName) return null;
  const walking = library.getFrame?.(sheetName, mood, 'walking');
  const idle = library.getFrame?.(sheetName, mood, 'idle');
  const talking = library.getFrame?.(sheetName, mood, 'talking');
  if (walking && idle && talking) {
    return { walking, idle, talking };
  }
  return null;
}

function createRandomEntry(parade) {
  const library = parade?.spriteLibrary;
  const bag = ensureGrabBag(parade);
  if (!library || bag.length === 0) return null;
  const attempts = Math.max(1, bag.length);
  for (let i = 0; i < attempts; i += 1) {
    const sheetName = drawFromGrabBag(parade);
    if (!sheetName) break;
    const frames = getFramesForMood(library, sheetName, 'happy');
    if (!frames) {
      returnCustomerToGrabBag(parade, sheetName);
      continue;
    }
    return {
      sheet: sheetName,
      mood: 'happy',
      frames,
    };
  }
  return null;
}

function populateGrabBag(parade) {
  if (!parade) {
    return [];
  }
  const library = parade.spriteLibrary;
  const sheets = Array.isArray(library?.sheetList) ? library.sheetList : [];
  const seen = new Set();
  const bag = [];
  for (const info of sheets) {
    const name = info?.name;
    if (!name || seen.has(name)) continue;
    const frames = getFramesForMood(library, name, 'happy');
    if (!frames) continue;
    seen.add(name);
    bag.push(name);
  }
  shuffleArray(bag);
  parade.grabBag = bag;
  return bag;
}

function ensureGrabBag(parade) {
  if (!parade) return [];
  if (!Array.isArray(parade.grabBag)) {
    parade.grabBag = [];
  }
  return parade.grabBag;
}

function drawFromGrabBag(parade) {
  const bag = ensureGrabBag(parade);
  if (!bag.length) return null;
  const index = Math.floor(Math.random() * bag.length);
  const [sheet] = bag.splice(index, 1);
  return sheet || null;
}

function returnCustomerToGrabBag(parade, sheet) {
  if (!parade || !sheet) return;
  const bag = ensureGrabBag(parade);
  if (parade.activeSheets instanceof Set && parade.activeSheets.has(sheet)) return;
  if (bag.includes(sheet)) return;
  const index = Math.floor(Math.random() * (bag.length + 1));
  bag.splice(index, 0, sheet);
}

function markSheetActive(parade, sheet) {
  if (!parade || !sheet) return;
  if (!(parade.activeSheets instanceof Set)) {
    parade.activeSheets = new Set();
  }
  parade.activeSheets.add(sheet);
}

function releaseSheet(parade, sheet) {
  if (!parade || !sheet) return;
  if (parade.activeSheets instanceof Set) {
    parade.activeSheets.delete(sheet);
  }
}

function checkForCustomerExhaustion(parade) {
  if (!parade || parade.gameOver) return;
  const bagCount = ensureGrabBag(parade).length;
  if (bagCount > 0) return;
  const actorCount = Array.isArray(parade.actors) ? parade.actors.length : 0;
  if (actorCount > 0) return;
  const queueCount = Array.isArray(parade.queue) ? parade.queue.length : 0;
  if (queueCount > 0) return;
  const activeCount = (parade.activeId ? 1 : 0) + (parade.pendingActiveId ? 1 : 0);
  if (activeCount > 0) return;
  parade.gameOver = true;
  triggerMasterFloristGameOver(parade.rootState, GAME_OVER_MESSAGE);
}

function shuffleArray(list) {
  if (!Array.isArray(list)) return [];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function randomBetween(range) {
  const [min, max] = range;
  if (!Number.isFinite(min)) return 0;
  if (!Number.isFinite(max) || max <= min) return min;
  return min + Math.random() * (max - min);
}



