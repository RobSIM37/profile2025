// Knuckle Bones core engine: board model, placement, knockouts, scoring, RNG

export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seedStr = '') {
  const seed = xmur3(String(seedStr))();
  return mulberry32(seed);
}

export function createEmptyBoard() {
  // 3 columns x 3 rows, values 1-6 or null
  return [Array(3).fill(null), Array(3).fill(null), Array(3).fill(null)];
}

export function cloneBoard(b) {
  return [b[0].slice(), b[1].slice(), b[2].slice()];
}

export function getOpenRow(board, col) {
  // return first empty row index in a column, or -1 if full
  const colArr = board[col];
  for (let r = 0; r < 3; r++) if (colArr[r] == null) return r;
  return -1;
}

export function canPlace(board, col) {
  return getOpenRow(board, col) !== -1;
}

export function placeDie(myBoard, oppBoard, col, value, row = undefined) {
  // Place value in myBoard at given column.
  // If row is provided, place at that empty row; otherwise use first open slot.
  let targetRow = (row == null ? getOpenRow(myBoard, col) : row|0);
  if (targetRow < 0 || targetRow > 2) return { ok: false, knocked: 0 };
  if (myBoard[col][targetRow] != null) return { ok: false, knocked: 0 };
  myBoard[col][targetRow] = value;
  let knocked = 0;
  for (let r = 0; r < 3; r++) {
    if (oppBoard[col][r] === value) {
      oppBoard[col][r] = null;
      knocked++;
    }
  }
  return { ok: true, row: targetRow, knocked };
}

export function isBoardFull(board) {
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) if (board[c][r] == null) return false;
  return true;
}

export function scoreBoard(board) {
  // For each column: group equal values, each die contributes value * count of that value in that column.
  let total = 0;
  for (let c = 0; c < 3; c++) {
    const counts = new Map();
    for (let r = 0; r < 3; r++) {
      const v = board[c][r];
      if (v == null) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    for (const [v, cnt] of counts) total += v * cnt * cnt; // each of cnt dice contributes v*cnt
  }
  return total;
}

export function getValidColumns(board) {
  const cols = [];
  for (let c = 0; c < 3; c++) if (canPlace(board, c)) cols.push(c);
  return cols;
}

export function rollD6(rng) {
  return 1 + Math.floor((rng?.() ?? Math.random()) * 6);
}

// AI evaluation helpers
export function evaluateMove({ myBoard, oppBoard, col, value, profile }) {
  // Simulate placement, compute heuristic score per 3 criteria
  const my = cloneBoard(myBoard);
  const op = cloneBoard(oppBoard);
  const beforeMy = scoreBoard(my);
  const beforeOp = scoreBoard(op);

  // Before counts in column for pairing computation
  let beforeCnt = 0;
  for (let r = 0; r < 3; r++) if (my[col][r] === value) beforeCnt++;

  const res = placeDie(my, op, col, value);
  if (!res.ok) return -Infinity;

  // After scores
  const afterMy = scoreBoard(my);
  const afterOp = scoreBoard(op);

  // 1) Pairing: how much did this value's contribution in this column increase?
  let afterCnt = 0;
  for (let r = 0; r < 3; r++) if (my[col][r] === value) afterCnt++;
  const pairingGain = value * (afterCnt * afterCnt - beforeCnt * beforeCnt); // delta for this value in this column

  // 2) Opponent loss: how much did their score drop overall?
  const oppLoss = (beforeOp - afterOp);

  // 3) Safety / future opportunity: avoid matching opponent's frequent value in this column.
  // Penalize if opponent already has many of this value in the same column (higher risk they'll clear ours later).
  let oppSameCnt = 0;
  for (let r = 0; r < 3; r++) if (oppBoard[col][r] === value) oppSameCnt++;
  const safetyScore = -oppSameCnt - (afterCnt - 1) * 0.5; // light anti-clump

  // Row bias: slightly prefer lower rows (fills from top -> bottom visually)
  const rowBias = (2 - res.row) * 0.01;

  const wPair = profile.wPair ?? 1.0;
  const wOpp = profile.wOpp ?? 1.0;
  const wSafe = profile.wSafe ?? 0.3;
  const noiseMag = profile.noise ?? 0.15;
  const noise = (Math.random() * 2 - 1) * noiseMag;

  return (wPair * pairingGain) + (wOpp * oppLoss) + (wSafe * safetyScore) + rowBias + noise;
}

export function chooseAiMove({ myBoard, oppBoard, value, profile }) {
  const cols = getValidColumns(myBoard);
  if (cols.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const c of cols) {
    const s = evaluateMove({ myBoard, oppBoard, col: c, value, profile });
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

export const AI_PROFILES = {
  // Higher safety weight, lower noise
  cautious:  { name: 'Cautious',  wPair: 1.0, wOpp: 1.0, wSafe: 0.8, noise: 0.08 },
  // Balanced emphasis
  balanced:  { name: 'Balanced',  wPair: 1.2, wOpp: 1.3, wSafe: 0.4, noise: 0.12 },
  // More aggressive on immediate gain/knockouts, low safety
  aggressive:{ name: 'Aggressive',wPair: 1.4, wOpp: 1.8, wSafe: 0.1, noise: 0.18 },
};
