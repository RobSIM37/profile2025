// Drag-first interaction wiring (markers appear on enter; drop on marker executes)

export function enableHumanSelect({ boardEl, state, DIRS, simulateMove, performMove, aiStepIfNeeded, helpers, getIsPreview }) {
  const { clearDirMarkers } = helpers;
  if (getIsPreview?.()) return;
  clearDirMarkers(boardEl);
  const human = getHuman(state);
  if (!human) return;
  const turnColor = state.turn.order[state.turn.index];
  if (turnColor !== human.color) return;

  const showMarkers = (fromIdx) => {
    clearDirMarkers(boardEl);
    DIRS.forEach((d) => {
      const m = simulateMove(state, fromIdx, d);
      if (!m.valid) return;
      const nx = (fromIdx % 8) + d.dx, ny = Math.floor(fromIdx / 8) + d.dy;
      if (nx < 0 || nx > 7 || ny < 0 || ny > 7) return;
      const ni = ny * 8 + nx; const target = boardEl.querySelector(`.kio-cell[data-index="${ni}"]`);
      if (!target) return;
      const marker = document.createElement('div');
      marker.className = 'kio-dir';
      marker.dataset.dir = d.key;
      Object.assign(marker.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'auto', zIndex: '8', borderRadius: '8px' });
      const PRIMARY = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3f48cc';
      marker.style.border = `2px dashed ${PRIMARY}`;
      marker.style.background = `rgba(63,72,204,0.12)`;
      // Accept drop from the dragged chip
      marker.addEventListener('dragover', (ev) => { ev.preventDefault(); });
      marker.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const from = Number(ev.dataTransfer?.getData('text/plain') || fromIdx);
        const dir = DIRS.find((dd) => dd.key === marker.dataset.dir);
        clearDirMarkers(boardEl);
        if (dir) { const mv = simulateMove(state, from, dir); if (mv.valid) { performMove(state, mv); aiStepIfNeeded(); } }
      });
      target.style.position = 'relative';
      target.appendChild(marker);
    });
  };

  boardEl.querySelectorAll('.kio-cell').forEach((sqEl, i) => {
    const pc = state.board.cells[i];
    const chip = sqEl.querySelector('.kio-piece');
    if (!pc || pc.color !== human.color || !chip) return;
    if (chip.__kioDnDWired) return; chip.__kioDnDWired = true;
    chip.style.cursor = 'grab';
    chip.draggable = true;
    chip.addEventListener('mouseenter', () => { if (!getIsPreview?.()) showMarkers(i); });
    chip.addEventListener('dragstart', (e) => {
      if (getIsPreview?.()) { e.preventDefault?.(); return; }
      e.dataTransfer?.setData('text/plain', String(i));
      showMarkers(i);
    });
    chip.addEventListener('dragend', () => { clearDirMarkers(boardEl); });
  });
}

function getHuman(state) {
  const color = state.turn?.order?.[state.turn.index];
  const p = state.players?.find((pp) => pp.color === color);
  return p && p.type === 'human' ? p : null;
}

// Setup-phase: allow dragging specials from rack to board cells
export function enableSetupDnD({
  boardEl,
  getIsSetupActive, // () => boolean
  isAllowedCell,    // (cellEl: Element|null) => boolean
  onDrop,           // ({ cellEl, payload }: { cellEl: Element, payload: string }) => void
}) {
  if (!boardEl || boardEl.__kioSetupDnDWired) return;
  boardEl.__kioSetupDnDWired = true;
  const getCellFromEvent = (e) => (e.target instanceof Element) ? e.target.closest('.kio-cell') : null;

  boardEl.addEventListener('dragover', (e) => {
    if (!getIsSetupActive()) return;
    const cellEl = getCellFromEvent(e);
    if (isAllowedCell(cellEl)) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      cellEl.classList.add('kio-drop-hover');
    }
  }, true);

  boardEl.addEventListener('dragleave', (e) => {
    if (!getIsSetupActive()) return;
    const cellEl = getCellFromEvent(e);
    cellEl?.classList.remove('kio-drop-hover');
  });

  boardEl.addEventListener('drop', (e) => {
    if (!getIsSetupActive()) return;
    const cellEl = getCellFromEvent(e);
    if (!cellEl || !isAllowedCell(cellEl)) return;
    e.preventDefault();
    const payload = e.dataTransfer?.getData('text/plain') || '';
    onDrop?.({ cellEl, payload });
  });
}
