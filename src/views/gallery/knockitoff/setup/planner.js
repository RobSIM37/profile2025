import { maskToGrid } from '../masks.js';
import { idxToXY } from '../engine/moves.js';

export function distToCenter(i){ const [x,y]=idxToXY(i); const cx=3.5, cy=3.5; return Math.hypot(x-cx,y-cy); }

export function getColorSquares(state, color){
  const grid = maskToGrid(state.board.mask);
  const out = [];
  for (let i=0;i<64;i++) if (grid[i]===color) out.push(i);
  return out;
}

export function weightedPickN(items, weightFn, n){
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

export function planAIPlacements(state, profiles, rememberOwn){
  if (!state) return;
  const centerBiasBase = (i)=>{ const d=distToCenter(i); return 1/Math.max(0.2,(d+0.2))**2; };
  const edgeBiasBase   = (i)=>{ const d=distToCenter(i); return (d+0.2)**2; };
  const activeColors = new Set(state.players.map(p=>p.color));
  const allColors = ['b','r','g','u'];
  const neutralColors = allColors.filter(c => !activeColors.has(c));
  const aiOrNeutral = [];
  for (const p of state.players){
    if (p.type === 'ai') aiOrNeutral.push({ ownerId: p.id, color: p.color, reduceCounts: true, profile: profiles[p.aiLevel||'medium'] || profiles.medium, neutral: false });
  }
  for (const color of neutralColors){
    // Neutral colors (in 3P games) should be filled with blanks only
    aiOrNeutral.push({ ownerId: `NP-${color}`, color, reduceCounts: false, profile: profiles.medium, neutral: true });
  }
  for (const entry of aiOrNeutral){
    const { ownerId, color, reduceCounts, profile, neutral } = entry;
    const slots = getColorSquares(state, color);
    const put = (i, kind)=>{ state.board.cells[i] = { ownerId, color, kind, faceDown: true }; };
    if (neutral) {
      // All blanks for neutral colors
      for (const i of slots) put(i, 'blank');
    } else {
      // AI-controlled color: pick specials, rest blanks
      const [fIdx] = weightedPickN(slots, (i)=> Math.pow(centerBiasBase(i), profile.placeCenterExp || 1), 1);
      const rem1 = slots.filter(i=>i!==fIdx);
      const sIdx = weightedPickN(rem1, (i)=> Math.pow(edgeBiasBase(i), profile.placeEdgeExp || 1), 3);
      const used = new Set([fIdx, ...sIdx]);
      if (typeof fIdx === 'number') put(fIdx,'frowny');
      for (const si of sIdx) put(si,'smiley');
      for (const i of rem1) if (!used.has(i)) put(i,'blank');
      const player = state.players.find(p=>p.color===color && p.type==='ai');
      if (player) {
        if (typeof fIdx === 'number') rememberOwn(color, fIdx, 'frowny');
        for (const si of sIdx) rememberOwn(color, si, 'smiley');
      }
      if (reduceCounts && state.counts?.specialsRemaining?.[color]) state.counts.specialsRemaining[color] = { frowny: 0, smiley: 0 };
    }
  }
}

export function revealAIPlacements(boardEl, state, pushTimer, maybeEnterPlayPhase){
  if (!state) return;
  const aiCells = [];
  for (let i=0;i<64;i++){
    const pc = state.board.cells[i];
    if (!pc) continue;
    const owner = state.players.find(p=>p.id===pc.ownerId);
    const isAI = owner?.type === 'ai';
    const isNeutral = !owner;
    if (isAI || isNeutral) aiCells.push(i);
  }
  for (let i=aiCells.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [aiCells[i],aiCells[j]]=[aiCells[j],aiCells[i]]; }
  // Track reveal completion so play transition waits until the loop finishes
  if (!state.setup) state.setup = { humanColors: [], index: 0 };
  state.setup.aiRevealDone = (aiCells.length === 0);
  state.setup.aiRevealRemaining = aiCells.length;
  if (state.setup.aiRevealDone) {
    // No reveals needed; check if we can transition now
    maybeEnterPlayPhase();
  }
  aiCells.forEach((idx, k)=>{
    const t = setTimeout(()=>{
      const sq = boardEl.querySelector(`.kio-cell[data-index="${idx}"]`);
      const pc = state.board.cells[idx];
      if (sq && pc){
        const dot = sq.querySelector('.kio-dot'); if (dot) dot.remove();
        if (!sq.querySelector('.kio-piece')){ const chip = document.createElement('span'); chip.className = `kio-piece face-down kio-${pc.color}`; sq.append(chip); }
        // Decrement remaining reveals and, when done, mark complete and check transition
        if (typeof state.setup.aiRevealRemaining === 'number') {
          state.setup.aiRevealRemaining -= 1;
          if (state.setup.aiRevealRemaining <= 0) {
            state.setup.aiRevealDone = true;
            maybeEnterPlayPhase();
          }
        }
      }
    }, 200*k + 1500);
    pushTimer(t);
  });
}

export function maybeAutoFillBlanks(boardEl, state, getActiveSetupHuman, renderRacks, maybeEnterPlayPhase){
  const human = getActiveSetupHuman(); if (!human) return;
  const left = state.counts.specialsRemaining[human.color];
  if (left.frowny === 0 && left.smiley === 0) {
    const grid = maskToGrid(state.board.mask);
    grid.forEach((cellColor, i) => {
      if (cellColor === human.color && !state.board.cells[i]) {
        state.board.cells[i] = { ownerId: human.id, color: human.color, kind: 'blank', faceDown: true };
        const sq = boardEl.querySelector(`.kio-cell[data-index="${i}"]`);
        if (sq) { const dot = sq.querySelector('.kio-dot'); if (dot) dot.remove(); const chip = document.createElement('span'); chip.className = `kio-piece face-down kio-${human.color}`; sq.append(chip); }
      }
    });
    if (state.setup) {
      state.setup.index += 1;
      const total = Array.isArray(state.setup.humanColors) ? state.setup.humanColors.length : 0;
      if (state.setup.index >= total) state.setup.humanPlacementDone = true;
    }
    renderRacks(state);
    maybeEnterPlayPhase();
  }
}

export function isBoardPopulated(boardEl) { return boardEl.querySelectorAll('.kio-dot').length === 0; }

// More robust readiness check: every mask square for active colors has a piece
export function isBoardReady(state) {
  if (!state) return false;
  const grid = state.board.mask ? maskToGrid(state.board.mask) : [];
  const active = new Set(state.players.map(p=>p.color));
  for (let i=0;i<64;i++) {
    const m = grid[i];
    if (!m || !active.has(m)) continue; // ignore inactive colors / empties
    if (!state.board.cells[i]) return false;
  }
  return true;
}
