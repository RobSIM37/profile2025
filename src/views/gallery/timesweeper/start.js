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

  // Difficulty select + panels (75% width, centered)
  const panels = buildPanels();
  // Style the select + panel area to 75% width of the app
  try {
    if (panels.wrapper) { panels.wrapper.style.width = '75%'; panels.wrapper.style.margin = '0 auto'; }
    if (panels.panelHost) { panels.panelHost.style.width = '75%'; panels.panelHost.style.margin = '0 auto'; }
  } catch {}
  // Ensure the selected panel renders on initial load
  try {
    panels.setActive(panels.select.value || panels.getActive(), false);
    if (!panels.panelHost.firstChild) {
      panels.select.value = 'Hard';
      panels.setActive('Hard', false);
    }
  } catch {}

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
      // Row: left = description, right = Reset time button
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = 'var(--space-4)';
      const p = document.createElement('p');
      p.textContent = `${cfg.W}×${cfg.H} board · ${cfg.M} mines · Fuse: ${formatTenths(fuse)}`;
      p.style.margin = '0';
      const resetWrap = document.createElement('div');
      resetWrap.style.marginLeft = 'auto';
      resetWrap.innerHTML = Button({ id: `ts-reset-${name}`, label: 'Reset time', variant: 'secondary' });
      // Right-justify the button
      resetWrap.style.display = 'flex';
      resetWrap.style.justifyContent = 'flex-end';
      resetWrap.firstElementChild.addEventListener('click', ()=>{
        const s = tsReadStats(cfg.W, cfg.H, cfg.M); delete s.best; tsWriteStats(cfg.W, cfg.H, cfg.M, s);
        panels.setActive(name, true);
      });
      row.append(p, resetWrap);
      el.append(row);
      return el;
    };
    const customPanel = ()=>{
      const el = document.createElement('div'); el.className='stack';
      const f = tsReadFuse();
      function row(label, value, min, max){ const { wrapper, input } = numberField({ label, value }); if(min!=null) input.min=String(min); if(max!=null) input.max=String(max); return { wrapper, input }; }
      const h = row('Height', custom?.h ?? 16, 5, 24);
      const w = row('Width', custom?.w ?? 30, 5, 40);
      const m = row('Mines', custom?.m ?? 99, 1, 200);
      // Top row: Height, Width, Mines
      const topGrid = document.createElement('div');
      // Use form-grid for descendant input styling, but override layout to 3 columns and remove max-width constraint
      topGrid.className = 'form-grid';
      topGrid.style.setProperty('--control-w','120px');
      topGrid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      topGrid.style.maxWidth = 'none';
      topGrid.style.width = '100%';
      topGrid.style.gap = 'var(--space-6)';
      topGrid.style.marginBottom = 'var(--space-4)';
      topGrid.append(h.wrapper, w.wrapper, m.wrapper);
      // Second row: Tight Fuse layout: "Fuse:" [mm] mm [ss] ss
      const fuseRow = document.createElement('div');
      // Remove grid: use a tight flex row instead
      fuseRow.className = '';
      fuseRow.style.display = 'flex';
      fuseRow.style.alignItems = 'center';
      fuseRow.style.gap = '8px';

      const fuseLabel = document.createElement('label');
      fuseLabel.textContent = 'Fuse:';
      // Match label styling used by other inputs
      fuseLabel.style.color = 'var(--muted)';
      fuseLabel.style.fontSize = '12px';
      fuseLabel.style.lineHeight = '1';

      const mmInput = document.createElement('input');
      mmInput.type = 'number'; mmInput.min = '0'; mmInput.max = '59';
      mmInput.className = 'control';
      // keep compact width and styled look without the form-grid wrapper
      mmInput.style.width = '80px';
      mmInput.style.background = 'var(--primary)';
      mmInput.style.color = '#ffffff';
      mmInput.style.border = '1px solid var(--primary)';
      mmInput.style.borderRadius = 'var(--radius)';
      mmInput.style.padding = 'var(--space-2)';
      mmInput.value = String(f.mm ?? 1);

      const mmUnit = document.createElement('span');
      mmUnit.textContent = 'mm';
      mmUnit.style.color = 'var(--muted)';
      mmUnit.style.fontSize = '12px';
      mmUnit.style.lineHeight = '1';

      const ssInput = document.createElement('input');
      ssInput.type = 'number'; ssInput.min = '0'; ssInput.max = '59';
      ssInput.className = 'control';
      ssInput.style.width = '80px';
      ssInput.style.background = 'var(--primary)';
      ssInput.style.color = '#ffffff';
      ssInput.style.border = '1px solid var(--primary)';
      ssInput.style.borderRadius = 'var(--radius)';
      ssInput.style.padding = 'var(--space-2)';
      ssInput.value = String(f.ss ?? 0);

      const ssUnit = document.createElement('span');
      ssUnit.textContent = 'ss';
      ssUnit.style.color = 'var(--muted)';
      ssUnit.style.fontSize = '12px';
      ssUnit.style.lineHeight = '1';

      fuseRow.append(fuseLabel, mmInput, mmUnit, ssInput, ssUnit);
      // small top margin to separate rows visually
      fuseRow.style.marginTop = 'var(--space-2)';

      el.append(topGrid, fuseRow);
      // keep custom object updated for New Game
      const sync = ()=>{ custom = { w: +w.input.value, h: +h.input.value, m: +m.input.value, mm: +mmInput.value, ss: +ssInput.value }; };
      [w.input,h.input,m.input,mmInput,ssInput].forEach(i=> i.addEventListener('input', sync));
      sync();
      return el;
    };
    // retain previously selected difficulty between games
    let initial = 'Hard';
    try { const prev = sessionStorage.getItem('ts:selected'); if (prev) initial = prev; } catch {}
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
      value: initial,
      includeNone: false,
    });
    return panels;
  }

  return frag;
}
