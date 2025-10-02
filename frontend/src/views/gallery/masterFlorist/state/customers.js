import { MF_CANVAS_WIDTH } from '../canvas/constants.js';
import { MASTER_FLORIST_LAYOUT } from './layout.js';
import { resetMasterFloristSolution } from './store.js';

const ACTIVE_IDLE_MS = 0;
const ACTIVE_TALK_MS = 5_000;
const TALK_TOGGLE_MS = 150;
const QUEUE_IDLE_RANGE = [2_500, 4_500];
const QUEUE_WALK_RANGE = [900, 1_600];
const NOTICE_DELAY_RANGE = [300, 1_200];
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
  if (parade.queueDirty) {
    layoutQueue(parade, false);
    parade.queueDirty = false;
  } else {
    layoutQueue(parade, true);
  }

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

  trimQueue(parade);
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

function countQueueActors(queue = []) {
  if (!Array.isArray(queue)) return 0;
  return queue.reduce((count, actor) => (actor ? count + 1 : count), 0);
}

function findFirstEmptyQueueSlot(queue = []) {
  if (!Array.isArray(queue)) return -1;
  for (let i = 0; i < queue.length; i += 1) {
    if (!queue[i]) return i;
  }
  return -1;
}

function trimQueue(parade) {
  if (!Array.isArray(parade?.queue)) return;
  while (parade.queue.length > 0 && parade.queue[parade.queue.length - 1] == null) {
    parade.queue.pop();
  }
}

function computeQueueSpacing(parade) {
  const count = Math.max(Array.isArray(parade?.queue) ? parade.queue.length : 0, 1);
  return Math.max(
    parade.queueSpacingMin,
    parade.queueSpacingBase - Math.max(0, count - 1) * parade.queueSpacingStep,
  );
}

function getQueueAnchor(parade, index) {
  if (index == null || index < 0) {
    return QUEUE_START_X;
  }
  const spacing = computeQueueSpacing(parade);
  return QUEUE_START_X + spacing * index;
}

function isFrontSlotEmpty(parade, index) {
  if (!Array.isArray(parade?.queue) || index == null || index <= 0) return false;
  const front = parade.queue[index - 1];
  return !front || front.state !== 'queued';
}

function countQueuePresence(parade) {
  const base = countQueueActors(parade?.queue);
  if (!Array.isArray(parade?.actors)) return base;
  return base + parade.actors.reduce((sum, actor) => {
    if (actor && actor.state === 'advancing' && typeof actor.queueTargetIndex === 'number' && actor.queueTargetIndex >= 0) {
      return sum + 1;
    }
    return sum;
  }, 0);
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

function ensureQueueStocked(parade) {
  if (!Array.isArray(parade.queue)) parade.queue = [];
  const desired = parade.maxVisible;
  if (desired <= 0) return;
  if (parade.spawnCooldownMs > 0) return;

  const activeCount = (parade.activeId ? 1 : 0) + (parade.pendingActiveId ? 1 : 0);
  if (countQueuePresence(parade) + activeCount >= desired) return;

  while (countQueuePresence(parade) + activeCount < desired) {
    const entry = nextEntry(parade);
    if (!entry) break;
    const actor = createActor(entry);
    const slotIndex = findFirstEmptyQueueSlot(parade.queue);
    if (slotIndex === -1) {
      parade.queue.push(actor);
      actor.queueIndex = parade.queue.length - 1;
    } else {
      parade.queue[slotIndex] = actor;
      actor.queueIndex = slotIndex;
    }
    parade.actors.push(actor);
    parade.queueDirty = true;
    parade.spawnCooldownMs = parade.spawnIntervalMs;
  }

  trimQueue(parade);
}

function nextEntry(parade) {
  if (!parade.pendingEntries || parade.pendingEntries.length === 0) {
    parade.pendingEntries = parade.sourceEntries.slice();
  }
  return parade.pendingEntries.shift() || null;
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
    queueTargetIndex: null,
    queue: {
      desiredX: SPAWN_X,
      needsAdvance: false,
      noticeDelayMs: randomBetween(NOTICE_DELAY_RANGE),
      noticeElapsed: 0,
      poseTimer: 0,
      idleDuration: randomBetween(QUEUE_IDLE_RANGE),
      walkDuration: randomBetween(QUEUE_WALK_RANGE),
    },
    bobOffset: 0,
    bobTimerMs: 0,
    bobActiveMs: 0,
    bobIsActive: false,
  };
}

function layoutQueue(parade, soft) {
  if (!Array.isArray(parade.queue) || parade.queue.length === 0) return;
  const spacing = computeQueueSpacing(parade);

  let anchor = QUEUE_START_X;
  parade.queue.forEach((actor, index) => {
    const slotX = anchor;
    if (!actor) {
      anchor += spacing;
      return;
    }

    actor.renderOrder = index;
    actor.queueIndex = index;

    const desiredX = slotX;
    const currentDesired = actor.queue.desiredX;
    if (!soft || Math.abs((currentDesired ?? desiredX) - desiredX) >= 0.5) {
      actor.queue.desiredX = desiredX;
      if (actor.state === 'entering') {
        actor.targetX = desiredX;
      }
    }

    if (actor.state === 'queued') {
      const frontEmpty = isFrontSlotEmpty(parade, index);
      if (frontEmpty && !actor.queue.needsAdvance) {
        actor.queue.needsAdvance = true;
        actor.queue.noticeElapsed = 0;
        actor.queue.noticeDelayMs = randomBetween(NOTICE_DELAY_RANGE);
      } else if (!frontEmpty && actor.queue.needsAdvance) {
        actor.queue.needsAdvance = false;
        actor.queue.noticeElapsed = 0;
      }
    }

    anchor += spacing;
  });
}

function advanceActor(parade, actor, deltaMs) {
  actor.timeInState += deltaMs;
  updateWalkBob(actor, deltaMs);

  switch (actor.state) {
    case 'entering':
    case 'advancing':
    case 'departing':
      moveTowardsTarget(parade, actor, deltaMs);
      break;
    case 'queued':
      updateQueued(actor, deltaMs);
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
    return;
  }

  if (actor.state === 'advancing') {
    const targetIndex = actor.queueTargetIndex;
    actor.queueTargetIndex = null;
    if (actor.pendingActive) {
      actor.pendingActive = false;
      beginActiveIdle(parade, actor);
    } else if (targetIndex != null && targetIndex >= 0) {
      parade.queue[targetIndex] = actor;
      actor.queueIndex = targetIndex;
      actor.state = 'queued';
      actor.pose = 'idle';
      resetQueuePose(actor);
    } else {
      actor.state = 'queued';
    }
    parade.queueDirty = true;
    trimQueue(parade);
    return;
  }

  if (actor.state === 'departing') {
    actor.remove = true;
  }
}

function updateQueued(parade, actor, deltaMs) {
  const queue = actor.queue;
  queue.poseTimer += deltaMs;

  let poseChanged = false;

  if (actor.pose === 'idle') {
    if (queue.poseTimer >= queue.idleDuration) {
      actor.pose = 'walking';
      resetWalkBob(actor);
      queue.poseTimer = 0;
      queue.walkDuration = randomBetween(QUEUE_WALK_RANGE);
      poseChanged = true;
    }
  } else if (queue.poseTimer >= queue.walkDuration) {
    actor.pose = 'idle';
    resetWalkBob(actor);
    queue.poseTimer = 0;
    queue.idleDuration = randomBetween(QUEUE_IDLE_RANGE);
    poseChanged = true;
  }

  const slotIndex = typeof actor.queueIndex === 'number' ? actor.queueIndex : parade.queue.indexOf(actor);
  const frontEmpty = isFrontSlotEmpty(parade, slotIndex);
  if (poseChanged && actor.state === 'queued') {
    if (frontEmpty) {
      queue.needsAdvance = true;
      queue.noticeElapsed = 0;
      queue.noticeDelayMs = randomBetween(NOTICE_DELAY_RANGE);
    } else if (queue.needsAdvance) {
      queue.needsAdvance = false;
      queue.noticeElapsed = 0;
    }
  }

  if (queue.needsAdvance) {
    queue.noticeElapsed += deltaMs;
    if (actor.pose === 'walking' && queue.noticeElapsed >= queue.noticeDelayMs) {
      queue.needsAdvance = false;
      actor.state = 'advancing';
      const currentIndex = typeof actor.queueIndex === 'number' ? actor.queueIndex : parade.queue.indexOf(actor);
      const targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      actor.queueTargetIndex = targetIndex;
      if (currentIndex >= 0 && parade.queue[currentIndex] === actor) {
        parade.queue[currentIndex] = null;
      }
      actor.queueIndex = null;
      const anchor = getQueueAnchor(parade, targetIndex);
      actor.queue.desiredX = anchor;
      actor.targetX = anchor;
      parade.queueDirty = true;
      actor.timeInState = 0;
    }
  }
}

function beginActiveIdle(parade, actor) {
  parade.activeId = actor.id;
  resetWalkBob(actor);
  actor.queueIndex = null;
  actor.queueTargetIndex = null;
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
  actor.queueTargetIndex = null;
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
  if (!Array.isArray(parade.queue)) return;
  const nextIndex = parade.queue.findIndex((actor) => actor);
  if (nextIndex === -1) return;
  const next = parade.queue[nextIndex];
  parade.queue[nextIndex] = null;
  next.queueIndex = null;
  next.queueTargetIndex = -1;
  parade.pendingActiveId = next.id;
  next.pendingActive = true;
  next.state = 'advancing';
  next.pose = 'walking';
  next.targetX = ACTIVE_ANCHOR_X;
  next.timeInState = 0;
  parade.queueDirty = true;
  trimQueue(parade);
}

function dropActor(parade, actor, index) {
  parade.actors.splice(index, 1);
  if (Array.isArray(parade.queue)) {
    const slotIndex = typeof actor.queueIndex === 'number' ? actor.queueIndex : parade.queue.indexOf(actor);
    if (slotIndex >= 0) {
      parade.queue[slotIndex] = null;
    } else {
      parade.queue = parade.queue.filter((entry) => entry !== actor);
    }
  }
  actor.queueIndex = null;
  actor.queueTargetIndex = null;

  if (parade.activeId === actor.id) {
    parade.activeId = null;
    parade.queueDirty = true;
  }
  if (parade.pendingActiveId === actor.id) {
    parade.pendingActiveId = null;
  }
  trimQueue(parade);
}

function resetQueuePose(actor) {
  const queue = actor.queue;
  resetWalkBob(actor);
  queue.poseTimer = 0;
  queue.idleDuration = randomBetween(QUEUE_IDLE_RANGE);
  queue.walkDuration = randomBetween(QUEUE_WALK_RANGE);
  queue.noticeElapsed = 0;
  queue.noticeDelayMs = randomBetween(NOTICE_DELAY_RANGE);
  queue.needsAdvance = false;
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




