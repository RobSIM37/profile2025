import { makeAIMemory } from './memory.js';

// Maintains per-player AI memory across turns (in-game scope)
export function makeAIControllers(players) {
  const ctrls = players.map((p) => {
    if (p.kind !== 'ai') return null;
    const raw = typeof p.memCap === 'number' ? p.memCap : 10;
    const cap = Math.max(0, Math.min(50, Math.floor(raw)));
    return { mem: makeAIMemory(cap) };
  });
  return ctrls;
}

export function rememberForAll(ctrls, state, flippedIdx) {
  const card = state.cards[flippedIdx];
  ctrls.forEach((c) => { if (c) c.mem.remember(card.id, flippedIdx); });
}

// Decide next flip index for current AI player
export function chooseFlip(ctrls, state) {
  const ai = ctrls[state.current];
  if (!ai) return -1;
  const mem = ai.mem;
  const cards = state.cards;
  const faceDownIdxs = cards.filter(c => c.state === 'down').map(c=>c.idx);
  const unknownFaceDownIdxs = faceDownIdxs.filter(i => !mem.seenIdx.has(i));
  if (state.firstPick == null) {
    // If a known pair exists (that is still face down), pick one
    const kp = mem.knownPair();
    if (kp) {
      const aDown = faceDownIdxs.includes(kp.a);
      const bDown = faceDownIdxs.includes(kp.b);
      if (aDown && bDown) return kp.a;
      // Otherwise ignore stale memory and fall through to unknown pick
    }
    // Exploration: avoid cards we remember; pick random truly unknown
    const pool = unknownFaceDownIdxs.length ? unknownFaceDownIdxs : faceDownIdxs;
    return pool[(Math.random()*pool.length)|0] ?? -1;
  } else {
    const first = cards[state.firstPick];
    const mate = mem.knowMate(first.id, first.idx);
    if (mate != null && faceDownIdxs.includes(mate)) return mate;
    // No known mate: exploration; avoid remembered cards
    const pool = unknownFaceDownIdxs.length ? unknownFaceDownIdxs : faceDownIdxs;
    return pool[(Math.random()*pool.length)|0] ?? -1;
  }
}

