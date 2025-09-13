import { openModal } from '../../../components/ui/modal.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeDeck } from './engine/deck.js';
import { createInitialState, isGameOver, advanceTurn } from './engine/state.js';
import { canFlip, flipUp, flipDown, evaluateFlip } from './engine/rules.js';
import { createBoard } from './ui/board.js';
import { makeAIControllers, rememberForAll, chooseFlip } from './ai/choose.js';
import { makeTimer } from '../../../lib/timers.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';

export const meta = { title: 'Memory — Game', description: 'Find matching pictures' };

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  // Source pane (hidden by default) toggled by subheader tabs
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';
  const wrap = document.createElement('section'); wrap.className = 'stack';

  // Pull config
  let config = null;
  try { config = JSON.parse(sessionStorage.getItem('memory:chosen') || 'null'); } catch {}
  const players = (config?.players || [{ kind: 'human', name: 'You' }]).slice(0,4);
  if (players.length === 0) players.push({ kind:'human', name:'You' });
  const faceUpSec = Number(config?.faceUpSec) || 1;

  let deck = makeDeck();
  let state = createInitialState(deck, players, faceUpSec);
  let aiCtrls = makeAIControllers(players);

  // Header: scores only (controls removed; subheader handles nav)
  const header = document.createElement('div'); header.style.display = 'flex'; header.style.justifyContent = 'center'; header.style.alignItems = 'center';
  const scores = document.createElement('div'); scores.className = 'mem-scores';
  header.append(scores);

  // Host for board so we can rebuild it for New Game
  const boardHost = document.createElement('div');
  let boardUI = createBoard({ cards: state.cards, cols: 10, onFlip: onHumanFlip });

  // timers (guard against rogue/overlapping timers)
  const mismatchT = makeTimer();
  const aiT = makeTimer();

  wrap.append(header, boardHost);
  boardHost.append(boardUI.root);
  // Subheader with Demo/Source tabs and title link back to setup
  const sub = makeGallerySubheader({
    title: 'Memory',
    href: '#/gallery/memory',
    emitInitial: false,
    onChange(id){
      const showDemo = id === 'demo';
      if (showDemo) {
        try { wrap.style.display = ''; srcPane.style.display = 'none'; } catch {}
        return;
      }
      try { wrap.style.display = 'none'; renderMemorySourceBrowser(srcPane); srcPane.style.display = ''; } catch {}
    },
  });
  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  frag.append(sub.root, wrap, srcPane);

  function renderScores(){
    const parts = players.map((p,i)=>{
      const active = i === state.current;
      const style = active ? 'font-weight:800; color: var(--link);' : '';
      return `<span style="${style}">${escapeHtml(p.name||('P'+(i+1)))}: ${state.scores[i]}</span>`;
    });
    scores.innerHTML = parts.join(' · ');
  }
  renderScores();

  function setCardState(idx, st){ boardUI.setState(idx, st); }

  function onHumanFlip(idx){
    if (state.lock) return;
    const card = state.cards[idx];
    if (!card || !canFlip(card)) return;
    flipUp(card); setCardState(idx, 'up'); rememberForAll(aiCtrls, state, idx);
    const res = evaluateFlip(state, card);
    if (res.action === 'continue') return;
    if (res.action === 'match') { renderScores(); if (isGameOver(state)) return onGameOver(); /* extra turn */ return maybeAIMove(); }
    if (res.action === 'mismatch') return handleMismatch(idx);
  }

  function handleMismatch(idx2){
    state.lock = true;
    const first = state.firstPick; // still set
    const a = state.cards[first];
    const b = state.cards[idx2];
    mismatchT.after(state.faceUpMs, () => {
      if (a) { flipDown(a); setCardState(a.idx, 'down'); }
      if (b) { flipDown(b); setCardState(b.idx, 'down'); }
      state.firstPick = null;
      state.lock = false;
      advanceTurn(state);
      renderScores();
      maybeAIMove();
    });
  }

  function onGameOver(){
    const max = Math.max(...state.scores);
    const winners = players.map((p,i)=>({p,i})).filter(x=>state.scores[x.i]===max);
    const names = winners.map(w=>escapeHtml(w.p.name || ('P'+(w.i+1)))).join(', ');
    const body = document.createElement('div');
    body.className = 'stack';
    const p = document.createElement('p'); p.innerHTML = `Winner: <strong>${names}</strong>`; body.append(p);
    const ul = document.createElement('ul'); ul.style.listStyle = 'none'; ul.style.padding = '0';
    players.forEach((pl,i)=>{
      const li = document.createElement('li'); li.innerHTML = `${escapeHtml(pl.name||('P'+(i+1)))} — <strong>${state.scores[i]}</strong>`; ul.append(li);
    });
    body.append(ul);
    openModal({
      title: 'Game Over',
      titleAlign: 'center',
      body,
      actionsAlign: 'center',
      actions: [
        { label: 'Play Again', onClick: () => { location.hash = '#/gallery/memory/game'; } },
        { label: 'New Setup', variant: 'secondary', onClick: () => { try { sessionStorage.removeItem('memory:chosen'); } catch {}; location.hash = '#/gallery/memory'; } },
      ],
    });
  }

  function maybeAIMove(){
    const cur = state.players[state.current];
    if (!cur || cur.kind !== 'ai') return;
    aiT.after(350, aiTurnStep);
  }

  function aiTurnStep(){
    if (state.lock) return;
    const cur = state.players[state.current];
    if (!cur || cur.kind !== 'ai') return;
    const idx = chooseFlip(aiCtrls, state);
    if (idx < 0) return;
    const card = state.cards[idx];
    if (!canFlip(card)) { aiT.after(100, aiTurnStep); return; }
    flipUp(card); setCardState(idx, 'up'); rememberForAll(aiCtrls, state, idx);
    const res = evaluateFlip(state, card);
    if (res.action === 'continue') { aiT.after(350, aiTurnStep); return; }
    if (res.action === 'match') { renderScores(); if (isGameOver(state)) return onGameOver(); aiT.after(450, aiTurnStep); return; }
    if (res.action === 'mismatch') { return handleMismatch(res.idx2); }
  }

  function newGame(){
    // Clear timers and rebuild fresh state/deck with same players
    mismatchT.clear();
    aiT.clear();
    deck = makeDeck();
    state = createInitialState(deck, players, faceUpSec);
    aiCtrls = makeAIControllers(players);
    // Rebuild board UI
    boardHost.innerHTML = '';
    boardUI = createBoard({ cards: state.cards, cols: 10, onFlip: onHumanFlip });
    boardHost.append(boardUI.root);
    renderScores();
    maybeAIMove();
  }

  // Kick off AI if needed
  maybeAIMove();

  return frag;
}

// Lightweight local source browser (mirrors Memory page)
const MEM_FILES = [
  'page.js','start.js','game2.js',
  'engine/deck.js','engine/state.js','engine/rules.js',
  'ai/memory.js','ai/choose.js',
  'ui/card.js','ui/board.js','ui/icons/index.js'
];
function renderMemorySourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div'); list.className = 'stack';
  const note = document.createElement('p'); note.textContent = 'Source files under src/views/gallery/memory/';
  list.append(note);
  MEM_FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary'); sum.textContent = path; item.append(sum);
    const pre = document.createElement('pre'); const code = document.createElement('code'); code.textContent = 'Loading.'; pre.append(code); item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try { const res = await fetch('src/views/gallery/memory/' + path, { cache: 'no-cache' }); const txt = await res.text(); code.textContent = txt; }
      catch(e){ code.textContent = 'Unable to load file in this context.'; }
    }, { once: true });
    list.append(item);
  });
  host.append(list);
}

function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

