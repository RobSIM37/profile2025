import { listLegalMovesForColor as listMovesCore } from '../engine/moves.js';

export function getAIProfileForColor(state, profiles, color) {
  const p = state.players.find((pp) => pp.color === color);
  if (!p || p.type !== 'ai') return profiles.medium;
  const lvl = (p.aiLevel || 'medium').toLowerCase();
  return profiles[lvl] || profiles.medium;
}

export function countFrownyThreats(state, targetColor, dirs) {
  const oppColors = state.turn.order.filter((c) => c !== targetColor && !(state.captured?.[c] || []).includes('frowny'));
  let count = 0;
  for (const oc of oppColors) {
    const moves = listMovesCore(state, oc, dirs);
    for (const mv of moves) if (mv.knocked?.kind === 'frowny' && mv.knocked?.color === targetColor) count++;
  }
  return count;
}

export function baseEvaluateMove(state, move, profile) {
  let score = (profile.knockWeights?.[move.knocked.kind] ?? 0);
  if (move.knocked.kind === 'smiley') score -= (profile.smileyPenalty ?? 0);
  const dCenter = (idx) => { const x = idx % 8, y = Math.floor(idx / 8); const cx = 3.5, cy = 3.5; return Math.hypot(x - cx, y - cy); };
  const isEdge = (idx) => { const x = idx % 8, y = Math.floor(idx / 8); return (x === 0 || y === 0 || x === 7 || y === 7); };
  if (isEdge(move.from)) score -= profile.originEdgePenalty;
  if (isEdge(move.dest)) score -= profile.endEdgePenalty;
  score += profile.centerControl * (1 / (1 + dCenter(move.dest)));
  score += (Math.random() - 0.5) * profile.noise;
  return score;
}

export function evaluateMove(state, move, profile, dirs, beforeThreats = null) {
  let score = baseEvaluateMove(state, move, profile);
  const protectW = profile.protectFrowny ?? 0;
  const exposeW = profile.frownyExposure ?? 0;
  if (protectW > 0 || exposeW > 0) {
    try {
      const me = move.mover.color;
      const before = (beforeThreats != null) ? beforeThreats : countFrownyThreats(state, me, dirs);
      if (before > 0) {
        const nextState = { ...state, board: { ...state.board, cells: move.cells } };
        const after = countFrownyThreats(nextState, me, dirs);
        const delta = before - after;
        if (delta !== 0) score += protectW * delta;
        if (after > before) score -= exposeW * (after - before);
      }
    } catch {}
  }
  return score;
}

export function bestMoveScoreForColor(state, color, profile, dirs) {
  const mvz = listMovesCore(state, color, dirs);
  if (mvz.length === 0) return -Infinity;
  let best = -Infinity;
  for (const m of mvz) {
    const v = baseEvaluateMove(state, m, profile);
    if (v > best) best = v;
  }
  return best;
}

export function nextActiveColorAfter(state, color) {
  const order = state.turn.order;
  const idx = order.indexOf(color);
  const n = order.length;
  for (let k = 1; k <= n; k++) {
    const c = order[(idx + k) % n];
    const elim = (state.captured?.[c] || []).includes('frowny');
    if (!elim) return c;
  }
  return color;
}

export function chooseAIMove(state, color, profiles, dirs, forgetExpired) {
  const moves = listMovesCore(state, color, dirs);
  if (moves.length === 0) return null;
  const profile = getAIProfileForColor(state, profiles, color);
  forgetExpired?.(color, profile);
  const scored = moves.map((m) => ({ m, s: baseEvaluateMove(state, m, profile) }));
  scored.sort((a, b) => b.s - a.s);
  const topN = Math.max(1, Math.min(profile.threatEvalTopN ?? 5, scored.length));
  const before = countFrownyThreats(state, color, dirs);
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < scored.length; i++) {
    const { m } = scored[i];
    let s = (i < topN) ? evaluateMove(state, m, profile, dirs, before) : scored[i].s;
    if (i < topN && profile.lookaheadDepth > 0) {
      const copy = { ...state, board: { ...state.board, cells: deepCopyCells(m.cells) } };
      const opp = nextActiveColorAfter(state, color);
      const oppProfile = getAIProfileForColor(state, profiles, opp);
      const oppBest = bestMoveScoreForColor(copy, opp, oppProfile, dirs);
      if (Number.isFinite(oppBest)) s -= profile.lookaheadFactor * oppBest;
    }
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

export function deepCopyCells(cells) { return cells.map((c) => (c ? { ...c } : null)); }

