import { FaceIcon } from '../../../../components/ui/faceIcon.js';

// Renders the setup-phase rack for the active human and wires DnD on pieces
export function renderSetupRack(state, { racksEl, boardEl, getActiveSetupHuman }) {
  racksEl.innerHTML = '';
  const human = state.players.find(p=>p.type==='human' && p.color === (getActiveSetupHuman()?.color || getActiveSetupHuman()?.color));
  const activeHuman = getActiveSetupHuman() || human;
  if (!activeHuman) return;

  const specials = state.counts.specialsRemaining[activeHuman.color];
  const avail = state.rackAvail?.[activeHuman.color] || { frowny: true, smiley: [true,true,true] };

  const rack = document.createElement('div');
  rack.className = 'kio-rack';

  const title = document.createElement('div');
  title.className = 'kio-rack-title';
  const dot = document.createElement('span'); dot.className = `kio-dot kio-${activeHuman.color}`;
  title.append(dot, document.createTextNode(' ' + (state.phase==='setup' ? `${activeHuman.name}: Place Pieces` : ' Your Rack')));

  const slots = document.createElement('div');
  slots.className = 'kio-rack-slots';

  const faceIcon = (kind) => { const svg = FaceIcon(kind, { size: 26, strokeWidth: 2.6 }); svg.classList.add('kio-icon'); return svg; };

  const makePiece = (kind, idx=null) => {
    const sp = document.createElement('span');
    sp.className = `kio-piece face-down kio-${activeHuman.color}`;
    sp.draggable = true;
    sp.dataset.kind = kind;
    if (idx !== null) sp.dataset.idx = String(idx);
    if (kind === 'frowny' || kind === 'smiley') sp.append(faceIcon(kind));
    return sp;
  };
  const makeSlot = (kind, idx=null) => {
    const d = document.createElement('div');
    d.className = 'kio-slot draggable';
    d.dataset.kind = kind;
    if (idx !== null) d.dataset.idx = String(idx);
    return d;
  };

  // frowny
  const fSlot = makeSlot('frowny');
  if (avail.frowny && specials.frowny > 0) fSlot.append(makePiece('frowny'));
  slots.append(fSlot);

  // smileys 0..2
  for (let i=0;i<3;i++) {
    const sSlot = makeSlot('smiley', i);
    if (avail.smiley[i] && specials.smiley > 0) sSlot.append(makePiece('smiley', i));
    slots.append(sSlot);
  }

  rack.append(title, slots);
  racksEl.append(rack);

  // Wire DnD on rack pieces to set payload and highlight board targets
  rack.querySelectorAll('.kio-piece').forEach((pieceEl)=>{
    const slot = pieceEl.closest('.kio-slot');
    pieceEl.addEventListener('dragstart', (e)=>{
      if (!pieceEl.draggable) { e.preventDefault(); return; }
      const kind = pieceEl.dataset.kind;
      // prevent dragging specials if exhausted
      if (kind==='frowny' && (!avail.frowny || specials.frowny<=0)) { e.preventDefault(); return; }
      if (kind==='smiley') {
        const si = Number(pieceEl.dataset.idx|0);
        if (!avail.smiley[si] || specials.smiley<=0) { e.preventDefault(); return; }
      }
      slot?.classList.add('dragging');
      // highlight valid board targets for this player
      const humanNow = getActiveSetupHuman();
      if (humanNow) {
        boardEl.querySelectorAll('.kio-cell').forEach((cellEl, i) => {
          const allowed = cellEl.dataset.color === humanNow.color && !state.board.cells[i];
          if (allowed) cellEl.classList.add('kio-droppable');
        });
      }
      // custom drag image without border
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        const ghost = document.createElement('div');
        ghost.style.width = '36px';
        ghost.style.height = '36px';
        ghost.style.borderRadius = '50%';
        ghost.style.background = getComputedStyle(pieceEl).backgroundColor;
        ghost.style.display = 'grid';
        ghost.style.placeItems = 'center';
        ghost.style.position = 'fixed';
        ghost.style.top = '-1000px';
        const face = pieceEl.querySelector('svg');
        if (face) ghost.appendChild(face.cloneNode(true));
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 18, 18);
        setTimeout(()=> document.body.removeChild(ghost), 0);
      }
      const si = pieceEl.dataset.idx ?? '';
      e.dataTransfer?.setData('text/plain', si!=='' ? `${kind}:${si}` : kind);
    });
    pieceEl.addEventListener('dragend', () => {
      slot?.classList.remove('dragging');
      boardEl.querySelectorAll('.kio-droppable, .kio-drop-hover').forEach(el => el.classList.remove('kio-droppable', 'kio-drop-hover'));
    });
  });
}
