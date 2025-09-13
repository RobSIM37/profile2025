import { Button } from '../../../components/ui/button.js';
import { openModal } from '../../../components/ui/modal.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { makeTimer } from '../../../lib/timers.js';
import { HudStat } from '../../../components/ui/hudStat.js';
import { Tag } from '../../../components/ui/tag.js';

export const meta = {
  title: 'FizzBuzz �?" Game',
  description: 'Human vs AI alternates on FizzBuzz; challenge-only validation with level-ups on correct human challenges.',
};

/** @typedef {'Human'|'AI'} Player */

export function render(){
  setAppSolid(true);

  const frag = document.createDocumentFragment();
  // Subheader with title + Demo/Source tabs
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';
  const sub = makeGallerySubheader({
    title: 'FizzBuzz',
    href: '#/gallery/fizzbuzz',
    emitInitial: false,
    onChange(id){
      const showDemo = id === 'demo';
      try {
        wrap.style.display = showDemo ? '' : 'none';
        srcPane.style.display = showDemo ? 'none' : '';
      } catch {}
      if (!showDemo) renderSourceBrowser(srcPane);
    },
  });
  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}
  const wrap = document.createElement('section');
  wrap.className = 'stack';

  // Live announcer
  const sr = document.createElement('div');
  sr.setAttribute('aria-live', 'polite');
  sr.style.position = 'absolute';
  sr.style.width = '1px'; sr.style.height = '1px'; sr.style.padding = '0';
  sr.style.margin = '-1px'; sr.style.overflow = 'hidden'; sr.style.clip = 'rect(0,0,0,0)'; sr.style.whiteSpace = 'nowrap'; border0(sr);

  // HUD
  const header = document.createElement('div');
  header.style.display = 'grid';
  header.style.gridTemplateColumns = 'repeat(2, 1fr)';
  header.style.gap = '8px';
  header.style.alignItems = 'center';
  const hudLevel = HudStat({ label: 'Level', value: '0' });
  const hudTimer = HudStat({ label: 'Timer', value: '-' });
  header.append(hudLevel.root, hudTimer.root);

  // (Removed separate Active Rules panel; rules are shown inline as toggle buttons)

  // Top two half-height controls row + Actions + Values grid
  const topRow = document.createElement('div');
  topRow.style.display = 'grid';
  topRow.style.gridTemplateRows = '1fr 1fr';
  topRow.style.gap = '6px';
  topRow.style.justifyItems = 'center';

  // Actions row (center the unified Respond button under the AI label)
  const actionsRow = document.createElement('div');
  actionsRow.style.display = 'flex';
  actionsRow.style.justifyContent = 'center';
  actionsRow.style.alignItems = 'center';
  actionsRow.style.gap = '8px';

  const btnGrid = document.createElement('div');
  btnGrid.style.display = 'flex';
  btnGrid.style.flexWrap = 'wrap';
  btnGrid.style.justifyContent = 'center';
  btnGrid.style.alignItems = 'stretch';
  btnGrid.style.gap = '8px';

  // Scrollable container for only the response buttons area
  const btnScroll = document.createElement('div');
  btnScroll.className = 'scroll-themed';
  btnScroll.style.maxHeight = 'none';
  btnScroll.style.overflowY = 'auto';
  btnScroll.style.overflowX = 'hidden';
  // Add inner padding so button box-shadows/borders aren't clipped
  btnScroll.style.padding = '6px 4px';
  btnScroll.style.borderRadius = '8px';
  btnScroll.append(btnGrid);

  const BUTTON_H = 48; // shrink response buttons by 25% (was 64)
  const TOP_H = 48;    // height for top-row controls to match Challenge

  wrap.append(header, topRow, actionsRow, btnScroll, sr);
  frag.append(sub.root, wrap, srcPane);

  // Game State
  /** @type {Map<number,string>} */
  const rules = new Map([[3, 'Fizz'], [5, 'Buzz']]);
  /** @type {{ N:number, level:number, rules:Map<number,string>, turn:Player, lastMove?:{player:Player,N:number,text:string,ts:number}, over:boolean, winner?:Player }} */
  const START_LEVEL = 1; // Start level
  const S = { N: 1, level: START_LEVEL, rules, turn: (Math.random() < 0.5 ? 'Human' : 'AI'), over: false };
  let pendingRuleAdd = false; // add rule after Next Level
  let levelCombos = computeAllCombos(S.rules);
  // Selected rule keys (divisors) for Human toggle inputs
  let selectedRuleKeys = new Set();
  // Rolling average response-time persistence
  let respAvgMs = loadRespAvgMs(); // defaults to 20000ms
  let respCount = loadRespCount(); // defaults to 0
  let lastHumanWindowMs = 0;

  // Timers
  const turnT = makeTimer();
  const loopT = makeTimer();
  let deadline = 0;
  let alive = true;

  // Init
  preloadRulesForLevel(S.level);
  syncRules();
  rebuildButtons();
  scheduleTurn();
  // Prevent page/body scroll while this view is active; only buttons area scrolls
  try {
    wrap.style.overflow = 'hidden';
    const appEl = document.getElementById('app');
    if (appEl) { appEl.style.removeProperty('overflow-y'); appEl.style.removeProperty('overflow-x'); appEl.style.removeProperty('height'); appEl.style.removeProperty('max-height'); }
    document.body.dataset.prevOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    sizeButtons();
  } catch {}

  // Cleanup on route change/unload to prevent timers or modals from leaking
  function cleanup(){
    alive = false;
    try { turnT.clear(); } catch {}
    try { loopT.clear(); } catch {}
    window.removeEventListener('hashchange', cleanup);
    window.removeEventListener('beforeunload', cleanup);
    window.removeEventListener('resize', sizeButtons);
    try {
      const appEl = document.getElementById('app');
      if (appEl) { appEl.style.removeProperty('overflow'); appEl.style.removeProperty('max-height'); }
      const prev = (document.body && document.body.dataset) ? (document.body.dataset.prevOverflow || '') : '';
      if (document.body) {
        document.body.style.overflow = prev;
        if (document.body.dataset) delete document.body.dataset.prevOverflow;
      }
    } catch {}
  }
  window.addEventListener('hashchange', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('resize', sizeButtons);

  return frag;

  // Logic
  function expectedOutput(N, rules){
    const parts = [...rules.entries()].filter(([k]) => N % k === 0).sort((a,b)=>a[0]-b[0]).map(([,w])=>w);
    return parts.length ? parts.join('') : String(N);
  }
  function wasValid(move){ return expectedOutput(move.N, S.rules) === move.text; }
  function other(p){ return p === 'Human' ? 'AI' : 'Human'; }
  function responseMs(level){
    // Fixed 20s per turn regardless of level
    return 20000;
  }
  function aiDelayMs(level){ return Math.max(250, 750 - level * 40); }
  // Mistake probability curve by current N: ~0 before 20, ~1 after 80
  function mistakeProbByN(N){
    const t = Math.max(0, Math.min(1, (N - 20) / 60));
    const s = t * t * (3 - 2 * t); // smoothstep
    return 0.01 + 0.98 * s; // ~1% at/below 20, ~99% at/above 80
  }
  function misplay(/*level*/){ return mistakeProbByN(S.N); }
  function badChallenge(/*level*/){ return mistakeProbByN(S.N); }
  function missedChallenge(/*level*/){ return mistakeProbByN(S.N); }

  function playResponse(player, text){
    if (!alive || S.over || S.turn !== player) return;
    if (player === 'Human') recordHumanResponded();
    S.lastMove = { player, N: S.N, text, ts: Date.now() };
    S.N += 1;
    S.turn = other(player);
    announce(`${player} played "${text}"`);
    syncHud();
    rebuildButtons();
    scheduleTurn();
  }

  function challengeLast(challenger){
    if (!alive || S.over || S.turn !== challenger || !S.lastMove) return;
    const valid = wasValid(S.lastMove);
    if (challenger === 'Human') {
      recordHumanResponded();
      if (!valid) { S.level += 1; pendingRuleAdd = true; endGame('Human', { kind: 'human-correct-challenge', details: buildMoveDetails(S.lastMove) }); return; }
      endGame('AI', { kind: 'wrong-challenge', details: buildMoveDetails(S.lastMove) }); return;
    }
    // AI challenges Human
    if (valid) {
      S.level += 1; pendingRuleAdd = true; endGame('Human', { kind: 'ai-bad-challenge', details: buildMoveDetails(S.lastMove) });
    } else {
      const timedOut = S.lastMove.text === '';
      endGame('AI', { kind: timedOut ? 'timeout-challenged' : 'challenged-invalid-move', details: buildMoveDetails(S.lastMove) });
    }
  }

  function levelUpOnHumanWin(){
    if (S.rules.size >= 8) return;
    const order = [ [7,'Bazz'], [4,'Quux'], [9,'Nix'], [2,'Zip'], [6,'Zap'], [8,'Zot'] ];
    const next = order.find(([k]) => !S.rules.has(k));
    if (next) { S.rules.set(next[0], next[1]); S.level += 1; levelCombos = computeAllCombos(S.rules); }
  }

  function timeoutTurn(player){
    // Human no-response is an immediate loss; do not record into rolling average
    if (player === 'Human') {
      const details = buildMoveDetails({ player: 'Human', N: S.N, text: '' });
      endGame('AI', { kind: 'timeout', details });
      return;
    }
  }

  function endGame(winner, info){
    if (!alive) return;
    S.over = true; S.winner = winner;
    syncHud();
    let advanced = false;
    let closedViaBackdrop = false;
    const modal = openModal({
      title: winner === 'Human' ? 'You Win' : 'You Lose',
      titleAlign: 'center',
      titleVariant: winner === 'Human' ? 'primary' : 'warning',
      actionsAlign: 'center',
      body: (()=>{
        const d = document.createElement('div');
        const lines = linesForOver(info);
        lines.forEach(t => { const p = document.createElement('p'); p.className = 'text-muted'; p.textContent = t; d.append(p); });
        const sub = document.createElement('div');
        sub.className = 'stack';
        const lvl = document.createElement('p'); lvl.textContent = `Level reached: ${S.level}`; sub.append(lvl);
        const avgP = document.createElement('p'); avgP.textContent = `Average response time: ${fmtSecs(respAvgMs)}`; sub.append(avgP);
        if (info?.details) {
          const { N, text, expected, applied, player } = info.details;
          const rows = [];
          if (info.kind !== 'timeout') {
            rows.push(`Challenged move by ${player}: ${text === '' ? '"" (empty)' : `"${text}"`}`);
          }
          rows.push(
            `At N = ${N}`,
            `Applied rules: ${applied.length ? applied.map(([k,w])=>`${k}:${w}`).join(', ') : 'none'}`,
            `Correct response: "${expected}"`
          );
          rows.forEach(t => { const r = document.createElement('p'); r.textContent = t; sub.append(r); });
        }
        d.append(sub);
        return d;
      })(),
      actions: (
        winner === 'Human'
          ? [
              { label: 'Next Level', onClick: () => { advanced = true; startNextLevel(); modal.close?.(); } },
            ]
          : [
              { label: 'Play Again', onClick: () => { resetGame(); modal.close?.(); } },
              { label: 'Quit', variant: 'secondary', onClick: () => { try { modal.close?.(); } catch {}; window.location.hash = '#/gallery/fizzbuzz'; } },
            ]
      ),
      onBackdropClick: () => {
        closedViaBackdrop = true;
        if (winner === 'Human') {
          // Advance immediately on outside-click when you win
          advanced = true;
          startNextLevel();
        } else {
          // On a loss, outside-click restarts the game
          resetGame();
        }
      },
      onClose: () => {
        // Apply +5s timeout penalty after modal closes (display shows pre-penalty value)
        if (winner === 'AI' && info?.kind === 'timeout') {
          try { respAvgMs = Math.min(20000, (respAvgMs || 20000) + 5000); saveResp(respAvgMs, respCount); } catch {}
        }
        if (winner === 'Human' && !advanced && !closedViaBackdrop) {
          advanced = true;
          startNextLevel();
        }
      },
    });
  }

  function resetGame(){
    S.N = 1; S.level = START_LEVEL; S.rules = new Map([[3,'Fizz'],[5,'Buzz']]); S.turn = (Math.random() < 0.5 ? 'Human' : 'AI'); S.lastMove = undefined; S.over = false; S.winner = undefined;
    preloadRulesForLevel(S.level);
    levelCombos = computeAllCombos(S.rules);
    syncRules();
    syncHud();
    rebuildButtons();
    scheduleTurn();
  }

  function startNextLevel(){
    if (pendingRuleAdd) { addNextRuleOnly(); pendingRuleAdd = false; }
    S.N = 1; S.turn = (Math.random() < 0.5 ? 'Human' : 'AI'); S.over = false; S.winner = undefined; S.lastMove = undefined;
    levelCombos = computeAllCombos(S.rules);
    syncRules();
    syncHud();
    rebuildButtons();
    scheduleTurn();
  }

  function addNextRuleOnly(){
    if (S.rules.size >= 8) return;
    const order = [ [7,'Bazz'], [4,'Quux'], [9,'Nix'], [2,'Zip'], [6,'Zap'], [8,'Zot'] ];
    const next = order.find(([k]) => !S.rules.has(k));
    if (next) { S.rules.set(next[0], next[1]); }
  }

  function preloadRulesForLevel(level){
    // Add (level-1) extra rules on load so the offerings reflect the level
    const needed = Math.max(0, (level|0) - 1);
    const order = [ [7,'Bazz'], [4,'Quux'], [9,'Nix'], [2,'Zip'], [6,'Zap'], [8,'Zot'] ];
    for (let i = 0; i < needed; i++) {
      const next = order.find(([k]) => !S.rules.has(k));
      if (!next) break; S.rules.set(next[0], next[1]);
    }
    levelCombos = computeAllCombos(S.rules);
  }

  // Turn loop
  function scheduleTurn(){
    if (!alive) return;
    turnT.clear(); loopT.clear();
    let ms;
    if (S.turn === 'Human') { ms = getHumanWindowMs(); lastHumanWindowMs = ms; }
    else { ms = Math.max(300, responseMs(S.level)); }
    deadline = Date.now() + ms;
    syncHud();
    const loop = () => {
      if (!alive || S.over) return;
      const now = Date.now();
      if (now >= deadline) {
        if (S.turn === 'Human') { timeoutTurn('Human'); return; }
        // For AI: do not trigger via deadline; keep timer hidden
      }
      hudTimer.val.textContent = (S.turn === 'Human') ? fmtSecs(deadline - now) : '---';
      loopT.after(100, loop);
    };
    loopT.after(50, loop);
    if (S.turn === 'AI') turnT.after(aiDelayMs(S.level), aiTakeTurn);
    sizeButtons();
  }

  function aiTakeTurn(){
    if (!alive || S.over || S.turn !== 'AI') return;
    if (S.lastMove && S.lastMove.player === 'Human'){
      const correct = wasValid(S.lastMove);
      const estimateInvalid = !correct && Math.random() > missedChallenge(S.level);
      if (estimateInvalid) { challengeLast('AI'); return; }
      const maybeBad = Math.random() < badChallenge(S.level);
      if (maybeBad) { challengeLast('AI'); return; }
    }
    const correctText = expectedOutput(S.N, S.rules);
    const willMisplay = Math.random() < misplay(S.level);
    const choice = willMisplay ? pickPlausibleWrong(S.N, S.rules, correctText) : correctText;
    playResponse('AI', choice);
  }

  // UI
  function syncHud(){
    hudLevel.val.textContent = String(S.level);
    hudTimer.val.textContent = S.over ? '-' : (S.turn === 'Human' ? fmtSecs(deadline - Date.now()) : '---');
  }
  function syncRules(){ /* rules are reflected by the toggle buttons now */ }

  function rebuildButtons(){
    // Top two controls centered (each same height as Challenge)
    topRow.innerHTML = '';
    topRow.style.gridTemplateRows = 'auto auto';
    const mkBlock = (text, opts={}) => {
      const el = document.createElement('div');
      el.textContent = text;
      el.style.display = 'grid'; el.style.placeItems = 'center';
      el.style.borderRadius = '8px'; el.style.border = `1px solid ${opts.border || 'var(--border)'}`;
      el.style.background = opts.bg || 'var(--bg-elev)';
      el.style.fontWeight = opts.weight || '700';
      el.style.width = 'min(300px, 100%)';
      el.style.minHeight = TOP_H + 'px';
      if (opts.className) el.className = opts.className;
      return el;
    };
    if (S.turn === 'AI') {
      const last = (S.lastMove && S.lastMove.player === 'Human') ? S.lastMove.text : null;
      const saidTxt = last == null ? 'Player said: -' : `Player said: ${last === '' ? '"" (empty)' : `"${last}"`}`;
      // Remove "AI Thinking" label to prevent layout jump between turns
      topRow.append(mkBlock(saidTxt));
    } else {
      const aiMoveText = (S.lastMove && S.lastMove.player === 'AI') ? S.lastMove.text : null;
      const shown = aiMoveText == null ? '-' : (aiMoveText === '' ? '"" (empty)' : `"${aiMoveText}"`);
      const info = mkBlock(`AI last response: ${shown}`, { border: 'var(--warning, #ffcc00)', bg: 'var(--bg, #0f141f)', weight: '600', className: 'text-warning' });
      // Turn the label into the Challenge control when challengeable
      const canChallenge = !S.over && !!S.lastMove && S.lastMove.player === 'AI' && S.turn === 'Human';
      if (canChallenge) {
        try {
          info.innerHTML = `AI last response: ${shown}<br>(Click to challenge)`;
          info.style.cursor = 'pointer';
          info.setAttribute('role', 'button');
          info.tabIndex = 0;
          const trigger = () => { if (S.turn === 'Human' && !S.over) challengeLast('Human'); };
          info.addEventListener('click', trigger);
          info.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); } });
        } catch {}
      }
      topRow.append(info);
      // Actions moved to actionsRow below
    }

    // Build actions row (Respond, Challenge)
    actionsRow.innerHTML = '';
    const isHumanTurn = (S.turn === 'Human' && !S.over);
    // Unified Respond button (acts as The Number or combined words based on selection)
    let respondBtn; { const h = document.createElement('div'); h.innerHTML = Button({ id: 'fb-respond', label: 'The Number' });
      respondBtn = h.firstElementChild; respondBtn.style.display='grid'; respondBtn.style.placeItems='center'; respondBtn.style.width='min(300px, 100%)'; respondBtn.style.minHeight = TOP_H + 'px';
      respondBtn.addEventListener('click', () => {
        if (S.turn !== 'Human' || S.over) return;
        const keys = [...selectedRuleKeys].sort((a,b)=>a-b);
        const text = keys.length ? keys.map(k => S.rules.get(k)).join('') : String(S.N);
        playResponse('Human', text);
      });
      actionsRow.append(respondBtn); }
    // Challenge button removed; use the clickable AI last response label instead

    // Values grid (keep visible on AI turn, but disabled)
    btnGrid.innerHTML = '';
    // Rebuild toggle inputs fresh each (re)render
    selectedRuleKeys.clear();
    const rulesSorted = [...S.rules.entries()].sort((a,b)=>a[0]-b[0]);
    // Center the values row; switch to flex layout
    btnGrid.style.display = 'flex';
    btnGrid.style.flexWrap = 'wrap';
    btnGrid.style.justifyContent = 'center';
    btnGrid.style.alignItems = 'stretch';
    btnGrid.style.maxWidth = '720px';
    btnGrid.style.margin = '0 auto';
    // Build a toggle button per rule
    rulesSorted.forEach(([k, word]) => {
      const id = `fb-tog-${k}`;
      const html = Button({ id, label: `${k}: ${word}`, variant: 'subtle' });
      const holder = document.createElement('div'); holder.innerHTML = html; const btn = holder.firstElementChild;
      btn.setAttribute('aria-pressed', 'false');
      btn.style.height = BUTTON_H + 'px'; btn.style.display = 'grid'; btn.style.placeItems = 'center';
      btn.style.flex = '0 1 140px';
      btn.style.minWidth = '120px';
      btn.disabled = !isHumanTurn;
      btn.setAttribute('aria-disabled', String(!isHumanTurn));
      // Unselected/disabled: grey via .button-secondary; selected removes it for a subtle highlight
      try { btn.classList.add('button-secondary'); } catch {}
      btn.addEventListener('click', () => {
        if (S.turn !== 'Human' || S.over) return;
        const on = selectedRuleKeys.has(k);
        if (on) {
          selectedRuleKeys.delete(k);
          btn.classList.add('button-secondary');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          selectedRuleKeys.add(k);
          btn.classList.remove('button-secondary');
          btn.setAttribute('aria-pressed', 'true');
        }
        updateRespondUI();
      });
      btnGrid.append(btn);
    });
    // Respond UI: update label and disabled/grey state based on selection and turn
    function updateRespondUI(){
      try {
        const hasSel = selectedRuleKeys.size > 0;
        const label = hasSel ? [...selectedRuleKeys].sort((a,b)=>a-b).map(k => S.rules.get(k)).join('') : 'The Number';
        respondBtn.textContent = label;
        const enabled = isHumanTurn; // allowed whenever it's the human's turn
        respondBtn.disabled = !enabled;
        respondBtn.setAttribute('aria-disabled', String(!enabled));
        if (enabled) {
          respondBtn.classList.remove('button-secondary');
        } else {
          if (!respondBtn.classList.contains('button-secondary')) respondBtn.classList.add('button-secondary');
        }
      } catch {}
    }
    updateRespondUI();
    sizeButtons();
  }

  function buildOptionsForCurrent(){
    const N = S.N;
    const items = [{ label: 'The Number', value: String(N) }];
    levelCombos.forEach(w => items.push({ label: w, value: w }));
    return { play: items };
  }

  function fmtSecs(ms){
    const secs = Math.max(0, ms) / 1000;
    return `${secs.toFixed(1)} s`;
  }

  // Response-time persistence helpers
  function loadRespAvgMs(){
    try { const v = Number(localStorage.getItem('fb:respAvgMs') || ''); return Number.isFinite(v) && v > 0 ? Math.min(20000, v) : 20000; } catch { return 20000; }
  }
  function loadRespCount(){
    try { const v = Number(localStorage.getItem('fb:respCount') || ''); return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0; } catch { return 0; }
  }
  function saveResp(avgMs, count){
    try { localStorage.setItem('fb:respAvgMs', String(Math.min(20000, Math.max(1, Math.floor(avgMs))))); } catch {}
    try { localStorage.setItem('fb:respCount', String(Math.max(0, Math.floor(count)))); } catch {}
  }
  function getHumanWindowMs(){
    const avg = Math.min(20000, respAvgMs);
    const factor = 1.5 + 0.1 * ((S.level || 1) - 1);
    return Math.round(avg * factor);
  }
  function recordHumanResponded(){
    try {
      const now = Date.now();
      const base = lastHumanWindowMs || getHumanWindowMs();
      const remaining = Math.max(0, deadline - now);
      const used = Math.min(base, Math.max(0, base - remaining));
      if (Number.isFinite(used)) {
        const n = (respCount || 0) + 1;
        const newAvg = (respAvgMs || 20000) + (used - (respAvgMs || 20000)) / n;
        respAvgMs = Math.min(20000, Math.max(1, newAvg));
        respCount = n;
        saveResp(respAvgMs, respCount);
      }
    } catch {}
  }

  // Size the buttons scroll area so the footer remains visible; only this area scrolls
  function sizeButtons(){
    try {
      const appEl = document.getElementById('app');
      if (!appEl) return;
      const rect = btnScroll.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 600;
      const footer = document.querySelector('.site-footer');
      const footerH = footer ? footer.offsetHeight : 56;
      const margin = 12;
      const h = Math.max(120, vh - rect.top - footerH - margin);
      btnScroll.style.height = h + 'px';
      btnScroll.style.maxHeight = h + 'px';
      btnScroll.style.overflowY = 'auto';
      btnScroll.style.overflowX = 'hidden';
    } catch {}
  }
  // (removed previous sizeScroll/sizeApp approaches)

  function pickPlausibleWrong(N, rules, correctText){
    const candidates = [ String(N), ...levelCombos ].filter(x => x !== correctText);
    return candidates.length ? candidates[(Math.random()*candidates.length)|0] : String(N);
  }

  function computeAllCombos(rules){
    const words = [...rules.entries()].sort((a,b)=>a[0]-b[0]).map(([,w])=>w);
    const n = words.length; const out = [];
    for (let k = 1; k <= n; k++){
      const idx = Array.from({length:k}, (_,i)=>i);
      while (true){
        out.push(idx.map(i=>words[i]).join(''));
        let p = k - 1; while (p >= 0 && idx[p] === p + n - k) p--; if (p < 0) break;
        idx[p]++; for (let q = p+1; q < k; q++) idx[q] = idx[q-1] + 1;
      }
    }
    return out;
  }

  function buildMoveDetails(move){
    const applied = [...S.rules.entries()].filter(([k]) => move.N % k === 0).sort((a,b)=>a[0]-b[0]);
    return { N: move.N, text: move.text, expected: expectedOutput(move.N, S.rules), applied, player: move.player };
  }

  function describeOver(info){
    switch(info?.kind){
      case 'human-correct-challenge': return 'You challenged the AI correctly.';
      case 'wrong-challenge': return 'You challenged the AI incorrectly.';
      case 'timeout': return 'You ran out of time.'; // human timed out
      case 'challenged-invalid-move': return 'AI challenged your move.';
      case 'ai-bad-challenge': return 'AI challenged incorrectly.';
      default: return 'Game ended.';
    }
  }

  function linesForOver(info){
    if (!info) return ['Game ended.'];
    if (info.kind === 'timeout') return ['You ran out of time. (+5s penalty will be applied to your average)'];
    if (info.kind === 'challenged-invalid-move') return ['AI challenged your move.'];
    return [ describeOver(info) ];
  }

  function announce(msg){ try { sr.textContent = msg; } catch {} }
}

// Minimal source browser for this view (Demo/Source tabs)
const FILES = [ 'page.js', 'game.js' ];
function renderSourceBrowser(host){
  if (!host) return;
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/fizzbuzz/';
  list.append(note);
  FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = path;
    item.append(sum);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'Loading…';
    pre.append(code);
    item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try {
        const res = await fetch('src/views/gallery/fizzbuzz/' + path, { cache: 'no-cache' });
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

// Helpers
function border0(el){ el.style.border = '0'; el.style.padding = '0'; }
