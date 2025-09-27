export function createAiEngine({ COLS, ROWS, listOpenColumns, findAvailableRow, checkForWin }) {
  // --- Tunables --------------------------------------------------------------
  const MAX_SEARCH_DEPTH = 6;
  const WIN_SCORE = 1_000_000;
  const CENTER_WEIGHT = 6;
  const FAST_WIN_REWARD = 10; // small bonus for earlier wins
  const DEFAULT_MOVE_NOISE = 0;  // base move noise when player config omits it
  const DEFAULT_PRED_NOISE = 0;  // predictions stay deterministic

  // --- Public API ------------------------------------------------------------
  function chooseAiMove(state, playerIdx) {
    const moves = scoreCandidateMoves(state, playerIdx);
    if (!moves.length) {
      const open = listOpenColumns(state.board);
      return open.length ? open[0] : null;
    }

    // Support: moveNoise > noise > fallback
    const player = state.players?.[playerIdx] ?? {};
    const noiseSetting = Number(
      (player.moveNoise ?? player.noise ?? DEFAULT_MOVE_NOISE)
    );

    return selectMoveWithNoise(moves, noiseSetting);
  }

  function chooseAiPrediction(state, targetIdx) {
    const moves = scoreCandidateMoves(state, targetIdx);
    if (!moves.length) {
      const open = listOpenColumns(state.board);
      return open.length ? open[0] : null;
    }

    // Predictions ignore noise so guesses stay fully deterministic.
    return selectMoveWithNoise(moves, DEFAULT_PRED_NOISE);
  }

  // --- Core scoring ----------------------------------------------------------
  function scoreCandidateMoves(state, playerIdx) {
    const open = listOpenColumns(state.board);
    if (!open.length) return [];

    // Depth selection
    const rawDepth = Number(state.players?.[playerIdx]?.depth);
    const depthSetting = Number.isFinite(rawDepth) ? rawDepth : 4;
    const clampedDepth = clampNumber(depthSetting, 1, MAX_SEARCH_DEPTH, 4);
    const searchDepth = Math.max(1, Math.min(MAX_SEARCH_DEPTH, Math.floor(clampedDepth)));

    const opponentIdx = playerIdx === 0 ? 1 : 0;
    const moves = [];

    // Move ordering: prefer center, then neighbors, then edges
    const orderedColumns = orderColumns(open);

    for (const column of orderedColumns) {
      const row = dropPiece(state.board, column, playerIdx);
      if (row == null) continue;

      let score;
      const isImmediateWin = checkForWin(state.board, row, column, playerIdx);

      if (isImmediateWin) {
        // Ensure wins are ranked above everything else; prefer faster wins slightly
        score = WIN_SCORE - FAST_WIN_REWARD * searchDepth;
      } else {
        // 1-ply blunder check: avoid giving opponent a forced win next move
        if (opponentHasImmediateWin(state.board, opponentIdx)) {
          // Heavy penalty, but not -Infinity; still let deeper search override if truly forced
          score = -WIN_SCORE / 2;
        } else {
          const depthRemaining = searchDepth - 1;
          if (depthRemaining <= 0) {
            score = evaluateBoard(state.board, playerIdx, opponentIdx);
          } else {
            score = minimaxScore(
              state.board,
              depthRemaining,
              /* maximizingPlayer */ false,
              playerIdx,
              opponentIdx,
              -WIN_SCORE,
              WIN_SCORE,
              /* fullDepth */ depthRemaining
            );
          }
        }
      }

      undoPiece(state.board, row, column);
      moves.push({ column, score, isImmediateWin });
    }

    // Sort best-first; stable random tiebreaks are unnecessary if you add noise later
    moves.sort((a, b) => b.score - a.score);
    return moves;
  }

  // --- Selection logic (with win gating + temperature sampling) --------------
  function selectMoveWithNoise(rankedMoves, noiseSetting) {
    if (!rankedMoves.length) return null;

    // Hard gate: if any immediate win exists, take it (no noise).
    const forced = rankedMoves.find(m => m.isImmediateWin);
    if (forced) return forced.column;

    const noiseValue = Number.isFinite(noiseSetting) ? noiseSetting : 0;
    const clampedNoise = clampNumber(noiseValue, 0, 100, 0);
    const temperature = clampedNoise / 100;

    // Margin guard: if best is clearly better than #2, take best outright.
    const best = rankedMoves[0];
    const second = rankedMoves[1];
    if (!second) return best.column;

    // Use a tiny fraction of WIN_SCORE as a large-margin threshold.
    const CLEAR_MARGIN = WIN_SCORE / 1000;
    if ((best.score - second.score) > CLEAR_MARGIN || temperature <= 0) {
      return best.column;
    }

    // Softmax sampling keeps the top move very likely while allowing variety.
    return pickWithTemperature(rankedMoves, temperature);
  }

  function pickWithTemperature(rankedMoves, temperature /* 0..1 */) {
    if (!rankedMoves.length) return null;
    const tau = Math.max(0.01, Math.min(1, temperature)) * 2.0; // 0.01..2.0

    const max = rankedMoves[0].score;
    const min = rankedMoves[rankedMoves.length - 1].score;
    const denom = Math.max(1, max - min);

    const exps = rankedMoves.map(m => Math.exp((m.score - max) / (denom * tau)));
    const sum = exps.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;

    for (let i = 0; i < rankedMoves.length; i++) {
      r -= exps[i];
      if (r <= 0) return rankedMoves[i].column;
    }
    return rankedMoves[0].column;
  }

  // --- Minimax with alpha-beta pruning --------------------------------------
  function minimaxScore(board, depth, maximizingPlayer, playerIdx, opponentIdx, alpha, beta, fullDepth) {
    const evaluation = evaluateBoard(board, playerIdx, opponentIdx);
    const columns = listOpenColumns(board);

    // Terminal checks
    if (depth <= 0 || !columns.length || Math.abs(evaluation) >= WIN_SCORE - FAST_WIN_REWARD) {
      return evaluation;
    }

    if (maximizingPlayer) {
      let best = -Infinity;
      const ordered = orderColumns(columns);
      for (const column of ordered) {
        const row = dropPiece(board, column, playerIdx);
        if (row == null) continue;

        let score;
        if (checkForWin(board, row, column, playerIdx)) {
          const depthOffset = fullDepth - depth;
          score = WIN_SCORE - FAST_WIN_REWARD * (depthOffset + 1);
        } else {
          // Optional: one-ply opponent blunder guard inside search could be added,
          // but root guard usually suffices and keeps search cheaper.
          score = minimaxScore(board, depth - 1, false, playerIdx, opponentIdx, alpha, beta, fullDepth);
        }

        undoPiece(board, row, column);
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return Number.isFinite(best) ? best : evaluation;
    } else {
      let best = Infinity;
      const ordered = orderColumns(columns);
      for (const column of ordered) {
        const row = dropPiece(board, column, opponentIdx);
        if (row == null) continue;

        let score;
        if (checkForWin(board, row, column, opponentIdx)) {
          const depthOffset = fullDepth - depth;
          score = -WIN_SCORE + FAST_WIN_REWARD * (depthOffset + 1);
        } else {
          score = minimaxScore(board, depth - 1, true, playerIdx, opponentIdx, alpha, beta, fullDepth);
        }

        undoPiece(board, row, column);
        if (score < best) best = score;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return Number.isFinite(best) ? best : evaluation;
    }
  }

  // --- Heuristic evaluation --------------------------------------------------
  function evaluateBoard(board, playerIdx, opponentIdx) {
    let score = 0;

    // Center column bias (classic Connect Four heuristic)
    const centerColumn = Math.floor(COLS / 2);
    for (let r = 0; r < ROWS; r++) {
      const cell = board[r][centerColumn];
      if (cell === playerIdx) score += CENTER_WEIGHT;
      else if (cell === opponentIdx) score -= CENTER_WEIGHT;
    }

    // Horizontal windows
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += scoreWindow(board, r, c, 0, 1, playerIdx, opponentIdx);
      }
    }
    // Vertical windows
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        score += scoreWindow(board, r, c, 1, 0, playerIdx, opponentIdx);
      }
    }
    // Diagonals
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += scoreWindow(board, r, c, 1, 1, playerIdx, opponentIdx);
        score += scoreWindow(board, r + 3, c, -1, 1, playerIdx, opponentIdx);
      }
    }

    return score;
  }

  function scoreWindow(board, startRow, startCol, rowStep, colStep, playerIdx, opponentIdx) {
    let playerCount = 0;
    let opponentCount = 0;
    let emptyCount = 0;

    for (let i = 0; i < 4; i++) {
      const cell = board[startRow + rowStep * i]?.[startCol + colStep * i];
      if (cell === playerIdx) playerCount += 1;
      else if (cell === opponentIdx) opponentCount += 1;
      else emptyCount += 1;
    }

    // Terminal detects
    if (playerCount === 4) return WIN_SCORE;
    if (opponentCount === 4) return -WIN_SCORE;

    // Heuristic shaping (slightly asymmetric to prefer blocking)
    let score = 0;
    if (playerCount === 3 && emptyCount === 1) score += 150;
    else if (playerCount === 2 && emptyCount === 2) score += 20;
    else if (playerCount === 1 && emptyCount === 3) score += 4;

    if (opponentCount === 3 && emptyCount === 1) score -= 170;
    else if (opponentCount === 2 && emptyCount === 2) score -= 24;
    else if (opponentCount === 1 && emptyCount === 3) score -= 3;

    return score;
  }

  // --- Helpers ---------------------------------------------------------------
  function opponentHasImmediateWin(board, opponentIdx) {
    const cols = listOpenColumns(board);
    for (const c of cols) {
      const r = findAvailableRow(board, c);
      if (r == null) continue;
      board[r][c] = opponentIdx;
      const win = checkForWin(board, r, c, opponentIdx);
      board[r][c] = null;
      if (win) return true;
    }
    return false;
  }

  function orderColumns(openColumns) {
    // Prefer center, then move outward: e.g., [3,2,4,1,5,0,6] for 7 cols
    const center = Math.floor(COLS / 2);
    return [...openColumns].sort((a, b) => {
      const da = Math.abs(a - center);
      const db = Math.abs(b - center);
      if (da !== db) return da - db;
      return a - b;
    });
  }

  function dropPiece(board, column, playerIdx) {
    const row = findAvailableRow(board, column);
    if (row == null) return null;
    board[row][column] = playerIdx;
    return row;
  }

  function undoPiece(board, row, column) {
    board[row][column] = null;
  }

  function clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    if (value < min) return min;
    if (value > max) return max;
    return Math.round(value * 1000) / 1000;
  }

  return { chooseAiMove, chooseAiPrediction };
}



