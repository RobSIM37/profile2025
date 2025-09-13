import { MASK_2P, MASK_4P, COLORS } from "./masks.js";
import { createGame, nextTurn } from "./state.js";
import { AI_PROFILES } from "./ai/profiles.js";
import {
  rememberOwn as rememberOwnMod,
  forgetExpired as forgetExpiredMod,
  bindMemory as bindMemoryAI,
} from "./ai/memory.js";
import { setAppSolid } from "../../../lib/appShell.js";
import { makeGallerySubheader } from "../../../components/ui/subheader.js";
import { simulateMove as simMoveCore } from "./engine/moves.js";
import { DIRS } from "./engine/directions.js";
import { performMove as performMoveCore } from "./play/perform.js";
import { onKnock as onKnockRule, checkEnd as checkEndRule } from "./rules.js";
import {
  planAIPlacements as planAIPlacementsCore,
  revealAIPlacements as revealAIPlacementsCore,
  maybeAutoFillBlanks as maybeAutoFillBlanksCore,
  isBoardReady,
} from "./setup/planner.js";
import {
  chooseAIMove as chooseAIMoveCore,
  getAIProfileForColor as getAIProfileForColorCore,
} from "./ai/evaluate.js";
import { aiStepIfNeeded as aiStepIfNeededCore } from "./ai/turns.js";
import {
  paintBoard as paintBoardUI,
  clearDirMarkers as clearDirMarkersUI,
  showMoveArrow as showMoveArrowUI,
  removeMoveArrow as removeMoveArrowUI,
  renderSideRacks as renderSideRacksUI,
  renderLog as renderLogUI,
  ensurePlayLayout as ensurePlayLayoutUI,
  syncLogHeight as syncLogHeightUI,
  showWinModal as showWinModalUI,
} from "./ui/renderers.js";
import { renderSetupRack as renderSetupRackUI } from "./ui/racks.js";
import { enableHumanSelect as enableHumanSelectUI } from "./ui/inputs.js";
import { drawSetupBoard as drawSetupBoardUI } from "./ui/setupBoard.js";
import { maybeEnterPlayPhase as maybeEnterPlayPhaseCore } from "./setup/phase.js";
import { getActiveSetupHuman as getActiveSetupHumanCore } from "./util/players.js";
import { pullAutostartChosen } from "./flow/autostart.js";

export const meta = {
  title: "Knock It Off!",
  description: "Placement mask preview for setup (2P or 3/4P)",
};

export function render() {
  const frag = document.createDocumentFragment();
  // Subheader: title with Demo/Source tabs (match Timesweeper)
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';
  const sub = makeGallerySubheader({
    title: 'Knock it Off',
    href: '#/gallery/knock-it-off',
    emitInitial: false,
    onChange(id){
      const showDemo = id === 'demo';
      // For Demo, keep users on the Game route and show the game panel
      if (showDemo) {
        try { wrap.style.display = ''; srcPane.style.display = 'none'; } catch {}
        return;
      }
      // For Source, hide the game panel and show source browser
      try { wrap.style.display = 'none'; renderKioSourceBrowser(srcPane); srcPane.style.display = ''; } catch {}
    },
  });
  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}
  const wrap = document.createElement("section");
  wrap.className = "stack kio-wrap";
  setAppSolid(true);

  frag.append(sub.root, wrap, srcPane);
  wrap.innerHTML = `
    <section class="stack kio-setup" id="kio-setup">
      <div class="kio-board" aria-label="8x8 board" role="grid"></div>
      <div class="kio-racks" id="kio-racks"></div>
    </section>
  `;
  const setupEl = wrap.querySelector("#kio-setup");

  const boardEl = setupEl.querySelector(".kio-board");
  let currentMask = MASK_2P;
  let gameState = null;
  // Active human during setup sequence
  const getActiveSetupHuman = () => getActiveSetupHumanCore(gameState);
  let aiTimers = [];
  let playWrap = null; // layout wrapper for play phase
  let cleanupResize = null;
  let isPreview = false; // when hovering log entries, disable interactions

  // Start a game from selected players (array of { kind: 'human'|'ai', level, name })
  function startFromChosen(chosen) {
    const pc = chosen.length;
    currentMask = pc === 2 ? MASK_2P : MASK_4P;
    draw(currentMask);
    const POL = ["b", "r", "g", "u"];
    const allowed =
      pc === 2 ? ["b", "r"] : pc === 3 ? ["b", "r", "g"] : POL.slice();
    const turnColors = allowed.slice();
    const assigned = chosen.slice().sort(() => Math.random() - 0.5);
    const types = assigned.map((c) => (c.kind === "human" ? "human" : "ai"));
    const playerNames = assigned.map((c) => c.name);
    const aiLevels = assigned.map((c) => c.level);
    const st = createGame({
      playerCount: pc,
      playerTypes: types,
      playerNames,
      aiLevels,
      turnColors,
    });
    // expose for debugging
    wrap.__kioState = st;
    gameState = st;
    gameState.phase = "setup";
    // Bind AI memory helpers to the new state
    {
      const m = bindMemoryAI(gameState);
      rememberOwn = m.rememberOwn;
      forgetExpired = m.forgetExpired;
    }
    const humanColors = gameState.players
      .filter((p) => p.type === "human")
      .map((p) => p.color);
    // Track setup prerequisites so we can transition to play only when both are done
    gameState.setup = {
      humanColors,
      index: 0,
      humanPlacementDone: false,
      aiRevealDone: false,
    };
    renderRacks(gameState);
    planAIPlacements();
    revealAIPlacements();
  }

  // AI memory of own specials by color (bound after state init)
  let rememberOwn = (color, idx, kind) =>
    rememberOwnMod(gameState, color, idx, kind);
  let forgetExpired = (color, profile) =>
    forgetExpiredMod(gameState, color, profile);

  function draw(mask) {
    drawSetupBoardUI({
      boardEl,
      mask,
      stateRef: () => gameState,
      getActiveSetupHuman: (st) => getActiveSetupHumanCore(st),
      renderRacks: (st) => renderRacks(st),
      maybeAutoFillBlanks: () => maybeAutoFillBlanks(),
    });
  }
  // Play layout + panels
  function ensurePlayLayout() {
    if (playWrap && playWrap.isConnected) return;
    const res = ensurePlayLayoutUI(boardEl);
    playWrap = res.playWrap;
    cleanupResize = res.cleanupResize;
  }

  function paintBoard(cells) {
    paintBoardUI(boardEl, cells);
    syncLogHeight();
  }

  function renderSideRacks(state) {
    renderSideRacksUI(state, playWrap);
  }

  function renderLog(state) {
    renderLogUI(state, playWrap, {
      onPreviewEnter: (entry) => {
        isPreview = true;
        clearDirMarkers();
        removeMoveArrow();
        paintBoard(entry.before);
        if (entry.from != null && entry.dirKey)
          showMoveArrow(entry.from, entry.dirKey);
      },
      onPreviewExit: () => {
        isPreview = false;
        removeMoveArrow();
        paintBoard(state.board.cells);
        enableHumanSelect();
      },
    });
    // Adjust layout then snap to bottom for new entries
    syncLogHeight();
    try {
      const box = playWrap?.querySelector(".kio-right .kio-log");
      if (box) box.scrollTop = box.scrollHeight;
    } catch {}
  }

  function syncLogHeight() {
    syncLogHeightUI(playWrap, boardEl);
  }

  // ---------- Movement engine ----------
  // geometry helpers now come from engine/moves.js

  const simulateMove = simMoveCore;

  const onKnock = onKnockRule;
  const checkEnd = checkEndRule;

  function showWinModal(winner) {
    isPreview = false;
    clearDirMarkers();
    removeMoveArrow();
    showWinModalUI(winner);
  }

  function performMove(state, move) {
    onKnock(state, move.knocked);
    performMoveCore(state, move, {
      getProfileForColor: (color) =>
        getAIProfileForColorCore(gameState, AI_PROFILES, color),
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
      chooseAIMove: (state, color) =>
        chooseAIMoveCore(state, color, AI_PROFILES, DIRS, forgetExpired),
      nextTurn: (state) => nextTurn(state),
      renderSideRacks: (state) => renderSideRacks(state),
      enableHumanSelect: () => enableHumanSelect(),
      showMoveArrow: (fromIdx, dirKey) =>
        showMoveArrowUI(boardEl, fromIdx, dirKey),
      removeMoveArrow: () => removeMoveArrowUI(),
      performMove: (state, mv) => performMove(state, mv),
    });
  }

  function clearDirMarkers() {
    clearDirMarkersUI(boardEl);
  }

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

  function showMoveArrow(fromIdx, dirKey) {
    showMoveArrowUI(boardEl, fromIdx, dirKey);
  }
  function removeMoveArrow() {
    removeMoveArrowUI();
  }

  // AI placement planning and reveal
  function planAIPlacements() {
    planAIPlacementsCore(gameState, AI_PROFILES, rememberOwn);
  }
  function clearAITimers() {
    aiTimers.forEach((id) => clearTimeout(id));
    aiTimers = [];
  }
  function revealAIPlacements() {
    clearAITimers();
    revealAIPlacementsCore(
      boardEl,
      gameState,
      (t) => aiTimers.push(t),
      maybeEnterPlayPhase
    );
  }

  function maybeAutoFillBlanks() {
    maybeAutoFillBlanksCore(
      boardEl,
      gameState,
      getActiveSetupHuman,
      renderRacks,
      maybeEnterPlayPhase
    );
  }

  function maybeEnterPlayPhase() {
    maybeEnterPlayPhaseCore(gameState, {
      isBoardReady,
      renderRacks,
      boardEl,
      enableHumanSelect,
      aiStepIfNeeded,
    });
  }

  function renderRacks(state) {
    const racksEl = setupEl.querySelector("#kio-racks");
    racksEl.innerHTML = "";
    const human =
      state.phase === "setup"
        ? getActiveSetupHuman() || state.players.find((p) => p.type === "human")
        : state.players.find((p) => p.type === "human");
    if (!human) return; // requires a human
    if (state.phase === "play") {
      ensurePlayLayout();
      renderSideRacks(state);
      renderLog(state);
      // Remove any setup hover highlights leftover
      boardEl
        .querySelectorAll(".kio-drop-hover")
        .forEach((el) => el.classList.remove("kio-drop-hover"));
      enableHumanSelect();
      syncLogHeight();
      racksEl.innerHTML = "";
      return;
    }
    renderSetupRackUI(state, { racksEl, boardEl, getActiveSetupHuman });
  }

  // start screen handled in start.js; nothing to wire here

  // Autostart path when coming from Start view; otherwise default to 1 Human vs 1 AI
  const chosen = pullAutostartChosen("kio:chosen");
  if (chosen) {
    startFromChosen(chosen);
  } else {
    // If not unlocked via Start view, bounce back to Start
    window.location.hash = "#/gallery/knock-it-off";
    return frag;
  }

  // Backdrop for legibility
  const appEl = document.getElementById("app");
  if (appEl) {
    appEl.style.background = "var(--bg)";
    appEl.style.color = "var(--text)";
  }

  return frag;
}

// Simple in-place source browser to mirror the page view
const KIO_FILES = [
  'index.js','start.js','game.js','howto.js','masks.js','rules.js','state.js',
  'ai/evaluate.js','ai/memory.js','ai/profiles.js','ai/turns.js',
  'engine/directions.js','engine/moves.js',
  'flow/autostart.js','flow/startGame.js',
  'play/perform.js',
  'setup/phase.js','setup/planner.js',
  'ui/inputs.js','ui/racks.js','ui/renderers.js','ui/setupBoard.js',
  'util/players.js',
];
function renderKioSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/knockitoff/';
  list.append(note);
  KIO_FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = path;
    item.append(sum);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'Loading.';
    pre.append(code);
    item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try {
        const res = await fetch('src/views/gallery/knockitoff/' + path, { cache: 'no-cache' });
        const txt = await res.text();
        code.textContent = txt;
      } catch (e) {
        code.textContent = 'Unable to load file in this context.';
      }
    }, { once: true });
    list.append(item);
  });
  host.append(list);
}
