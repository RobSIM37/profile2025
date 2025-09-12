import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { numberField } from '../../../components/ui/inputs.js';
import { makeControlsGrid } from '../../../components/ui/controlsGrid.js';
import { makePlayerConfigurator } from '../../../components/ui/playerConfigurator.js';

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
          <div class="player-grid" id="mem-player-grid"></div>
        </div>
        <div class="mem-field player-field" id="mem-faceup-field"></div>
        <div class="player-buttons"><a id="mem-new" class="button" href="#/gallery/memory/game">New Game</a></div>
      </div>
    </section>
  `;
  frag.append(wrap);

  const startEl = wrap.querySelector('#mem-start');
  const btnNew = startEl.querySelector('#mem-new');
  const gridHost = startEl.querySelector('#mem-player-grid');
  // Build the Face Up Time number field using global helper
  const faceFieldHost = startEl.querySelector('#mem-faceup-field');
  const nf = numberField({ id: 'mem-faceup', label: 'Face Up Time (seconds)', value: 1.0, min: 0.5, max: 5, step: 0.5 });
  if (faceFieldHost) {
    const cg2 = makeControlsGrid({ cols: ['28px','0.7fr','72px','1.3fr'] });
    faceFieldHost.append(cg2.root);
    cg2.addRow({ id: 'faceup', label: '', a: nf.wrapper, mode: 'one' });
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
    const row3 = rowHandles[2]?.root; const row4 = rowHandles[3]?.root;
    if (v2 === 'none') {
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
  // Player configurator: builds rows with cascading None and AI memory field
  const pc = makePlayerConfigurator({
    rows: 4,
    cols: ['28px','0.7fr','72px','1.3fr'],
    buildSelect(i){
      const sel = document.createElement('select'); sel.className = 'player-sel'; sel.id = `mem-p${i}`;
      sel.innerHTML = `
        <option value="human">Human</option>
        <option value="ai">AI</option>
        ${i===1 ? '' : '<option value="none">None</option>'}
      `;
      sel.value = (i===1? 'human' : (i===2? 'ai' : 'none'));
      return sel;
    },
    buildExtra(i){
      const nf = numberField({ id: `mem-mem-${i}`, label: '', value: 10, min: 0, max: 50, step: 1 });
      const lab = nf.wrapper.querySelector('label'); if (lab) lab.style.display = 'none';
      nf.wrapper.style.width = '72px'; nf.wrapper.style.margin = '0'; nf.wrapper.style.setProperty('--control-w','72px');
      nf.input.style.width = '100%'; nf.input.style.boxSizing = 'border-box'; nf.input.setAttribute('aria-label','Memory Length');
      return nf.wrapper;
    },
    buildName(i){ const name = document.createElement('input'); name.className = 'player-name'; name.id = `mem-n${i}`; name.type='text'; name.value = `Human ${i}`; return name; },
    modeFor(v){ return v==='ai' ? 'three' : (v==='human' ? 'two' : 'one'); },
    onSelectChange(i, value, { name, row }){
      // Update row layout mode and name field when type changes
      const idx = i - 1;
      if (value === 'ai') {
        row?.setMode('three');
        if (name) { name.disabled = true; if (!name.value || /^\s*Human\s+/i.test(name.value)) name.value = randPun(); }
      } else if (value === 'human') {
        row?.setMode('two');
        if (name) {
          name.disabled = false;
          const saved = localStorage.getItem(LS_KEY(i));
          if (saved && saved.trim()) name.value = saved;
        }
      } else {
        row?.setMode('one');
        if (name) name.disabled = true;
      }
    },
  });
  gridHost.append(pc.root);
  const sels = pc.sels; const names = pc.names; const rowHandles = pc.rows;
  const memFields = pc.extras.map((w)=>({ wrapper: w, input: w?.querySelector('input') }));

  function applySeatUI(idx) {
    const i = idx + 1;
    const sel = sels[idx]; const name = names[idx]; const row = rowHandles[idx];
    const v = sel?.value || 'none';
    if (v === 'ai') {
      row?.setMode('three');
      if (name) { name.disabled = true; if (!name.value || /^\s*Human\s+/i.test(name.value)) name.value = randPun(); }
    } else if (v === 'human') {
      row?.setMode('two');
      if (name) { name.disabled = false; const saved = localStorage.getItem(LS_KEY(i)); if (saved && saved.trim()) name.value = saved; }
    } else {
      row?.setMode('one');
      if (name) name.disabled = true;
    }
  }

  // Try to restore prior selection from sessionStorage (persist while in Memory)
  try {
    const saved = JSON.parse(sessionStorage.getItem('memory:chosen') || 'null');
    if (saved && Array.isArray(saved.players)) {
      const ps = saved.players;
      pc.setPlayers(({ i, sel, name, extra }) => {
        const p = ps[i]; const idx = i+1; if (!sel) return;
        if (!p) { if (idx>=2) sel.value = 'none'; return; }
        sel.value = (p.kind === 'ai') ? 'ai' : 'human';
        if (name && p.name) name.value = p.name;
        if (p.kind === 'ai' && typeof p.memCap === 'number' && extra) {
          const input = extra.querySelector('input'); if (input) input.value = String(Math.max(0, Math.min(50, Math.floor(p.memCap))));
        }
      });
      if (typeof saved.faceUpSec === 'number' && !Number.isNaN(saved.faceUpSec)) {
        faceUpInput.value = String(saved.faceUpSec);
      }
    }
  } catch {}

  sels.forEach((sel, idx)=>{ sel?.addEventListener('change', ()=>{ /* configurator handles */ updateRows(); }); });
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
      const name = names[i].value || (kind==='human'? (localStorage.getItem(LS_KEY(i+1)) || `Human ${i+1}`) : randPun());
      if (kind === 'ai') {
        const raw = Number(memFields[i]?.input?.value);
        const memCap = Math.max(0, Math.min(50, Number.isFinite(raw) ? Math.floor(raw) : 10));
        chosen.push({ kind, name, memCap });
      } else {
        chosen.push({ kind, name });
      }
    }
    const faceUpSec = Math.max(0.1, Math.min(10, Number(faceUpInput.value) || 1));
    try { sessionStorage.setItem('memory:chosen', JSON.stringify({ players: chosen, faceUpSec })); } catch {}
  });

  return frag;
}
