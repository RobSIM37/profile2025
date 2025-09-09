// Player helpers used across setup/play

export function getActiveSetupHuman(state) {
  if (!state || state.phase !== 'setup') return null;
  const col = state.setup?.humanColors?.[state.setup.index];
  if (!col) return null;
  return state.players.find((p) => p.type === 'human' && p.color === col) || null;
}

export function getCurrentHuman(state) {
  if (!state) return null;
  const color = state.turn?.order?.[state.turn.index];
  const p = state.players?.find((pp) => pp.color === color);
  return p && p.type === 'human' ? p : null;
}

