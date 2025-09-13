export const meta = { title: 'Timesweeper', description: 'Choose a difficulty and defuse the time bomb' };
import { Button } from '../../../components/ui/button.js';
import { numberField } from '../../../components/ui/inputs.js';
import { makeSelectPanels } from '../../../components/ui/selectPanels.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { readFuse as tsReadFuse, writeFuse as tsWriteFuse, startingFuseMs } from '../../../features/timesweeper/fuse.js';
import { readStats as tsReadStats, writeStats as tsWriteStats } from '../../../features/timesweeper/stats.js';
import { PRESETS, DEFAULT_FUSE_MS } from '../../../consts/timesweeper.js';
import { formatTenths } from '../../../lib/format.js';

export function render(){
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack';

  // No extra header text; subheader provides the title

  // Difficulty select + panels
  const panels = buildPanels();

  const play = document.createElement('div'); play.style.display='grid'; play.style.placeItems='center';
  play.innerHTML = Button({ id: 'ts-start', label: 'New Game' });

  const howtoWrap = document.createElement('div'); howtoWrap.style.display='grid'; howtoWrap.style.placeItems='center';
  howtoWrap.innerHTML = Button({ id: 'ts-how', label: 'How to Play', variant: 'secondary' });

  wrap.append(panels.root, play, howtoWrap);
  frag.append(wrap);

  // Selection state
  let selected = panels.getActive();
  let custom = getCustomConfig();
  panels.select.addEventListener('change', ()=> { selected = panels.getActive(); });

  wrap.querySelector('#ts-start').addEventListener('click', ()=>{
    try { sessionStorage.setItem('ts:chosen','1'); sessionStorage.setItem('ts:selected', selected); if (custom) sessionStorage.setItem('ts:custom', JSON.stringify(custom)); } catch {}
    location.hash = '#/gallery/timesweeper/game';
  });
  wrap.querySelector('#ts-how').addEventListener('click', ()=>{ location.hash = '#/gallery/timesweeper/how-to'; });

  function getCustomConfig(){
    const f = tsReadFuse();
    return { w: 30, h: 16, m: 99, mm: (f.mm ?? 1), ss: (f.ss ?? 0) };
  }

  function buildPanels(){
    const opts = [
      { id: 'Easy', label: 'Easy' },
      { id: 'Intermediate', label: 'Intermediate' },
      { id: 'Hard', label: 'Hard' },
      { id: 'Custom', label: 'Custom' },
    ];
    const mkDesc = (name, cfg)=>{
      const stats = tsReadStats(cfg.W, cfg.H, cfg.M);
      const fuse = startingFuseMs(name, stats.best);
      const el = document.createElement('div'); el.className='stack';
      const p = document.createElement('p'); p.textContent = `${cfg.W}×${cfg.H} board · ${cfg.M} mines · Fuse: ${formatTenths(fuse)}`;
      const reset = document.createElement('div'); reset.innerHTML = Button({ id: `ts-reset-${name}`, label: 'Reset time', variant: 'secondary' });
      reset.firstElementChild.addEventListener('click', ()=>{ const s = tsReadStats(cfg.W, cfg.H, cfg.M); delete s.best; tsWriteStats(cfg.W, cfg.H, cfg.M, s); panels.setActive(name, true); });
      el.append(p, reset);
      return el;
    };
    const customPanel = ()=>{
      const el = document.createElement('div'); el.className='stack';
      const f = tsReadFuse();
      const grid = document.createElement('div'); grid.className='form-grid'; grid.style.setProperty('--control-w','120px');
      function row(label, value, min, max){ const { wrapper, input } = numberField({ label, value }); if(min!=null) input.min=String(min); if(max!=null) input.max=String(max); return { wrapper, input }; }
      const w = row('Width', custom?.w ?? 30, 5, 40);
      const h = row('Height', custom?.h ?? 16, 5, 24);
      const m = row('Mines', custom?.m ?? 99, 1, 200);
      const mm = row('Time Bomb (mm)', f.mm ?? 1, 0, 59);
      const ss = row('Time Bomb (ss)', f.ss ?? 0, 0, 59);
      [w.wrapper,h.wrapper,m.wrapper,mm.wrapper,ss.wrapper].forEach(n=>grid.append(n));
      const reset = document.createElement('div'); reset.innerHTML = Button({ id: 'ts-reset-custom', label: 'Reset time', variant: 'secondary' });
      reset.firstElementChild.addEventListener('click', ()=>{ tsWriteFuse({ mm: 1, ss: 0 }); panels.setActive('Custom', true); });
      el.append(grid, reset);
      // keep custom object updated for New Game
      const sync = ()=>{ custom = { w: +w.input.value, h: +h.input.value, m: +m.input.value, mm: +mm.input.value, ss: +ss.input.value }; };
      [w.input,h.input,m.input,mm.input,ss.input].forEach(i=> i.addEventListener('input', sync));
      sync();
      return el;
    };
    const panels = makeSelectPanels({
      id: 'ts-difficulty',
      label: 'Pick a Difficulty',
      options: opts,
      panels: {
        Easy: ()=> mkDesc('Easy', PRESETS.Easy),
        Intermediate: ()=> mkDesc('Intermediate', PRESETS.Intermediate),
        Hard: ()=> mkDesc('Hard', PRESETS.Hard),
        Custom: customPanel,
      },
      value: 'Hard',
      includeNone: false,
    });
    return panels;
  }

  return frag;
}
