// Core win/lose bookkeeping for Knock It Off!

export function onKnock(state, piece) {
  if (!piece) return;
  const color = piece.color;
  if (!state.captured[color]) state.captured[color] = [];
  state.captured[color].push(piece.kind);
}

export function checkEnd(state) {
  // Win by smileys: a player with all three smileys removed wins immediately
  for (const p of state.players) {
    const caps = state.captured[p.color] || [];
    const sCount = caps.filter(k=>k==='smiley').length;
    if (sCount >= 3) return { over: true, winner: p, reason: 'three-smileys' };
  }
  // Win by last frowny remaining (only among real players)
  const alive = state.players.filter(p => !(state.captured[p.color]||[]).includes('frowny'));
  if (alive.length === 1) return { over: true, winner: alive[0], reason: 'last-frowny' };
  return { over: false };
}

