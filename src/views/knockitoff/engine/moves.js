// Core movement/geometry helpers for Knock It Off!

export const idxToXY = (i) => [i % 8, Math.floor(i / 8)];
export const xyToIdx = (x, y) => (x < 0 || x > 7 || y < 0 || y > 7) ? -1 : (y * 8 + x);
export const inBounds = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;

export function collectOccupiedAlong(cells, startIdx, dx, dy) {
  const out = [];
  let [x, y] = idxToXY(startIdx);
  while (true) {
    x += dx; y += dy;
    if (!inBounds(x, y)) break;
    const ni = xyToIdx(x, y);
    if (cells[ni]) out.push(ni);
  }
  return out;
}

export function simulateMove(state, fromIdx, dir) {
  const cells = state.board.cells;
  const mover = cells[fromIdx];
  if (!mover) return { valid: false };
  const occ = collectOccupiedAlong(cells, fromIdx, dir.dx, dir.dy);
  if (occ.length === 0) return { valid: false };
  const last = occ[occ.length - 1];
  const knocked = cells[last];
  if (!knocked) return { valid: false };
  if (knocked.color === mover.color) return { valid: false };
  const newCells = state.board.cells.map((c) => (c ? { ...c } : null));
  newCells[fromIdx] = null;
  for (let j = occ.length - 1; j >= 0; j--) {
    if (j === occ.length - 1) {
      newCells[occ[j]] = null;
    } else {
      const dest = occ[j + 1];
      newCells[dest] = { ...cells[occ[j]] };
      newCells[occ[j]] = null;
    }
  }
  const dest = occ[0];
  newCells[dest] = { ...mover };
  return { valid: true, cells: newCells, knocked, from: fromIdx, dest, mover, dir };
}

export function listLegalMovesForColor(state, color, dirs) {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board.cells[i];
    if (!p || p.color !== color) continue;
    for (const d of dirs) {
      const m = simulateMove(state, i, d);
      if (m.valid) moves.push(m);
    }
  }
  return moves;
}

