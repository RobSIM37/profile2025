import { createCard } from './card.js';
import { iconSvg, iconLabel } from './icons/index.js';

export function createBoard({ cards, cols = 10, onFlip }){
  const wrap = document.createElement('div');
  wrap.className = 'mem-board';
  Object.assign(wrap.style, {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(40px, 1fr))`,
    gap: '8px',
  });

  const handles = new Map();
  const ratio = 4/3; // height/width ~ 4:3 vertical

  function makeCell(c){
    const title = iconLabel(c.id);
    const card = createCard({ idx: c.idx, iconSvg: iconSvg(c.id, { size: 44 }), title, onFlip });
    const cell = document.createElement('div');
    cell.style.position = 'relative';
    cell.append(card.root);
    Object.assign(card.root.style, { width: '100%', aspectRatio: `${ratio}` });
    handles.set(c.idx, card);
    return cell;
  }

  cards.forEach(c => wrap.append(makeCell(c)));

  function setState(idx, st){
    const h = handles.get(idx); if (!h) return;
    if (st === 'up') h.setUp(true);
    else if (st === 'down') h.setUp(false);
    else if (st === 'locked') { h.setUp(true); h.lock(); }
  }

  return { root: wrap, setState };
}
