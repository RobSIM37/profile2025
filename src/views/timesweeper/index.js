import { initBoard, reveal, chord, toggleFlag, isWin, isLoss, flagsLeft, revealAllMines } from './engine.js';

export const meta = {
  title: 'Timesweeper',
  description: 'Minesweeper with a timebomb twist (baseline)',
};

export function render() {
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack ts-wrap';

  const header = document.createElement('div');
  header.className = 'ts-controls';
  header.innerHTML = `
    <div class="ts-presets">
      <button id="ts-easy" class="button button-secondary">Easy</button>
      <button id="ts-inter" class="button button-secondary">Intermidiate</button>
      <button id="ts-hard" class="button button-secondary">Hard</button>
      <button id="ts-custom" class="button button-secondary">Custom</button>
    </div>
    <button id="ts-new" class="button">New Game</button>
    <div class="ts-stat">Flags: <span id="ts-flags">0</span></div>
    <div class="ts-stat">Fuse: <span id="ts-fuse" class="fuse running">--:--.-</span></div>
  `;

  const boardHost = document.createElement('div');
  boardHost.className = 'ts-board';

  const modal = document.createElement('div');
  modal.className = 'ts-modal hidden';
  modal.innerHTML = `
    <div class="ts-modal-card">
      <h3 id="ts-modal-title">Game Over</h3>
      <div class="ts-modal-body">
        <div id="ts-stats-block">
          <p>Solve Time: <span id="ts-solve">--:--</span></p>
          <p>Best Time: <span id="ts-best">--:--</span></p>
          <p>Wins: <span id="ts-wins">0</span> &nbsp; Losses: <span id="ts-losses">0</span> &nbsp; Win%: <span id="ts-winpct">0%</span></p>
        </div>
        <div id="ts-custom-note" class="hidden"><p>Custom mode: stats are not tracked.</p></div>
      </div>
      <div class="ts-modal-actions">
        <button id="ts-play-again" class="button">New Game</button>
      </div>
    </div>`;

  // Custom config modal
  const cfg = document.createElement('div');
  cfg.className = 'ts-modal hidden';
  cfg.innerHTML = `
    <div class="ts-modal-card">
      <h3>Custom Game</h3>
      <div class="ts-modal-body">
        <div class="ts-config-grid">
          <label for="cfg-w">Width</label>
          <input id="cfg-w" type="number" min="5" max="40" value="30" />
          <label for="cfg-h">Height</label>
          <input id="cfg-h" type="number" min="5" max="24" value="16" />
          <label for="cfg-m">Mines</label>
          <div class="ts-mines-row">
            <input id="cfg-m" type="number" min="1" max="200" value="99" />
            <button type="button" id="cfg-m-max" class="button button-secondary small">Max: <span id="cfg-m-maxv">--</span></button>
          </div>
          <label for="cfg-mm">Time Bomb Time</label>
          <div class="ts-fuse">
            <input id="cfg-mm" type="number" min="0" max="59" value="1" />
            <span>:</span>
            <input id="cfg-ss" type="number" min="0" max="59" value="00" />
          </div>
        </div>
      </div>
      <div class="ts-modal-actions">
        <button id="cfg-cancel" class="button button-secondary">Cancel</button>
        <button id="cfg-save" class="button">Save</button>
      </div>
    </div>`;

  wrap.append(header, boardHost, modal, cfg);
  frag.append(wrap);

  // Ensure the entire blue-border area (main container) is filled with a solid backdrop
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.style.background = 'var(--bg)';
    appEl.style.color = 'var(--text)';
  }

  // Prevent native context menu anywhere in the Timesweeper area (immersion)
  wrap.addEventListener('contextmenu', (e) => e.preventDefault());

  // State
  let W = 30, H = 16, M = 99;
  let board = initBoard(W, H);
  let firstClick = true;
  let difficulty = 'Hard';
  let gameOver = false;
  let startTs = 0;
  let timerId = 0;
  let fuseTotalMs = 60000; // starting fuse
  let fuseRemainingMs = 60000;
  let fuseDefused = false;
  let lastTick = 0;

  const $ = (id) => wrap.querySelector(id);
  // Inputs live only in the config modal now; cache getters when needed
  const flagsEl = $('#ts-flags');
  const fuseEl = $('#ts-fuse');
  const bestEl = $('#ts-best');
  const solveEl = $('#ts-solve');
  const winsEl = $('#ts-wins');
  const lossesEl = $('#ts-losses');
  const winpctEl = $('#ts-winpct');

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v|0));
  const statsKey = () => `timesweeper:stats:${W}x${H}x${M}`;
  const readStats = () => { try { return JSON.parse(localStorage.getItem(statsKey())||'{}'); } catch { return {}; } };
  const writeStats = (s) => localStorage.setItem(statsKey(), JSON.stringify(s));
  const fmt = (ms) => {
    if (!ms || ms <= 0) return '--:--.-';
    const tenths = Math.floor(ms / 100);
    const s = Math.floor(tenths / 10);
    const t = tenths % 10;
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return `${m}:${ss}.${t}`;
  };
  const fuseKey = 'timesweeper:customFuse';
  function readFuse(){ try { return JSON.parse(localStorage.getItem(fuseKey)||'{}'); } catch { return {}; } }
  function writeFuse(obj){ localStorage.setItem(fuseKey, JSON.stringify(obj)); }

  function syncStats() {
    flagsEl.textContent = String(flagsLeft(board, M));
  }

  function setFuseDisplay(ms, defused) {
    const clamped = Math.max(0, ms|0);
    const tenths = Math.floor(clamped / 100);
    const s = Math.floor(tenths / 10);
    const t = tenths % 10;
    const m = Math.floor(s/60);
    const ss = String(s%60).padStart(2,'0');
    fuseEl.textContent = `${m}:${ss}.${t}`;
    fuseEl.classList.toggle('defused', !!defused);
    fuseEl.classList.toggle('running', !defused);
  }

  function startingFuseMs() {
    if (difficulty === 'Custom') {
      const f = readFuse();
      const mm = Math.max(0, (f.mm|0));
      const ss = Math.max(0, Math.min(59, (f.ss|0)));
      return Math.max(1000, (mm*60+ss)*1000);
    }
    const s = readStats();
    const defaults = { Easy: 60000, Intermidiate: 180000, Hard: 300000 };
    const fallback = defaults[difficulty] ?? 60000;
    const best = s.best && isFinite(s.best) && s.best>0 ? s.best : fallback;
    return best;
  }

  function updateDifficultyUI() {
    const btns = {
      Easy: wrap.querySelector('#ts-easy'),
      Intermidiate: wrap.querySelector('#ts-inter'),
      Hard: wrap.querySelector('#ts-hard'),
      Custom: wrap.querySelector('#ts-custom'),
    };
    Object.values(btns).forEach(b => b && b.classList.remove('active'));
    const b = btns[difficulty];
    if (b) b.classList.add('active');
  }

  function drawBoard() {
    // CSS grid sizing
    boardHost.style.setProperty('--ts-cols', board[0]?.length || 0);
    boardHost.innerHTML = '';
    for (const row of board) {
      for (const c of row) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'ts-cell';
        cell.dataset.x = c.x; cell.dataset.y = c.y;
        if (c.hidden) {
          cell.classList.add('hidden');
          if (c.flagged) cell.classList.add(c.isTimebomb ? 'tflag' : 'flagged');
        } else {
          cell.classList.add('revealed');
          if (c.isMine) cell.classList.add('mine');
          else if (c.neighbors>0) { cell.textContent = String(c.neighbors); cell.classList.add(`n${c.neighbors}`); }
        }
        boardHost.append(cell);
      }
    }
    syncStats();
  }

  function newGame() {
    firstClick = true;
    gameOver = false;
    if (timerId) { clearInterval(timerId); timerId = 0; }
    board = initBoard(W, H);
    modal.classList.add('hidden');
    fuseTotalMs = startingFuseMs();
    fuseRemainingMs = fuseTotalMs;
    fuseDefused = false;
    setFuseDisplay(fuseRemainingMs, fuseDefused);
    updateDifficultyUI();
    drawBoard();
  }

  function applyPreset(name, w, h, m) {
    difficulty = name;
    W = w; H = h; M = m;
    updateDifficultyUI();
    newGame();
  }

  function onCellPrimary(x, y) {
    if (gameOver) return;
    const current = board[y]?.[x];
    // If already revealed, do nothing here so dblclick can chord without re-render reset
    if (!firstClick && current && !current.hidden) {
      return;
    }
    if (firstClick) {
      // Place mines avoiding the first click area
      board = initBoard(W, H, { x, y }, M);
      firstClick = false;
      startTs = performance.now();
      if (timerId) clearInterval(timerId);
      lastTick = startTs;
      timerId = setInterval(()=>{
        if (!gameOver) {
          const now = performance.now();
          const dt = now - lastTick; lastTick = now;
          if (!fuseDefused) {
            fuseRemainingMs -= dt;
            setFuseDisplay(fuseRemainingMs, fuseDefused);
            if (fuseRemainingMs <= 0) { endGame(false); }
          }
        }
      }, 100);
    }
    reveal(board, x, y);
    if (isLoss(board)) endGame(false);
    else if (isWin(board)) endGame(true);
    drawBoard();
  }

  function onCellChord(x, y) {
    if (gameOver) return;
    chord(board, x, y);
    if (isLoss(board)) endGame(false);
    else if (isWin(board)) endGame(true);
    drawBoard();
  }

  function onCellFlag(x, y) {
    if (gameOver) return;
    const cell = board[y]?.[x];
    const prev = cell?.flagged;
    toggleFlag(board, x, y);
    const nowFlagged = board[y]?.[x]?.flagged;
    if (cell && cell.isTimebomb) {
      if (!prev && nowFlagged) { fuseDefused = true; setFuseDisplay(fuseRemainingMs, true); }
      else if (prev && !nowFlagged) { fuseDefused = false; setFuseDisplay(fuseRemainingMs, false); }
    }
    drawBoard();
  }

  function endGame(won){
    gameOver = true;
    if (timerId) { clearInterval(timerId); timerId = 0; }
    const elapsed = startTs ? performance.now()-startTs : 0;
    if (!won) revealAllMines(board);
    // Update or hide stats depending on difficulty
    const statsBlock = wrap.querySelector('#ts-stats-block');
    const customNote = wrap.querySelector('#ts-custom-note');
    if (difficulty === 'Custom') {
      statsBlock.classList.add('hidden');
      customNote.classList.remove('hidden');
    } else {
      const s = readStats();
      s.wins = (s.wins|0) + (won?1:0);
      s.losses = (s.losses|0) + (!won?1:0);
      if (solveEl) solveEl.textContent = fmt(elapsed);
      const prevBest = s.best||Infinity;
      if (won) s.best = Math.min(prevBest, elapsed);
      writeStats(s);
      bestEl.textContent = fmt(s.best||0);
      // Highlight Best Time if new record for this preset
      if (won && elapsed < prevBest) {
        bestEl.style.color = '#3f48cc';
        bestEl.style.fontWeight = '800';
      } else {
        bestEl.style.color = '';
        bestEl.style.fontWeight = '';
      }
      winsEl.textContent = String(s.wins||0);
      lossesEl.textContent = String(s.losses||0);
      const total = (s.wins|0) + (s.losses|0);
      winpctEl.textContent = total ? `${Math.round((s.wins||0)/total*100)}%` : '0%';
      statsBlock.classList.remove('hidden');
      customNote.classList.add('hidden');
    }
    wrap.querySelector('#ts-modal-title').textContent = won ? 'You Win!' : 'Game Over';
    const btn = modal.querySelector('#ts-play-again');
    modal.dataset.outcome = won ? 'win' : 'loss';
    btn.textContent = won ? 'New Game' : 'Continue';
    modal.classList.remove('hidden');
  }

  // Events
  // Custom config
  wrap.querySelector('#ts-custom').addEventListener('click', () => {
    const fuse = readFuse();
    const wEl = cfg.querySelector('#cfg-w');
    const hEl = cfg.querySelector('#cfg-h');
    const mEl = cfg.querySelector('#cfg-m');
    const mMaxBtn = cfg.querySelector('#cfg-m-max');
    const mMaxVal = cfg.querySelector('#cfg-m-maxv');
    wEl.value = W;
    hEl.value = H;
    // compute and enforce dynamic max mines = w*h - 1
    const applyMax = () => {
      const w = clamp(wEl.value, 5, 40);
      const h = clamp(hEl.value, 5, 24);
      // Enforce at least 10 empty cells anywhere => max mines = w*h - 10
      const maxM = Math.max(1, w * h - 10);
      mEl.max = String(maxM);
      if ((mEl.value|0) > maxM) mEl.value = String(maxM);
      if (mMaxVal) mMaxVal.textContent = String(maxM);
    };
    applyMax();
    // Update max when width/height change while dialog open
    const wHandler = () => applyMax();
    const hHandler = () => applyMax();
    wEl.addEventListener('input', wHandler);
    hEl.addEventListener('input', hHandler);
    const mClampHandler = () => { if (mEl.value==='') return; const maxM=mEl.max|0; let v=mEl.value|0; if(!Number.isFinite(v)||v<1) v=1; if(v>maxM) v=maxM; mEl.value=String(v); };
    mEl.addEventListener('input', mClampHandler);
    mMaxBtn.onclick = () => { mEl.value = mEl.max; };
    mEl.value = M;
    cfg.querySelector('#cfg-mm').value = fuse.mm ?? 1;
    cfg.querySelector('#cfg-ss').value = String(fuse.ss ?? 0).padStart(2,'0');
    cfg.classList.remove('hidden');
    // tidy up listeners when dialog closed
    const cleanup = () => { wEl.removeEventListener('input', wHandler); hEl.removeEventListener('input', hHandler); mEl.removeEventListener('input', mClampHandler); mMaxBtn.onclick = null; };
    cfg.querySelector('#cfg-cancel').onclick = () => { cfg.classList.add('hidden'); cleanup(); };
    cfg.querySelector('#cfg-save').onclick = () => {
      const w = clamp(wEl.value, 5, 40);
      const h = clamp(hEl.value, 5, 24);
      const m = clamp(mEl.value, 1, Math.min(200, Math.max(1, w*h-10)));
      const mm = clamp(cfg.querySelector('#cfg-mm').value, 0, 59);
      const ss = clamp(cfg.querySelector('#cfg-ss').value, 0, 59);
      writeFuse({ mm, ss });
      difficulty = 'Custom';
      W = w; H = h; M = m;
      cfg.classList.add('hidden');
      cleanup();
      updateDifficultyUI();
      newGame();
    };
  });
  boardHost.addEventListener('click', (e) => {
    const btn = e.target.closest('.ts-cell'); if (!btn) return;
    onCellPrimary(btn.dataset.x|0, btn.dataset.y|0);
  });
  boardHost.addEventListener('dblclick', (e) => {
    const btn = e.target.closest('.ts-cell'); if (!btn) return;
    onCellChord(btn.dataset.x|0, btn.dataset.y|0);
  });
  boardHost.addEventListener('contextmenu', (e) => {
    const btn = e.target.closest('.ts-cell'); if (!btn) return;
    e.preventDefault(); onCellFlag(btn.dataset.x|0, btn.dataset.y|0);
  });
  wrap.querySelector('#ts-new').addEventListener('click', newGame);
  modal.querySelector('#ts-play-again').addEventListener('click', () => {
    if (modal.dataset.outcome === 'win') newGame();
    else modal.classList.add('hidden');
  });
  wrap.querySelector('#ts-easy').addEventListener('click', () => applyPreset('Easy', 9, 9, 10));
  wrap.querySelector('#ts-inter').addEventListener('click', () => applyPreset('Intermidiate', 16, 16, 40));
  wrap.querySelector('#ts-hard').addEventListener('click', () => applyPreset('Hard', 30, 16, 99));

  newGame();
  return frag;
}
