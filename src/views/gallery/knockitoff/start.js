import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makePlayerConfigurator } from '../../../components/ui/playerConfigurator.js';

export const meta = {
  title: 'Knock It Off! — Start',
  description: 'Set players and begin a game',
};

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack kio-wrap';

  wrap.innerHTML = `
    <h2>Knock It Off!</h2>
    <section class="kio-start stack" id="kio-start">
      <div class="kio-controls">
        <div class="player-field">
          <label>Players</label>
          <div class="player-grid" id="kio-player-grid"></div>
        </div>
        <div class="kio-buttons"><a id="kio-new" class="button" href="#/gallery/knock-it-off/game">New Game</a></div>
        <div class="kio-buttons kio-how">${Button({ id: 'kio-how', label: 'How To Play', variant: 'secondary' })}</div>
      </div>
    </section>
  `;
  frag.append(wrap);

  const startEl = wrap.querySelector('#kio-start');
  const btnNew = startEl.querySelector('#kio-new');
  const btnHow = startEl.querySelector('#kio-how');
  const gridHost = startEl.querySelector('#kio-player-grid');
  const pc = makePlayerConfigurator({
    rows: 4,
    cols: ['28px','0.7fr','72px','1.3fr'],
    buildSelect(i){
      const sel = document.createElement('select'); sel.className = 'player-sel'; sel.id = `kio-p${i}`;
      sel.innerHTML = `
        <option value=\"human\">Human</option>
        <option value=\"ai-easy\">Easy AI</option>
        <option value=\"ai-medium\">Medium AI</option>
        <option value=\"ai-hard\">Hard AI</option>
        ${i===1? '' : '<option value="none">None</option>'}
      `;
      sel.value = (i===1? 'human' : (i===2? 'ai-medium' : 'none'));
      return sel;
    },
    buildExtra(){ return null; },
    buildName(i){ const name = document.createElement('input'); name.className = 'player-name'; name.id = `kio-n${i}`; name.type='text'; name.value = `Human ${i}`; return name; },
    modeFor(v){ return v==='none' ? 'one' : 'two'; },
    onSelectChange(i, value, { name }){
      if (value.startsWith('ai-')) { name.disabled = true; if (!name.value || name.value.startsWith('Human')) name.value = randPun(); }
      else if (value === 'human') { name.disabled = false; const saved = localStorage.getItem(LS_KEY(i)); if (saved && saved.trim()) name.value = saved; }
      else { name.disabled = true; }
    },
  });
  gridHost.append(pc.root);
  const sels = pc.sels; const names = pc.names; const rowHandles = pc.rows;

  const LS_KEY = (i)=>`kio_hname_${i}`;
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

  function updateRows(){
    const r3 = rowHandles[2]?.root; const r4 = rowHandles[3]?.root;
    const v2 = sels[1]?.value || 'none';
    if (v2 === 'none') {
      if (r3) r3.style.display = 'none';
      if (r4) r4.style.display = 'none';
      if (sels[2]) { sels[2].value = 'none'; applySeatUI(2); }
      if (sels[3]) { sels[3].value = 'none'; applySeatUI(3); }
      return;
    }
    if (r3) r3.style.display = '';
    const v3 = sels[2]?.value || 'none';
    if (r4) r4.style.display = (v3 !== 'none') ? '' : 'none';
    if (v3 === 'none' && sels[3]) { sels[3].value = 'none'; applySeatUI(3); }
  }
  function applySeatUI(idx) {
    const sel = sels[idx]; const nameEl = names[idx]; if (!sel || !nameEl) return;
    const t = sel.value;
    if (t === 'none') {
      rowHandles[idx]?.setMode('one');
      nameEl.style.display = 'none';
      nameEl.disabled = true;
    } else if (t === 'human' || t.startsWith('ai-')) {
      rowHandles[idx]?.setMode('two');
      nameEl.style.display = '';
      nameEl.disabled = false;
      const saved = localStorage.getItem(LS_KEY(idx+1));
      if (saved && saved.trim()) { nameEl.value = saved; }
      else if (!nameEl.value || nameEl.value.startsWith('AI ')) { nameEl.value = `Human ${idx+1}`; }
    }
  }
  sels.forEach((sel, idx)=>{ sel?.addEventListener('change', ()=>{ updateRows(); }); });
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
      const level = t.startsWith('ai-') ? t.split('-')[1] : null;
      chosen.push({ kind, level, name: names[i].value || (kind==='human'? (localStorage.getItem(LS_KEY(i+1)) || `Human ${i+1}`) : randPun()) });
    }
    // Pass config via sessionStorage then route to game
    try { sessionStorage.setItem('kio:chosen', JSON.stringify(chosen)); } catch {}
  });
  btnHow.addEventListener('click', () => {
    try { sessionStorage.setItem('kio:howto', '1'); } catch {}
    window.location.hash = '#/gallery/knock-it-off/how-to';
  });

  return frag;
}

function playerRow(i, defaultName, defaultType, selected) {
  return `<div class="player-row">${rowContent(i, defaultName, defaultType, selected)}</div>`;
}
function rowContent(i, defaultName, defaultType, selected=false) {
  const sel = (v)=> v===defaultType ? 'selected' : '';
  return `
    <span class="player-row-label">#${i}</span>
    <select class="player-sel" id="kio-p${i}">
      <option value="human" ${sel('human')}>Human</option>
      <option value="ai-easy" ${sel('ai-easy')}>Easy AI</option>
      <option value="ai-medium" ${sel('ai-medium')}>Medium AI</option>
      <option value="ai-hard" ${sel('ai-hard')}>Hard AI</option>
      <option value="none" ${sel('none')}>None</option>
    </select>
    <input class="player-name" id="kio-n${i}" type="text" value="${defaultName}" />
  `;
}
