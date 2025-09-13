// AI turn orchestration helpers (UI-agnostic; all effects passed via deps)

// deps: {
//   chooseAIMove(state, color),
//   nextTurn(state),
//   renderSideRacks(state),
//   enableHumanSelect(),
//   showMoveArrow(fromIdx, dirKey),
//   removeMoveArrow(),
//   performMove(state, move),
// }
export function aiStepIfNeeded(state, deps) {
  const {
    chooseAIMove,
    nextTurn,
    renderSideRacks,
    enableHumanSelect,
    showMoveArrow,
    removeMoveArrow,
    performMove,
  } = deps;

  if (!state || state.phase !== 'play') return;
  const turnColor = state.turn.order[state.turn.index];
  const p = state.players.find((pp) => pp.color === turnColor);
  if (!p || p.type !== 'ai') return;

  const mv = chooseAIMove(state, turnColor);
  if (!mv) {
    // No AI move: advance turn and wire human
    nextTurn(state);
    renderSideRacks(state);
    enableHumanSelect();
    // Try again in case next player is AI
    return aiStepIfNeeded(state, deps);
  }
  showMoveArrow(mv.from, mv.dir.key);
  setTimeout(() => {
    removeMoveArrow();
    performMove(state, mv);
    aiStepIfNeeded(state, deps);
  }, 650);
}

