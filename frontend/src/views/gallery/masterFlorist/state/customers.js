import { MF_CANVAS_WIDTH } from '../canvas/constants.js';
import { MASTER_FLORIST_LAYOUT } from './layout.js';
import { resetMasterFloristSolution } from './store.js';

const ACTIVE_IDLE_MS = 2_000;
const ACTIVE_TALK_MS = 10_000;
const TALK_TOGGLE_MS = 150;
const QUEUE_IDLE_RANGE = [2_500, 4_500];
const QUEUE_WALK_RANGE = [900, 1_600];
const NOTICE_DELAY_RANGE = [300, 1_200];
const WALK_SPEED = 320; // px per second
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

function ensureQueueStocked(parade) {
  const desired = parade.maxVisible;
  if (desired <= 0) return;
  if (parade.spawnCooldownMs > 0) return;
  const inPlay = parade.queue.length + (parade.activeId ? 1 : 0) + (parade.pendingActiveId ? 1 : 0);
  if (inPlay >= desired) return;

  const entry = nextEntry(parade);
  if (!entry) return;

  const actor = createActor(entry);
  parade.actors.push(actor);
  parade.queue.push(actor);
  parade.queueDirty = true;
  parade.spawnCooldownMs = parade.spawnIntervalMs;
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
    queue: {
      desiredX: SPAWN_X,
      needsAdvance: false,
      noticeDelayMs: randomBetween(NOTICE_DELAY_RANGE),
      noticeElapsed: 0,
      poseTimer: 0,
      idleDuration: randomBetween(QUEUE_IDLE_RANGE),
      walkDuration: randomBetween(QUEUE_WALK_RANGE),
    },
  };
}

function layoutQueue(parade, soft) {
  if (!parade.queue.length) return;
  const count = parade.queue.length;
  const spacing = Math.max(
    parade.queueSpacingMin,
    parade.queueSpacingBase - Math.max(0, count - 1) * parade.queueSpacingStep,
  );

  let anchor = QUEUE_START_X;
  parade.queue.forEach((actor, index) => {
    if (!actor) return;
    actor.renderOrder = index;
    actor.queueIndex = index;
    if (actor.pendingActive) {
      anchor += spacing;
      return;
    }

    const current = actor.queue.desiredX;
    if (soft && Math.abs((current ?? anchor) - anchor) < 0.5) {
      anchor += spacing;
      return;
    }

    actor.queue.desiredX = anchor;
    if (actor.state === 'entering') {
      actor.targetX = anchor;
    } else if (actor.state === 'queued') {
      actor.queue.needsAdvance = true;
      actor.queue.noticeElapsed = 0;
      actor.queue.noticeDelayMs = randomBetween(NOTICE_DELAY_RANGE);
    }
    anchor += spacing;
  });
}

function advanceActor(parade, actor, deltaMs) {
  actor.timeInState += deltaMs;

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
    if (actor.pendingActive) {
      actor.pendingActive = false;
      beginActiveIdle(parade, actor);
    } else {
      actor.state = 'queued';
      actor.pose = 'idle';
      resetQueuePose(actor);
    }
    return;
  }

  if (actor.state === 'departing') {
    actor.remove = true;
  }
}

function updateQueued(actor, deltaMs) {
  const queue = actor.queue;
  queue.poseTimer += deltaMs;

  if (actor.pose === 'idle') {
    if (queue.poseTimer >= queue.idleDuration) {
      actor.pose = 'walking';
      queue.poseTimer = 0;
      queue.walkDuration = randomBetween(QUEUE_WALK_RANGE);
    }
  } else if (queue.poseTimer >= queue.walkDuration) {
    actor.pose = 'idle';
    queue.poseTimer = 0;
    queue.idleDuration = randomBetween(QUEUE_IDLE_RANGE);
  }

  if (queue.needsAdvance) {
    queue.noticeElapsed += deltaMs;
    if (actor.pose === 'walking' && queue.noticeElapsed >= queue.noticeDelayMs) {
      queue.needsAdvance = false;
      actor.state = 'advancing';
      actor.targetX = queue.desiredX;
      actor.timeInState = 0;
    }
  }
}

function beginActiveIdle(parade, actor) {
  parade.activeId = actor.id;
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
  const next = parade.queue.shift();
  if (!next) return;
  parade.pendingActiveId = next.id;
  next.pendingActive = true;
  next.state = 'advancing';
  next.pose = 'walking';
  next.targetX = ACTIVE_ANCHOR_X;
  next.timeInState = 0;
  parade.queueDirty = true;
}

function dropActor(parade, actor, index) {
  parade.actors.splice(index, 1);
  parade.queue = parade.queue.filter((entry) => entry !== actor);

  if (parade.activeId === actor.id) {
    parade.activeId = null;
    parade.queueDirty = true;
  }
  if (parade.pendingActiveId === actor.id) {
    parade.pendingActiveId = null;
  }
}

function resetQueuePose(actor) {
  const queue = actor.queue;
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
