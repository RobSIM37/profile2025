// Create state and begin setup from chosen player descriptors

export function startFromChosen(chosen, deps) {
  const { MASK_2P, MASK_4P, draw, createGame, renderRacks, planAIPlacements, revealAIPlacements } = deps;
  const pc = chosen.length;
  const currentMask = pc === 2 ? MASK_2P : MASK_4P;
  draw(currentMask);

  const POL = ['b', 'r', 'g', 'u'];
  const allowed = pc === 2 ? ['b', 'r'] : pc === 3 ? ['b', 'r', 'g'] : POL.slice();
  const turnColors = allowed.slice();
  const assigned = chosen.slice().sort(() => Math.random() - 0.5);
  const types = assigned.map((c) => (c.kind === 'human' ? 'human' : 'ai'));
  const playerNames = assigned.map((c) => c.name);
  const aiLevels = assigned.map((c) => c.level);
  const state = createGame({ playerCount: pc, playerTypes: types, playerNames, aiLevels, turnColors });
  state.phase = 'setup';
  const humanColors = state.players.filter((p) => p.type === 'human').map((p) => p.color);
  state.setup = { humanColors, index: 0, humanPlacementDone: false, aiRevealDone: false };
  renderRacks(state);
  planAIPlacements();
  revealAIPlacements();
  return { state, currentMask };
}

