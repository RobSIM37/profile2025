export function createInitialState(deck, players, faceUpSec = 1) {
  const cards = deck.map((c, idx) => ({ idx, id: c.id, pair: c.pair, key: c.key, state: 'down' }));
  const scores = players.map(_ => 0);
  return {
    cards,
    players, // [{ kind: 'human'|'ai', level?: 'easy'|'medium'|'hard'|'perfect', name }]
    scores,
    current: 0,
    firstPick: null,
    lock: false,
    faceUpMs: Math.max(100, Math.floor(faceUpSec * 1000)),
    foundPairs: 0,
    totalPairs: deck.length / 2,
  };
}

export function isGameOver(state) {
  return state.foundPairs >= state.totalPairs;
}

export function advanceTurn(state) {
  state.current = (state.current + 1) % state.players.length;
}

