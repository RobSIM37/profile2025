import { initBoard, reveal, chord, toggleFlag, isWin, isLoss, flagsLeft, revealAllMines } from './engine.js';
import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { readStats, writeStats } from '../../../features/timesweeper/stats.js';
import { readFuse, writeFuse, startingFuseMs } from '../../../features/timesweeper/fuse.js';
import { PRESETS } from '../../../consts/timesweeper.js';
import { formatTenths } from '../../../lib/format.js';

export const meta = { title: 'Timesweeper', description: 'Minesweeper with a timed twist' };

export function render(){
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  // Subheader: title with Demo/Source tabs
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';
  const sub = makeGallerySubheader({
    title: 'Timesweeper',
    href: '#/gallery/timesweeper',
    emitInitial: false,
    onChange(id){
      if (id === 'demo') {
        location.hash = '#/gallery/timesweeper';
        return;
      }
      try { renderTsSourceBrowser(srcPane); srcPane.style.display = ''; } catch {}
    },
  });

  const wrap = document.createElement('section');
  wrap.className = 'stack ts-wrap';

  const header = document.createElement('div');
  header.className = 'actions ts-controls';
  header.style.justifyContent='center';
  header.style.marginTop = 'var(--space-6)';
  header.innerHTML = `
    <span class="ts-stat">Flags: <span id="ts-flags">0</span></span>
    <span class="ts-stat">Fuse: <span id="ts-fuse" class="fuse running">--:--.-</span></span>
  `;

  const boardHost = document.createElement('div');
  boardHost.className='ts-board';
  boardHost.style.setProperty('--ts-cols', '30');

  // Modal for end-game and stats
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
        <button id="ts-quit" class="button button-secondary">Quit</button>
      </div>
    </div>`;

  wrap.append(header, boardHost, modal);
  frag.append(sub.root, wrap, srcPane);

  // Prevent native context menu anywhere in the Timesweeper area (immersion)
  wrap.addEventListener('contextmenu', (e)=> e.preventDefault());

  // State
  let difficulty = 'Hard';
  let W=30,H=16,M=99;
  try {
    const sel = sessionStorage.getItem('ts:selected');
    if (sel === 'Easy') ({W,H,M} = PRESETS.Easy, difficulty='Easy');
    else if (sel === 'Intermediate') ({W,H,M} = PRESETS.Intermediate, difficulty='Intermediate');
    else if (sel === 'Hard') ({W,H,M} = PRESETS.Hard, difficulty='Hard');
    else if (sel === 'Custom') { const raw = sessionStorage.getItem('ts:custom'); if (raw) { const c = JSON.parse(raw); W=c.w||W; H=c.h||H; M=c.m||M; difficulty='Custom'; writeFuse({ mm:c.mm|0, ss:c.ss|0 }); } }
  } catch {}

  let board = initBoard(W,H);
  let firstClick = true;
  let gameOver = false;
  let startTs = 0;
  let timerId = 0;
  let fuseTotalMs = 60000;
  let fuseRemainingMs = 60000;
  let fuseDefused = false;
  let lastTick = 0;

  const flagsEl = wrap.querySelector('#ts-flags');
  const fuseEl = wrap.querySelector('#ts-fuse');
  const bestEl = modal.querySelector('#ts-best');
  const solveEl = modal.querySelector('#ts-solve');
  const winsEl = modal.querySelector('#ts-wins');
  const lossesEl = modal.querySelector('#ts-losses');
  const winpctEl = modal.querySelector('#ts-winpct');

  const fmt = (ms)=> formatTenths(ms||0);

  function readStatsLocal(){ return readStats(W,H,M); }
  function writeStatsLocal(s){ writeStats(W,H,M,s); }

  function setFuseDisplay(ms, defused){
    const clamped = Math.max(0, ms|0);
    const tenths = Math.floor(clamped / 100);
    const s = Math.floor(tenths / 10);
    const t = tenths % 10;
    const m = Math.floor(s/60);
    const ss = String(s%60).padStart(2,'0');
    if (fuseEl) fuseEl.textContent = `${m}:${ss}.${t}`;
    if (fuseEl) { fuseEl.classList.toggle('defused', !!defused); fuseEl.classList.toggle('running', !defused); }
  }

  function startingFuseMsLocal(){
    const s = readStatsLocal();
    const best = s.best && isFinite(s.best) && s.best>0 ? s.best : undefined;
    return startingFuseMs(difficulty, best);
  }

  function paint(){
    boardHost.innerHTML='';
    boardHost.style.setProperty('--ts-cols', String(W));
    for (let y = 0; y < H; y++){
      for (let x = 0; x < W; x++){
        const c = board[y][x];
        const b = document.createElement('button');
        b.type = 'button';
        let cls = 'ts-cell';
        cls += c.hidden ? ' hidden' : ' revealed';
        if (c.hidden && c.flagged) cls += c.isTimebomb ? ' tflag' : ' flagged';
        if (!c.hidden && c.isMine) cls += ' mine';
        if (!c.hidden && !c.isMine && c.neighbors>0) cls += ' n' + c.neighbors;
        b.className = cls;
        b.dataset.x = String(x); b.dataset.y = String(y);
        b.textContent = (!c.hidden && !c.isMine && c.neighbors>0) ? String(c.neighbors) : '';
        boardHost.append(b);
      }
    }
    if (flagsEl) flagsEl.textContent = String(flagsLeft(board, M));
  }

  function layMines(first){ board = initBoard(W,H, first, M); }

  function tick(){
    if (gameOver) return;
    const now = performance.now();
    const dt = lastTick ? (now - lastTick) : 0; lastTick = now;
    if (!fuseDefused) {
      fuseRemainingMs -= dt;
      setFuseDisplay(fuseRemainingMs, false);
      if (fuseRemainingMs <= 0) { endGame(false); return; }
    } else {
      setFuseDisplay(fuseRemainingMs, true);
    }
  }

  function onCellPrimary(x,y){
    if (gameOver) return;
    const cell = board[y]?.[x]; if (!cell) return;
    if (!firstClick && !cell.hidden) return; // allow dblclick chord to handle revealed
    if (firstClick) {
      firstClick = false;
      layMines({x,y});
      startTs = performance.now();
      if (timerId) clearInterval(timerId);
      lastTick = startTs;
      timerId = setInterval(tick, 100);
    }
    reveal(board, x, y);
    if (isLoss(board)) endGame(false);
    else if (isWin(board)) endGame(true);
    paint();
  }

  function onCellChord(x,y){
    if (gameOver) return;
    chord(board, x, y);
    if (isLoss(board)) endGame(false);
    else if (isWin(board)) endGame(true);
    paint();
  }

  function onCellFlag(x,y){
    if (gameOver) return;
    const cell = board[y]?.[x];
    const prev = cell?.flagged;
    toggleFlag(board, x, y);
    const nowFlagged = board[y]?.[x]?.flagged;
    if (cell && cell.isTimebomb) {
      if (!prev && nowFlagged) { fuseDefused = true; setFuseDisplay(fuseRemainingMs, true); }
      else if (prev && !nowFlagged) { fuseDefused = false; setFuseDisplay(fuseRemainingMs, false); }
    }
    paint();
  }

  function endGame(won){
    gameOver = true;
    if (timerId) { clearInterval(timerId); timerId = 0; }
    const elapsed = startTs ? (performance.now() - startTs) : 0;
    if (!won) revealAllMines(board);
    // Stats UI
    const statsBlock = modal.querySelector('#ts-stats-block');
    const customNote = modal.querySelector('#ts-custom-note');
    if (difficulty === 'Custom') {
      statsBlock.classList.add('hidden');
      customNote.classList.remove('hidden');
    } else {
      const s = readStatsLocal();
      s.wins = (s.wins|0) + (won?1:0);
      s.losses = (s.losses|0) + (!won?1:0);
      if (solveEl) solveEl.textContent = fmt(elapsed);
      const prevBest = s.best||Infinity;
      if (won) s.best = Math.min(prevBest, elapsed);
      writeStatsLocal(s);
      bestEl.textContent = fmt(s.best||0);
      if (won && elapsed < prevBest) { bestEl.style.color = 'var(--primary)'; bestEl.style.fontWeight = '800'; }
      else { bestEl.style.color = ''; bestEl.style.fontWeight = ''; }
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

  function newGame(){
    firstClick = true;
    gameOver = false;
    if (timerId) { clearInterval(timerId); timerId = 0; }
    board = initBoard(W,H);
    modal.classList.add('hidden');
    fuseTotalMs = startingFuseMsLocal();
    fuseRemainingMs = fuseTotalMs;
    fuseDefused = false;
    setFuseDisplay(fuseRemainingMs, false);
    // ensure initial grid size is set
    boardHost.style.setProperty('--ts-cols', String(W));
    paint();
  }

  function asEl(t){ return t && t.nodeType === 3 ? t.parentElement : t; }
  boardHost.addEventListener('click', (e)=>{ if (gameOver) return; const el = asEl(e.target); const b = el && el.closest ? el.closest('.ts-cell') : null; if(!b) return; onCellPrimary(b.dataset.x|0, b.dataset.y|0); });
  boardHost.addEventListener('dblclick', (e)=>{ if (gameOver) return; const el = asEl(e.target); const b = el && el.closest ? el.closest('.ts-cell') : null; if(!b) return; onCellChord(b.dataset.x|0, b.dataset.y|0); });
  boardHost.addEventListener('contextmenu', (e)=>{ if (gameOver) return; const el = asEl(e.target); const b = el && el.closest ? el.closest('.ts-cell') : null; if(!b) return; e.preventDefault(); onCellFlag(b.dataset.x|0, b.dataset.y|0); });

  modal.querySelector('#ts-play-again').addEventListener('click', ()=>{
    if (modal.dataset.outcome === 'win') newGame();
    else modal.classList.add('hidden');
  });
  // Quit: navigate back to the start screen
  modal.querySelector('#ts-quit').addEventListener('click', ()=>{
    try { sessionStorage.removeItem('ts:chosen'); } catch {}
    location.hash = '#/gallery/timesweeper';
  });

  // Initialize game state
  newGame();
  return frag;
}

// Lightweight source browser for game route
const TS_FILES = ['index.js','engine.js'];
function renderTsSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div'); list.className = 'stack';
  const note = document.createElement('p'); note.textContent = 'Source files under src/views/gallery/timesweeper/'; list.append(note);
  TS_FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary'); sum.textContent = path; item.append(sum);
    const pre = document.createElement('pre'); const code = document.createElement('code'); code.textContent = 'Loading.'; pre.append(code); item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try { const res = await fetch('src/views/gallery/timesweeper/' + path, { cache: 'no-cache' }); const txt = await res.text(); code.textContent = txt; }
      catch (e) { code.textContent = 'Unable to load file in this context.'; }
    }, { once: true });
    list.append(item);
  });
  host.append(list);
}
