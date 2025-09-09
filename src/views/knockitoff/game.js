import { MASK_2P, MASK_4P, COLORS } from './masks.js';
import { createGame, nextTurn } from './state.js';
import { Button } from '../../components/ui/button.js';
import { AI_PROFILES } from './ai/profiles.js';
import { rememberOwn as rememberOwnMod, forgetExpired as forgetExpiredMod } from './ai/memory.js';
import { setAppSolid } from '../../lib/appShell.js';
import { simulateMove as simMoveCore } from './engine/moves.js';
import { performMove as performMoveCore } from './play/perform.js';
import { onKnock as onKnockRule, checkEnd as checkEndRule } from './rules.js';
import { planAIPlacements as planAIPlacementsCore, revealAIPlacements as revealAIPlacementsCore, maybeAutoFillBlanks as maybeAutoFillBlanksCore, isBoardPopulated as isBoardPopulatedUI, isBoardReady } from './setup/planner.js';
import { chooseAIMove as chooseAIMoveCore, getAIProfileForColor as getAIProfileForColorCore } from './ai/evaluate.js';
import { aiStepIfNeeded as aiStepIfNeededCore } from './ai/turns.js';
import { drawBoardFromMask, paintBoard as paintBoardUI, clearDirMarkers as clearDirMarkersUI, showMoveArrow as showMoveArrowUI, removeMoveArrow as removeMoveArrowUI, renderSideRacks as renderSideRacksUI, renderLog as renderLogUI, ensurePlayLayout as ensurePlayLayoutUI, teardownPlayLayout as teardownPlayLayoutUI, syncLogHeight as syncLogHeightUI, showWinModal as showWinModalUI } from './ui/renderers.js';
import { renderSetupRack as renderSetupRackUI } from './ui/racks.js';
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

  frag.append(wrap);
  wrap.innerHTML = `
    <h2>Knock It Off!</h2>
    <section class="stack kio-setup" id="kio-setup">
      <div class="kio-board" aria-label="8x8 board" role="grid"></div>
      <div class="kio-racks" id="kio-racks"></div>
      <div class="kio-buttons">${Button({ id: 'kio-back', label: 'Back', variant: 'secondary' })}</div>
    </section>
  `;
  const setupEl = wrap.querySelector('#kio-setup');
  
  const boardEl = setupEl.querySelector('.kio-board');
  const btnBack = setupEl.querySelector('#kio-back');
  btnBack?.addEventListener('click', () => {
    // Navigate back to the Start view route for Knock It Off!
    window.location.hash = '#/gallery/knock-it-off';
  });
  let currentMask = MASK_2P;
  let gameState = null;
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

  // AI memory of own specials by color
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

  function paintBoard(cells) { paintBoardUI(boardEl, cells); syncLogHeight(); }

  // removed turn banner; we use arrow indicator next to active rack

  function renderSideRacks(state) { renderSideRacksUI(state, playWrap); }

  function renderLog(state) {
    renderLogUI(state, playWrap, {
      onPreviewEnter: (entry) => { isPreview = true; clearDirMarkers(); removeMoveArrow(); paintBoard(entry.before); if (entry.from != null && entry.dirKey) showMoveArrow(entry.from, entry.dirKey); },
      onPreviewExit: () => { isPreview = false; removeMoveArrow(); paintBoard(state.board.cells); enableHumanSelect(); },
    });
    // Adjust layout then snap to bottom for new entries
    syncLogHeight();
    try {
      const box = playWrap?.querySelector('.kio-right .kio-log');
      if (box) box.scrollTop = box.scrollHeight;
    } catch {}
  }

  function syncLogHeight() { syncLogHeightUI(playWrap, boardEl); }

  // ---------- Movement engine ----------
  // geometry helpers now come from engine/moves.js

  const simulateMove = simMoveCore;

  const onKnock = onKnockRule;
  const checkEnd = checkEndRule;

  function showWinModal(winner) { isPreview = false; clearDirMarkers(); removeMoveArrow(); showWinModalUI(winner); }

  function performMove(state, move) {
    onKnock(state, move.knocked);
    performMoveCore(state, move, {
      getProfileForColor: (color) => getAIProfileForColorCore(gameState, AI_PROFILES, color),
      forgetExpired: (color, profile) => forgetExpired(color, profile),
      paintBoard: (cells) => paintBoard(state.board.cells),
      renderSideRacks: (st) => renderSideRacks(st),
      renderLog: (st) => renderLog(st),
      checkEnd: (st) => checkEnd(st),
      nextTurn: (st) => nextTurn(st),
      enableHumanSelect: () => enableHumanSelect(),
      showWinModal: (winner) => showWinModal(winner),
      COLORS,
    });
  }

  function aiStepIfNeeded() {
    aiStepIfNeededCore(gameState, {
      chooseAIMove: (state, color) => chooseAIMoveCore(state, color, AI_PROFILES, DIRS, forgetExpired),
      nextTurn: (state) => nextTurn(state),
      renderSideRacks: (state) => renderSideRacks(state),
      enableHumanSelect: () => enableHumanSelect(),
      showMoveArrow: (fromIdx, dirKey) => showMoveArrowUI(boardEl, fromIdx, dirKey),
      removeMoveArrow: () => removeMoveArrowUI(),
      performMove: (state, mv) => performMove(state, mv),
    });
  }

  function clearDirMarkers() { clearDirMarkersUI(boardEl); }

  // Click-to-select interactions
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

  // colorLabel handled inside performMoveCore

  function showMoveArrow(fromIdx, dirKey) { showMoveArrowUI(boardEl, fromIdx, dirKey); }
  function removeMoveArrow() { removeMoveArrowUI(); }

  // AI placement planning and reveal
  function planAIPlacements(){ planAIPlacementsCore(gameState, AI_PROFILES, rememberOwn); }
  function clearAITimers(){ aiTimers.forEach(id=>clearTimeout(id)); aiTimers = []; }
  function revealAIPlacements(){ clearAITimers(); revealAIPlacementsCore(boardEl, gameState, (t)=> aiTimers.push(t), maybeEnterPlayPhase); }

  function maybeAutoFillBlanks() { maybeAutoFillBlanksCore(boardEl, gameState, getActiveSetupHuman, renderRacks, maybeEnterPlayPhase); }

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
    renderSetupRackUI(state, { racksEl, boardEl, getActiveSetupHuman });
  }

  // start screen handled in start.js; nothing to wire here

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
