import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { numberField } from '../../../components/ui/inputs.js';

export const meta = {
  title: 'Memory — Start',
  description: 'Set players and begin a game',
};

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack';

  wrap.innerHTML = `
    <h2>Memory</h2>
    <section class="mem-start stack" id="mem-start">
      <div class="mem-controls stack">
        <div class="mem-field player-field">
          <label>Players</label>
          <div class="player-grid">
            ${playerRow(1, 'Human 1', 'human')}
            ${playerRow(2, 'Human 2', 'ai-medium')}
            <div class="player-row" id="mem-row3">
              ${rowContent(3, 'Human 3', 'none')}
            </div>
            <div class="player-row" id="mem-row4" style="display:none;">
              ${rowContent(4, 'Human 4', 'none')}
            </div>
          </div>
        </div>
        <div class="mem-field player-field" id="mem-faceup-field"></div>
        <div class="player-buttons"><a id="mem-new" class="button" href="#/gallery/memory/game">New Game</a></div>
      </div>
    </section>
  `;
  frag.append(wrap);

  const startEl = wrap.querySelector('#mem-start');
  const btnNew = startEl.querySelector('#mem-new');
  const sels = [1,2,3,4].map(i=>startEl.querySelector(`#mem-p${i}`));
  const names = [1,2,3,4].map(i=>startEl.querySelector(`#mem-n${i}`));
  const row3 = startEl.querySelector('#mem-row3');
  const row4 = startEl.querySelector('#mem-row4');
  // Build the Face Up Time number field using global helper
  const faceFieldHost = startEl.querySelector('#mem-faceup-field');
  const nf = numberField({ id: 'mem-faceup', label: 'Face Up Time (seconds)', value: 1.0, min: 0.5, max: 5, step: 0.5 });
  if (faceFieldHost) {
    faceFieldHost.append(nf.wrapper);
    // Center the control like player rows
    faceFieldHost.style.display = 'grid';
    faceFieldHost.style.justifyItems = 'center';
  }
  const faceUpInput = nf.input;

  const LS_KEY = (i)=>`mem_hname_${i}`;
  const AI_PUN_NAMES = [
    'Byte Knight','Null Pointer','Loop Skywalker','Cache Money','Sir Cumference',
    'Bugsy Malone','Bitty Boop','Stack Sparrow','Captain Crunch','Mr. Roboto',
    'Lady Lambda','Tony Starch','Count Recursion','Pix Elle','Sudo Nym',
    'Ada Mango','Robo Baggins','Algo Rhythm','Seg Fault','Duke Nukeml'
  ];
  const usedPunNames = new Set();
  const randPun = () => {
    const pool = AI_PUN_NAMES.filter(n=>!usedPunNames.has(n));
    const pick = (pool.length? pool : AI_PUN_NAMES)[Math.floor(Math.random()* (pool.length? pool.length : AI_PUN_NAMES.length))];
    usedPunNames.add(pick);
    return pick;
  };

  function updateRows() {
    const v2 = sels[1]?.value || 'none';
    if (v2 === 'none') {
      // Hide #3 and #4 and force them to None
      if (row3) row3.style.display = 'none';
      if (row4) row4.style.display = 'none';
      if (sels[2]) { sels[2].value = 'none'; applySeatUI(2); }
      if (sels[3]) { sels[3].value = 'none'; applySeatUI(3); }
      return;
    }
    if (row3) row3.style.display = '';
    const v3 = sels[2]?.value || 'none';
    if (row4) row4.style.display = (v3 !== 'none') ? '' : 'none';
  }
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
      if (!nameEl.value || !nameEl.disabled || nameEl.value.startsWith('Human')) {
        nameEl.value = randPun();
      }
    }
  }
  // Try to restore prior selection from sessionStorage (persist while in Memory)
  try {
    const saved = JSON.parse(sessionStorage.getItem('memory:chosen') || 'null');
    if (saved && Array.isArray(saved.players)) {
      const ps = saved.players;
      for (let i=0;i<4;i++) {
        const p = ps[i];
        if (!sels[i]) continue;
        if (!p) {
          // No player specified -> treat as None for seats 2-4
          if (i>=1) sels[i].value = 'none';
          continue;
        }
        if (p.kind === 'human') sels[i].value = 'human';
        else if (p.kind === 'ai') sels[i].value = `ai-${p.level || 'easy'}`;
        if (names[i] && p.name) names[i].value = p.name;
      }
      if (typeof saved.faceUpSec === 'number' && !Number.isNaN(saved.faceUpSec)) {
        faceUpInput.value = String(saved.faceUpSec);
      }
    }
  } catch {}

  sels.forEach((sel, idx)=>{
    sel?.addEventListener('change', ()=>{ applySeatUI(idx); updateRows(); });
  });
  names.forEach((input, idx)=>{
    input?.addEventListener('input', ()=>{ if (!input.disabled) localStorage.setItem(LS_KEY(idx+1), input.value); });
  });
  sels.forEach((_, idx)=>applySeatUI(idx));
  updateRows();

  btnNew.addEventListener('click', () => {
    const chosen = [];
    for (let i=0;i<4;i++) {
      const t = sels[i].value;
      if (t==='none') continue;
      const kind = (t==='human') ? 'human' : 'ai';
      const level = t.startsWith('ai-') ? t.split('-')[1] : null; // easy|medium|hard|perfect
      chosen.push({ kind, level, name: names[i].value || (kind==='human'? (localStorage.getItem(LS_KEY(i+1)) || `Human ${i+1}`) : randPun()) });
    }
    const faceUpSec = Math.max(0.1, Math.min(10, Number(faceUpInput.value) || 1));
    try { sessionStorage.setItem('memory:chosen', JSON.stringify({ players: chosen, faceUpSec })); } catch {}
  });

  return frag;
}

function playerRow(i, defaultName, defaultType) {
  return `<div class=\"player-row\">${rowContent(i, defaultName, defaultType)}</div>`;
}
function rowContent(i, defaultName, defaultType) {
  const sel = (v)=> v===defaultType ? 'selected' : '';
  return `
    <span class="player-row-label">#${i}</span>
    <select class="player-sel" id="mem-p${i}">
      <option value="human" ${sel('human')}>Human</option>
      <option value="ai-easy" ${sel('ai-easy')}>Easy AI</option>
      <option value="ai-medium" ${sel('ai-medium')}>Medium AI</option>
      <option value="ai-hard" ${sel('ai-hard')}>Hard AI</option>
      <option value="ai-perfect" ${sel('ai-perfect')}>Perfect AI</option>
      ${i===1 ? '' : `<option value="none" ${sel('none')}>None</option>`}
    </select>
    <input class="player-name" id="mem-n${i}" type="text" value="${defaultName}" />
  `;
}
