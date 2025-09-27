import { Button } from '../../../components/ui/button.js';
import { HudStat } from '../../../components/ui/hudStat.js';
import { openModal } from '../../../components/ui/modal.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { renderPredictFourSourceBrowser } from './sourceBrowser.js';
import { createAiEngine } from './AI.js';

const CONFIG_KEY = 'pf:config';
const CONFIG_VERSION = 2;
const DEFAULT_PREDICT_POINTS = 4;
const COLS = 7;
const ROWS = 6;
const CELL = 72;
const CHIP_MARGIN = 8;
const TOP_BUFFER = 80;

const { chooseAiMove, chooseAiPrediction } = createAiEngine({
  COLS,
  ROWS,
  listOpenColumns,
  findAvailableRow,
  checkForWin,
});

export const meta = {
  title: 'Predict Four - Game',
  description: 'Play a prediction-enhanced take on Connect Four.',
};

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();

  const demoPane = document.createElement('section');
  demoPane.className = 'stack pf-game';
  demoPane.style.gap = 'var(--space-6, 24px)';

  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  let sourceLoaded = false;
  const sub = makeGallerySubheader({
    title: 'Predict Four',
    href: '#/gallery/predict-four',
    emitInitial: false,
    onChange(id) {
      const showDemo = id === 'demo';
      demoPane.style.display = showDemo ? '' : 'none';
      srcPane.style.display = showDemo ? 'none' : '';
      if (!showDemo && !sourceLoaded) {
        renderPredictFourSourceBrowser(srcPane, ['game.js', 'AI.js']);
        sourceLoaded = true;
      }
    },
  });

  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  frag.append(sub.root, demoPane, srcPane);
  const config = readConfig();
  const players = preparePlayers(config.players);

  let startingPlayer = Math.random() < 0.5 ? 0 : 1;
  try {
    const storedStart = sessionStorage.getItem('pf:start-player');
    if (storedStart === '0' || storedStart === '1') {
      startingPlayer = Number(storedStart);
      sessionStorage.removeItem('pf:start-player');
    }
  } catch {}

  const state = {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    chips: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    players,
    winPoints: config.winPoints,
    predictPoints: config.predictPoints,
    pendingPrediction: null,
    currentPlayer: startingPlayer,
    phase: 'drop',
    finished: false,
    totalMoves: 0,
  };

  const hud = buildHud(players);
  demoPane.append(hud.root);

  const status = document.createElement('p');
  status.className = 'pf-status';
  status.style.fontWeight = '600';
  status.style.textAlign = 'center';
  demoPane.append(status);

  const boardParts = buildBoard();
  demoPane.append(boardParts.boardWrap);


  const manager = createTurnManager({
    state,
    status,
    dragLayer: boardParts.dragLayer,
    chipsLayer: boardParts.chipsLayer,
    boardWrap: boardParts.boardWrap,
    highlights: boardParts.highlights,
    hud,
  });

  manager.start();

  return frag;
}

function readConfig() {
  let parsed = null;
  try {
    const raw = sessionStorage.getItem(CONFIG_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const defaults = {
    version: CONFIG_VERSION,
    winPoints: 10,
    predictPoints: DEFAULT_PREDICT_POINTS,
    players: [
      { kind: 'human', name: 'Red', depth: 4, noise: 10 },
      { kind: 'human', name: 'Gold', depth: 4, noise: 10 },
    ],
  };
  if (!parsed) return defaults;
  const version = Number.isFinite(parsed?.version) ? parsed.version : 1;
  const winPoints = Number.isFinite(parsed?.winPoints) ? parsed.winPoints : defaults.winPoints;
  const predictPoints = normalizePredictPoints(parsed?.predictPoints, version);
  const players = Array.isArray(parsed?.players) && parsed.players.length >= 2 ? parsed.players.slice(0, 2) : defaults.players;
  return { version: CONFIG_VERSION, winPoints, predictPoints, players };
}

function normalizePredictPoints(value, version = CONFIG_VERSION) {
  const safeVersion = Number.isFinite(version) ? version : 1;
  if (!Number.isFinite(value)) return DEFAULT_PREDICT_POINTS;
  if (safeVersion < CONFIG_VERSION && value === 3) return DEFAULT_PREDICT_POINTS;
  if (value < 0) return 0;
  if (value > 50) return 50;
  return value;
}

function preparePlayers(rawPlayers = []) {
  const palette = [
    { fill: '#ef4444', ghostFill: 'rgba(248, 113, 113, 0.35)', label: 'Red' },
    { fill: '#facc15', ghostFill: 'rgba(250, 204, 21, 0.4)', label: 'Gold' },
  ];
  return rawPlayers.map((player = {}, idx) => {
    const base = palette[idx] || palette[0];
    const name = typeof player.name === 'string' && player.name.trim() ? player.name.trim().slice(0, 24) : base.label;
    const depth = Number.isFinite(player.depth) ? player.depth : 4;
    const noise = Number.isFinite(player.noise) ? player.noise : 10;
    return {
      index: idx,
      kind: player.kind === 'ai' ? 'ai' : 'human',
      name,
      depth,
      noise,
      fill: base.fill,
      ghostFill: base.ghostFill,
      correctPredictions: 0,
    };
  });
}

function buildHud(players) {
  const root = document.createElement('section');
  root.className = 'pf-hud';
  root.style.display = 'grid';
  root.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  root.style.gap = 'var(--space-4, 16px)';

  const humanCount = players.filter(player => player.kind !== 'ai').length;
  const allHuman = humanCount === players.length && humanCount > 0;

  const panels = players.map((player, idx) =>
    createPlayerPanel(player, idx, { maskStats: allHuman && player.kind !== 'ai' })
  );
  panels.forEach(panel => root.append(panel.root));

  return { root, panels };
}

function createPlayerPanel(player, idx, opts = {}) {
  const isAi = player.kind === 'ai';
  const maskStats = !isAi && !!opts.maskStats;

  const panel = document.createElement('article');
  panel.className = 'pf-player-panel';
  panel.style.border = '1px solid var(--border)';
  panel.style.borderRadius = '12px';
  panel.style.padding = '12px';
  panel.style.background = 'var(--bg-elev)';
  panel.style.display = 'grid';
  panel.style.gap = '8px';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '8px';

  const swatch = document.createElement('span');
  swatch.style.width = '16px';
  swatch.style.height = '16px';
  swatch.style.borderRadius = '50%';
  swatch.style.background = player.fill;
  swatch.style.boxShadow = '0 0 0 1px rgba(15, 23, 42, 0.35)';

  const nameEl = document.createElement('h3');
  nameEl.textContent = player.name;
  nameEl.style.margin = '0';
  nameEl.style.fontSize = '18px';

  header.append(swatch, nameEl);

  const subtitle = document.createElement('p');
  subtitle.style.margin = '0';
  subtitle.style.fontSize = '13px';
  subtitle.style.color = 'var(--muted)';
  subtitle.textContent = isAi
    ? `AI | depth ${player.depth} | ${player.noise}% noise`
    : 'Human player';

  let predStat = null;
  let pointsStat = null;
  let revealBtn = null;

  if (!isAi) {
    const statsRow = document.createElement('div');
    statsRow.style.display = 'grid';
    statsRow.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    statsRow.style.gap = '8px';

    predStat = HudStat({ label: 'Correct predictions', value: maskStats ? 'Hidden' : '0' });
    predStat.root.dataset.masked = maskStats ? 'true' : 'false';
    pointsStat = HudStat({ label: 'Score preview', value: maskStats ? 'Hidden' : '0' });
    pointsStat.root.dataset.masked = maskStats ? 'true' : 'false';

    statsRow.append(predStat.root, pointsStat.root);
    panel.append(header, subtitle, statsRow);

    if (maskStats) {
      const controls = document.createElement('div');
      controls.className = 'pf-secret-controls';
      controls.innerHTML = Button({ id: `pf-reveal-${idx}`, label: 'Reveal tally', variant: 'subtle' });
      revealBtn = controls.querySelector('button');
      if (revealBtn) {
        revealBtn.type = 'button';
        revealBtn.dataset.playerIdx = String(idx);
      }
      panel.append(controls);
    }
  } else {
    panel.append(header, subtitle);
  }

  return { root: panel, nameEl, subtitle, predStat, pointsStat, revealBtn, playerIdx: idx, maskStats };
}

function buildBoard() {
  const width = COLS * CELL;
  const height = ROWS * CELL;

  const wrap = document.createElement('div');
  wrap.className = 'pf-board-wrap';
  wrap.style.position = 'relative';
  wrap.style.width = `${width}px`;
  wrap.style.height = `${height + TOP_BUFFER}px`;
  wrap.style.margin = '0 auto';

  const chipsLayer = document.createElement('div');
  chipsLayer.className = 'pf-chips-layer';
  chipsLayer.style.position = 'absolute';
  chipsLayer.style.left = '0';
  chipsLayer.style.top = `${TOP_BUFFER}px`;
  chipsLayer.style.width = '100%';
  chipsLayer.style.height = `${height}px`;
  chipsLayer.style.pointerEvents = 'none';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.position = 'absolute';
  svg.style.left = '0';
  svg.style.top = `${TOP_BUFFER}px`;
  svg.style.pointerEvents = 'none';
  svg.append(buildBoardSvg(width, height));

  const highlightsLayer = document.createElement('div');
  highlightsLayer.style.position = 'absolute';
  highlightsLayer.style.left = '0';
  highlightsLayer.style.top = `${TOP_BUFFER}px`;
  highlightsLayer.style.width = '100%';
  highlightsLayer.style.height = `${height}px`;
  highlightsLayer.style.pointerEvents = 'none';

  const highlights = [];
  for (let c = 0; c < COLS; c++) {
    const h = document.createElement('div');
    h.style.position = 'absolute';
    h.style.left = `${c * CELL}px`;
    h.style.top = '0';
    h.style.width = `${CELL}px`;
    h.style.height = '100%';
    h.style.background = 'rgba(56, 189, 248, 0.16)';
    h.style.opacity = '0';
    h.style.transition = 'opacity 120ms ease';
    highlightsLayer.append(h);
    highlights[c] = h;
  }

  const dragLayer = document.createElement('div');
  dragLayer.className = 'pf-drag-layer';
  dragLayer.style.position = 'absolute';
  dragLayer.style.left = '0';
  dragLayer.style.top = '0';
  dragLayer.style.width = '100%';
  dragLayer.style.height = `${height + TOP_BUFFER}px`;
  dragLayer.style.pointerEvents = 'none';

  wrap.append(chipsLayer, svg, highlightsLayer, dragLayer);

  return { boardWrap: wrap, chipsLayer, dragLayer, highlights };
}

function buildBoardSvg(width, height) {
  const frag = document.createDocumentFragment();

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', 'pf-board-fill');
  gradient.setAttribute('x1', '0');
  gradient.setAttribute('x2', '1');
  gradient.setAttribute('y1', '0');
  gradient.setAttribute('y2', '1');
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#1d4ed8');
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#2563eb');
  gradient.append(stop1, stop2);
  defs.append(gradient);

  const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
  mask.setAttribute('id', 'pf-grid-mask');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '0');
  rect.setAttribute('y', '0');
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('rx', '24');
  rect.setAttribute('fill', '#fff');
  mask.append(rect);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(c * CELL + CELL / 2));
      circle.setAttribute('cy', String(r * CELL + CELL / 2));
      circle.setAttribute('r', String(CELL / 2 - CHIP_MARGIN));
      circle.setAttribute('fill', '#000');
      mask.append(circle);
    }
  }
  defs.append(mask);

  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  shadow.setAttribute('x', '0');
  shadow.setAttribute('y', '6');
  shadow.setAttribute('width', String(width));
  shadow.setAttribute('height', String(height));
  shadow.setAttribute('rx', '24');
  shadow.setAttribute('fill', 'rgba(15, 23, 42, 0.35)');

  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('x', '0');
  board.setAttribute('y', '0');
  board.setAttribute('width', String(width));
  board.setAttribute('height', String(height));
  board.setAttribute('rx', '24');
  board.setAttribute('fill', 'url(#pf-board-fill)');
  board.setAttribute('mask', 'url(#pf-grid-mask)');

  frag.append(defs, shadow, board);
  return frag;
}

function createTurnManager({ state, status, dragLayer, chipsLayer, boardWrap, highlights, hud }) {
  const columnFromX = (clientX) => {
    const rect = boardWrap.getBoundingClientRect();
    const left = rect.left;
    const width = COLS * CELL;
    const rel = clientX - left;
    if (rel < 0 || rel > width) return -1;
    return Math.floor(rel / CELL);
  };

  let activeDrag = null;
  let statusTimer = 0;
  const activeRevealTimers = new Map();
  const clearRevealTimers = () => {
    activeRevealTimers.forEach(timeoutId => clearTimeout(timeoutId));
    activeRevealTimers.clear();
  };
  let aiTimer = null;

  const cancelAi = () => {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
  };

  const scheduleAi = (callback, delay = 450) => {
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = window.setTimeout(() => {
      aiTimer = null;
      if (!state.finished) callback();
    }, delay);
  };

  const setStatus = (text) => {
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = 0; }
    status.textContent = text;
  };

  const flashStatus = (text, next, delay = 900) => {
    setStatus(text);
    if (!next) return;
    statusTimer = window.setTimeout(() => {
      statusTimer = 0;
      if (!state.finished) setStatus(next);
    }, delay);
  };

  const clearDragChip = () => {
    if (activeDrag?.element?.isConnected) activeDrag.element.remove();
    dragLayer.style.pointerEvents = 'none';
    activeDrag = null;
    highlights.forEach(h => { h.style.opacity = '0'; });
  };

  const updatePanels = () => {
    hud.panels.forEach(panel => {
      const player = state.players[panel.playerIdx];
      if (panel.pointsStat) {
        const predictionScore = player.correctPredictions * state.predictPoints;
        const pointsMasked = panel.pointsStat.root.dataset.masked !== 'false';
        panel.pointsStat.val.textContent = pointsMasked ? 'Hidden' : String(predictionScore);
      }
      if (panel.predStat) {
        const masked = panel.predStat.root.dataset.masked !== 'false';
        panel.predStat.val.textContent = masked ? 'Hidden' : String(player.correctPredictions);
      }

      const isCurrentTurn = !state.finished && panel.playerIdx === state.currentPlayer;
      panel.root.classList.toggle('is-active', isCurrentTurn);
      panel.root.classList.toggle('is-complete', state.finished);

      if (panel.revealBtn) {
        const allowReveal = panel.maskStats && isCurrentTurn;
        panel.revealBtn.disabled = !allowReveal;
        if (!allowReveal) {
          if (activeRevealTimers.has(panel.playerIdx)) {
            clearTimeout(activeRevealTimers.get(panel.playerIdx));
            activeRevealTimers.delete(panel.playerIdx);
          }
          if (panel.predStat) {
            panel.predStat.root.dataset.masked = 'true';
            panel.predStat.val.textContent = 'Hidden';
          }
          if (panel.pointsStat) {
            panel.pointsStat.root.dataset.masked = 'true';
            panel.pointsStat.val.textContent = 'Hidden';
          }
        }
      }
    });
  };

  hud.panels.forEach(panel => {
    const btn = panel.revealBtn;
    if (!btn || !panel.predStat || !panel.pointsStat) return;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const idx = Number(btn.dataset.playerIdx || 0);
      if (activeRevealTimers.has(idx)) {
        clearTimeout(activeRevealTimers.get(idx));
        activeRevealTimers.delete(idx);
      }
      panel.predStat.root.dataset.masked = 'false';
      panel.pointsStat.root.dataset.masked = 'false';
      updatePanels();
      const timeout = window.setTimeout(() => {
        panel.predStat.root.dataset.masked = 'true';
        panel.pointsStat.root.dataset.masked = 'true';
        updatePanels();
        activeRevealTimers.delete(idx);
      }, 4000);
      activeRevealTimers.set(idx, timeout);
    });
  });

  const spawnTurnChip = () => {
    clearDragChip();
    activeDrag = createDragChip(state.players[state.currentPlayer], {
      dragLayer,
      highlights,
      boardRect: () => boardWrap.getBoundingClientRect(),
      columnFromX,
      topBuffer: TOP_BUFFER,
      onDrop: handleChipDrop,
      boardState: state.board,
    });
  };

  const spawnPredictionChip = (predictorIdx, targetIdx) => {
    clearDragChip();
    activeDrag = createDragChip(state.players[targetIdx], {
      dragLayer,
      highlights,
      boardRect: () => boardWrap.getBoundingClientRect(),
      columnFromX,
      topBuffer: TOP_BUFFER,
      onDrop: (col) => {
        const row = findAvailableRow(state.board, col);
        if (row === null) {
          setStatus('Choose a column with space remaining.');
          return false;
        }
        animatePredictionMarker(chipsLayer, state.players[targetIdx], row, col);
        state.pendingPrediction = { predictor: predictorIdx, target: targetIdx, column: col };
        clearDragChip();
        startTurn(targetIdx);
        return true;
      },
      boardState: state.board,
      ghost: true,
    });
  };

    function handleChipDrop(column) {
    cancelAi();
    const row = findAvailableRow(state.board, column);
    if (row === null) {
      setStatus('That column is full. Try a different column.');
      return false;
    }

    clearDragChip();
    addChipToBoard(state, row, column, chipsLayer);
    state.totalMoves += 1;

    const predictionOutcome = resolvePendingPrediction(column, state, updatePanels);

    const winLine = checkForWin(state.board, row, column, state.currentPlayer);
    if (winLine) {
      highlightWin(state, winLine);
      updatePanels();
      clearRevealTimers();
      finishGame(state, state.currentPlayer, status, hud);
      return true;
    }

    if (state.totalMoves >= ROWS * COLS) {
      updatePanels();
      clearRevealTimers();
      finishGame(state, null, status, hud);
      return true;
    }

    const predictorIdx = state.currentPlayer;
    const predictor = state.players[predictorIdx];
    const nextPlayer = predictorIdx === 0 ? 1 : 0;
    state.phase = 'predict';

    if (predictor.kind !== 'ai') {
      setStatus('Predict the opponent\'s next move.');
    }

    if (predictionOutcome?.hit || predictionOutcome?.miss) {
      if (predictor.kind === 'ai') {
        const delay = 900;
        scheduleAi(() => runAiPrediction(predictorIdx, nextPlayer), delay);
        return true;
      }
      spawnPredictionChip(predictorIdx, nextPlayer);
      return true;
    }

    if (predictor.kind === 'ai') {
      scheduleAi(() => runAiPrediction(predictorIdx, nextPlayer), 420);
      return true;
    }

    spawnPredictionChip(predictorIdx, nextPlayer);
    return true;
  }

  const runAiPrediction = (predictorIdx, targetIdx) => {
    const predictor = state.players[predictorIdx];
    const target = state.players[targetIdx];
    dragLayer.style.pointerEvents = 'none';
    const open = listOpenColumns(state.board);
    if (!open.length) {
      scheduleAi(() => startTurn(targetIdx), 200);
      return;
    }
    let column = chooseAiPrediction(state, predictorIdx, targetIdx);
    if (column == null || findAvailableRow(state.board, column) === null) {
      column = open[0];
    }
    const row = findAvailableRow(state.board, column);
    if (row !== null && predictor.kind !== 'ai') {
      animatePredictionMarker(chipsLayer, target, row, column);
    }
    state.pendingPrediction = { predictor: predictorIdx, target: targetIdx, column };
    updatePanels();
    scheduleAi(() => startTurn(targetIdx), 320);
  };


  const runAiDrop = (playerIdx) => {
    const open = listOpenColumns(state.board);
    if (!open.length) {
      clearRevealTimers();
      finishGame(state, null, status, hud);
      return;
    }
    scheduleAi(() => {
      let column = chooseAiMove(state, playerIdx);
      if (column == null || findAvailableRow(state.board, column) === null) {
        column = listOpenColumns(state.board)[0];
      }
      if (column == null) return;
      const success = handleChipDrop(column);
      if (!success) {
        const fallback = listOpenColumns(state.board).find((c) => c !== column);
        if (fallback != null) handleChipDrop(fallback);
      }
    }, 480);
  };

  function startTurn(playerIdx) {
    if (state.finished) return;
    cancelAi();
    if (!dragLayer.isConnected) {
      requestAnimationFrame(() => startTurn(playerIdx));
      return;
    }
    state.currentPlayer = playerIdx;
    state.phase = 'drop';
    updatePanels();
    const player = state.players[playerIdx];
    if (player.kind === 'ai') {
      clearDragChip();
      dragLayer.style.pointerEvents = 'none';
      setStatus(`${player.name} is deciding...`);
      runAiDrop(playerIdx);
      return;
    }
    setStatus(player.name + ', place your chip.');
    spawnTurnChip();
  }

  updatePanels();

  return {
    start() {
      startTurn(state.currentPlayer);
    },
  };
}

function createDragChip(player, opts) {
  const { dragLayer, highlights, onDrop, boardRect, columnFromX, topBuffer, ghost = false, boardState } = opts;
  const size = CELL - CHIP_MARGIN * 2;
  const element = document.createElement('div');
  element.className = ghost ? 'pf-drag-chip pf-drag-chip--ghost' : 'pf-drag-chip';
  element.style.position = 'absolute';
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.borderRadius = '50%';
  element.style.top = `${topBuffer / 2 - size / 2}px`;
  element.style.background = ghost ? player.ghostFill : player.fill;
  element.style.border = '3px solid rgba(15, 23, 42, 0.3)';
  element.style.boxShadow = ghost ? '0 8px 16px rgba(14, 165, 233, 0.25)' : '0 8px 16px rgba(15, 23, 42, 0.35)';
  element.style.cursor = 'grab';
  element.style.touchAction = 'none';
  element.style.outline = 'none';
  element.style.pointerEvents = 'auto';
  element.tabIndex = 0;

  dragLayer.style.pointerEvents = 'auto';
  dragLayer.append(element);

  const getBoardRect = () => boardRect();
  const getLayerRect = () => dragLayer.getBoundingClientRect();
  const releaseHighlights = () => highlights.forEach((h) => { h.style.opacity = '0'; });

  const dragState = { pointerId: null, dragging: false, currentCol: null };

  const clampLeft = (clientX) => {
    const rect = getBoardRect();
    const lr = getLayerRect();
    const rawLeft = clientX - size / 2;
    const minLeft = rect.left - size;
    const maxLeft = rect.left + rect.width - size;
    return Math.max(minLeft, Math.min(maxLeft, rawLeft)) - lr.left;
  };

  const syncToColumn = (col) => {
    if (col == null || col < 0 || col >= COLS) return;
    const rect = getBoardRect();
    const lr = getLayerRect();
    const left = rect.left + col * CELL + CELL / 2 - size / 2;
    element.style.left = `${left - lr.left}px`;
    dragState.currentCol = col;
    highlights.forEach((h, idx) => { h.style.opacity = idx === col ? '1' : '0'; });
  };

  const setOutsideBoard = () => {
    const rect = getBoardRect();
    const lr = getLayerRect();
    element.style.left = `${rect.left - size - 12 - lr.left}px`;
    dragState.currentCol = null;
    releaseHighlights();
  };

  const updateFromPointer = (clientX) => {
    const boardRect = getBoardRect();
    const clampedClientX = Math.min(clientX, boardRect.left + boardRect.width - 1);
    const relativeLeft = clampLeft(clampedClientX);
    element.style.left = `${relativeLeft}px`;
    let col = columnFromX(clampedClientX);
    if (col < 0 && clampedClientX >= boardRect.left + boardRect.width - 1) col = COLS - 1;
    if (col >= 0 && col < COLS) {
      syncToColumn(col);
    } else {
      dragState.currentCol = null;
      releaseHighlights();
    }
  };

  const bounce = () => {
    element.style.transition = 'transform 160ms ease';
    element.style.transform = 'translateY(-14px)';
    requestAnimationFrame(() => {
      element.style.transform = 'translateY(0)';
    });
  };

  const openColumns = listOpenColumns(boardState);
  const defaultColumn = openColumns.length ? openColumns[0] : Math.floor(COLS / 2);
  setOutsideBoard();

  const completeDrop = () => {
    if (dragState.currentCol == null) {
      bounce();
      return;
    }
    const accepted = onDrop?.(dragState.currentCol);
    if (accepted === false) {
      bounce();
      return;
    }
    dragLayer.style.pointerEvents = 'none';
    element.remove();
    releaseHighlights();
  };

  element.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    element.focus();
    element.setPointerCapture(ev.pointerId);
    dragState.pointerId = ev.pointerId;
    dragState.dragging = true;
    element.style.cursor = 'grabbing';
    updateFromPointer(ev.clientX);
  });

  element.addEventListener('pointermove', (ev) => {
    if (!dragState.dragging || ev.pointerId !== dragState.pointerId) return;
    updateFromPointer(ev.clientX);
  });

  const finishDrag = () => {
    dragState.dragging = false;
    element.style.cursor = 'grab';
  };

  element.addEventListener('pointerup', (ev) => {
    if (ev.pointerId !== dragState.pointerId) return;
    element.releasePointerCapture(ev.pointerId);
    finishDrag();
    completeDrop();
  });

  element.addEventListener('pointercancel', (ev) => {
    if (ev.pointerId !== dragState.pointerId) return;
    element.releasePointerCapture(ev.pointerId);
    finishDrag();
    releaseHighlights();
    setOutsideBoard();
  });

  element.addEventListener('keydown', (ev) => {
    const open = listOpenColumns(boardState);
    if (!open.length) return;
    const currentIdx = dragState.currentCol == null ? -1 : open.indexOf(dragState.currentCol);
    const startIdx = currentIdx === -1 ? 0 : currentIdx;
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const nextIdx = (startIdx - 1 + open.length) % open.length;
      syncToColumn(open[nextIdx]);
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      const nextIdx = (startIdx + 1) % open.length;
      syncToColumn(open[nextIdx]);
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (dragState.currentCol == null) syncToColumn(defaultColumn);
      completeDrop();
    }
  });

  return { element };
}

function findAvailableRow(board, column) {
  for (let r = 0; r < ROWS; r++) {
    if (board[r][column] == null) return r;
  }
  return null;
}

function listOpenColumns(board) {
  const cols = [];
  for (let c = 0; c < COLS; c++) {
    if (findAvailableRow(board, c) !== null) cols.push(c);
  }
  return cols;
}

function addChipToBoard(state, row, column, layer) {
  state.board[row][column] = state.currentPlayer;
  const chip = document.createElement('div');
  chip.className = 'pf-chip';
  chip.style.position = 'absolute';
  const size = CELL - CHIP_MARGIN * 2;
  chip.style.width = `${size}px`;
  chip.style.height = `${size}px`;
  chip.style.borderRadius = '50%';
  chip.style.left = `${column * CELL + CHIP_MARGIN}px`;
  chip.style.top = `${(ROWS - 1 - row) * CELL + CHIP_MARGIN}px`;
  chip.style.background = state.players[state.currentPlayer].fill;
  chip.style.border = '3px solid rgba(15, 23, 42, 0.3)';
  chip.style.boxShadow = '0 12px 24px rgba(15, 23, 42, 0.35)';
  chip.style.transform = `translateY(-${ROWS * CELL}px)`;
  chip.style.transition = 'transform 360ms cubic-bezier(0.22, 0.9, 0.34, 1)';
  layer.append(chip);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      chip.style.transform = 'translateY(0)';
    });
  });
  state.chips[row][column] = chip;
}

function animatePredictionMarker(layer, player, row, column) {
  const marker = document.createElement('div');
  marker.className = 'pf-chip pf-chip--ghost';
  const size = CELL - CHIP_MARGIN * 2;
  marker.style.position = 'absolute';
  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.borderRadius = '50%';
  marker.style.left = `${column * CELL + CHIP_MARGIN}px`;
  marker.style.top = `${(ROWS - 1 - row) * CELL + CHIP_MARGIN}px`;
  marker.style.background = player.ghostFill;
  marker.style.border = '3px solid rgba(14, 165, 233, 0.35)';
  marker.style.boxShadow = '0 8px 18px rgba(14, 165, 233, 0.3)';
  marker.style.transform = `translateY(-${ROWS * CELL}px)`;
  marker.style.transition = 'transform 320ms ease, opacity 220ms ease';
  marker.style.opacity = '0.75';
  marker.style.pointerEvents = 'none';
  layer.append(marker);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      marker.style.transform = 'translateY(0)';
    });
  });
  setTimeout(() => {
    marker.style.opacity = '0';
    marker.addEventListener('transitionend', () => marker.remove(), { once: true });
  }, 420);
}

function resolvePendingPrediction(actualColumn, state, updatePanels) {
  const pending = state.pendingPrediction;
  if (!pending || pending.target !== state.currentPlayer) return null;
  const hit = pending.column === actualColumn;
  if (hit) {
    const predictor = state.players[pending.predictor];
    predictor.correctPredictions += 1;
  }
  state.pendingPrediction = null;
  updatePanels();
  return { predictorIdx: pending.predictor, hit, miss: !hit };
}

function checkForWin(board, row, column, playerIdx) {
  const dirs = [
    { dr: 1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];
  for (const { dr, dc } of dirs) {
    const line = collectLine(board, row, column, playerIdx, dr, dc);
    if (line.length >= 4) return line;
  }
  return null;
}

function collectLine(board, row, column, playerIdx, dr, dc) {
  const coords = [{ row, column }];
  let r = row + dr;
  let c = column + dc;
  while (inBounds(r, c) && board[r][c] === playerIdx) {
    coords.push({ row: r, column: c });
    r += dr;
    c += dc;
  }
  r = row - dr;
  c = column - dc;
  while (inBounds(r, c) && board[r][c] === playerIdx) {
    coords.push({ row: r, column: c });
    r -= dr;
    c -= dc;
  }
  return coords;
}

function inBounds(row, column) {
  return row >= 0 && row < ROWS && column >= 0 && column < COLS;
}

function highlightWin(state, line) {
  line.forEach(({ row, column }) => {
    const chip = state.chips[row][column];
    if (chip) {
      chip.style.boxShadow = '0 0 0 4px rgba(250, 204, 21, 0.9)';
    }
  });
}

function finishGame(state, winnerIdx, status, hud) {
  state.finished = true;
  state.phase = 'over';
  const winner = typeof winnerIdx === 'number' ? state.players[winnerIdx] : null;
  status.textContent = winner ? `${winner.name} wins!` : 'The board is full - draw.';

  const totals = state.players.map((player, idx) => {
    const predictionScore = player.correctPredictions * state.predictPoints;
    const winScore = winnerIdx === idx ? state.winPoints : 0;
    return {
      name: player.name,
      predictionScore,
      winScore,
      total: predictionScore + winScore,
    };
  });

  hud.panels.forEach((panel, idx) => {
    if (panel.pointsStat) {
      panel.pointsStat.val.textContent = String(totals[idx].total);
      panel.pointsStat.root.dataset.masked = 'false';
    }
    if (panel.predStat) {
      panel.predStat.val.textContent = String(state.players[idx].correctPredictions);
      panel.predStat.root.dataset.masked = 'false';
    }
    panel.revealBtn?.setAttribute('disabled', 'true');
    panel.root.classList.add('is-complete');
    panel.root.classList.remove('is-active');
  });

  const modalActions = [
    {
      label: 'Play again',
      onClick: () => {
        try { sessionStorage.setItem('pf:chosen', '1'); } catch {}
        const firstPlayer = Math.random() < 0.5 ? '0' : '1';
        try { sessionStorage.setItem('pf:start-player', firstPlayer); } catch {}
        location.hash = '#/gallery/predict-four/game';
      },
    },
    {
      label: 'Settings',
      variant: 'secondary',
      onClick: () => { location.hash = '#/gallery/predict-four'; },
    },
  ];

  openModal({
    title: winner ? `${winner.name} wins!` : 'Game over',
    body: buildSummaryBody(totals, winnerIdx, state),
    actions: modalActions,
  });
}

function buildSummaryBody(totals, winnerIdx, state) {
  const wrap = document.createElement('div');
  wrap.className = 'stack';
  const intro = document.createElement('p');
  if (typeof winnerIdx === 'number') {
    intro.textContent = 'Final scores';
    intro.style.fontWeight = '700';
  } else {
    intro.textContent = 'No winner this round, so only prediction bonuses apply.';
  }
  wrap.append(intro);

  const list = document.createElement('ul');
  list.className = 'stack';
  totals.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.name}: ${entry.total} pts (win ${entry.winScore}, predictions ${entry.predictionScore})`;
    list.append(li);
  });
  wrap.append(list);
  return wrap;
}
























