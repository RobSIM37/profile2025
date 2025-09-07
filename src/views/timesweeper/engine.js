// Timesweeper game engine (vanilla, adapted from legacy)

export function initBoard(width, height, firstClick = null, mineCount = 0) {
  const board = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({
        hidden: true,
        flagged: false,
        isMine: false,
        isTimebomb: false,
        neighbors: 0,
        x,
        y,
      });
    }
    board.push(row);
  }
  if (!firstClick) return board;
  return populateBoard(board, firstClick, mineCount);
}

export function boardSize(board) {
  return { w: board[0]?.length || 0, h: board.length };
}

function distance(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function randomIndex(arr) {
  return Math.floor(Math.random() * arr.length);
}

function pullFromArray(arr) {
  const idx = randomIndex(arr);
  const [v] = arr.splice(idx, 1);
  return v;
}

function populateBoard(board, firstClick, mineCount) {
  const empties = [];
  board.forEach((row) =>
    row.forEach((cell) => {
      if (distance(firstClick, cell) >= 2) empties.push(cell);
    })
  );

  for (let m = 0; m < mineCount; m++) {
    const mine = pullFromArray(empties);
    if (!mine) break;
    mine.isMine = true;
    if (m === 0) mine.isTimebomb = true; // future: timebomb fuse logic
  }

  // compute neighbor counts
  const { w, h } = boardSize(board);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) board[y][x].neighbors = countNeighbors(board, x, y);

  return board;
}

function countNeighbors(board, x, y) {
  const { w, h } = boardSize(board);
  let n = 0;
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && board[ny][nx].isMine) n++;
    }
  return n;
}

export function reveal(board, x, y) {
  const cell = board[y]?.[x];
  if (!cell || !cell.hidden || cell.flagged) return board;
  cell.hidden = false;
  if (cell.neighbors === 0 && !cell.isMine) {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx,
          ny = y + dy;
        if (board[ny]?.[nx]) reveal(board, nx, ny);
      }
  }
  return board;
}

export function chord(board, x, y) {
  const { w, h } = boardSize(board);
  const center = board[y]?.[x];
  if (!center || center.hidden) return board;
  let flags = 0;
  const candidates = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const c = board[ny][nx];
        if (c.flagged) flags++;
        else if (c.hidden) candidates.push(c);
      }
    }
  if (flags === center.neighbors) candidates.forEach((c) => reveal(board, c.x, c.y));
  return board;
}

export function toggleFlag(board, x, y) {
  const cell = board[y]?.[x];
  if (!cell || !cell.hidden) return board;
  cell.flagged = !cell.flagged;
  return board;
}

export function isLoss(board) {
  for (const row of board) for (const c of row) if (c.isMine && !c.hidden) return true;
  return false;
}

export function isWin(board) {
  const { w, h } = boardSize(board);
  let count = 0;
  for (const row of board) for (const c of row) if (c.isMine || !c.hidden) count++;
  return count === w * h;
}

export function flagsLeft(board, totalMines) {
  let used = 0;
  for (const row of board) for (const c of row) if (c.flagged) used++;
  return Math.max(0, totalMines - used);
}

export function revealAllMines(board) {
  for (const row of board) for (const c of row) if (c.isMine) c.hidden = false;
  return board;
}
