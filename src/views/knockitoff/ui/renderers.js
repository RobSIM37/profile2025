import { COLORS, maskToGrid } from '../masks.js';
import { FaceIcon } from '../../../components/ui/faceIcon.js';

let moveArrowEl = null;

export function drawBoardFromMask(boardEl, mask) {
  const grid = maskToGrid(mask);
  boardEl.innerHTML = '';
  grid.forEach((cell, idx) => {
    const sq = document.createElement('div');
    sq.className = 'kio-cell';
    const x = idx % 8, y = Math.floor(idx / 8);
    sq.classList.add(((x + y) % 2 === 0) ? 'light' : 'dark');
    if (cell && cell !== '.') {
      const dot = document.createElement('span');
      dot.className = `kio-dot kio-${cell}`;
      dot.title = COLORS[cell];
      sq.dataset.color = cell;
      sq.append(dot);
    }
    sq.dataset.index = String(idx);
    boardEl.append(sq);
  });
}

export function paintBoard(boardEl, cells) {
  // Remove any lingering direction markers globally (defensive)
  boardEl.querySelectorAll('.kio-dir').forEach((el) => el.remove());
  const sqs = boardEl.querySelectorAll('.kio-cell');
  sqs.forEach((sq, i) => {
    // Clean overlays inside each cell as well
    sq.querySelectorAll('.kio-dir').forEach((el) => el.remove());
    // Remove previous pieces then re-add for current state
    sq.querySelectorAll('.kio-piece').forEach((el) => el.remove());
    const pc = cells[i];
    if (!pc) return;
    const chip = document.createElement('span');
    chip.className = `kio-piece face-down kio-${pc.color}`;
    sq.append(chip);
  });
}

export function clearDirMarkers(boardEl) {
  boardEl.querySelectorAll('.kio-dir').forEach((el) => el.remove());
}

export function showMoveArrow(boardEl, fromIdx, dirKey) {
  removeMoveArrow();
  const fromEl = boardEl.querySelector(`.kio-cell[data-index="${fromIdx}"]`);
  if (!fromEl) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const cellSize = fromEl.getBoundingClientRect().width || 40;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.style.position = 'absolute';
  svg.style.left = '0'; svg.style.top = '0';
  svg.style.width = `${cellSize}px`; svg.style.height = `${cellSize}px`;
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '3';

  // Arrowhead marker (yellow)
  const defs = document.createElementNS(svgNS, 'defs');
  const marker = document.createElementNS(svgNS, 'marker');
  marker.setAttribute('id', 'kio-arrowhead');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '8');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto-start-reverse');
  const head = document.createElementNS(svgNS, 'path');
  head.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  head.setAttribute('fill', '#f1c40f');
  marker.appendChild(head);
  defs.appendChild(marker);
  svg.appendChild(defs);
  const arrow = document.createElementNS(svgNS, 'path');
  arrow.setAttribute('fill', 'none');
  arrow.setAttribute('stroke', '#f1c40f');
  arrow.setAttribute('stroke-width', '8');
  arrow.setAttribute('stroke-linecap', 'round');
  // Path coordinates are [x1,y1,x2,y2]; arrowhead is at (x2,y2)
  const map = {
    n:  [50, 90, 50, 10],
    ne: [10, 90, 90, 10],
    e:  [10, 50, 90, 50],
    se: [10, 10, 90, 90],
    s:  [50, 10, 50, 90],
    sw: [90, 10, 10, 90],
    w:  [90, 50, 10, 50],
    nw: [90, 90, 10, 10],
  };
  const pts = map[dirKey] || [50, 10, 50, 90];
  arrow.setAttribute('d', `M ${pts[0]} ${pts[1]} L ${pts[2]} ${pts[3]}`);
  arrow.setAttribute('marker-end', 'url(#kio-arrowhead)');
  svg.appendChild(arrow);
  fromEl.style.position = 'relative';
  fromEl.appendChild(svg);
  moveArrowEl = svg;
}

export function removeMoveArrow() {
  // Only remove the arrow SVG itself, not its parent cell
  if (moveArrowEl) moveArrowEl.remove();
  moveArrowEl = null;
}

function colorLabel(c) {
  return ({ b: 'Blue', r: 'Red', g: 'Green', u: 'Blue2' }[c]) || c;
}

export function renderSideRacks(state, playWrap) {
  const left = playWrap?.querySelector('.kio-left');
  if (!left) return;
  left.innerHTML = '';
  const title = document.createElement('div'); title.className = 'kio-side-title'; title.textContent = 'Players'; left.appendChild(title);
  const col = document.createElement('div'); col.className = 'kio-left-rows'; left.appendChild(col);
  const turnColor = state.turn.order[state.turn.index];
  state.players.forEach((p) => {
    const wrap = document.createElement('div'); wrap.className = 'kio-player-rack';
    const row = document.createElement('div'); row.className = 'kio-rack-row';
    if (p.color === turnColor) row.classList.add('is-active');
    const arrow = document.createElement('span'); arrow.className = 'kio-turn-arrow'; arrow.textContent = '➤';
    const head = document.createElement('div'); head.className = 'kio-player-head';
    const dot = document.createElement('span'); dot.className = `kio-dot kio-${p.color}`;
    const name = document.createElement('span'); name.textContent = `${p.name}`;
    if (p.type === 'ai') { const badge = document.createElement('span'); badge.className = 'kio-ai-badge'; badge.textContent = p.aiLevel || 'ai'; head.append(dot, name, badge); } else { head.append(dot, name); }
    row.append(arrow, head);
    const slots = document.createElement('div'); slots.className = 'kio-mini-slots';
    const makeFace = (kind) => { const svg = FaceIcon(kind, { size: 20, strokeWidth: 2.2 }); svg.classList.add('kio-icon'); return svg; };
    const caps = state.captured[p.color] || [];
    const sCount = caps.filter((k) => k === 'smiley').length;
    const fCap = caps.includes('frowny');
    const fSlot = document.createElement('div'); fSlot.className = 'kio-mini-slot'; if (fCap) fSlot.append(makeFace('frowny'));
    slots.append(fSlot);
    for (let i = 0; i < 3; i++) { const s = document.createElement('div'); s.className = 'kio-mini-slot'; if (i < sCount) s.append(makeFace('smiley')); slots.append(s); }
    wrap.append(row, slots);
    if (fCap) wrap.classList.add('is-eliminated');
    if (sCount >= 3) wrap.classList.add('is-winner');
    col.appendChild(wrap);
  });
}

export function renderLog(state, playWrap, { onPreviewEnter, onPreviewExit } = {}) {
  const right = playWrap?.querySelector('.kio-right');
  if (!right) return;
  right.innerHTML = '';
  const title = document.createElement('div'); title.className = 'kio-side-title kio-log-title'; title.textContent = 'Game Log'; right.appendChild(title);
  const box = document.createElement('div'); box.className = 'kio-log';
  state.logs.forEach((entry, idx) => {
    const item = document.createElement('div'); item.className = 'kio-log-item';
    const textL = document.createElement('span'); textL.textContent = (entry.textPrefix) ? entry.textPrefix : (entry.text || `Move ${idx + 1}`);
    item.appendChild(textL);
    if (entry.knockedColor) {
      const wrap = document.createElement('span');
      wrap.className = `kio-piece face-down kio-${entry.knockedColor}`;
      wrap.style.width = '26px';
      wrap.style.height = '26px';
      wrap.title = (entry.knockedKind === 'smiley') ? 'Smiley' : (entry.knockedKind === 'frowny') ? 'Frowny' : 'Blank';
      if (entry.knockedKind === 'smiley' || entry.knockedKind === 'frowny') {
        const icon = FaceIcon(entry.knockedKind, { size: 20, strokeWidth: 2.2 });
        icon.classList.add('kio-icon');
        wrap.append(icon);
      }
      item.appendChild(wrap);
    }
    item.addEventListener('mouseenter', () => onPreviewEnter?.(entry));
    item.addEventListener('mouseleave', () => onPreviewExit?.());
    box.appendChild(item);
  });
  right.appendChild(box);
  box.scrollTop = box.scrollHeight;
}

export function ensurePlayLayout(boardEl) {
  const playWrap = document.createElement('div'); playWrap.className = 'kio-play-wrap';
  const left = document.createElement('aside'); left.className = 'kio-left';
  const center = document.createElement('div'); center.className = 'kio-center';
  const right = document.createElement('aside'); right.className = 'kio-right';
  boardEl.parentElement.insertBefore(playWrap, boardEl);
  center.appendChild(boardEl);
  playWrap.append(left, center, right);
  const onResize = () => syncLogHeight(playWrap, boardEl);
  window.addEventListener('resize', onResize);
  return { playWrap, cleanupResize: () => window.removeEventListener('resize', onResize) };
}

export function teardownPlayLayout(boardEl, playWrap, cleanupResize) {
  try {
    const parent = playWrap?.parentElement;
    if (parent) {
      const center = playWrap.querySelector('.kio-center');
      if (center && boardEl.parentElement === center) parent.insertBefore(boardEl, playWrap);
      parent.removeChild(playWrap);
    }
  } catch {}
  cleanupResize?.();
}

export function syncLogHeight(playWrap, boardEl) {
  const right = playWrap?.querySelector('.kio-right');
  const box = right?.querySelector('.kio-log');
  if (!box) return;
  const h = boardEl.offsetHeight;
  if (h > 0) box.style.height = `${h}px`;
  const boardTop = boardEl.getBoundingClientRect().top;
  const rightTop = right.getBoundingClientRect().top;
  const title = right.querySelector('.kio-log-title');
  const titleH = title ? title.getBoundingClientRect().height : 0;
  const mt = Math.max(0, Math.round(boardTop - rightTop - titleH));
  box.style.marginTop = `${mt}px`;
  // Keep the log pinned to the latest entry after layout changes
  box.scrollTop = box.scrollHeight;
}
