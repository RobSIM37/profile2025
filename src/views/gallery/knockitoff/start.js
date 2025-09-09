import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';

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
        <div class="kio-field">
          <label>Players</label>
          <div class="kio-players-grid">
            ${playerRow(1, 'Human 1', 'human', true)}
            ${playerRow(2, 'Human 2', 'ai-medium', false)}
            ${playerRow(3, 'Human 3', 'none', false)}
            <div class="kio-row" id="kio-row4" style="display:none;">
              ${rowContent(4, 'Human 4', 'none')}
            </div>
          </div>
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
  const sels = [1,2,3,4].map(i=>startEl.querySelector(`#kio-p${i}`));
  const names = [1,2,3,4].map(i=>startEl.querySelector(`#kio-n${i}`));
  const row4 = startEl.querySelector('#kio-row4');

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
      if (!nameEl.value || !nameEl.disabled || nameEl.value.startsWith('Human')) {
        nameEl.value = randPun();
      }
    }
  }
  sels.forEach((sel, idx)=>{
    sel?.addEventListener('change', ()=>{ applySeatUI(idx); updateRow4(); });
  });
  names.forEach((input, idx)=>{
    input?.addEventListener('input', ()=>{ if (!input.disabled) localStorage.setItem(LS_KEY(idx+1), input.value); });
  });
  sels.forEach((_, idx)=>applySeatUI(idx));
  updateRow4();

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
  return `<div class="kio-row">${rowContent(i, defaultName, defaultType, selected)}</div>`;
}
function rowContent(i, defaultName, defaultType, selected=false) {
  const sel = (v)=> v===defaultType ? 'selected' : '';
  return `
    <span class="kio-row-label">#${i}</span>
    <select class="kio-sel" id="kio-p${i}">
      <option value="human" ${sel('human')}>Human</option>
      <option value="ai-easy" ${sel('ai-easy')}>Easy AI</option>
      <option value="ai-medium" ${sel('ai-medium')}>Medium AI</option>
      <option value="ai-hard" ${sel('ai-hard')}>Hard AI</option>
      <option value="none" ${sel('none')}>None</option>
    </select>
    <input class="kio-name" id="kio-n${i}" type="text" value="${defaultName}" />
  `;
}
