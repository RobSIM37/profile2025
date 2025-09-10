// Build the deck (50 cards = 25 pairs) and shuffle

export const SYMBOL_IDS = [
  'apple','ball','cat','dog','egg','fish','grapes','hat','icecream','jellyfish',
  'kite','leaf','moon','nest','orange','pizza','rainbow','sun','tree','umbrella',
  'violin','whale','xylophone','yoyo','zebra'
];

export function makeDeck() {
  const ids = SYMBOL_IDS.slice(0, 25);
  const deck = [];
  ids.forEach((id, i) => { deck.push({ id, pair:i, key:`${id}-a` }); deck.push({ id, pair:i, key:`${id}-b` }); });
  shuffle(deck);
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

