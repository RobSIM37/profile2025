// Game state scaffolding for Knock It Off!
// Focus: data structures and factories (no gameplay logic yet)

import { MASK_2P, MASK_4P, COLORS } from './masks.js';

export const PlayerType = {
  Human: 'human',
  AI: 'ai',
  Remote: 'remote', // placeholder for future WebSocket play
};

export const PieceKind = {
  Frowny: 'frowny', // lose this -> eliminated
  Smiley: 'smiley', // lose all three -> you win
  Blank: 'blank',
};

// Turn order is fixed by color: b → r → g → u
export const TURN_ORDER = ['b', 'r', 'g', 'u'];

export function countMaskByColor(maskRows) {
  const counts = { b: 0, r: 0, g: 0, u: 0 };
  for (const row of maskRows) for (const ch of row) if (counts.hasOwnProperty(ch)) counts[ch]++;
  return counts;
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickColors(playerCount) {
  const all = TURN_ORDER.slice();
  // random assignment, but turn order remains b→r→g→u
  const picks = shuffle(all).slice(0, playerCount);
  return TURN_ORDER.filter((c) => picks.includes(c));
}

function defaultPlayerName(idx, type) {
  if (type === PlayerType.Human) return 'You';
  if (type === PlayerType.AI) return `AI ${idx}`;
  return `Remote ${idx}`;
}

export function createGame(options = {}) {
  const playerCount = Math.min(4, Math.max(2, options.playerCount || 2));
  const maskRows = playerCount === 2 ? MASK_2P : MASK_4P;
  const perColorSlots = countMaskByColor(maskRows);

  // Determine participating colors in fixed order. For 2P, only black and red.
  let turnColors = options.turnColors && options.turnColors.length ? options.turnColors.slice(0, playerCount) : TURN_ORDER.slice(0, playerCount);

  // Types: default Human + AIs, then map to colors
  const defaultTypes = Array.from({ length: playerCount }, (_, i) => (i === 0 ? PlayerType.Human : PlayerType.AI));
  const types = (options.playerTypes && options.playerTypes.length ? options.playerTypes : defaultTypes).slice(0, playerCount);
  const namesOpt = (options.playerNames || []).slice(0, playerCount);
  const aiLevelsOpt = (options.aiLevels || []).slice(0, playerCount);

  const players = turnColors.map((color, i) => {
    const slots = perColorSlots[color] || 0;
    const blanks = Math.max(0, slots - 4); // 1 frowny + 3 smiley
    const type = types[i] || PlayerType.AI;
    const idxForName = i + 1;
    return {
      id: `P${idxForName}`,
      name: namesOpt[i] || defaultPlayerName(idxForName, type),
      type,
      color, // 'b' | 'r' | 'g' | 'u'
      order: i, // turn order index
      aiLevel: type === PlayerType.AI ? (aiLevelsOpt[i] || 'medium') : null,
      pieces: {
        [PieceKind.Frowny]: 1,
        [PieceKind.Smiley]: 3,
        [PieceKind.Blank]: blanks,
      },
      eliminated: false,
    };
  });

  const state = {
    phase: 'start', // 'start' | 'setup' | 'play' | 'gameover'
    createdAt: Date.now(),
    rules: {
      board: { width: 8, height: 8 },
      playerCount,
      maskId: playerCount === 2 ? '2P' : '4P',
    },
    board: {
      mask: maskRows, // array of 8 strings
      cells: Array(64).fill(null), // each cell: { ownerId, color, kind, faceDown: true } | null
    },
    players, // in turn order
    turn: {
      order: turnColors.slice(), // e.g., ['b','r','g','u'] filtered to active players
      index: 0, // current color index
      round: 1,
      turns: 0,
    },
    counts: {
      remainingPlayers: players.length,
      specialsRemaining: players.reduce((acc, p) => {
        acc[p.color] = { frowny: 1, smiley: 3 };
        return acc;
      }, {}),
    },
    // Captured specials per color (array of kinds: 'frowny' | 'smiley')
    captured: players.reduce((acc, p) => {
      acc[p.color] = [];
      return acc;
    }, {}),
    // Move log: [{ id, text, before: cells[64], after: cells[64], turnColor }]
    logs: [],
    // Availability flags for rendering draggable specials in racks
    rackAvail: players.reduce((acc, p) => {
      acc[p.color] = { frowny: true, smiley: [true, true, true] };
      return acc;
    }, {}),
    // Future: rngSeed, logs, pendingRemote, etc.
  };

  return state;
}

// Placeholder: advance turn (no gameplay yet)
export function nextTurn(state) {
  const n = state.turn.order.length;
  if (n === 0) return state;
  // advance until we land on a non-eliminated color, or bail after n attempts
  let attempts = 0;
  while (attempts < n) {
    state.turn.index = (state.turn.index + 1) % n;
    state.turn.turns += 1;
    if (state.turn.index === 0) state.turn.round += 1;
    const color = state.turn.order[state.turn.index];
    const eliminated = (state.captured?.[color] || []).includes('frowny');
    if (!eliminated) break;
    attempts++;
  }
  return state;
}
