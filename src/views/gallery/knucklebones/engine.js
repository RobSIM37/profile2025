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

export function placeDie(myBoard, oppBoard, col, value) {
  // Place value in myBoard at given column (first open slot),
  // then remove matching values in same column from oppBoard.
  const row = getOpenRow(myBoard, col);
  if (row === -1) return { ok: false, knocked: 0 };
  myBoard[col][row] = value;
  let knocked = 0;
  for (let r = 0; r < 3; r++) {
    if (oppBoard[col][r] === value) {
      oppBoard[col][r] = null;
      knocked++;
    }
  }
  return { ok: true, row, knocked };
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
  // Simulate placement, compute heuristic score
  const my = cloneBoard(myBoard);
  const op = cloneBoard(oppBoard);
  const beforeMy = scoreBoard(my);
  const beforeOp = scoreBoard(op);
  // Before counts in column for clump calc
  const beforeCounts = new Map();
  for (let r = 0; r < 3; r++) {
    const v = my[col][r];
    if (v != null) beforeCounts.set(v, (beforeCounts.get(v) || 0) + 1);
  }
  const res = placeDie(my, op, col, value);
  if (!res.ok) return -Infinity;
  const afterMy = scoreBoard(my);
  const afterOp = scoreBoard(op);
  const deltaMy = afterMy - beforeMy;
  const deltaOp = afterOp - beforeOp;
  const net = deltaMy - (beforeOp - afterOp); // my gain + opponent loss

  const knockedBonus = res.knocked * (profile.attackWeight || 2); // reward removing

  // Clump risk penalty: if we increased count of this value in col, penalize by opp open slots and value
  const beforeCnt = beforeCounts.get(value) || 0;
  const afterCnt = beforeCnt + 1;
  let clumpPenalty = 0;
  if (afterCnt > 1) {
    const oppOpen = getOpenRow(oppBoard, col) === -1 ? 0 : (3 - oppBoard[col].filter(v => v != null).length);
    clumpPenalty = (profile.riskWeight ?? 1) * oppOpen * value * (afterCnt - 1);
  }

  // Slight preference for placing lower rows first (stability in tie-breaks)
  const rowBias = (2 - res.row) * 0.01;

  return net + knockedBonus - clumpPenalty + rowBias;
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
  cautious: { name: 'Cautious', riskWeight: 2.0, attackWeight: 1.5 },
  balanced: { name: 'Balanced', riskWeight: 1.0, attackWeight: 2.0 },
  aggressive: { name: 'Aggressive', riskWeight: 0.4, attackWeight: 2.5 },
};

