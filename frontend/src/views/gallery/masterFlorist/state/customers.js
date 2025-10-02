import { MF_CANVAS_WIDTH } from '../canvas/constants.js';
import { MASTER_FLORIST_LAYOUT } from './layout.js';
import { resetMasterFloristSolution } from './store.js';

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
    queueSpacingBase: BASE_PERSONAL_SPACE,
    queueSpacingMin: MIN_PERSONAL_SPACE,
    queueSpacingStep: PERSONAL_SPACE_STEP,
    mouthToggleMs: TALK_TOGGLE_MS,
    maxVisible: Math.min(MAX_VISIBLE_CUSTOMERS, entries.length + 1),
    queueDirty: true,
    queueSpacingSnapshot: BASE_PERSONAL_SPACE,
  };
}

export function updateCustomerParade(state, info = {}) {
  const parade = state?.customerParade;
  if (!parade || !parade.spriteLibrary) return;

  const deltaMs = Number(info?.deltaMs) || 0;
  if (deltaMs <= 0) return;

  parade.elapsedMs += deltaMs;
  parade.spawnCooldownMs = Math.max(0, parade.spawnCooldownMs - deltaMs);

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

function createQueueState(anchorX = SPAWN_X) {
  return {
    mode: 'waiting',
    elapsedMs: 0,
    delayMs: randomBetween(QUEUE_ADVANCE_DELAY_RANGE),
    restX: anchorX,
  };
}

function ensureQueueState(actor, anchorX) {
  if (!actor || typeof actor !== 'object') return null;
  if (!actor.queue || typeof actor.queue !== 'object') {
    actor.queue = createQueueState(anchorX ?? SPAWN_X);
  }
  if (anchorX != null) {
    actor.queue.restX = Math.min(actor.queue.restX ?? anchorX, anchorX);
  }
  return actor.queue;
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

function ensureQueueStocked(parade) {
  if (!parade) return;
  if (!Array.isArray(parade.queue)) {
    parade.queue = [];
  }
  const desired = parade.maxVisible;
  if (desired <= 0) return;
  if (parade.spawnCooldownMs > 0) return;

  const activeCount = (parade.activeId ? 1 : 0) + (parade.pendingActiveId ? 1 : 0);
  if (parade.queue.length + activeCount >= desired) return;

  while (parade.queue.length + activeCount < desired) {
    const entry = nextEntry(parade);
    if (!entry) break;
    const actor = createActor(entry);
    actor.state = 'entering';
    actor.pose = 'walking';
    actor.x = SPAWN_X;
    actor.queueIndex = parade.queue.length;
    const spacing = computeQueueSpacing(parade, actor.queueIndex + 1);
    const anchor = getQueueAnchor(parade, actor.queueIndex, spacing);
    actor.targetX = anchor;
    ensureQueueState(actor, anchor);
    parade.actors.push(actor);
    parade.queue.push(actor);
    parade.queueDirty = true;
    parade.spawnCooldownMs = parade.spawnIntervalMs;
    break;
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
    actor.queueIndex = index;
    const anchor = getQueueAnchor(parade, index, spacing);
    const queue = ensureQueueState(actor, anchor);
    if (actor.state === 'entering') {
      actor.targetX = anchor;
    }
    if (actor.state === 'queued' && queue.mode !== 'advancing') {
      queue.restX = Math.min(queue.restX ?? anchor, anchor);
    }
  });
}

function slideActorTowards(actor, targetX, deltaMs) {
  const currentX = actor.x ?? SPAWN_X;
  if (targetX >= currentX) {
    actor.x = currentX;
    return true;
  }
  const step = actor.speed * (deltaMs / 1000);
  if (step <= 0) {
    return false;
  }
  const delta = currentX - targetX;
  if (delta <= step) {
    actor.x = targetX;
    return true;
  }
  actor.x = currentX - step;
  return false;
}

function startQueueAdvance(actor) {
  const queue = ensureQueueState(actor);
  queue.mode = 'advancing';
  queue.elapsedMs = 0;
  actor.pose = 'walking';
  resetWalkBob(actor);
}

function updateQueued(parade, actor, deltaMs) {
  const queue = ensureQueueState(actor);
  const index = typeof actor.queueIndex === 'number' ? actor.queueIndex : parade.queue.indexOf(actor);
  if (index < 0) return;

  const spacing = parade.queueSpacingSnapshot ?? computeQueueSpacing(parade);
  const anchor = getQueueAnchor(parade, index, spacing);
  queue.restX = Math.min(queue.restX ?? anchor, anchor);

  const ahead = index > 0 ? parade.queue[index - 1] : null;
  const aheadX = ahead ? ahead.x : QUEUE_START_X;
  const desiredX = ahead ? aheadX + spacing : QUEUE_START_X;
  const targetX = Math.min(queue.restX, desiredX);

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
    queue.mode = 'waiting';
    queue.elapsedMs = 0;
    queue.delayMs = randomBetween(QUEUE_ADVANCE_DELAY_RANGE);
    queue.restX = targetX;
    actor.pose = 'idle';
    resetWalkBob(actor);
  }
}

function createActor(entry) {
  const id = [entry.sheet, entry.mood, Date.now(), Math.random().toString(16).slice(2, 6)].join('-');
  const frames = entry.frames;
  const template = frames.idle || frames.walking || frames.talking;
  const width = template?.width ?? 180;
  const height = template?.height ?? 300;

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
    queue: createQueueState(),
    bobOffset: 0,
    bobTimerMs: 0,
    bobActiveMs: 0,
    bobIsActive: false,
  };
}

function layoutQueue(parade, soft) {
  applyQueueLayout(parade);
}

function advanceActor(parade, actor, deltaMs) {
  if (!actor || typeof actor !== 'object') return;
  actor.timeInState += deltaMs;

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
  announceFrames(parade, actor);
  if (parade.rootState) {
    resetMasterFloristSolution(parade.rootState);
    parade.rootState.drag = null;
    parade.rootState.hoverStemId = null;
    parade.rootState.pendingDrops = [];
  }
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
    beginDeparture(parade, actor);
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
  queue.restX = actor.x;
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
  chat.appendMessage('system', text, 'Sprites');
  actor.chatAnnounced = true;
}

function randomBetween(range) {
  const [min, max] = range;
  if (!Number.isFinite(min)) return 0;
  if (!Number.isFinite(max) || max <= min) return min;
  return min + Math.random() * (max - min);
}

