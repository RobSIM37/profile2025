import { Button } from '../../../components/ui/button.js';
import { openModal } from '../../../components/ui/modal.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { Accordion } from '../../../components/ui/accordion.js';
import { generate, levelToSize, intendedSteps, applyMove, isSolved, xmur3 } from './engine.js';
import { makeGrid } from './grid.js';
import { loadProgress, saveMaxLevel, saveLastLevel, saveLastSeed } from './state.js';

export const meta = { title: 'Light Houses', description: 'Toggle neighbors to turn on all lights' };

function parseHashQuery() {
  try {
    const hash = location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return {};
    const q = new URLSearchParams(hash.slice(qIndex + 1));
    const out = {};
    for (const [k, v] of q.entries()) out[k] = v;
    return out;
  } catch { return {}; }
}

// Encode the puzzle board as a binary string (length=size^2)
function encodeSeedFromBoard(board) {
  let s = '';
  for (let i = 0; i < board.length; i++) s += board[i] ? '1' : '0';
  return s;
}
function isValidSeedForSize(seed, size) {
  return typeof seed === 'string' && seed.length === size * size && /^[01]+$/.test(seed);
}
function decodeSeedToBoard(seed, size) {
  const arr = new Uint8Array(size * size);
  for (let i = 0; i < arr.length; i++) arr[i] = seed.charCodeAt(i) === 49 ? 1 : 0; // '1' -> 49
  return arr;
}
function randomEngineSeed() {
  try {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return String(a[0].toString(16)) + String(a[1].toString(16));
  } catch { return String(Date.now()) + Math.random().toString(16).slice(2); }
}
function countOn(arr){ let n=0; for (let i=0;i<arr.length;i++) n += arr[i] ? 1 : 0; return n; }

// Lightweight signature to distinguish app-generated links from hand-edited ones
const SIG_SALT = 'lh:v1:seed-salt';
function makeSig(seed, level){
  try {
    const seedStr = String(seed || '');
    const h = xmur3(`${SIG_SALT}:${seedStr}:${level||''}`)();
    return (h >>> 0).toString(16);
  } catch { return '0'; }
}
function isOneClickPuzzle(puzzle, size){
  const n = size*size;
  const tmp = new Uint8Array(puzzle.length);
  for (let i = 0; i < n; i++) {
    tmp.set(puzzle);
    applyMove(tmp, size, i);
    if (isSolved(tmp)) return true;
  }
  return false;
}

function renderGame() {
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack';
  setAppSolid(true);

  const params = parseHashQuery();
  const progress = loadProgress();
  let maxLevel = progress.maxLevel;
  let currentLevel = params.level ? Math.max(1, Number(params.level) || 1) : (progress.lastLevel || maxLevel);
  let seed = params.seed || progress.lastSeed || '';
  let sigParam = params.sig || '';

  let currentSize = levelToSize(currentLevel, 9);
  let puzzleBoard;
  if (isValidSeedForSize(seed, currentSize)) {
    puzzleBoard = decodeSeedToBoard(seed, currentSize);
  } else {
    const gen0 = generate(currentSize, currentLevel, randomEngineSeed());
    puzzleBoard = gen0.board;
    seed = encodeSeedFromBoard(puzzleBoard);
    saveLastSeed(seed);
  }
  let board = new Uint8Array(puzzleBoard);
  let moves = 0;
  let moveCap = 0;
  const MIN_ON_RATIO = 0.15; // require at least 15% lights on
  let minOnCount = 0;
  const oneClick = isOneClickPuzzle(puzzleBoard, currentSize);
  let naturalEntry = sigParam && sigParam === makeSig(seed, currentLevel);

  // Title and tagline removed per design

  // Level controls (prev/next)
  const levelRow = document.createElement('div');
  levelRow.style.display = 'flex';
  levelRow.style.justifyContent = 'center';
  levelRow.style.alignItems = 'center';
  levelRow.style.gap = '12px';
  levelRow.innerHTML = `
    ${Button({ id: 'lh-level-down', label: '◀', size: 'small', attrs: { 'aria-label': 'Previous level' } })}
    <span id="lh-level-label">Level ${currentLevel}</span>
    ${Button({ id: 'lh-level-up', label: '▶', size: 'small', attrs: { 'aria-label': 'Next level' } })}
  `;
  const levelLabel = levelRow.querySelector('#lh-level-label');
  const levelDownBtn = levelRow.querySelector('#lh-level-down');
  const levelUpBtn = levelRow.querySelector('#lh-level-up');
  try { if (levelDownBtn) levelDownBtn.textContent = '◀'; if (levelUpBtn) levelUpBtn.textContent = '▶'; } catch {}
  function refreshLevelUI(){
    if (levelLabel) levelLabel.textContent = `Level ${currentLevel}`;
    if (levelDownBtn) levelDownBtn.style.visibility = currentLevel > 1 ? '' : 'hidden';
    if (levelUpBtn) levelUpBtn.style.visibility = currentLevel < maxLevel ? '' : 'hidden';
  }

  // Actions
  const actions = document.createElement('div'); actions.className = 'actions';
  actions.style.display = 'flex';
  actions.style.justifyContent = 'center';
  actions.style.gap = '12px';
  actions.style.marginTop = '16px';
  actions.innerHTML = `${Button({ id: 'lh-new', label: 'New Game' })} ${Button({ id: 'lh-reset', label: 'Reset', variant: 'secondary' })}`;

  // Stats (below level selector)
  const stats = document.createElement('div'); stats.className = 'lh-stats';
  stats.style.textAlign = 'center';
  stats.style.margin = '6px 0 10px';
  stats.innerHTML = `Moves: <strong id="lh-moves">0</strong> / <span id="lh-cap">--</span> <span id="lh-minon" style="margin-left:16px">Keep <strong id="lh-keep">0</strong> lights on!</span>`;
  { const e = stats.querySelector('#lh-minon'); if (e && (0.15 <= 0)) e.style.display = 'none'; }

  // Grid
  let grid = makeGrid({ size: currentSize, getState: () => board, onCell: (idx) => {
    applyMove(board, currentSize, idx);
    moves++;
    updateStats();
    grid.paint();
    if (isSolved(board)) return onWin();
    if (MIN_ON_RATIO > 0 && countOn(board) < minOnCount) return onMinOnFail();
    if (moves >= moveCap) return onOutOfMoves();
  }});
  try { grid.layout(); } catch {}
  grid.paint();

  // Order: level selector, stats, grid, actions
  wrap.append(levelRow, stats, grid.root, actions);
  frag.append(wrap);

  function updateStats(){
    const mv = wrap.querySelector('#lh-moves');
    const cap = wrap.querySelector('#lh-cap');
    const keep = wrap.querySelector('#lh-keep');
    if (mv) mv.textContent = String(moves);
    if (cap) cap.textContent = String(moveCap);
    if (keep) keep.textContent = String(minOnCount);
  }
  function computeCaps(){
    moveCap = Math.max(8, Math.ceil(intendedSteps(currentLevel, currentSize) * 1.5));
    minOnCount = Math.ceil(currentSize * currentSize * MIN_ON_RATIO);
    updateStats();
  }

  function updateUrl(replace = true) {
    const sig = makeSig(seed, currentLevel);
    const hash = `#/gallery/light-houses?level=${encodeURIComponent(currentLevel)}&seed=${encodeURIComponent(seed || '')}&sig=${encodeURIComponent(sig)}`;
    try {
      if (replace && history.replaceState) history.replaceState(null, '', hash);
      else location.hash = hash;
    } catch {}
  }

  function onWin() {
    const body = document.createElement('div'); body.className = 'stack';
    body.style.textAlign = 'center';
    const p = document.createElement('p'); p.textContent = 'You lit them all!'; body.append(p);
    const atMax = currentLevel === maxLevel;
    const canAdvance = atMax && naturalEntry && !oneClick;
    const nextBtn = { label: canAdvance ? 'Play Next' : 'Play Again', onClick: () => {
      if (canAdvance) { maxLevel++; saveMaxLevel(maxLevel); currentLevel = maxLevel; saveLastLevel(currentLevel); }
      startNew();
    }};
    openModal({ title: 'Well done!', titleAlign: 'center', body, actionsAlign: 'center', actions: [nextBtn] });
  }

  function onOutOfMoves(){
    const body = document.createElement('div'); body.className = 'stack';
    body.style.textAlign = 'center';
    body.innerHTML = `<p>Out of Moves</p>`;
    openModal({
      title: 'Game Over',
      body,
      titleAlign: 'center',
      actionsAlign: 'center',
      actions: [{ label: 'Try Again', onClick: () => { moves = 0; startNew(); } }],
      onClose: () => { moves = 0; startNew(); },
    });
  }
  function onMinOnFail(){
    const body = document.createElement('div'); body.className = 'stack';
    body.style.textAlign = 'center';
    body.innerHTML = `<p>Too many lights went dark.</p>`;
    openModal({
      title: 'Game Over',
      body,
      titleAlign: 'center',
      actionsAlign: 'center',
      actions: [{ label: 'Try Again', onClick: () => { moves = 0; startNew(); } }],
      onClose: () => { moves = 0; startNew(); },
    });
  }

  function startNew() {
    const s = levelToSize(currentLevel, 9);
    const gen = generate(s, currentLevel, randomEngineSeed());
    puzzleBoard = new Uint8Array(gen.board);
    board = new Uint8Array(puzzleBoard);
    seed = encodeSeedFromBoard(puzzleBoard);
    saveLastSeed(seed);
    sigParam = makeSig(seed, currentLevel);
    naturalEntry = true;
    moves = 0; updateStats();
    if (s !== currentSize) {
      currentSize = s;
      const newGrid = makeGrid({ size: currentSize, getState: () => board, onCell: (idx) => {
        applyMove(board, currentSize, idx);
        moves++;
        updateStats();
        grid.paint();
        if (isSolved(board)) return onWin();
        if (MIN_ON_RATIO > 0 && countOn(board) < minOnCount) return onMinOnFail();
        if (moves >= moveCap) return onOutOfMoves();
      }});
      wrap.replaceChild(newGrid.root, grid.root); grid = newGrid; try { grid.layout(); } catch {}
    }
    grid.paint(); refreshLevelUI();
    computeCaps();
    updateUrl(true);
  }

  // Events
  queueMicrotask(() => {
    try { grid.layout(); grid.paint(); } catch {}
    window.addEventListener('resize', () => { try { grid.layout(); grid.paint(); } catch {} });
    const newBtn = wrap.querySelector('#lh-new'); const resetBtn = wrap.querySelector('#lh-reset');
    newBtn?.addEventListener('click', () => { startNew(); });
    resetBtn?.addEventListener('click', () => { board = new Uint8Array(puzzleBoard); moves = 0; updateStats(); grid.paint(); });
    levelDownBtn?.addEventListener('click', () => { if (currentLevel > 1) { currentLevel--; saveLastLevel(currentLevel); startNew(); } });
    levelUpBtn?.addEventListener('click', () => { if (currentLevel < maxLevel) { currentLevel++; saveLastLevel(currentLevel); startNew(); } });
  });

  computeCaps();
  refreshLevelUI();
  updateUrl(true);
  return frag;
}

export function render() {
  const frag = document.createDocumentFragment();
  const chrome = document.createElement('section'); chrome.className = 'stack';
  const tabs = document.createElement('div'); tabs.className = 'pips-tabs';
  const demoBtn = document.createElement('a'); demoBtn.href = '#'; demoBtn.textContent = 'Demo'; demoBtn.className = 'button';
  const srcBtn = document.createElement('a'); srcBtn.href = '#'; srcBtn.textContent = 'Source'; srcBtn.className = 'button button-secondary';
  tabs.append(demoBtn, srcBtn);
  const demoPane = document.createElement('div'); demoPane.className = 'gallery-demo-pane';
  const srcPane = document.createElement('div'); srcPane.className = 'pips-src-pane'; srcPane.style.display = 'none';
  const gameFrag = renderGame(); demoPane.append(gameFrag);
  chrome.append(tabs, demoPane, srcPane); frag.append(chrome);
  const showDemo = () => { srcPane.style.display = 'none'; demoPane.style.display = ''; demoBtn.className = 'button'; srcBtn.className = 'button button-secondary'; };
  const showSrc = () => { demoPane.style.display = 'none'; srcPane.style.display = ''; demoBtn.className = 'button button-secondary'; srcBtn.className = 'button'; renderLhSourceBrowser(srcPane); };
  demoBtn.addEventListener('click', function(e){ e.preventDefault(); showDemo(); });
  srcBtn.addEventListener('click', function(e){ e.preventDefault(); showSrc(); });
  showDemo();
  return frag;
}

const LH_FILES = ['page.js','engine.js','grid.js','state.js'];

function renderLhSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div'); list.className = 'stack';
  const note = document.createElement('p'); note.textContent = 'Source files under src/views/gallery/lighthouses/';
  list.append(note);
  LH_FILES.forEach(function(path){
    const pre = document.createElement('pre'); const code = document.createElement('code'); code.textContent = 'Loading.'; pre.append(code);
    const item = Accordion({ summary: path, content: pre });
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try { const res = await fetch('src/views/gallery/lighthouses/' + path, { cache: 'no-cache' }); const txt = await res.text(); code.textContent = txt; }
      catch (e) { code.textContent = 'Unable to load file in this context.'; }
    }, { once: true });
    list.append(item);
  });
  host.append(list);
}


