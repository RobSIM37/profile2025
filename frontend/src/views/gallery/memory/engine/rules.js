export function canFlip(card){
  return card.state === 'down';
}

export function flipUp(card){ card.state = 'up'; }
export function flipDown(card){ card.state = 'down'; }
export function lockOut(card){ card.state = 'locked'; }

export function evaluateFlip(state, card) {
  // returns { action: 'continue'|'match'|'mismatch'|'ignore', pairIdx?, idx2? }
  if (card.state !== 'up') return { action: 'ignore' };
  const first = state.firstPick;
  if (first == null) {
    state.firstPick = card.idx;
    return { action: 'continue' };
  }
  const firstCard = state.cards[first];
  if (!firstCard) { state.firstPick = card.idx; return { action: 'continue' }; }
  if (first === card.idx) return { action: 'continue' };
  const isMatch = firstCard.pair === card.pair;
  if (isMatch) {
    lockOut(firstCard); lockOut(card);
    state.scores[state.current]++;
    state.firstPick = null;
    state.foundPairs++;
    return { action: 'match', pairIdx: card.pair };
  } else {
    // mismatch: caller should schedule flipDown after delay and then advance turn
    return { action: 'mismatch', idx2: card.idx };
  }
}

