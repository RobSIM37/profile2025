// ControlsGrid — layout helper for labeled rows of controls
// API:
// makeControlsGrid({ cols = ['28px','1fr','72px','1fr'], gap = '8px' }) -> { root, addRow, getRow }
// addRow({ id, label, a, b, c, mode }) -> { root, setMode(mode), getMode() }
// Modes:
//  - 'one'   : a spans cols 2-4; b/c hidden
//  - 'two'   : a spans cols 2-3; c in col 4; b hidden
//  - 'three' : a col2; b col3; c col4

export function makeControlsGrid({ cols = ['28px','1fr','72px','1fr'], gap = '8px' } = {}) {
  const root = document.createElement('div');
  root.className = 'controls-grid';
  root.style.setProperty('--cg-cols', cols.join(' '));
  root.style.setProperty('--cg-gap', gap);

  const rows = new Map();

  function addRow({ id, label, a, b, c, mode = 'two' }) {
    const row = document.createElement('div');
    row.className = 'controls-row';
    const lab = document.createElement('span'); lab.className = 'controls-label'; lab.textContent = label || '';
    const colA = document.createElement('div'); colA.className = 'controls-a'; if (a) colA.append(a);
    const colB = document.createElement('div'); colB.className = 'controls-b'; if (b) colB.append(b);
    const colC = document.createElement('div'); colC.className = 'controls-c'; if (c) colC.append(c);
    row.append(lab, colA, colB, colC);

    function setMode(m) {
      row.classList.remove('mode-one','mode-two','mode-three');
      if (m === 'three') row.classList.add('mode-three');
      else if (m === 'one') row.classList.add('mode-one');
      else row.classList.add('mode-two');
    }
    function getMode(){
      if (row.classList.contains('mode-three')) return 'three';
      if (row.classList.contains('mode-one')) return 'one';
      return 'two';
    }
    setMode(mode);
    root.append(row);
    const handle = { root: row, setMode, getMode, lab, colA, colB, colC };
    if (id) rows.set(id, handle);
    return handle;
  }

  function getRow(id){ return rows.get(id) || null; }

  return { root, addRow, getRow };
}

