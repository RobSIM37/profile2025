// AI memory helpers scoped by state passed in
export function ensureAIMemory(state) {
  if (!state.aiMemory) state.aiMemory = {};
}

export function rememberOwn(state, color, idx, kind) {
  ensureAIMemory(state);
  if (!state.aiMemory[color]) state.aiMemory[color] = new Map();
  state.aiMemory[color].set(idx, { kind, turn: state.turn.turns });
}

export function forgetExpired(state, color, profile) {
  ensureAIMemory(state);
  const m = state.aiMemory[color]; if (!m) return;
  const maxAge = profile.recallMoves ?? 0;
  if (maxAge <= 0) { m.clear(); return; }
  for (const [idx, rec] of m.entries()) {
    if ((state.turn.turns - (rec.turn || 0)) > maxAge) m.delete(idx);
  }
}

