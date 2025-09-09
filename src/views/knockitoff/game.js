import { MASK_2P, MASK_4P, COLORS, maskToGrid } from './masks.js';
import { createGame, nextTurn } from './state.js';
import { Button } from '../../components/ui/button.js';
import { FaceIcon } from '../../components/ui/faceIcon.js';
import { openModal } from '../../components/ui/modal.js';
import { setAppSolid } from '../../lib/appShell.js';

export const meta = {
  title: 'Knock It Off!',
  description: 'Placement mask preview for setup (2P or 3/4P)',
};

export function render() {
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack kio-wrap';
  setAppSolid(true);

  wrap.innerHTML = `
    <h2>Knock It Off!</h2>
    <section class="kio-start stack" id="kio-start">
      <div class="kio-controls">
        <div class="kio-field">
          <label>Players</label>
          <div class="kio-players-grid">
            <div class="kio-row">
              <span class="kio-row-label">#1</span>
              <select class="kio-sel" id="kio-p1">
                <option value="human" selected>Human</option>
                <option value="ai-easy">Easy AI</option>
                <option value="ai-medium">Medium AI</option>
                <option value="ai-hard">Hard AI</option>
              </select>
              <input class="kio-name" id="kio-n1" type="text" value="Human 1" />
            </div>
            <div class="kio-row">
              <span class="kio-row-label">#2</span>
              <select class="kio-sel" id="kio-p2">
                <option value="human">Human</option>
                <option value="ai-easy">Easy AI</option>
                <option value="ai-medium" selected>Medium AI</option>
                <option value="ai-hard">Hard AI</option>
              </select>
              <input class="kio-name" id="kio-n2" type="text" value="Human 2" />
            </div>
            <div class="kio-row">
              <span class="kio-row-label">#3</span>
              <select class="kio-sel" id="kio-p3">
                <option value="human">Human</option>
                <option value="ai-easy">Easy AI</option>
                <option value="ai-medium">Medium AI</option>
                <option value="ai-hard">Hard AI</option>
                <option value="none" selected>None</option>
              </select>
              <input class="kio-name" id="kio-n3" type="text" value="Human 3" />
            </div>
            <div class="kio-row" id="kio-row4" style="display:none;">
              <span class="kio-row-label">#4</span>
              <select class="kio-sel" id="kio-p4">
                <option value="human">Human</option>
                <option value="ai-easy">Easy AI</option>
                <option value="ai-medium">Medium AI</option>
                <option value="ai-hard">Hard AI</option>
                <option value="none" selected>None</option>
              </select>
              <input class="kio-name" id="kio-n4" type="text" value="Human 4" />
            </div>
          </div>
        </div>
        <div class="kio-buttons">${Button({ id: 'kio-new', label: 'New Game' })}</div>
        <div class="kio-buttons kio-how">${Button({ id: 'kio-how', label: 'How To Play', variant: 'secondary' })}</div>
      </div>
    </section>

    <section class="stack kio-setup hidden" id="kio-setup">
      <div class="kio-board" aria-label="8x8 board" role="grid"></div>
      <div class="kio-racks" id="kio-racks"></div>
      <div class="kio-buttons">${Button({ id: 'kio-back', label: 'Back', variant: 'secondary' })}</div>
    </section>

    <section class="stack kio-rules hidden" id="kio-rules">
      <h3>How To Play</h3>
      <ol class="kio-list">
        <li>Each player secretly places their pieces on their colored dots (1 Frowny, 3 Smiley, the rest Blank).</li>
        <li>On your turn, choose one of your pieces and a direction (orthogonal or diagonal).</li>
        <li>Your piece slides in that direction until it hits another piece, then stops; the hit piece continues in the same direction. Repeat until a piece is knocked off the board.</li>
        <li>Your move must knock off an opponent’s piece — you may not eliminate your own piece.</li>
        <li>Lose your Frowny → you are out. Lose all three Smileys → you win!</li>
      </ol>
      <div class="kio-examples">
        <figure>
          ${exampleSVG('orth','before')}
          <figcaption>Before</figcaption>
        </figure>
        <figure>
          ${exampleSVG('orth','after')}
          <figcaption>After</figcaption>
        </figure>
        <figure>
          ${exampleSVG('diag','before')}
          <figcaption>Before</figcaption>
        </figure>
        <figure>
          ${exampleSVG('diag','after')}
          <figcaption>After</figcaption>
        </figure>
      </div>
      <div class="kio-buttons">${Button({ id: 'kio-rules-back', label: 'Back', variant: 'secondary' })}</div>
    </section>
  `;

  frag.append(wrap);

  const startEl = wrap.querySelector('#kio-start');
  const setupEl = wrap.querySelector('#kio-setup');
  const rulesEl = wrap.querySelector('#kio-rules');
  const boardEl = setupEl.querySelector('.kio-board');
  const btnBack = setupEl.querySelector('#kio-back');
  const btnNew = startEl.querySelector('#kio-new');
  const btnHow = startEl.querySelector('#kio-how');
  const sels = [1,2,3,4].map(i=>startEl.querySelector(`#kio-p${i}`));
  const names = [1,2,3,4].map(i=>startEl.querySelector(`#kio-n${i}`));
  const row4 = startEl.querySelector('#kio-row4');
  const AI_PUN_NAMES = [
    'Byte Knight','Null Pointer','Loop Skywalker','Cache Money','Sir Cumference',
    'Bugsy Malone','Bitty Boop','Duke Nukeml','Seg Fault','Algo Rhythm',
    'Stack Sparrow','Captain Crunch','Mr. Roboto','Lady Lambda','Tony Starch',
    'Count Recursion','Pix Elle','Sudo Nym','Ada Mango','Robo Baggins'
  ];
  const usedPunNames = new Set();
  const randPun = () => {
    const pool = AI_PUN_NAMES.filter(n=>!usedPunNames.has(n));
    const pick = (pool.length? pool : AI_PUN_NAMES)[Math.floor(Math.random()* (pool.length? pool.length : AI_PUN_NAMES.length))];
    usedPunNames.add(pick);
    return pick;
  };
  const LS_KEY = (i)=>`kio_hname_${i}`;
  let currentMask = MASK_2P;
  let gameState = null;
  // Current human whose turn it is (during play). Returns null on AI turns.
  const getHuman = () => {
    if (!gameState) return null;
    const color = gameState.turn?.order?.[gameState.turn.index];
    const p = gameState.players?.find(pp=>pp.color===color);
    return p && p.type === 'human' ? p : null;
  };
  // Active human during setup sequence
  const getActiveSetupHuman = () => {
    if (!gameState || gameState.phase !== 'setup') return null;
    const col = gameState.setup?.humanColors?.[gameState.setup.index];
    if (!col) return null;
    return gameState.players.find(p=>p.type==='human' && p.color===col) || null;
  };
  let aiTimers = [];
  let playWrap = null; // layout wrapper for play phase
  let cleanupResize = null;
  let isPreview = false; // when hovering log entries, disable interactions
  let isDragging = false; // track DnD to toggle marker hit-testing
  let moveArrowEl = null;
  const DIRS = [
    { dx: 0, dy: -1, key: 'n' },
    { dx: 1, dy: -1, key: 'ne' },
    { dx: 1, dy: 0, key: 'e' },
    { dx: 1, dy: 1, key: 'se' },
    { dx: 0, dy: 1, key: 's' },
    { dx: -1, dy: 1, key: 'sw' },
    { dx: -1, dy: 0, key: 'w' },
    { dx: -1, dy: -1, key: 'nw' },
  ];

  // Start a game from selected players (array of { kind: 'human'|'ai', level, name })
  function startFromChosen(chosen){
    const pc = chosen.length;
    currentMask = (pc === 2) ? MASK_2P : MASK_4P;
    draw(currentMask);
    const POL = ['b','r','g','u'];
    const allowed = (pc===2) ? ['b','r'] : (pc===3) ? ['b','r','g'] : POL.slice();
    const turnColors = allowed.slice();
    const assigned = chosen.slice().sort(()=>Math.random()-0.5);
    const types = assigned.map(c => c.kind==='human' ? 'human' : 'ai');
    const playerNames = assigned.map(c => c.name);
    const aiLevels = assigned.map(c => c.level);
    const st = createGame({ playerCount: pc, playerTypes: types, playerNames, aiLevels, turnColors });
    // expose for debugging
    wrap.__kioState = st;
    gameState = st;
    gameState.phase = 'setup';
    const humanColors = gameState.players.filter(p=>p.type==='human').map(p=>p.color);
    gameState.setup = { humanColors, index: 0 };
    renderRacks(gameState);
    planAIPlacements();
    revealAIPlacements();
  }

  // ---------- AI difficulty profiles (first pass) ----------
  const AI_PROFILES = {
    easy: {
      knockWeights: { frowny: 8, smiley: 0, blank: 1 },
      smileyPenalty: 6,
      targetWeakestWeight: 1.0, // penalize hitting opponents with fewer smileys
      originEdgePenalty: 0.2,
      endEdgePenalty: 0.4,
      centerControl: 0.5,
      lookaheadDepth: 0,
      lookaheadFactor: 0.0,
      noise: 0.8,
      recallMoves: 2,
      moveFrownyPenalty: 8,
      moveSmileyPenalty: 3,
      placeCenterExp: 0.8,
      placeEdgeExp: 0.8,
    },
    medium: {
      knockWeights: { frowny: 12, smiley: 0, blank: 1.5 },
      smileyPenalty: 10,
      targetWeakestWeight: 1.8,
      originEdgePenalty: 0.4,
      endEdgePenalty: 0.8,
      centerControl: 1.0,
      lookaheadDepth: 1,
      lookaheadFactor: 0.5,
      noise: 0.35,
      recallMoves: 6,
      moveFrownyPenalty: 12,
      moveSmileyPenalty: 5,
      placeCenterExp: 1.2,
      placeEdgeExp: 1.2,
    },
    hard: {
      knockWeights: { frowny: 16, smiley: 0, blank: 2 },
      smileyPenalty: 14,
      targetWeakestWeight: 2.4,
      originEdgePenalty: 0.8,
      endEdgePenalty: 1.2,
      centerControl: 1.6,
      lookaheadDepth: 2,
      lookaheadFactor: 0.8,
      noise: 0.1,
      recallMoves: 999,
      moveFrownyPenalty: 16,
      moveSmileyPenalty: 7,
      placeCenterExp: 1.6,
      placeEdgeExp: 1.6,
    },
  };

  // AI memory of own specials by color
  function ensureAIMemory() {
    if (!gameState.aiMemory) gameState.aiMemory = {};
  }
  function rememberOwn(color, idx, kind) {
    ensureAIMemory();
    if (!gameState.aiMemory[color]) gameState.aiMemory[color] = new Map();
    gameState.aiMemory[color].set(idx, { kind, turn: gameState.turn.turns });
  }
  function forgetExpired(color, profile) {
    ensureAIMemory();
    const m = gameState.aiMemory[color]; if (!m) return;
    const maxAge = profile.recallMoves ?? 0;
    if (maxAge <= 0) { m.clear(); return; }
    for (const [idx, rec] of m.entries()) {
      if ((gameState.turn.turns - (rec.turn||0)) > maxAge) m.delete(idx);
    }
  }

  // Small checker icon for logs and UI: returns a span with chip color and optional face SVG
  function createCheckerIcon(kind, color, size = 18) {
    const wrap = document.createElement('span');
    wrap.className = `kio-piece face-down kio-${color}`;
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    if (kind === 'smiley' || kind === 'frowny') {
      const innerSize = Math.max(12, size - 6);
      wrap.appendChild(FaceIcon(kind, { size: innerSize, strokeWidth: 2.2 }));
    }
    return wrap;
  }

  function draw(mask) {
    const grid = maskToGrid(mask);
    boardEl.innerHTML = '';
    grid.forEach((cell, idx) => {
      const sq = document.createElement('div');
      sq.className = 'kio-cell';
      // checkerboard background for readability
      const x = idx % 8, y = Math.floor(idx / 8);
      sq.classList.add(((x + y) % 2 === 0) ? 'light' : 'dark');
      if (cell && cell !== '.') {
        const dot = document.createElement('span');
        dot.className = `kio-dot kio-${cell}`;
        dot.title = COLORS[cell];
        // mark allowed color for drag validation
        sq.dataset.color = cell;
        sq.append(dot);
      }
      sq.dataset.index = String(idx);
      boardEl.append(sq);
    });

    // Wire board-level DnD delegation once (used only during setup phase)
    if (!boardEl.__kioDnDWired) {
      boardEl.__kioDnDWired = true;
      const getCellFromEvent = (e) => (e.target instanceof Element) ? e.target.closest('.kio-cell') : null;
      const getIndex = (cellEl) => Number(cellEl?.dataset.index ?? '-1');
      const isAllowed = (cellEl) => {
        if (!gameState || !cellEl) return false;
        if (gameState.phase !== 'setup') return false;
        const idx2 = getIndex(cellEl);
        const human = getActiveSetupHuman();
        return Boolean(human && cellEl.dataset.color === human.color && !gameState.board.cells[idx2]);
      };
      boardEl.addEventListener('dragover', (e) => {
        if (gameState?.phase !== 'setup') return;
        const cellEl = getCellFromEvent(e);
        if (isAllowed(cellEl)) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          cellEl.classList.add('kio-drop-hover');
        }
      }, true);
      boardEl.addEventListener('dragleave', (e) => {
        if (gameState?.phase !== 'setup') return;
        const cellEl = getCellFromEvent(e);
        cellEl?.classList.remove('kio-drop-hover');
      });
      boardEl.addEventListener('drop', (e) => {
        if (!gameState || gameState.phase !== 'setup') return;
        const cellEl = getCellFromEvent(e);
        if (!cellEl) return;
        const allowed = isAllowed(cellEl);
        if (!allowed) return;
        e.preventDefault();
        const payload = e.dataTransfer?.getData('text/plain') || '';
        const [kind, idxStr] = payload.includes(':') ? payload.split(':') : [payload, ''];
        const idx2 = getIndex(cellEl);
        const human = getActiveSetupHuman();
        if (!human) return;
        // place piece
        const piece = { ownerId: human.id, color: human.color, kind, faceDown: true };
        gameState.board.cells[idx2] = piece;
        // update counts for specials
        const cnt = gameState.counts.specialsRemaining[human.color];
        const avail = gameState.rackAvail[human.color];
        if (kind==='frowny' && cnt.frowny>0) { cnt.frowny -= 1; avail.frowny = false; }
        if (kind==='smiley' && cnt.smiley>0) {
          cnt.smiley -= 1;
          const si = Number(idxStr|0);
          if (Number.isFinite(si) && si>=0 && si<3) avail.smiley[si] = false;
        }
        // render
        const dot = cellEl.querySelector('.kio-dot'); if (dot) dot.remove();
        const chip = document.createElement('span');
        chip.className = `kio-piece face-down kio-${human.color}`;
        cellEl.append(chip);
        renderRacks(gameState);
        // if specials are all placed, auto-fill remaining mask squares with blanks
        maybeAutoFillBlanks();
        // clear any board highlights
        boardEl.querySelectorAll('.kio-droppable, .kio-drop-hover').forEach(el => el.classList.remove('kio-droppable', 'kio-drop-hover'));
        // mark accepted for dragend cleanup
        const ev = new Event('kio-drop-accepted', { bubbles: true });
        boardEl.dispatchEvent(ev);
      });
    }
  }
  // Play layout + panels
  function ensurePlayLayout() {
    if (playWrap && playWrap.isConnected) return;
    playWrap = document.createElement('div');
    playWrap.className = 'kio-play-wrap';
    const left = document.createElement('aside'); left.className = 'kio-left';
    const center = document.createElement('div'); center.className = 'kio-center';
    const right = document.createElement('aside'); right.className = 'kio-right';
    // Insert before board and move board inside center
    boardEl.parentElement.insertBefore(playWrap, boardEl);
    center.appendChild(boardEl);
    playWrap.append(left, center, right);
    // keep log height in sync with board
    const onResize = () => { syncLogHeight(); syncLeftTop(); };
    window.addEventListener('resize', onResize);
    cleanupResize = () => window.removeEventListener('resize', onResize);
  }

  function teardownPlayLayout() {
    if (!playWrap) return;
    try {
      const parent = playWrap.parentElement;
      if (parent) {
        const center = playWrap.querySelector('.kio-center');
        if (center && boardEl.parentElement === center) {
          parent.insertBefore(boardEl, playWrap);
        }
        parent.removeChild(playWrap);
      }
    } catch {}
    playWrap = null;
    if (cleanupResize) { cleanupResize(); cleanupResize = null; }
  }

  function paintBoard(cells) {
    const sqs = boardEl.querySelectorAll('.kio-cell');
    sqs.forEach((sq, i) => {
      sq.querySelectorAll('.kio-piece').forEach(el => el.remove());
      const piece = cells[i];
      if (piece) {
        const chip = document.createElement('span');
        chip.className = `kio-piece face-down kio-${piece.color}`;
        sq.append(chip);
      }
    });
  }

  // removed turn banner; we use arrow indicator next to active rack

  function renderSideRacks(state) {
    const left = playWrap?.querySelector('.kio-left');
    if (!left) return;
    left.innerHTML = '';
    const title = document.createElement('div'); title.className = 'kio-side-title'; title.textContent = 'Players'; left.appendChild(title);
    const rows = document.createElement('div'); rows.className = 'kio-left-rows'; left.appendChild(rows);
    const order = state.turn.order.slice();
    const turnColor = state.turn.order[state.turn.index];
    order.forEach(color => {
      const p = state.players.find(pp=>pp.color===color);
      const row = document.createElement('div'); row.className = 'kio-rack-row';
      row.classList.toggle('is-active', color === turnColor);
      // arrow
      const arrow = document.createElementNS('http://www.w3.org/2000/svg','svg');
      arrow.setAttribute('viewBox','0 0 24 24');
      arrow.classList.add('kio-turn-arrow');
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M6 4l10 8-10 8z');
      path.setAttribute('fill','currentColor');
      arrow.appendChild(path);
      // rack box
      const wrap = document.createElement('div'); wrap.className = 'kio-player-rack';
      const head = document.createElement('div'); head.className = 'kio-player-head';
      const dot = document.createElement('span'); dot.className = `kio-dot kio-${color}`;
      const name = document.createElement('span'); name.textContent = p?.name || color;
      head.append(dot, name);
      if (p && p.type === 'ai') {
        const lvl = (p.aiLevel || 'medium').toString();
        const badge = document.createElement('span');
        badge.className = 'kio-ai-badge';
        badge.textContent = lvl.charAt(0).toUpperCase() + lvl.slice(1);
        head.append(badge);
      }
      const captured = state.captured?.[color] || [];
      const smileyCaptured = captured.filter(k=>k==='smiley').length;
      const frownyCaptured = captured.includes('frowny');

      // status classes
      if (frownyCaptured) wrap.classList.add('is-eliminated');
      if (smileyCaptured === 3) wrap.classList.add('is-winner');

      // four fixed slots: [frowny][smiley][smiley][smiley]
      const slots = document.createElement('div'); slots.className = 'kio-mini-slots';
      const makeFace = (kind) => {
        const sp = document.createElement('span'); sp.className = `kio-piece face-down kio-${color}`; sp.style.width='28px'; sp.style.height='28px';
        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.classList.add('kio-icon');
        const dark = '#111827', yellow='#fde047';
        const bg = document.createElementNS('http://www.w3.org/2000/svg','circle'); bg.setAttribute('cx','12'); bg.setAttribute('cy','12'); bg.setAttribute('r','9'); bg.setAttribute('fill',yellow); bg.setAttribute('stroke',dark); bg.setAttribute('stroke-width','1.5'); svg.appendChild(bg);
        if (kind==='smiley') { const l=document.createElementNS('http://www.w3.org/2000/svg','circle'); l.setAttribute('cx','8.5'); l.setAttribute('cy','10'); l.setAttribute('r','1.4'); l.setAttribute('fill',dark); const r=document.createElementNS('http://www.w3.org/2000/svg','circle'); r.setAttribute('cx','15.5'); r.setAttribute('cy','10'); r.setAttribute('r','1.4'); r.setAttribute('fill',dark); const m=document.createElementNS('http://www.w3.org/2000/svg','path'); m.setAttribute('d','M7.2 14.2c1.9 2.2 3.8 3 4.8 3s2.9-.8 4.8-3'); m.setAttribute('fill','none'); m.setAttribute('stroke',dark); m.setAttribute('stroke-width','2.6'); m.setAttribute('stroke-linecap','round'); svg.append(l,r,m); }
        else { const lx1=document.createElementNS('http://www.w3.org/2000/svg','path'); lx1.setAttribute('d','M7.4 9.2l2.4 2.4'); lx1.setAttribute('stroke',dark); lx1.setAttribute('stroke-width','2.2'); lx1.setAttribute('stroke-linecap','round'); const lx2=document.createElementNS('http://www.w3.org/2000/svg','path'); lx2.setAttribute('d','M9.8 9.2l-2.4 2.4'); lx2.setAttribute('stroke',dark); lx2.setAttribute('stroke-width','2.2'); lx2.setAttribute('stroke-linecap','round'); const rx1=document.createElementNS('http://www.w3.org/2000/svg','path'); rx1.setAttribute('d','M14.0 9.2l2.4 2.4'); rx1.setAttribute('stroke',dark); rx1.setAttribute('stroke-width','2.2'); rx1.setAttribute('stroke-linecap','round'); const rx2=document.createElementNS('http://www.w3.org/2000/svg','path'); rx2.setAttribute('d','M16.4 9.2l-2.4 2.4'); rx2.setAttribute('stroke',dark); rx2.setAttribute('stroke-width','2.2'); rx2.setAttribute('stroke-linecap','round'); const m=document.createElementNS('http://www.w3.org/2000/svg','path'); m.setAttribute('d','M7.2 17.5c1.9-2.2 3.8-3 4.8-3s2.9.8 4.8 3'); m.setAttribute('fill','none'); m.setAttribute('stroke',dark); m.setAttribute('stroke-width','2.6'); m.setAttribute('stroke-linecap','round'); svg.append(lx1,lx2,rx1,rx2,m); }
        sp.append(svg); return sp;
      };
      // Frowny slot
      const fSlot = document.createElement('div'); fSlot.className = 'kio-mini-slot'; if (frownyCaptured) fSlot.append(makeFace('frowny')); slots.append(fSlot);
      // Smiley slots
      for (let i=0;i<3;i++){ const s = document.createElement('div'); s.className = 'kio-mini-slot'; if (i < smileyCaptured) s.append(makeFace('smiley')); slots.append(s); }

      wrap.append(head, slots);
      row.append(arrow, wrap);
      rows.append(row);
    });
    syncLeftTop();
  }

  function renderLog(state) {
    const right = playWrap?.querySelector('.kio-right');
    if (!right) return;
    right.innerHTML = '';
    const title = document.createElement('div'); title.className = 'kio-side-title kio-log-title'; title.textContent = 'Game Log'; right.appendChild(title);
    const box = document.createElement('div'); box.className = 'kio-log';
    state.logs.forEach((entry, idx) => {
      const item = document.createElement('div'); item.className = 'kio-log-item';
      const textL = document.createElement('span'); textL.textContent = (entry.textPrefix) ? entry.textPrefix : (entry.text || `Move ${idx+1}`);
      item.appendChild(textL);
      if (entry.knockedKind && entry.knockedColor) {
        const icon = createCheckerIcon(entry.knockedKind, entry.knockedColor, 32);
        icon.style.marginLeft = '6px';
        item.appendChild(icon);
      }
      item.addEventListener('mouseenter', ()=> { isPreview = true; clearDirMarkers(); removeMoveArrow(); paintBoard(entry.before); if (entry.from != null && entry.dirKey) showMoveArrow(entry.from, entry.dirKey); });
      item.addEventListener('mouseleave', ()=> { isPreview = false; removeMoveArrow(); paintBoard(state.board.cells); enableHumanSelect(); });
      box.appendChild(item);
    });
    right.appendChild(box);
    syncLogHeight();
    // autoscroll to bottom
    box.scrollTop = box.scrollHeight;
  }

  function syncLogHeight() {
    const right = playWrap?.querySelector('.kio-right');
    const box = right?.querySelector('.kio-log');
    if (!box) return;
    const h = boardEl.offsetHeight;
    if (h > 0) box.style.height = `${h}px`;
    // Align top of log box with top of board
    const boardTop = boardEl.getBoundingClientRect().top;
    const rightTop = right.getBoundingClientRect().top;
    const title = right.querySelector('.kio-log-title');
    const titleH = title ? title.getBoundingClientRect().height : 0;
    const mt = Math.max(0, Math.round(boardTop - rightTop - titleH));
    box.style.marginTop = `${mt}px`;
  }

  // ---------- Movement engine ----------
  const idxToXY = (i) => [i % 8, Math.floor(i / 8)];
  const xyToIdx = (x,y) => (x < 0 || x > 7 || y < 0 || y > 7) ? -1 : (y * 8 + x);
  const inBounds = (x,y) => x>=0 && x<8 && y>=0 && y<8;

  function firstOccupiedAlong(cells, startIdx, dx, dy) {
    let [x,y] = idxToXY(startIdx);
    while (true) {
      x += dx; y += dy;
      if (!inBounds(x,y)) return -1;
      const ni = xyToIdx(x,y);
      if (cells[ni]) return ni;
    }
  }

  function collectOccupiedAlong(cells, startIdx, dx, dy) {
    const out = [];
    let [x,y] = idxToXY(startIdx);
    while (true) {
      x += dx; y += dy;
      if (!inBounds(x,y)) break;
      const ni = xyToIdx(x,y);
      if (cells[ni]) out.push(ni);
    }
    return out;
  }

  function simulateMove(state, fromIdx, dir) {
    const cells = state.board.cells;
    const mover = cells[fromIdx];
    if (!mover) return { valid: false };
    // Find the first piece in the path; if none, the mover would fall off (illegal)
    const occ = collectOccupiedAlong(cells, fromIdx, dir.dx, dir.dy);
    if (occ.length === 0) return { valid: false };
    const last = occ[occ.length - 1];
    const knocked = cells[last];
    if (!knocked) return { valid: false };
    if (knocked.color === mover.color) return { valid: false }; // cannot eliminate own piece
    // Build new board by pushing chain forward and placing mover on first occupied square
    const newCells = state.board.cells.map(c => (c ? { ...c } : null));
    newCells[fromIdx] = null; // mover leaves its cell
    // Push each occupied piece forward one step toward the edge
    for (let j = occ.length - 1; j >= 0; j--) {
      if (j === occ.length - 1) {
        // last piece goes off the board
        newCells[occ[j]] = null;
      } else {
        const dest = occ[j + 1];
        newCells[dest] = { ...cells[occ[j]] };
        newCells[occ[j]] = null;
      }
    }
    // Place mover onto the first occupied square
    const dest = occ[0];
    newCells[dest] = { ...mover };
    return { valid: true, cells: newCells, knocked, from: fromIdx, dest, mover, dir };
  }

  function listLegalMovesForColor(state, color) {
    const moves = [];
    for (let i=0;i<64;i++) {
      const p = state.board.cells[i];
      if (!p || p.color !== color) continue;
      for (const d of DIRS) {
        const m = simulateMove(state, i, d);
        if (m.valid) moves.push(m);
      }
    }
    return moves;
  }

  function weightKnock(kind) {
    if (kind === 'frowny') return 10;
    if (kind === 'smiley') return 6;
    return 2; // blank
  }

  function getAIProfileForColor(color) {
    const p = gameState.players.find(pp=>pp.color===color);
    if (!p || p.type !== 'ai') return AI_PROFILES.medium;
    const lvl = (p.aiLevel||'medium').toLowerCase();
    return AI_PROFILES[lvl] || AI_PROFILES.medium;
  }

  function smileysCaptured(color) {
    return (gameState.captured?.[color] || []).filter(k=>k==='smiley').length;
  }

  function isEdge(idx){ const x=idx%8, y=Math.floor(idx/8); return (x===0||y===0||x===7||y===7); }

  function evaluateMove(state, move, profile) {
    // Base: value of knocked piece
    let score = (profile.knockWeights?.[move.knocked.kind] ?? 0);
    // Avoid helping opponent: penalize knocking smileys in general
    if (move.knocked.kind === 'smiley') score -= (profile.smileyPenalty ?? 0);
    // Also penalize targeting opponents already low on smileys (closer to winning)
    const victimSmileysCaptured = smileysCaptured(move.knocked.color);
    score -= profile.targetWeakestWeight * victimSmileysCaptured;
    // Penalize moving from edge or ending on edge
    if (isEdge(move.from)) score -= profile.originEdgePenalty;
    if (isEdge(move.dest)) score -= profile.endEdgePenalty;
    // Try not to move own specials if remembered
    const aiColor = state.turn.order[state.turn.index];
    if (aiColor) {
      forgetExpired(aiColor, profile);
      const mem = (gameState.aiMemory?.[aiColor]) || null;
      const rec = mem ? mem.get(move.from) : null;
      if (rec) {
        if (rec.kind === 'frowny') score -= (profile.moveFrownyPenalty ?? 0);
        else if (rec.kind === 'smiley') score -= (profile.moveSmileyPenalty ?? 0);
      } else {
        // Unknown memory: small caution not to move potential special
        score -= (profile.moveSmileyPenalty ?? 0) * 0.2;
      }
    }
    // Prefer knocking pieces near the center
    const dCenter = distToCenter(move.from); // origin proximity contributes
    const dKnock = distToCenter(listOccupiedAlongIndexes(state, move).lastIdx ?? move.dest);
    score += profile.centerControl * (1/(1+dKnock));
    // Add small noise
    score += (Math.random()-0.5) * profile.noise;
    return score;
  }

  // helper to expose last index of chain for evaluation
  function listOccupiedAlongIndexes(state, move) {
    // reconstruct occ for evaluation
    const occ = collectOccupiedAlong(state.board.cells, move.from, move.dir.dx, move.dir.dy);
    return { lastIdx: occ[occ.length-1] };
  }

  function bestMoveScoreForColor(state, color, profile) {
    const mvz = listLegalMovesForColor(state, color);
    if (mvz.length === 0) return -Infinity;
    let best = -Infinity;
    for (const m of mvz) {
      const v = evaluateMove(state, m, profile);
      if (v > best) best = v;
    }
    return best;
  }

  function nextActiveColorAfter(color) {
    const order = gameState.turn.order;
    const idx = order.indexOf(color);
    const n = order.length;
    for (let k=1;k<=n;k++) {
      const c = order[(idx+k)%n];
      const elim = (gameState.captured?.[c] || []).includes('frowny');
      if (!elim) return c;
    }
    return color;
  }

  function chooseAIMove(state, color) {
    const moves = listLegalMovesForColor(state, color);
    if (moves.length === 0) return null;
    const profile = getAIProfileForColor(color);
    // decay memory for this AI color before evaluating
    forgetExpired(color, profile);
    // Score each move
    let best = null, bestScore = -Infinity;
    for (const m of moves) {
      let s = evaluateMove(state, m, profile);
      // Optional lookahead: approximate opponent's best reply and subtract
      if (profile.lookaheadDepth > 0) {
        const copy = { ...state, board: { ...state.board, cells: deepCopyCells(m.cells) } };
        const opp = nextActiveColorAfter(color);
        const oppProfile = getAIProfileForColor(opp);
        const oppBest = bestMoveScoreForColor(copy, opp, oppProfile);
        if (Number.isFinite(oppBest)) s -= profile.lookaheadFactor * oppBest;
      }
      if (s > bestScore) { bestScore = s; best = m; }
    }
    return best;
  }

  function deepCopyCells(cells) { return cells.map(c=> c ? { ...c } : null); }

  function appendLog(state, text, before, after) {
    state.logs.push({ id: `L${state.logs.length+1}`, text, before, after, turnColor: state.turn.order[state.turn.index] });
    renderLog(state);
  }

  function onKnock(state, piece) {
    if (!piece) return;
    const color = piece.color;
    if (!state.captured[color]) state.captured[color] = [];
    state.captured[color].push(piece.kind);
  }

  function checkEnd(state) {
    // Win by smileys: a player with all three smileys removed wins immediately
    for (const p of state.players) {
      const caps = state.captured[p.color] || [];
      const sCount = caps.filter(k=>k==='smiley').length;
      if (sCount >= 3) return { over: true, winner: p, reason: 'three-smileys' };
    }
    // Win by last frowny remaining
    const alive = state.players.filter(p => !(state.captured[p.color]||[]).includes('frowny'));
    if (alive.length === 1) return { over: true, winner: alive[0], reason: 'last-frowny' };
    return { over: false };
  }

  function showWinModal(winner) {
    isPreview = false; clearDirMarkers(); removeMoveArrow();
    const body = document.createElement('div');
    const titleBottom = document.createElement('div'); titleBottom.className = 'kio-rack-title';
    const dot = document.createElement('span'); dot.className = `kio-dot kio-${winner.color}`;
    const span = document.createElement('span'); span.textContent = `${winner.name} Wins!`;
    titleBottom.append(dot, document.createTextNode(' '), span);
    const hint = document.createElement('div');
    hint.style.marginTop = '8px';
    hint.style.fontWeight = '600';
    hint.style.fontSize = '14px';
    hint.style.color = '#e5e7eb';
    hint.textContent = 'Click outside to dismiss';
    body.append(titleBottom, hint);
    openModal({ title: 'Game Over', body });
  }

  function performMove(state, move) {
    const before = deepCopyCells(state.board.cells);
    state.board.cells = move.cells;
    onKnock(state, move.knocked);
    // Update AI memory for mover color: shift remembered index to dest
    const moverColor = move.mover.color;
    const prof = getAIProfileForColor(moverColor);
    forgetExpired(moverColor, prof);
    const mem = gameState.aiMemory?.[moverColor];
    if (mem && mem.has(move.from)) {
      const rec = mem.get(move.from); mem.delete(move.from); mem.set(move.dest, { kind: rec.kind, turn: gameState.turn.turns });
    }
    paintBoard(state.board.cells);
    renderSideRacks(state);
    const moverName = state.players.find(p=>p.color===move.mover.color)?.name || colorLabel(move.mover.color);
    const victimName = state.players.find(p=>p.color===move.knocked.color)?.name || colorLabel(move.knocked.color);
    const textPrefix = `${moverName} knocked off ${victimName}'s`;
    const after = deepCopyCells(state.board.cells);
    // include move metadata for hover arrow and icon rendering
    state.logs.push({
      id: `L${state.logs.length+1}`,
      textPrefix,
      before,
      after,
      turnColor: state.turn.order[state.turn.index],
      from: move.from,
      dirKey: move.dir.key,
      knockedKind: move.knocked.kind,
      knockedColor: move.knocked.color,
    });
    renderLog(state);
    const res = checkEnd(state);
    if (res.over) {
      state.phase = 'gameover';
      showWinModal(res.winner);
      return;
    }
    nextTurn(state);
    renderSideRacks(state);
    // If it's now a human turn, enable selection
    enableHumanSelect();
  }

  function aiStepIfNeeded() {
    if (!gameState || gameState.phase !== 'play') return;
    const turnColor = gameState.turn.order[gameState.turn.index];
    const p = gameState.players.find(pp=>pp.color===turnColor);
    if (!p || p.type !== 'ai') return;
    const mv = chooseAIMove(gameState, turnColor);
    if (!mv) {
      // No AI move: advance turn and wire human
      nextTurn(gameState);
      renderSideRacks(gameState);
      enableHumanSelect();
      aiStepIfNeeded();
      return;
    }
    showMoveArrow(mv.from, mv.dir.key);
    setTimeout(()=> { removeMoveArrow(); performMove(gameState, mv); aiStepIfNeeded(); }, 650);
  }

  function clearDirMarkers() { boardEl.querySelectorAll('.kio-dir').forEach(el=>el.remove()); }

  function enableHumanDrag() {
    clearDirMarkers();
    const human = getHuman();
    if (!human) return;
    const turnColor = gameState.turn.order[gameState.turn.index];
    if (turnColor !== human.color) return;
    // Make only human pieces draggable and add direction markers on dragstart
    boardEl.querySelectorAll('.kio-cell').forEach((sqEl, i) => {
      const pc = gameState.board.cells[i];
      const chip = sqEl.querySelector('.kio-piece');
      if (!pc || pc.color !== human.color || !chip) { if (chip) chip.draggable=false; return; }
      chip.draggable = true;
      if (chip.__kioWired) return; chip.__kioWired = true;
      chip.addEventListener('dragstart', (e)=>{
        clearDirMarkers();
        e.dataTransfer?.setData('text/plain', String(i));
        // add full-square markers for legal directions
        DIRS.forEach(d => {
          const m = simulateMove(gameState, i, d);
          if (!m.valid) return;
          const [x,y]=idxToXY(i); const nx=x+d.dx, ny=y+d.dy; if (!inBounds(nx,ny)) return;
          const ni=xyToIdx(nx,ny); const target = boardEl.querySelector(`.kio-cell[data-index="${ni}"]`);
          if (!target) return;
          const marker=document.createElement('div');
          marker.className='kio-dir';
          marker.dataset.dir = d.key;
          marker.style.position='absolute';
          marker.style.left='0';
          marker.style.top='0';
          marker.style.width='100%';
          marker.style.height='100%';
          const PRIMARY = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3f48cc';
          marker.style.border=`2px dashed ${PRIMARY}`;
          marker.style.background=rgbaFromHex(PRIMARY, 0.12);
          marker.style.pointerEvents='auto';
          marker.style.zIndex='8';
          marker.style.borderRadius='8px';
          marker.addEventListener('dragover',(ev)=>{ ev.preventDefault(); });
          marker.addEventListener('drop',(ev)=>{
            ev.preventDefault();
            const from = Number(e.dataTransfer?.getData('text/plain')||i);
            const dir = DIRS.find(dd=>dd.key===marker.dataset.dir);
            clearDirMarkers();
            if (dir) {
              const mv = simulateMove(gameState, from, dir);
              if (mv.valid) { performMove(gameState, mv); aiStepIfNeeded(); }
            }
          });
          target.style.position='relative';
          target.appendChild(marker);
        });
      });
      chip.addEventListener('dragend', ()=> clearDirMarkers());
    });
  }

  function rgbaFromHex(hex, alpha) {
    const h = String(hex || '').replace('#','');
    const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
    const n = parseInt(full.slice(0,6), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Click-to-select alternative, more reliable across browsers
  function enableHumanSelect() {
    if (isPreview) return; // do not wire during preview
    clearDirMarkers();
    const human = getHuman();
    if (!human) return;
    const turnColor = gameState.turn.order[gameState.turn.index];
    if (turnColor !== human.color) return;
    boardEl.querySelectorAll('.kio-cell').forEach((sqEl, i) => {
      const pc = gameState.board.cells[i];
      const chip = sqEl.querySelector('.kio-piece');
      if (!pc || pc.color !== human.color || !chip) { if (chip) chip.classList.remove('kio-can-move'); return; }
      const hasMove = DIRS.some(d => simulateMove(gameState, i, d).valid);
      chip.classList.toggle('kio-can-move', hasMove);
      if (!hasMove) return;
      chip.draggable = true;
      if (!sqEl.__kioCellWired) {
        sqEl.__kioCellWired = true;
        sqEl.addEventListener('mouseenter', () => {
          // Only show markers if it's still the human's turn and not previewing
          const humanNow = getHuman();
          if (!humanNow) return;
          const tc = gameState.turn.order[gameState.turn.index];
          if (gameState.phase !== 'play' || tc !== humanNow.color || isPreview) return;
          const pcNow = gameState.board.cells[i];
          if (!pcNow || pcNow.color !== humanNow.color) return; // do not show for opponent pieces
          showMarkers('hover');
        });
        // When leaving a cell, remove markers unless entering a marker or another of our pieces
        sqEl.addEventListener('mouseleave', (ev) => {
          if (isDragging) return;
          const humanNow = getHuman();
          if (!humanNow) { clearDirMarkers(); return; }
          const toEl = ev.relatedTarget;
          if (!(toEl instanceof Element)) { clearDirMarkers(); return; }
          if (toEl.closest('.kio-dir')) return; // keep while going into a target
          const tc = gameState.turn.order[gameState.turn.index];
          if (gameState.phase !== 'play' || tc !== humanNow.color || isPreview) { clearDirMarkers(); return; }
          const nextCell = toEl.closest('.kio-cell');
          if (!nextCell) { clearDirMarkers(); return; }
          const idxNext = Number(nextCell.dataset.index || '-1');
          const nextPiece = Number.isFinite(idxNext) ? gameState.board.cells[idxNext] : null;
          if (!nextPiece || nextPiece.color !== humanNow.color) clearDirMarkers();
        });
      }
      if (chip.__kioClickWired) return; chip.__kioClickWired = true;
      const showMarkers = (mode='hover') => {
        clearDirMarkers();
        DIRS.forEach(d => {
          const m = simulateMove(gameState, i, d); if (!m.valid) return;
          const [x,y]=idxToXY(i); const nx=x+d.dx, ny=y+d.dy; if (!inBounds(nx,ny)) return;
          const ni=xyToIdx(nx,ny); const target = boardEl.querySelector(`.kio-cell[data-index="${ni}"]`); if (!target) return;
          const marker = document.createElement('div'); marker.className='kio-dir'; marker.dataset.dir=d.key;
          const PRIMARY2 = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3f48cc';
          marker.style.position='absolute'; marker.style.left='0'; marker.style.top='0'; marker.style.width='100%'; marker.style.height='100%'; marker.style.border=`2px dashed ${PRIMARY2}`; marker.style.background=rgbaFromHex(PRIMARY2, 0.12); marker.style.borderRadius='8px'; marker.style.zIndex='8'; marker.style.cursor='pointer';
          marker.style.pointerEvents = (mode==='drag' || mode==='click' || isDragging) ? 'auto' : 'none';
          marker.addEventListener('click', () => { clearDirMarkers(); const dir = DIRS.find(dd=>dd.key===marker.dataset.dir); if (!dir) return; const mv = simulateMove(gameState, i, dir); if (mv.valid) { performMove(gameState, mv); aiStepIfNeeded(); } });
          marker.addEventListener('dragover', (ev)=> { ev.preventDefault(); });
          marker.addEventListener('drop', (ev)=> { ev.preventDefault(); const from = Number(ev.dataTransfer?.getData('text/plain')||i); const dir = DIRS.find(dd=>dd.key===marker.dataset.dir); clearDirMarkers(); if (dir) { const mv = simulateMove(gameState, from, dir); if (mv.valid) { performMove(gameState, mv); aiStepIfNeeded(); } } });
          target.style.position='relative'; target.appendChild(marker);
        });
      };
      chip.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const humanNow = getHuman();
        if (!humanNow) return;
        const tc = gameState.turn.order[gameState.turn.index];
        if (gameState.phase !== 'play' || tc !== humanNow.color || isPreview) return;
        const pcNow = gameState.board.cells[i];
        if (!pcNow || pcNow.color !== humanNow.color) return;
        chip.draggable = true; showMarkers('click');
      });
      chip.addEventListener('mouseenter', () => {
        const humanNow = getHuman();
        if (!humanNow) return;
        const tc = gameState.turn.order[gameState.turn.index];
        if (gameState.phase !== 'play' || tc !== humanNow.color || isPreview) return;
        const pcNow = gameState.board.cells[i];
        if (!pcNow || pcNow.color !== humanNow.color) return;
        chip.draggable = true; showMarkers('hover');
      });
      chip.addEventListener('dragstart', (e) => {
        const humanNow = getHuman();
        if (!humanNow) return;
        const tc = gameState.turn.order[gameState.turn.index];
        const pcNow = gameState.board.cells[i];
        if (gameState.phase !== 'play' || tc !== humanNow.color || isPreview || !pcNow || pcNow.color !== humanNow.color) { e.preventDefault?.(); return; }
        isDragging = true; e.dataTransfer?.setData('text/plain', String(i)); showMarkers('drag');
      });
      chip.addEventListener('dragend', () => { isDragging = false; clearDirMarkers(); });
    });
    // clicking outside markers clears them
    boardEl.addEventListener('click', (ev) => { if (!(ev.target instanceof Element)) return; if (!ev.target.closest('.kio-dir')) clearDirMarkers(); }, { once: true });
    // leaving the board clears markers if not dragging
    const onLeaveBoard = (ev) => { if (!isDragging) clearDirMarkers(); };
    boardEl.addEventListener('mouseleave', onLeaveBoard, { once: true });
  }

  function colorLabel(c) {
    const name = COLORS[c] || c;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function showMoveArrow(fromIdx, dirKey) {
    removeMoveArrow();
    const cell = boardEl.querySelector(`.kio-cell[data-index="${fromIdx}"]`);
    if (!cell) return;
    const ang = { n:-90, ne:-45, e:0, se:45, s:90, sw:135, w:180, nw:-135 }[dirKey] || 0;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('kio-move-arrow');
    svg.setAttribute('viewBox','0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M6 4l10 8-10 8z');
    path.setAttribute('fill','#fde047');
    svg.appendChild(path);
    svg.style.position='absolute'; svg.style.width='24px'; svg.style.height='24px'; svg.style.left='50%'; svg.style.top='50%'; svg.style.transform=`translate(-50%, -50%) rotate(${ang}deg)`; svg.style.zIndex='10'; svg.style.pointerEvents='none';
    cell.style.position = 'relative';
    cell.appendChild(svg);
    moveArrowEl = svg;
  }

  function removeMoveArrow() { if (moveArrowEl && moveArrowEl.parentElement) moveArrowEl.parentElement.removeChild(moveArrowEl); moveArrowEl = null; }

  function syncLeftTop() {
    const left = playWrap?.querySelector('.kio-left');
    const rows = left?.querySelector('.kio-left-rows');
    if (!rows) return;
    const boardTop = boardEl.getBoundingClientRect().top;
    const leftTop = left.getBoundingClientRect().top;
    const title = left.querySelector('.kio-side-title');
    const titleH = title ? title.getBoundingClientRect().height : 0;
    const mt = Math.max(0, Math.round(boardTop - leftTop - titleH));
    rows.style.marginTop = `${mt}px`;
  }

  // ——— AI placement planning and reveal ———
  function indexToXY(i){ return [i % 8, Math.floor(i/8)]; }
  function distToCenter(i){ const [x,y]=indexToXY(i); const cx=3.5, cy=3.5; return Math.hypot(x-cx,y-cy); }
  function getColorSquares(color){
    const grid = maskToGrid(gameState.board.mask);
    const out = [];
    for (let i=0;i<64;i++) if (grid[i]===color) out.push(i);
    return out;
  }
  function weightedPickN(items, weightFn, n){
    const pool = items.slice();
    const picks = [];
    for (let k=0;k<n && pool.length>0;k++){
      const weights = pool.map(weightFn);
      const sum = weights.reduce((a,b)=>a+b,0) || 1;
      let r = Math.random()*sum;
      let idx = 0;
      while (idx<pool.length && r>0){ r -= weights[idx]; if (r>0) idx++; }
      if (idx>=pool.length) idx = pool.length-1;
      picks.push(pool[idx]);
      pool.splice(idx,1);
    }
    return picks;
  }
  function planAIPlacements(){
    if (!gameState) return;
    const centerBiasBase = (i)=>{ const d=distToCenter(i); return 1/Math.max(0.2,(d+0.2))**2; };
    const edgeBiasBase   = (i)=>{ const d=distToCenter(i); return (d+0.2)**2; };
    const activeColors = new Set(gameState.players.map(p=>p.color));
    const allColors = ['b','r','g','u'];
    const neutralColors = allColors.filter(c => !activeColors.has(c));
    const aiOrNeutral = [];
    for (const p of gameState.players){
      if (p.type !== 'ai') continue;
      aiOrNeutral.push({ ownerId: p.id, color: p.color, reduceCounts: true, profile: getAIProfileForColor(p.color) });
    }
    // Add neutral colors (e.g., eliminated blue in 3P) — not in players/turn order
    for (const color of neutralColors){
      aiOrNeutral.push({ ownerId: `NP-${color}`, color, reduceCounts: false, profile: AI_PROFILES.medium });
    }

    for (const entry of aiOrNeutral){
      const { ownerId, color, reduceCounts, profile } = entry;
      const slots = getColorSquares(color);
      // choose 1 frowny near center
      const [fIdx] = weightedPickN(slots, (i)=> Math.pow(centerBiasBase(i), profile.placeCenterExp || 1), 1);
      const rem1 = slots.filter(i=>i!==fIdx);
      // choose 3 smileys toward edge
      const sIdx = weightedPickN(rem1, (i)=> Math.pow(edgeBiasBase(i), profile.placeEdgeExp || 1), 3);
      const used = new Set([fIdx, ...sIdx]);
      // place into state
      const put = (i, kind)=>{ gameState.board.cells[i] = { ownerId, color, kind, faceDown: true }; };
      if (typeof fIdx === 'number') put(fIdx,'frowny');
      for (const si of sIdx) put(si,'smiley');
      // fill rest with blanks
      for (const i of rem1) if (!used.has(i)) put(i,'blank');
      // Remember AI's own specials for memory tracking
      const player = gameState.players.find(p=>p.color===color && p.type==='ai');
      if (player) {
        if (typeof fIdx === 'number') rememberOwn(color, fIdx, 'frowny');
        for (const si of sIdx) rememberOwn(color, si, 'smiley');
      }
      // reduce special counters for AI
      if (reduceCounts && gameState.counts?.specialsRemaining?.[color]){
        gameState.counts.specialsRemaining[color] = { frowny: 0, smiley: 0 };
      }
    }
  }
  function clearAITimers(){ aiTimers.forEach(id=>clearTimeout(id)); aiTimers = []; }
  function revealAIPlacements(){
    if (!gameState) return;
    clearAITimers();
    // collect indices with AI or neutral pieces
    const aiCells = [];
    for (let i=0;i<64;i++){
      const pc = gameState.board.cells[i];
      if (!pc) continue;
      const owner = gameState.players.find(p=>p.id===pc.ownerId);
      const isAI = owner?.type === 'ai';
      const isNeutral = !owner; // ownerId not found means neutral color we placed
      if (isAI || isNeutral) aiCells.push(i);
    }
    // random order
    for (let i=aiCells.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [aiCells[i],aiCells[j]]=[aiCells[j],aiCells[i]]; }
    // staggered reveal
    aiCells.forEach((idx, k)=>{
      const t = setTimeout(()=>{
        const sq = boardEl.querySelector(`.kio-cell[data-index="${idx}"]`);
        const pc = gameState.board.cells[idx];
        if (sq && pc){
          const dot = sq.querySelector('.kio-dot'); if (dot) dot.remove();
          if (!sq.querySelector('.kio-piece')){
            const chip = document.createElement('span');
            chip.className = `kio-piece face-down kio-${pc.color}`;
            sq.append(chip);
          }
          // After each AI placement, check if setup is fully populated
          maybeEnterPlayPhase();
        }
      }, 200*k + 1500);
      aiTimers.push(t);
    });
  }

  function maybeAutoFillBlanks() {
    const human = getActiveSetupHuman();
    if (!human) return;
    const left = gameState.counts.specialsRemaining[human.color];
    if (left.frowny === 0 && left.smiley === 0) {
      const grid = maskToGrid(gameState.board.mask);
      grid.forEach((cellColor, i) => {
        if (cellColor === human.color && !gameState.board.cells[i]) {
          // place blank piece
          gameState.board.cells[i] = { ownerId: human.id, color: human.color, kind: 'blank', faceDown: true };
          // update DOM square
          const sq = boardEl.querySelector(`.kio-cell[data-index="${i}"]`);
          if (sq) {
            const dot = sq.querySelector('.kio-dot'); if (dot) dot.remove();
            const chip = document.createElement('span');
            chip.className = `kio-piece face-down kio-${human.color}`;
            sq.append(chip);
          }
        }
      });
      // Advance to next human in setup
      if (gameState.setup) gameState.setup.index += 1;
      renderRacks(gameState);
      maybeEnterPlayPhase();
    }
  }

  function isBoardPopulated() {
    // Board is visually populated when no placement dots remain on the BOARD
    return boardEl.querySelectorAll('.kio-dot').length === 0;
  }

  function maybeEnterPlayPhase() {
    if (!gameState || gameState.phase === 'play') return;
    if (isBoardPopulated()) {
      gameState.phase = 'play';
      renderRacks(gameState);
      // After entering play, ensure interactions and possibly AI move
      // Remove any setup hover highlights leftover
      boardEl.querySelectorAll('.kio-drop-hover').forEach(el=>el.classList.remove('kio-drop-hover'));
      enableHumanSelect();
      aiStepIfNeeded();
    }
  }

  function renderRacks(state) {
    const racksEl = setupEl.querySelector('#kio-racks');
    racksEl.innerHTML = '';
    const human = state.phase === 'setup' ? (getActiveSetupHuman() || state.players.find(p=>p.type==='human')) : state.players.find(p=>p.type==='human');
    if (!human) return; // requires a human
    if (state.phase === 'play') {
      ensurePlayLayout();
      renderSideRacks(state);
      renderLog(state);
      // Remove any setup hover highlights leftover
      boardEl.querySelectorAll('.kio-drop-hover').forEach(el=>el.classList.remove('kio-drop-hover'));
      enableHumanSelect();
      syncLogHeight();
      racksEl.innerHTML = '';
      return;
    }
    const specials = state.counts.specialsRemaining[human.color];
    const avail = state.rackAvail?.[human.color] || { frowny: true, smiley: [true,true,true] };
    const rack = document.createElement('div');
    rack.className = 'kio-rack';
    const title = document.createElement('div');
    title.className = 'kio-rack-title';
    const dot = document.createElement('span'); dot.className = `kio-dot kio-${human.color}`; title.append(dot, document.createTextNode(state.phase==='setup' ? ` ${human.name}: Place Pieces` : ' Your Rack'));
    const slots = document.createElement('div');
    slots.className = 'kio-rack-slots';

    // helpers
    const faceIcon = (kind) => {
      const svg = FaceIcon(kind, { size: 26, strokeWidth: 2.6 });
      svg.classList.add('kio-icon');
      return svg;
    };
    const makePiece = (kind, idx=null) => {
      const sp = document.createElement('span');
      sp.className = `kio-piece face-down kio-${human.color}`;
      sp.draggable = true;
      sp.dataset.kind = kind;
      if (idx !== null) sp.dataset.idx = String(idx);
      if (kind === 'frowny' || kind === 'smiley') sp.append(faceIcon(kind));
      return sp;
    };
    const makeSlot = (kind, idx=null) => {
      const d = document.createElement('div');
      d.className = 'kio-slot draggable';
      d.dataset.kind = kind;
      if (idx !== null) d.dataset.idx = String(idx);
      return d;
    };

    // frowny
    const fSlot = makeSlot('frowny');
    if (avail.frowny && specials.frowny > 0) fSlot.append(makePiece('frowny'));
    slots.append(fSlot);

    // smileys 0..2
    for (let i=0;i<3;i++) {
      const sSlot = makeSlot('smiley', i);
      if (avail.smiley[i] && specials.smiley > 0) sSlot.append(makePiece('smiley', i));
      slots.append(sSlot);
    }

    rack.append(title, slots);
    racksEl.append(rack);
    // wire drag
    let lastDragAccepted = false;
    rack.querySelectorAll('.kio-piece').forEach((pieceEl)=>{
      const slot = pieceEl.closest('.kio-slot');
      pieceEl.addEventListener('dragstart', (e)=>{
        if (!pieceEl.draggable) { e.preventDefault(); return; }
        const kind = pieceEl.dataset.kind;
        // prevent dragging specials if exhausted
        if (kind==='frowny' && (!avail.frowny || specials.frowny<=0)) { e.preventDefault(); return; }
        if (kind==='smiley') {
          const si = Number(pieceEl.dataset.idx|0);
          if (!avail.smiley[si] || specials.smiley<=0) { e.preventDefault(); return; }
        }
        lastDragAccepted = false;
        slot?.classList.add('dragging');
        // keep original visible to avoid browser quirks that cancel drags
        // highlight valid board targets for this player
        const human = getActiveSetupHuman();
        if (human) {
          boardEl.querySelectorAll('.kio-cell').forEach((cellEl, i) => {
            const allowed = cellEl.dataset.color === human.color && !gameState.board.cells[i];
            if (allowed) cellEl.classList.add('kio-droppable');
          });
        }
        // custom drag image without border
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          const ghost = document.createElement('div');
          ghost.style.width = '36px';
          ghost.style.height = '36px';
          ghost.style.borderRadius = '50%';
          ghost.style.background = getComputedStyle(pieceEl).backgroundColor;
          ghost.style.display = 'grid';
          ghost.style.placeItems = 'center';
          ghost.style.position = 'fixed';
          ghost.style.top = '-1000px';
          const emoji = pieceEl.querySelector('.kio-emoji')?.textContent || '';
          const em = document.createElement('span');
          em.textContent = emoji;
          em.style.fontSize = '22px';
          em.style.lineHeight = '1';
          em.style.color = (pieceEl.classList.contains('kio-b')) ? '#fff' : '#111827';
          ghost.appendChild(em);
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 18, 18);
          setTimeout(()=> document.body.removeChild(ghost), 0);
        }
        const si = pieceEl.dataset.idx ?? '';
        e.dataTransfer?.setData('text/plain', si!=='' ? `${kind}:${si}` : kind);
      });
      pieceEl.addEventListener('dragend', ()=>{
        slot?.classList.remove('dragging');
        // nothing to restore visually; just cleanup highlights
        // remove highlights
        boardEl.querySelectorAll('.kio-droppable, .kio-drop-hover').forEach(el => el.classList.remove('kio-droppable', 'kio-drop-hover'));
      });
    });

    // Hook to mark accepted drops
    boardEl.addEventListener('kio-drop-accepted', () => { lastDragAccepted = true; });
  }

  // start screen interactions
  // conditional render of #4
  const updateRow4 = () => {
    const v3 = sels[2]?.value || 'none';
    row4.style.display = (v3 !== 'none') ? '' : 'none';
  };
  function applySeatUI(idx) {
    const sel = sels[idx]; const nameEl = names[idx]; if (!sel || !nameEl) return;
    const t = sel.value;
    if (t === 'none') {
      nameEl.style.display = 'none';
      nameEl.disabled = true;
    } else if (t === 'human') {
      nameEl.style.display = '';
      nameEl.disabled = false;
      const saved = localStorage.getItem(LS_KEY(idx+1));
      if (saved && saved.trim()) { nameEl.value = saved; }
      else if (!nameEl.value || nameEl.value.startsWith('AI ')) { nameEl.value = `Human ${idx+1}`; }
    } else if (t.startsWith('ai-')) {
      nameEl.style.display = '';
      nameEl.disabled = true;
      // Assign playful AI name if not already one
      if (!nameEl.value || !nameEl.disabled || nameEl.value.startsWith('Human')) {
        nameEl.value = randPun();
      }
    }
  }
  sels.forEach((sel, idx)=>{
    sel?.addEventListener('change', ()=>{
      applySeatUI(idx);
      updateRow4();
    });
  });
  // Persist human names as the user types
  names.forEach((input, idx)=>{
    input?.addEventListener('input', ()=>{
      if (!input.disabled) localStorage.setItem(LS_KEY(idx+1), input.value);
    });
  });
  // Initialize seat UI
  sels.forEach((_, idx)=>applySeatUI(idx));
  updateRow4();
  btnNew.addEventListener('click', () => {
    clearAITimers();
    teardownPlayLayout();
    startEl.classList.add('hidden');
    rulesEl.classList.add('hidden');
    setupEl.classList.remove('hidden');
    // Build players from selectors (ignore 'none')
    const chosen = [];
    for (let i=0;i<4;i++) {
      const t = sels[i].value;
      if (t==='none') continue;
      const kind = (t==='human') ? 'human' : 'ai';
      const level = t.startsWith('ai-') ? t.split('-')[1] : null;
      chosen.push({ kind, level, name: names[i].value || (kind==='human'? (localStorage.getItem(LS_KEY(i+1)) || `Human ${i+1}`) : randPun()) });
    }
    startFromChosen(chosen);
  });
  btnHow.addEventListener('click', () => {
    clearAITimers();
    teardownPlayLayout();
    startEl.classList.add('hidden');
    setupEl.classList.add('hidden');
    rulesEl.classList.remove('hidden');
  });
  btnBack.addEventListener('click', () => {
    // In the dedicated Game view, Back navigates to the Start view route
    window.location.hash = '#/gallery/knock-it-off';
  });
  wrap.querySelector('#kio-rules-back').addEventListener('click', () => {
    rulesEl.classList.add('hidden');
    startEl.classList.remove('hidden');
  });

  // Prefer showing the setup section in this view
  startEl.classList.add('hidden');
  rulesEl.classList.add('hidden');
  setupEl.classList.remove('hidden');

  // Autostart path when coming from Start view; otherwise default to 1 Human vs 1 AI
  let chosen = null;
  try { const raw = sessionStorage.getItem('kio:chosen'); chosen = raw ? JSON.parse(raw) : null; } catch {}
  if (Array.isArray(chosen) && chosen.length >= 2) {
    try { sessionStorage.removeItem('kio:chosen'); } catch {}
    startFromChosen(chosen);
  } else {
    // If not unlocked via Start view, bounce back to Start
    window.location.hash = '#/gallery/knock-it-off';
    return frag;
  }

  // Backdrop for legibility
  const appEl = document.getElementById('app');
  if (appEl) { appEl.style.background = 'var(--bg)'; appEl.style.color = 'var(--text)'; }

  return frag;
}

function exampleSVG(kind, stage='before') {
  // Simple 5x5 diagram with colored discs and an arrow path
  const cell = 44, size = cell*5;
  const board = (x,y)=>`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="${(x+y)%2? '#e2e8f0':'#f1f5f9'}"/>`;
  // Make discs larger so arrows feel proportional
  const disc = (x,y,fill)=>`<circle cx="${x*cell+cell/2}" cy="${y*cell+cell/2}" r="${cell*0.42}" fill="${fill}" stroke="#1f2937" stroke-width="2.5"/>`;
  const arrow = (x1,y1,x2,y2)=>`<defs><marker id="kio-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#111827"/></marker></defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="3" marker-end="url(#kio-arrow)"/>`;
  let pieces='', arrows='';
  if (kind==='orth') {
    if (stage==='before') {
      pieces += disc(0,2,'#3b82f6'); // blue mover
      pieces += disc(2,2,'#ef4444'); // red bumped
      pieces += disc(3,2,'#10b981'); // green bumped
      arrows = arrow(cell*0.5,cell*2.5, cell*4.5, cell*2.5);
    } else {
      // After: blue stops at (2,2); red moves to (3,2); green off board
      pieces += disc(2,2,'#3b82f6'); // blue
      pieces += disc(3,2,'#ef4444'); // red
    }
  } else { // diag
    if (stage==='before') {
      pieces += disc(1,1,'#ef4444'); // red mover
      pieces += disc(2,2,'#3b82f6'); // blue bumped
      pieces += disc(3,3,'#10b981'); // green bumped
      arrows = arrow(cell*1.5,cell*1.5, cell*3.7, cell*3.7);
    } else {
      // After: red moves to (2,2); blue to (3,3); green off board
      pieces += disc(2,2,'#ef4444');
      pieces += disc(3,3,'#3b82f6');
    }
  }
  let squares='';
  for (let y=0;y<5;y++) for (let x=0;x<5;x++) squares += board(x,y);
  const label = `${kind==='orth'?'Orthogonal':'Diagonal'} ${stage}`;
  return `<svg class="kio-example" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">${squares}${pieces}${arrows}</svg>`;
}

// (moved startFromChosen into render() for proper scope)
