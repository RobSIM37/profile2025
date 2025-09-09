import { MASK_2P, MASK_4P, COLORS, maskToGrid } from './masks.js';
import { createGame, nextTurn } from './state.js';
import { Button } from '../../components/ui/button.js';
import { FaceIcon } from '../../components/ui/faceIcon.js';
import { openModal } from '../../components/ui/modal.js';
import { AI_PROFILES } from './ai/profiles.js';
import { ensureAIMemory as ensureAIMemoryMod, rememberOwn as rememberOwnMod, forgetExpired as forgetExpiredMod } from './ai/memory.js';
import { setAppSolid } from '../../lib/appShell.js';
import { idxToXY, xyToIdx, inBounds, collectOccupiedAlong, simulateMove as simMoveCore, listLegalMovesForColor as listMovesCore } from './engine/moves.js';
import { planAIPlacements as planAIPlacementsCore, revealAIPlacements as revealAIPlacementsCore, maybeAutoFillBlanks as maybeAutoFillBlanksCore, isBoardPopulated as isBoardPopulatedUI, isBoardReady } from './setup/planner.js';
import { chooseAIMove as chooseAIMoveCore, getAIProfileForColor as getAIProfileForColorCore } from './ai/evaluate.js';
import { drawBoardFromMask, paintBoard as paintBoardUI, clearDirMarkers as clearDirMarkersUI, showMoveArrow as showMoveArrowUI, removeMoveArrow as removeMoveArrowUI, renderSideRacks as renderSideRacksUI, renderLog as renderLogUI, ensurePlayLayout as ensurePlayLayoutUI, teardownPlayLayout as teardownPlayLayoutUI, syncLogHeight as syncLogHeightUI } from './ui/renderers.js';
import { enableHumanSelect as enableHumanSelectUI, enableSetupDnD as enableSetupDnDUI } from './ui/inputs.js';

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
    // Track setup prerequisites so we can transition to play only when both are done
    gameState.setup = { humanColors, index: 0, humanPlacementDone: false, aiRevealDone: false };
    renderRacks(gameState);
    planAIPlacements();
    revealAIPlacements();
  }

  // AI profiles are imported from ./ai/profiles.js

  // AI memory of own specials by color
  const ensureAIMemory = () => ensureAIMemoryMod(gameState);
  const rememberOwn = (color, idx, kind) => rememberOwnMod(gameState, color, idx, kind);
  const forgetExpired = (color, profile) => forgetExpiredMod(gameState, color, profile);

  // (removed unused createCheckerIcon; renderers handle icons)

  function draw(mask) {
    // Render mask using shared renderer
    drawBoardFromMask(boardEl, mask);

    // Wire setup-phase DnD via inputs module
    const getIndex = (cellEl) => Number(cellEl?.dataset.index ?? '-1');
    const isAllowed = (cellEl) => {
      if (!gameState || !cellEl) return false;
      if (gameState.phase !== 'setup') return false;
      const idx2 = getIndex(cellEl);
      const human = getActiveSetupHuman();
      return Boolean(human && cellEl.dataset.color === human.color && !gameState.board.cells[idx2]);
    };
    enableSetupDnDUI({
      boardEl,
      getIsSetupActive: () => gameState?.phase === 'setup',
      isAllowedCell: isAllowed,
      onDrop: ({ cellEl, payload }) => {
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
      },
    });
  }
  // Play layout + panels
  function ensurePlayLayout() {
    if (playWrap && playWrap.isConnected) return;
    const res = ensurePlayLayoutUI(boardEl);
    playWrap = res.playWrap; cleanupResize = res.cleanupResize;
  }

  function teardownPlayLayout() {
    if (!playWrap) return;
    teardownPlayLayoutUI(boardEl, playWrap, cleanupResize);
    playWrap = null; cleanupResize = null;
  }

  function paintBoard(cells) { paintBoardUI(boardEl, cells); syncLogHeight(); }

  // removed turn banner; we use arrow indicator next to active rack

  function renderSideRacks(state) { renderSideRacksUI(state, playWrap); }

  function renderLog(state) {
    renderLogUI(state, playWrap, {
      onPreviewEnter: (entry) => { isPreview = true; clearDirMarkers(); removeMoveArrow(); paintBoard(entry.before); if (entry.from != null && entry.dirKey) showMoveArrow(entry.from, entry.dirKey); },
      onPreviewExit: () => { isPreview = false; removeMoveArrow(); paintBoard(state.board.cells); enableHumanSelect(); },
    });
    syncLogHeight();
  }

  function syncLogHeight() { syncLogHeightUI(playWrap, boardEl); }

  // ---------- Movement engine ----------
  // geometry helpers now come from engine/moves.js

  const simulateMove = simMoveCore;

  function listLegalMovesForColor(state, color) { return listMovesCore(state, color, DIRS); }





  function chooseAIMove(state, color) {
    return chooseAIMoveCore(state, color, AI_PROFILES, DIRS, forgetExpired);
  }

  function deepCopyCells(cells) { return cells.map(c=> c ? { ...c } : null); }

  // (removed unused appendLog)

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
    const prof = getAIProfileForColorCore(gameState, AI_PROFILES, moverColor);
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

  function clearDirMarkers() { clearDirMarkersUI(boardEl); }

  // enableHumanDrag was an older interaction mode; removed as unused

  // rgbaFromHex moved to shared color utils; not needed here

  // Click-to-select alternative, more reliable across browsers
  function enableHumanSelect() {
    if (isPreview) return;
    enableHumanSelectUI({
      boardEl,
      state: gameState,
      DIRS,
      simulateMove,
      performMove,
      aiStepIfNeeded,
      helpers: { clearDirMarkers, showMoveArrow, removeMoveArrow },
      getIsPreview: () => isPreview,
    });
  }

  function colorLabel(c) {
    const name = COLORS[c] || c;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function showMoveArrow(fromIdx, dirKey) { showMoveArrowUI(boardEl, fromIdx, dirKey); }
  function removeMoveArrow() { removeMoveArrowUI(); }

  // syncLeftTop handled by renderers sync; removed local implementation

  // ——— AI placement planning and reveal ———
  function planAIPlacements(){ planAIPlacementsCore(gameState, AI_PROFILES, rememberOwn); }
  function clearAITimers(){ aiTimers.forEach(id=>clearTimeout(id)); aiTimers = []; }
  function revealAIPlacements(){ clearAITimers(); revealAIPlacementsCore(boardEl, gameState, (t)=> aiTimers.push(t), maybeEnterPlayPhase); }

  function maybeAutoFillBlanks() { maybeAutoFillBlanksCore(boardEl, gameState, getActiveSetupHuman, renderRacks, maybeEnterPlayPhase); }

  function isBoardPopulated() { return isBoardPopulatedUI(boardEl); }

  function maybeEnterPlayPhase() {
    if (!gameState || gameState.phase === 'play') return;
    // Transition only after: all human placements complete AND AI reveal loop finished
    const setup = gameState.setup || {};
    const humanTotal = Array.isArray(setup.humanColors) ? setup.humanColors.length : 0;
    const humansDone = humanTotal === 0 || (setup.index >= humanTotal) || setup.humanPlacementDone === true;
    if (humansDone && !setup.humanPlacementDone) setup.humanPlacementDone = true;
    const aiDone = setup.aiRevealDone === true;
    // Also require the board to be logically ready
    if (humansDone && aiDone && isBoardReady(gameState)) {
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
