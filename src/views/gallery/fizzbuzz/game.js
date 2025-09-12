import { Button } from '../../../components/ui/button.js';
import { openModal } from '../../../components/ui/modal.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeTimer } from '../../../lib/timers.js';

export const meta = {
  title: 'FizzBuzz �?" Game',
  description: 'Human vs AI alternates on FizzBuzz; challenge-only validation with level-ups on correct human challenges.',
};

/** @typedef {'Human'|'AI'} Player */

export function render(){
  setAppSolid(true);

  const frag = document.createDocumentFragment();
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
  const hudLevel = mkHud('Level', '0');
  const hudTimer = mkHud('Timer', '-');
  header.append(hudLevel.wrap, hudTimer.wrap);

  // Rules panel
  const rulesPanel = document.createElement('div');
  rulesPanel.style.border = '1px solid var(--border)';
  rulesPanel.style.borderRadius = 'var(--radius)';
  rulesPanel.style.background = 'var(--bg-elev)';
  rulesPanel.style.padding = '8px 10px';
  const rulesTitle = document.createElement('div'); rulesTitle.textContent = 'Active Rules'; rulesTitle.style.fontWeight = '700'; rulesTitle.style.marginBottom = '6px';
  const rulesList = document.createElement('div'); rulesList.style.display = 'flex'; rulesList.style.flexWrap = 'wrap'; rulesList.style.gap = '8px';
  rulesPanel.append(rulesTitle, rulesList);

  // Top two half-height controls row + Buttons grid
  const topRow = document.createElement('div');
  topRow.style.display = 'grid';
  topRow.style.gridTemplateRows = '1fr 1fr';
  topRow.style.gap = '6px';
  topRow.style.justifyItems = 'center';

  const btnGrid = document.createElement('div');
  btnGrid.style.display = 'grid';
  btnGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(140px, 1fr))';
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

  wrap.append(header, rulesPanel, topRow, btnScroll, sr);
  frag.append(wrap);

  // Game State
  /** @type {Map<number,string>} */
  const rules = new Map([[3, 'Fizz'], [5, 'Buzz']]);
  /** @type {{ N:number, level:number, rules:Map<number,string>, turn:Player, lastMove?:{player:Player,N:number,text:string,ts:number}, over:boolean, winner?:Player }} */
  const START_LEVEL = 1; // Start level
  const S = { N: 1, level: START_LEVEL, rules, turn: 'Human', over: false };
  let pendingRuleAdd = false; // add rule after Next Level
  let levelCombos = computeAllCombos(S.rules);

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
  function misplay(level){ return Math.min(0.35, 0.02 + 0.01*level); }
  function badChallenge(level){ return Math.min(0.35, 0.02 + 0.01*level); }
  function missedChallenge(level){ return Math.min(0.5, 0.08 + 0.02*level); }

  function playResponse(player, text){
    if (!alive || S.over || S.turn !== player) return;
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

  function timeoutTurn(player){ playResponse(player, ''); }

  function endGame(winner, info){
    if (!alive) return;
    S.over = true; S.winner = winner;
    syncHud();
    let advanced = false;
    const modal = openModal({
      title: winner === 'Human' ? 'You Win' : 'You Lose',
      titleAlign: 'center',
      actionsAlign: 'center',
      body: (()=>{
        const d = document.createElement('div');
        const lines = linesForOver(info);
        lines.forEach(t => { const p = document.createElement('p'); p.className = 'text-muted'; p.textContent = t; d.append(p); });
        const sub = document.createElement('div');
        sub.className = 'stack';
        const lvl = document.createElement('p'); lvl.textContent = `Level reached: ${S.level}`; sub.append(lvl);
        if (info?.details) {
          const { N, text, expected, applied, player } = info.details;
          const rows = [];
          if (info.kind !== 'timeout-challenged') {
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
      actions: [
        winner === 'Human'
          ? { label: 'Next Level', onClick: () => { advanced = true; startNextLevel(); modal.close?.(); } }
          : { label: 'Play Again', onClick: () => { resetGame(); modal.close?.(); } },
      ],
      onClose: () => {
        if (winner === 'Human' && !advanced) {
          advanced = true;
          startNextLevel();
        }
      },
    });
  }

  function resetGame(){
    S.N = 1; S.level = START_LEVEL; S.rules = new Map([[3,'Fizz'],[5,'Buzz']]); S.turn = 'Human'; S.lastMove = undefined; S.over = false; S.winner = undefined;
    preloadRulesForLevel(S.level);
    levelCombos = computeAllCombos(S.rules);
    syncRules();
    syncHud();
    rebuildButtons();
    scheduleTurn();
  }

  function startNextLevel(){
    if (pendingRuleAdd) { addNextRuleOnly(); pendingRuleAdd = false; }
    S.N = 1; S.turn = 'Human'; S.over = false; S.winner = undefined; S.lastMove = undefined;
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
    const ms = S.turn === 'Human' ? responseMs(S.level) : Math.max(300, responseMs(S.level));
    deadline = Date.now() + ms;
    syncHud();
    const loop = () => {
      if (!alive || S.over) return;
      const now = Date.now();
      if (now >= deadline) {
        if (S.turn === 'Human') timeoutTurn('Human');
        if (S.turn === 'AI') { aiTakeTurn(); }
        return;
      }
      hudTimer.val.textContent = fmtSecs(deadline - now);
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
    hudTimer.val.textContent = S.over ? '-' : fmtSecs(deadline - Date.now());
  }
  function syncRules(){
    rulesList.innerHTML = '';
    const pairs = [...S.rules.entries()].sort((a,b)=>a[0]-b[0]);
    pairs.forEach(([k, w]) => {
      const pill = document.createElement('span');
      pill.textContent = `${k}: ${w}`;
      pill.style.border = '1px solid var(--border)';
      pill.style.borderRadius = '999px';
      pill.style.padding = '2px 8px';
      pill.style.background = 'var(--bg)';
      rulesList.append(pill);
    });
  }

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
      topRow.append(mkBlock(saidTxt), mkBlock('AI Thinking'));
    } else {
      const aiMoveText = (S.lastMove && S.lastMove.player === 'AI') ? S.lastMove.text : null;
      const shown = aiMoveText == null ? '-' : (aiMoveText === '' ? '"" (empty)' : `"${aiMoveText}"`);
      const info = mkBlock(`AI last response: ${shown}`, { border: 'var(--warning, #ffcc00)', bg: 'var(--bg, #0f141f)', weight: '600', className: 'text-warning' });
      topRow.append(info);
      const cWrap = document.createElement('div');
      const challengeHtml = Button({ id: 'fb-challenge', label: 'Challenge', variant: 'secondary' });
      cWrap.innerHTML = challengeHtml; const cBtn = cWrap.firstElementChild;
      cBtn.style.display = 'grid'; cBtn.style.placeItems = 'center'; cBtn.style.width = 'min(300px, 100%)'; cBtn.style.minHeight = TOP_H + 'px';
      cBtn.addEventListener('click', () => { if (S.turn === 'Human' && !S.over) challengeLast('Human'); });
      topRow.append(cBtn);
    }

    // Main buttons
    btnGrid.innerHTML = '';
    const opts = buildOptionsForCurrent();
    // Limit to at most 4 columns per row; balance rows by rounding up
    const n = opts.play.length;
    const rows = Math.max(1, Math.ceil(n / 4));
    const cols = Math.max(1, Math.ceil(n / rows));
    btnGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(140px, 1fr))`;
    opts.play.forEach(item => {
      const id = `fb-${(item.label || item.value).toString().replace(/[^a-z0-9]+/gi,'-')}`;
      const html = Button({ id, label: item.label || item.value });
      const holder = document.createElement('div'); holder.innerHTML = html; const btn = holder.firstElementChild;
      btn.addEventListener('click', () => { if (S.turn === 'Human' && !S.over) playResponse('Human', item.value); });
      btn.style.height = BUTTON_H + 'px'; btn.style.display = 'grid'; btn.style.placeItems = 'center';
      btnGrid.append(btn);
    });
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
      case 'timeout-challenged': return 'You ran out of time.'; // keep separate from the challenge event
      case 'challenged-invalid-move': return 'AI challenged your move.';
      case 'ai-bad-challenge': return 'AI challenged incorrectly.';
      default: return 'Game ended.';
    }
  }

  function linesForOver(info){
    if (!info) return ['Game ended.'];
    if (info.kind === 'timeout-challenged') return ['You ran out of time.'];
    if (info.kind === 'challenged-invalid-move') return ['AI challenged your move.'];
    return [ describeOver(info) ];
  }

  function announce(msg){ try { sr.textContent = msg; } catch {} }
}

// Helpers
function mkHud(label, value){
  const wrap = document.createElement('div');
  wrap.style.textAlign = 'center';
  wrap.style.background = 'var(--bg-elev)';
  wrap.style.border = '1px solid var(--border)';
  wrap.style.borderRadius = '8px';
  wrap.style.padding = '6px 8px';
  const lab = document.createElement('div'); lab.textContent = label; lab.style.fontSize = '12px'; lab.style.color = 'var(--muted)';
  const val = document.createElement('div'); val.textContent = value; val.style.fontWeight = '700'; val.style.fontSize = '16px';
  wrap.append(lab, val);
  return { wrap, val };
}

function border0(el){ el.style.border = '0'; el.style.padding = '0'; }

