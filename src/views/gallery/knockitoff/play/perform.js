// Apply a move, update AI memory, log, and advance turn
export function performMove(state, move, deps) {
  const {
    getProfileForColor, // (color) => profile
    forgetExpired,      // (color, profile) => void
    paintBoard,         // (cells) => void
    renderSideRacks,    // (state) => void
    renderLog,          // (state) => void
    checkEnd,           // (state) => { over, winner }
    nextTurn,           // (state) => void
    enableHumanSelect,  // () => void
    showWinModal,       // (winner) => void
    COLORS,             // color labels
  } = deps;

  const deepCopyCells = (cells) => cells.map((c) => (c ? { ...c } : null));
  const colorLabel = (c) => {
    const name = COLORS[c] || c; return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const before = deepCopyCells(state.board.cells);
  state.board.cells = move.cells;

  // Update AI memory for mover color: shift remembered index to dest
  const moverColor = move.mover.color;
  const prof = getProfileForColor(moverColor);
  forgetExpired(moverColor, prof);
  const mem = state.aiMemory?.[moverColor];
  if (mem && mem.has(move.from)) {
    const rec = mem.get(move.from); mem.delete(move.from); mem.set(move.dest, { kind: rec.kind, turn: state.turn.turns });
  }

  paintBoard(state.board.cells);
  renderSideRacks(state);

  const moverName = state.players.find((p) => p.color === move.mover.color)?.name || colorLabel(move.mover.color);
  const victimName = state.players.find((p) => p.color === move.knocked.color)?.name || colorLabel(move.knocked.color);
  const textPrefix = `${moverName} knocked off ${victimName}'s`;
  const after = deepCopyCells(state.board.cells);

  state.logs.push({
    id: `L${state.logs.length + 1}`,
    textPrefix,
    before,
    after,
    turnColor: state.turn.order[state.turn.index],
    from: move.from,
    dirKey: move.dir.key,
    knockedKind: move.knocked.kind,
    knockedColor: move.knocked.color,
  });
  renderLog(state);

  const res = checkEnd(state);
  if (res.over) {
    state.phase = 'gameover';
    showWinModal(res.winner);
    return;
  }
  nextTurn(state);
  renderSideRacks(state);
  enableHumanSelect();
}

