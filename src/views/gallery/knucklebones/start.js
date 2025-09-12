import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makePlayerConfigurator } from '../../../components/ui/playerConfigurator.js';

export const meta = {
  title: 'Knuckle Bones — Start',
  description: 'Set players and begin a game',
};

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack kio-wrap kio-start';
  // Title moved to top bar in page.js; omit duplicate header here


  // Start screen keeps only short blurb; full how-to is offered as a button below

  // Player configurator (2 seats) — match KIO wrappers for width/centering
  const controls = document.createElement('div');
  controls.className = 'kio-controls';
  const playerField = document.createElement('div');
  playerField.className = 'player-field';
  const playersLabel = document.createElement('label');
  playersLabel.textContent = 'Players';
  const gridHost = document.createElement('div');
  gridHost.className = 'player-grid';
  gridHost.id = 'kb-player-grid';
  const config = makePlayerConfigurator({
    rows: 2,
    // Match KIO widths exactly: 28px | 0.7fr | 72px | 1.3fr
    cols: ['28px','0.7fr','72px','1.3fr'],
    buildSelect(i){
      const sel = document.createElement('select');
      sel.className = 'kio-sel';
      sel.setAttribute('aria-label', `Seat ${i} type`);
      sel.innerHTML = `
        <option value="human">Human</option>
        <option value="ai:balanced">AI — Balanced</option>
        <option value="ai:cautious">AI — Cautious</option>
        <option value="ai:aggressive">AI — Aggressive</option>
      `;
      sel.value = i === 1 ? 'human' : 'ai:balanced';
      return sel;
    },
    buildName(i){
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'kio-name';
      input.setAttribute('aria-label', `Seat ${i} name`);
      input.placeholder = i === 1 ? 'Player 1' : 'Player 2';
      input.value = i === 1 ? 'Player 1' : 'CPU';
      input.maxLength = 24;
      return input;
    },
    modeFor(){ return 'two'; },
    onSelectChange(i, value, ctx){ /* handled below via applySeat */ },
  });
  gridHost.append(config.root);
  playerField.append(playersLabel, gridHost);
  controls.append(playerField);

  // Name persistence and AI pun names
  const LS_KEY = (i)=>`kb_hname_${i}`;
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

  function applySeat(i){
    const idx = i-1;
    const sel = config.sels[idx];
    const nameEl = config.names[idx];
    if (!sel || !nameEl) return;
    const t = sel.value;
    if (t === 'human') {
      nameEl.disabled = false;
      const saved = localStorage.getItem(LS_KEY(i));
      if (saved && saved.trim()) nameEl.value = saved;
      else if (!nameEl.value || nameEl.value === 'CPU') nameEl.value = `Player ${i}`;
    } else if (t.startsWith('ai:')) {
      nameEl.disabled = true;
      if (!nameEl.value || nameEl.value.startsWith('Player') || nameEl.value === 'CPU') nameEl.value = randPun();
    }
  }

  // Wire listeners and initialize names
  config.sels.forEach((sel, idx)=>{
    sel?.addEventListener('change', ()=>applySeat(idx+1));
  });
  config.names.forEach((input, idx)=>{
    input?.addEventListener('input', ()=>{ if (!input.disabled) localStorage.setItem(LS_KEY(idx+1), input.value); });
  });
  applySeat(1); applySeat(2);

  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.justifyContent = 'center';
  buttons.style.gap = '12px';
  const newWrap = document.createElement('div');
  newWrap.innerHTML = Button({ id: 'kio-new', label: 'New Game' });
  const newBtn = newWrap.firstElementChild;
  newBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const chosen = config.getPlayers(({ sel, name }) => {
      const t = sel.value;
      if (t === 'human') return { kind: 'human', name: name.value.trim() || 'Player' };
      const prof = t.split(':')[1] || 'balanced';
      return { kind: 'ai', level: prof, name: name.value.trim() || 'CPU' };
    });
    try {
      sessionStorage.setItem('kb:chosen', JSON.stringify(chosen));
    } catch {}
    window.location.hash = '#/gallery/knuckle-bones/game';
  });
  buttons.append(newWrap);

  // How To Play button centered, styled like KIO
  const howWrap = document.createElement('div');
  howWrap.className = 'kio-buttons kio-how';
  howWrap.innerHTML = Button({ id: 'kb-how', label: 'How To Play', variant: 'secondary' });
  const howBtn = howWrap.firstElementChild;
  howBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/gallery/knuckle-bones/how-to'; });

  wrap.append(controls, buttons, howWrap);
  frag.append(wrap);
  return frag;
}


