import { drawBoardFromMask } from './renderers.js';
import { enableSetupDnD } from './inputs.js';

// Draws the board mask and wires setup-phase DnD onto the board
export function drawSetupBoard({ boardEl, mask, stateRef, getActiveSetupHuman, renderRacks, maybeAutoFillBlanks }) {
  drawBoardFromMask(boardEl, mask);

  const getIndex = (cellEl) => Number(cellEl?.dataset.index ?? '-1');
  const isAllowed = (cellEl) => {
    const state = stateRef();
    if (!state || !cellEl) return false;
    if (state.phase !== 'setup') return false;
    const idx2 = getIndex(cellEl);
    const human = getActiveSetupHuman(state);
    return Boolean(human && cellEl.dataset.color === human.color && !state.board.cells[idx2]);
  };

  enableSetupDnD({
    boardEl,
    getIsSetupActive: () => stateRef()?.phase === 'setup',
    isAllowedCell: isAllowed,
    onDrop: ({ cellEl, payload }) => {
      const state = stateRef();
      if (!state || state.phase !== 'setup') return;
      const [kind, idxStr] = payload.includes(':') ? payload.split(':') : [payload, ''];
      const idx2 = getIndex(cellEl);
      const human = getActiveSetupHuman(state);
      if (!human) return;
      const piece = { ownerId: human.id, color: human.color, kind, faceDown: true };
      state.board.cells[idx2] = piece;
      const cnt = state.counts.specialsRemaining[human.color];
      const avail = state.rackAvail[human.color];
      if (kind === 'frowny' && cnt.frowny > 0) { cnt.frowny -= 1; avail.frowny = false; }
      if (kind === 'smiley' && cnt.smiley > 0) {
        cnt.smiley -= 1;
        const si = Number(idxStr | 0);
        if (Number.isFinite(si) && si >= 0 && si < 3) avail.smiley[si] = false;
      }
      const dot = cellEl.querySelector('.kio-dot'); if (dot) dot.remove();
      const chip = document.createElement('span'); chip.className = `kio-piece face-down kio-${human.color}`; cellEl.append(chip);
      renderRacks(state);
      maybeAutoFillBlanks();
      boardEl.querySelectorAll('.kio-droppable, .kio-drop-hover').forEach((el) => el.classList.remove('kio-droppable', 'kio-drop-hover'));
      const ev = new Event('kio-drop-accepted', { bubbles: true }); boardEl.dispatchEvent(ev);
    },
  });
}

