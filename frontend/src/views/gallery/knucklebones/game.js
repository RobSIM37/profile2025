import { openModal } from '../../../components/ui/modal.js';
// import { HudStat } from '../../../components/ui/hudStat.js';
import { Button } from '../../../components/ui/button.js';
import { rngFromSeed, rollD6, createEmptyBoard, placeDie, isBoardFull, scoreBoard, getValidColumns, getOpenRow, AI_PROFILES, chooseAiMove } from './engine.js';
import { setAppSolid } from '../../../lib/appShell.js';

export const meta = {
  title: 'Knuckle Bones',
  description: 'Two-player dice duels (local or vs AI)',
};

export function render() {
  const frag = document.createDocumentFragment();
  setAppSolid(true);
  // Chrome with Demo/Source tabs
  const chrome = document.createElement('section');
  chrome.className = 'stack';
  const tabs = document.createElement('div');
  tabs.className = 'pips-tabs';
  tabs.style.marginBottom = '0';
  const demoBtn = document.createElement('a'); demoBtn.href = '#'; demoBtn.textContent = 'Demo'; demoBtn.className = 'button button-subtle';
  const srcBtn = document.createElement('a'); srcBtn.href = '#'; srcBtn.textContent = 'Source'; srcBtn.className = 'button button-secondary button-subtle';
  tabs.append(demoBtn, srcBtn);
  const demoPane = document.createElement('div'); demoPane.className = 'gallery-demo-pane';
  const srcPane = document.createElement('div'); srcPane.className = 'pips-src-pane'; srcPane.style.display = 'none';

  // Load config (autostart like Knock It Off). Prefer kb:chosen payload.
  let cfg = null;
  try {
    const chosenRaw = sessionStorage.getItem('kb:chosen');
    if (chosenRaw && chosenRaw[0] === '[') {
      const chosen = JSON.parse(chosenRaw);
      const players = chosen.slice(0,2).map((c, i) => ({
        type: c.kind === 'human' ? 'human' : `ai:${c.level||'balanced'}`,
        name: c.name || (c.kind==='human' ? `Player ${i+1}` : 'CPU'),
      }));
      cfg = { players };
    }
  } catch {}
  if (!cfg) {
    try {
      const raw = sessionStorage.getItem('kb:config');
      if (raw) cfg = JSON.parse(raw);
    } catch {}
  }
  if (!cfg) {
    // bounce back to setup
    window.location.hash = '#/gallery/knuckle-bones';
    return frag;
  }

  // Seeded RNG (for reproducible roll sequences via hash ?seed=...)
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const seed = params.get('seed') || `${Date.now()}`;
  const rng = rngFromSeed(seed);

  // State
  const boards = [createEmptyBoard(), createEmptyBoard()];
  const names = [cfg.players?.[0]?.name || 'Player 1', cfg.players?.[1]?.name || 'Player 2'];
  const types = [cfg.players?.[0]?.type || 'human', cfg.players?.[1]?.type || 'human'];
  // Randomize starting player: 50/50 chance player 2 goes first
  let turn = (rng() < 0.5) ? 0 : 1; // 0 or 1
  let currentRoll = rollD6(rng);
  let selCol = 0; // keyboard focus column for current player

  // Root
  const wrap = document.createElement('section');
  wrap.className = 'stack';
  // Title is rendered in the top bar; omit duplicate header here

  // No global HUD row; scores live next to player names

  // Boards centered; roll panel positioned outside normal flow on the right
  const layout = document.createElement('div');
  layout.style.position = 'relative';
  layout.style.display = 'block';
  layout.style.margin = '0 auto';

  const leftCol = document.createElement('div');
  leftCol.className = 'stack';
  leftCol.style.margin = '0 auto';
  const boardEls = [makeBoard(0), makeBoard(1)];
  // Opponent (index 1) above player (index 0)
  leftCol.append(boardEls[1].root, boardEls[0].root);

  const diceCol = document.createElement('div');
  diceCol.className = 'stack';
  diceCol.style.position = 'absolute';
  diceCol.style.right = '0';
  diceCol.style.top = '0';
  // No visible title for the cup
  const cup = document.createElement('div');
  const CUP_SIZE = 120;
  cup.style.width = CUP_SIZE + 'px';
  cup.style.height = CUP_SIZE + 'px';
  cup.style.borderRadius = '999px';
  cup.style.border = '5px solid var(--primary)';
  cup.style.boxShadow = 'inset 0 0 0 2px rgba(255,255,255,0.15)';
  cup.style.position = 'relative';
  cup.style.overflow = 'hidden';
  cup.style.margin = '0 auto';
  cup.style.background = 'var(--bg-elev)';
  let dieFace = makeDieFace(currentRoll, 44);
  dieFace.root.style.position = 'absolute';
  dieFace.root.style.left = '50%';
  dieFace.root.style.top = '50%';
  dieFace.root.style.transform = 'translate(-50%, -50%)';
  dieFace.root.setAttribute('draggable','false');
  cup.appendChild(dieFace.root);
  // rAF handle for cup roll animation
  let rollReq = 0;
  function clearCup(){
    // Stop any ongoing roll animation and reset cup position
    try { cancelAnimationFrame(rollReq); } catch {}
    diceCol.style.transform = '';
    // Remove the die face so the cup appears empty
    try {
      const parentNow = dieFace.root?.parentElement;
      if (parentNow) parentNow.removeChild(dieFace.root);
    } catch {}
    try { dieFace.root?.setAttribute('draggable','false'); } catch {}
  }

  function showDieCentered(val, draggable = false){
    try { cancelAnimationFrame(rollReq); } catch {}
    diceCol.style.transform = '';
    try {
      const parentNow = dieFace.root?.parentElement;
      if (parentNow) parentNow.removeChild(dieFace.root);
    } catch {}
    dieFace = makeDieFace(val, 44);
    dieFace.root.style.position = 'absolute';
    dieFace.root.style.left = '50%';
    dieFace.root.style.top = '50%';
    dieFace.root.style.transform = 'translate(-50%, -50%)';
    dieFace.root.setAttribute('draggable', draggable ? 'true' : 'false');
    dieFace.root.style.cursor = draggable ? 'grab' : 'default';
    dieFace.root.addEventListener('dragstart', (e) => {
      if (dieFace.root.getAttribute('draggable') !== 'true') { e.preventDefault(); return; }
      try { e.dataTransfer?.setData('text/kb-die', String(currentRoll)); } catch {}
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
      document.body.style.cursor = 'grabbing';
      dieFace.root.style.cursor = 'grabbing';
    });
    dieFace.root.addEventListener('dragend', () => { document.body.style.cursor=''; dieFace.root.style.cursor='grab'; });
    cup.appendChild(dieFace.root);
  }
  diceCol.append(cup);
  layout.append(leftCol, diceCol);

  // Controls
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.justifyContent = 'center';
  controls.style.gap = '12px';
  const restartWrap = document.createElement('div');
  restartWrap.innerHTML = Button({ label: 'Restart', id: 'kb-restart', variant: 'secondary' });
  const restartBtn = restartWrap.firstElementChild;
  restartBtn.addEventListener('click', () => restart());
  controls.append(restartWrap);

  wrap.append(layout);
  demoPane.append(wrap);
  // Top bar with left-justified title and centered tabs
  const topbar = document.createElement('div');
  topbar.style.position = 'relative';
  topbar.style.display = 'flex';
  topbar.style.justifyContent = 'center';
  topbar.style.alignItems = 'center';
  const titleLinkTop = document.createElement('a');
  titleLinkTop.href = '#/gallery/knuckle-bones'; titleLinkTop.textContent = 'Knuckle Bones';
  titleLinkTop.style.position = 'absolute'; titleLinkTop.style.left = '0'; titleLinkTop.style.top = '50%'; titleLinkTop.style.transform = 'translateY(-50%)';
  titleLinkTop.style.color = 'inherit'; titleLinkTop.style.textDecoration = 'none';
  titleLinkTop.style.fontWeight = '800'; titleLinkTop.style.fontSize = '1.6rem';
  titleLinkTop.addEventListener('mouseover', ()=> titleLinkTop.style.textDecoration = 'underline');
  titleLinkTop.addEventListener('mouseout', ()=> titleLinkTop.style.textDecoration = 'none');
  topbar.append(titleLinkTop, tabs);
  chrome.append(topbar, demoPane, srcPane);
  frag.append(chrome);

  updateScores();
  updateTurnHUD();
  updateBoards();
  // Ensure cup starts next to the active grid
  try { positionCup(); } catch {}
  requestAnimationFrame(() => { try { positionCup(); } catch {} });
  animateRoll(currentRoll).then(() => { maybeAiAct(); });
  // Reposition cup on resize
  window.addEventListener('resize', () => { try { positionCup(); } catch {} });

  // Keyboard: left/right to change col, Enter to place
  window.addEventListener('keydown', onKey);
  function onKey(e){
    const humanTurn = types[turn].startsWith('human');
    if (!humanTurn) return;
    if (e.key === 'ArrowLeft') { selCol = (selCol + 2) % 3; updateHighlight(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { selCol = (selCol + 1) % 3; updateHighlight(); e.preventDefault(); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') { selCol = parseInt(e.key, 10) - 1; updateHighlight(); e.preventDefault(); }
    else if (e.key === 'Enter') { tryPlace(selCol); e.preventDefault(); }
  }

  function restart(){
    try { sessionStorage.removeItem('kb:config'); } catch {}
    window.location.hash = '#/gallery/knuckle-bones';
  }

  function makeBoard(idx){
    const container = document.createElement('div');
    // Avoid global .stack auto-margins inside a board; we manage spacing explicitly
    container.className = '';
    const title = document.createElement('h3');
    title.textContent = names[idx];
    title.style.textAlign = 'center';
    // score badge next to title
    const score = document.createElement('span');
    score.textContent = '0';
    score.style.display = 'inline-block';
    score.style.minWidth = '36px';
    score.style.textAlign = 'center';
    score.style.border = '1px solid var(--border)';
    score.style.borderRadius = '10px';
    score.style.padding = '4px 8px';
    score.style.background = 'var(--bg-elev)';
    const nameRow = document.createElement('div');
    nameRow.style.display = 'flex';
    nameRow.style.justifyContent = 'space-between';
    nameRow.style.alignItems = 'center';
    nameRow.style.gap = '12px';
    nameRow.style.width = '192px';
    // Symmetric spacing so top gap (to upper grid) equals bottom gap (to lower grid)
    nameRow.style.margin = '10px auto';
    nameRow.append(title, score);
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3, 56px)';
    grid.style.gridTemplateRows = 'repeat(3, 56px)';
    grid.style.gap = '6px';
    grid.style.justifyContent = 'center';

    const cells = [];
    for (let r=0;r<3;r++){
      for (let c=0;c<3;c++){
        const cell = document.createElement('button');
        cell.className = 'button';
        cell.style.minWidth = '56px';
        cell.style.minHeight = '56px';
        cell.style.padding = '0';
        cell.style.fontWeight = '700';
        // Center SVG nicely within the cell
        cell.style.display = 'grid';
        cell.style.placeItems = 'center';
        cell.setAttribute('aria-label', `Row ${r+1} Column ${c+1}`);
        const colIdx = c; // for click handler referencing column
        cell.addEventListener('click', () => {
          if (turn !== idx) return; // can only play on own board
          tryPlace(colIdx);
        });
        // Drag-and-drop placement support
        cell.addEventListener('dragover', (e) => {
          const types = e.dataTransfer?.types || [];
          const hasDie = Array.from(types).includes('text/kb-die');
          if (!hasDie) return;
          if (turn !== idx) return; // only current player's board
          if (!getValidColumns(boards[idx]).includes(colIdx)) return;
          if (boards[idx][colIdx][r] != null) return; // only empty cell
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });
        cell.addEventListener('drop', (e) => {
          const data = e.dataTransfer?.getData('text/kb-die');
          if (!data) return;
          e.preventDefault();
          if (turn !== idx) return;
          if (!getValidColumns(boards[idx]).includes(colIdx)) return;
          if (boards[idx][colIdx][r] != null) return;
          tryPlace(colIdx, r);
        });

        cells.push(cell);
        grid.append(cell);
      }
    }

    // For AI (idx 1), place grid first then name row to keep names between grids
    if (idx === 1) container.append(grid, nameRow); else container.append(nameRow, grid);
    return { root: container, cells, title, grid, score, nameRow };
  }

  function tryPlace(col, row){
    const my = boards[turn];
    const op = boards[1 - turn];
    if (!getValidColumns(my).includes(col)) return; // column full
    const res = placeDie(my, op, col, currentRoll, row);
    if (!res.ok) return;
    // Advance turn and roll
    const prevWasAI = types[turn].startsWith('ai:');
    currentRoll = rollD6(rng);
    turn = 1 - turn;
    updateScores();
    updateTurnHUD();
    updateBoards();
    // End condition: if either board full, end game immediately
    if (isBoardFull(boards[0]) || isBoardFull(boards[1])) {
      onGameOver();
      return;
    }
    if (types[turn].startsWith('ai:')) {
      // Move cup to AI grid immediately, then animate and act
      positionCup();
      animateRoll(currentRoll).then(() => { maybeAiAct(); });
    } else {
      if (prevWasAI) {
        // Keep cup at previous player during pause; show empty cup
        clearCup();
        setTimeout(() => {
          // After pause, move cup to human grid and start roll
          positionCup();
          showDieCentered(currentRoll, false);
          animateRoll(currentRoll);
        }, 1000);
      } else {
        positionCup();
        animateRoll(currentRoll);
      }
    }
  }

  function maybeAiAct(){
    const t = types[turn];
    if (!t.startsWith('ai:')) { updateHighlight(); return; }
    const profKey = t.split(':')[1] || 'balanced';
    const profile = AI_PROFILES[profKey] || AI_PROFILES.balanced;
    // Small delay for UX (show roll animation on AI turns)
    setTimeout(() => {
      const my = boards[turn];
      const op = boards[1 - turn];
      const move = chooseAiMove({ myBoard: my, oppBoard: op, value: currentRoll, profile });
      if (move == null) {
        // no moves? shouldn't happen unless board full
        onGameOver();
        return;
      }
      tryPlace(move);
    }, 600);
  }

  function updateBoards(){
    // Render both boards to text
    for (let idx=0; idx<2; idx++){
      const b = boards[idx];
      const els = boardEls[idx].cells;
      for (let r=0;r<3;r++) for (let c=0;c<3;c++){
        const v = b[c][r];
        const i = r*3 + c;
        const btn = els[i];
        btn.innerHTML = '';
        if (v != null) {
          const die = makeDieFace(v, 54); // slightly larger but still centered
          btn.appendChild(die.root);
        }
        btn.className = 'button' + (v == null ? ' button-secondary' : '');
        btn.disabled = (idx !== turn) || v != null; // only empty cells clickable, but we use column click semantics
      }
    }
    updateHighlight();
  }

  function updateHighlight(){
    // Indicate selectable columns for the current player
    const idx = turn;
    const validList = getValidColumns(boards[idx]);
    const validCols = new Set(validList);
    if (!validCols.has(selCol) && validList.length) selCol = validList[0];
    const els = boardEls[idx].cells;
    for (let r=0;r<3;r++) for (let c=0;c<3;c++){
      const i = r*3 + c;
      const btn = els[i];
      const isValid = validCols.has(c);
      btn.disabled = boards[idx][c][r] != null || !isValid;
      // Remove column highlight rings; rely on enabled state only
      btn.style.outline = '';
    }
    // No HUD roll display anymore
  }

  function updateScores(){
    const s1 = scoreBoard(boards[0]);
    const s2 = scoreBoard(boards[1]);
    if (boardEls[0]?.score) boardEls[0].score.textContent = String(s1);
    if (boardEls[1]?.score) boardEls[1].score.textContent = String(s2);
  }

  // Turn HUD no longer repositions the cup; explicit calls control timing
  function updateTurnHUD(){ }

  function positionCup(){
    // Position cup 200px to the right of the VIEW (layout) center horizontally,
    // and vertically centered on the active player's grid.
    const cur = boardEls[turn]; if (!cur) return;
    const gridEl = cur.grid;
    try {
      const layoutRect = layout.getBoundingClientRect();
      const gridRect = gridEl.getBoundingClientRect();
      const topPx = (gridRect.top - layoutRect.top) + Math.max(0, (gridRect.height - CUP_SIZE) / 2);
      // Horizontal: center of layout + 200px, minus half cup size
      let leftPx = (layoutRect.width / 2) + 200 - (CUP_SIZE / 2);
      // Clamp inside layout bounds as safety
      const maxLeft = layoutRect.width - CUP_SIZE;
      if (leftPx > maxLeft) leftPx = maxLeft;
      if (leftPx < 0) leftPx = 0;
      diceCol.style.position = 'absolute';
      diceCol.style.top = `${Math.round(topPx)}px`;
      diceCol.style.left = `${Math.round(leftPx)}px`;
      diceCol.style.right = '';
    } catch {
      // If layout not ready, retry on next frame
      requestAnimationFrame(() => { try { positionCup(); } catch {} });
    }
  }

function animateRoll(value){
    // Bouncing die inside the cup: jitter position and pips, then settle
    // Returns a Promise that resolves when the die settles.
    return new Promise((resolve) => {
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const setDie = (val) => {
        const parent = dieFace.root.parentElement;
        if (parent) parent.removeChild(dieFace.root);
        dieFace = makeDieFace(val, 44);
        dieFace.root.style.position = 'absolute';
        dieFace.root.style.left = '50%';
        dieFace.root.style.top = '50%';
        dieFace.root.style.transform = 'translate(-50%, -50%)';
        dieFace.root.addEventListener('dragstart', (e) => {
          if (dieFace.root.getAttribute('draggable') !== 'true') { e.preventDefault(); return; }
          try { e.dataTransfer?.setData('text/kb-die', String(currentRoll)); } catch {}
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
          document.body.style.cursor = 'grabbing';
          dieFace.root.style.cursor = 'grabbing';
        });
        dieFace.root.addEventListener('dragend', () => { document.body.style.cursor=''; dieFace.root.style.cursor='grab'; });
        if (parent) parent.appendChild(dieFace.root);
      };

      dieFace.root.setAttribute('draggable', 'false');
      if (prefersReduced) { setDie(value); dieFace.root.setAttribute('draggable','true'); dieFace.root.style.cursor='grab'; resolve(); return; }

      const start = performance.now();
      const dur = 250 + Math.floor(rng()*1750);
      const amp = 10;
      const freq = 0.006 + rng()*0.012;
      const R = 120/2 - 14; // based on CUP_SIZE

      const step = () => {
        const now = performance.now();
        const t = now - start;
        // wobble dice column container slightly
        const x = Math.sin(now*freq) * amp;
        diceCol.style.transform = `translateX(${x}px)`;
        // temporary face and position
        setDie(1 + Math.floor(rng()*6));
        const ang = rng()*Math.PI*2; const rad = Math.sqrt(rng())*R;
        const dx = Math.cos(ang)*rad; const dy = Math.sin(ang)*rad;
        dieFace.root.style.left = `${60 + dx}px`;
        dieFace.root.style.top = `${60 + dy}px`;
        dieFace.root.style.transform = 'translate(-50%, -50%)';
        if (t < dur) { rollReq = requestAnimationFrame(step); }
        else {
          diceCol.style.transform = '';
          setDie(value);
          dieFace.root.style.left = '50%'; dieFace.root.style.top = '50%';
          dieFace.root.style.transform = 'translate(-50%, -50%)';
          dieFace.root.setAttribute('draggable','true'); dieFace.root.style.cursor='grab';
          resolve();
        }
      };
      cancelAnimationFrame(rollReq);
      rollReq = requestAnimationFrame(step);
    });
  }
  

  function makeDieFace(value, size=56){
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', '2'); rect.setAttribute('y', '2');
    rect.setAttribute('width', String(size-4)); rect.setAttribute('height', String(size-4));
    rect.setAttribute('rx', String(Math.max(4, Math.floor(size*0.18))));
    rect.setAttribute('fill', '#ffffff');
    rect.setAttribute('stroke', '#111111');
    rect.setAttribute('stroke-width', '2');
    svg.appendChild(rect);
    const pips = [];
    const r = Math.max(3, Math.floor(size*0.08));
    const coords = {
      tl: [size*0.28, size*0.28],
      tm: [size*0.5 , size*0.28],
      tr: [size*0.72, size*0.28],
      ml: [size*0.28, size*0.5 ],
      mm: [size*0.5 , size*0.5 ],
      mr: [size*0.72, size*0.5 ],
      bl: [size*0.28, size*0.72],
      bm: [size*0.5 , size*0.72],
      br: [size*0.72, size*0.72],
    };
    function add(name){ const [cx,cy]=coords[name]; const c=document.createElementNS(NS,'circle'); c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(r)); c.setAttribute('fill','#111111'); svg.appendChild(c); pips.push(c); }
    if (value===1) add('mm');
    else if (value===2){ add('tl'); add('br'); }
    else if (value===3){ add('tl'); add('mm'); add('br'); }
    else if (value===4){ add('tl'); add('tr'); add('bl'); add('br'); }
    else if (value===5){ add('tl'); add('tr'); add('mm'); add('bl'); add('br'); }
    else if (value===6){ add('tl'); add('ml'); add('bl'); add('tr'); add('mr'); add('br'); }
    const wrap = document.createElement('div');
    wrap.style.width = `${size}px`; wrap.style.height = `${size}px`; wrap.style.display = 'grid'; wrap.style.placeItems = 'center';
    wrap.appendChild(svg);
    return { root: wrap, svg, rect, pips };
  }

  // New game-over handler that restarts with same options
  function onGameOver(){
    window.removeEventListener('keydown', onKey);
    const s1 = scoreBoard(boards[0]);
    const s2 = scoreBoard(boards[1]);
    const title = s1 === s2 ? 'Tie Game' : `${s1 > s2 ? names[0] : names[1]} Wins!`;
    const body = document.createElement('div');
    const p = document.createElement('p'); p.textContent = `${names[0]}: ${s1} — ${names[1]}: ${s2}`; body.append(p);
    const chosen = types.map((t,i)=> t==='human' ? { kind: 'human', name: names[i] } : { kind: 'ai', level: (t.split(':')[1]||'balanced'), name: names[i] });
    let quitting = false;
    const restart = () => {
      try { sessionStorage.setItem('kb:chosen', JSON.stringify(chosen)); } catch {}
      // Force rerender by changing hash (router strips query, but hashchange still fires)
      const seed = Date.now();
      location.hash = `#/gallery/knuckle-bones/game?seed=${seed}`;
    };
    const again = { label: 'Play Again', onClick: restart };
    const quit = { label: 'Quit', variant: 'secondary', onClick: () => { quitting = true; try { sessionStorage.removeItem('kb:chosen'); sessionStorage.removeItem('kb:config'); } catch {}; location.hash = '#/gallery/knuckle-bones'; } };
    openModal({ title, body, actions: [again, quit], actionsAlign: 'center', titleAlign: 'center', onClose: () => { if (!quitting) restart(); } });
  }

  function endGame(){
    window.removeEventListener('keydown', onKey);
    const s1 = scoreBoard(boards[0]);
    const s2 = scoreBoard(boards[1]);
    const title = s1 === s2 ? 'Tie Game' : `${s1 > s2 ? names[0] : names[1]} Wins!`;
    const body = document.createElement('div');
    const p = document.createElement('p'); p.textContent = `${names[0]}: ${s1} — ${names[1]}: ${s2}`; body.append(p);
    const chosen = types.map((t,i)=> t==='human' ? { kind: 'human', name: names[i] } : { kind: 'ai', level: (t.split(':')[1]||'balanced'), name: names[i] });
    const again = { label: 'Play Again', onClick: () => { try { sessionStorage.setItem('kb:chosen', JSON.stringify(chosen)); } catch {}; const seed = Date.now(); location.hash = `#/gallery/knuckle-bones/game?seed=${seed}`; } };
    const quit = { label: 'Quit', variant: 'secondary', onClick: () => { try { sessionStorage.removeItem('kb:chosen'); sessionStorage.removeItem('kb:config'); } catch {}; location.hash = '#/gallery/knuckle-bones'; } };
    openModal({ title, body, actions: [again, quit], actionsAlign: 'center', titleAlign: 'center' });
  }

  // Tabs wiring
  const showDemo = () => {
    srcPane.style.display = 'none';
    demoPane.style.display = '';
    demoBtn.className = 'button button-subtle';
    srcBtn.className = 'button button-secondary button-subtle';
  };
  const showSrc = () => {
    demoPane.style.display = 'none';
    srcPane.style.display = '';
    demoBtn.className = 'button button-secondary button-subtle';
    srcBtn.className = 'button button-subtle';
    renderKbSourceBrowser(srcPane);
  };
  demoBtn.addEventListener('click', (e)=>{ e.preventDefault(); showDemo(); });
  srcBtn.addEventListener('click', (e)=>{ e.preventDefault(); showSrc(); });
  showDemo();

  return frag;
}

const KB_FILES = [ 'page.js', 'start.js', 'game.js', 'howto.js', 'engine.js' ];
function renderKbSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/knucklebones/';
  list.append(note);
  KB_FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary'); sum.textContent = path; item.append(sum);
    const pre = document.createElement('pre'); const code = document.createElement('code'); code.textContent = 'Loading…'; pre.append(code); item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try { const res = await fetch('src/views/gallery/knucklebones/' + path, { cache: 'no-cache' }); const txt = await res.text(); code.textContent = txt; }
      catch (e) { code.textContent = 'Unable to load file in this context.'; }
    }, { once: true });
    list.append(item);
  });
  host.append(list);
}

