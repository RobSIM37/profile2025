import { AI_PROFILES } from './profiles.js';
import { makeAIMemory } from './memory.js';

// Maintains per-player AI memory across turns (in-game scope)
export function makeAIControllers(players) {
  const ctrls = players.map((p) => {
    if (p.kind !== 'ai') return null;
    const prof = AI_PROFILES[p.level] || AI_PROFILES.easy;
    return { profile: prof, mem: makeAIMemory(prof.memCap) };
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
  if (state.firstPick == null) {
    // If a known pair exists, pick one of them
    if (ai.profile.memCap === Infinity) {
      const kp = mem.knownPair();
      if (kp) return kp.a;
    }
    // Otherwise pick a random unknown
    return faceDownIdxs[(Math.random()*faceDownIdxs.length)|0] ?? -1;
  } else {
    const first = cards[state.firstPick];
    const mate = mem.knowMate(first.id, first.idx);
    if (mate != null) return mate;
    // Perfect tries to avoid re-flipping likely singles; pick any unknown
    return faceDownIdxs[(Math.random()*faceDownIdxs.length)|0] ?? -1;
  }
}

