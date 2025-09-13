// PlayerConfigurator — builds a ControlsGrid with N player rows
// Flexible for different games via small callbacks.
// API:
// makePlayerConfigurator({
//   rows = 4,
//   cols = ['28px','0.7fr','72px','1.3fr'],
//   allowNoneFrom = 2,               // seat index (1-based) from which None is allowed
//   buildSelect(i): HTMLSelectElement,
//   buildExtra?(i): Element|null,    // optional middle control (e.g., Memory Length)
//   buildName(i): HTMLInputElement,
//   modeFor(value): 'one'|'two'|'three',
//   onSelectChange?(i, value, ctx): void, // ctx: { sel, extra, name, row }
// }) -> { root, rows, sels, names, extras, setMode(i,mode), updateVisibility(), getPlayers(mapper), setPlayers(setter) }

import { makeControlsGrid } from './controlsGrid.js';

export function makePlayerConfigurator(opts = {}){
  const {
    rows = 4,
    cols = ['28px','0.7fr','72px','1.3fr'],
    allowNoneFrom = 2,
    buildSelect,
    buildExtra = () => null,
    buildName,
    modeFor,
    onSelectChange,
  } = opts;

  const grid = makeControlsGrid({ cols });
  const sels = []; const names = []; const extras = []; const rowHandles = [];

  for (let i=1; i<=rows; i++){
    const sel = buildSelect(i);
    const extra = buildExtra(i);
    const name = buildName(i);
    const mode = modeFor(sel.value);
    const handle = grid.addRow({ id: `row${i}`, label: `#${i}`, a: sel, b: extra || undefined, c: name, mode });
    sels[i-1] = sel; names[i-1] = name; extras[i-1] = extra; rowHandles[i-1] = handle;
    sel.addEventListener('change', ()=>{ onSelectChange?.(i, sel.value, { sel, extra, name, row: handle }); updateVisibility(); });
  }

  function setMode(i, mode){ rowHandles[i-1]?.setMode(mode); }

  function updateVisibility(){
    for (let i=2; i<=rows; i++){
      const prev = sels[i-2]?.value || 'none';
      const r = rowHandles[i-1]?.root; if (!r) continue;
      const visible = prev !== 'none';
      r.style.display = visible ? '' : 'none';
      if (!visible) { sels[i-1].value = 'none'; setMode(i, modeFor('none')); }
    }
  }

  function getPlayers(mapper){
    const out = [];
    for (let i=0;i<rows;i++){
      out.push(mapper({ i, sel: sels[i], name: names[i], extra: extras[i] }));
    }
    return out;
  }

  function setPlayers(setter){
    for (let i=0;i<rows;i++) setter({ i, sel: sels[i], name: names[i], extra: extras[i], row: rowHandles[i] });
    updateVisibility();
  }

  return { root: grid.root, rows: rowHandles, sels, names, extras, setMode, updateVisibility, getPlayers, setPlayers };
}

