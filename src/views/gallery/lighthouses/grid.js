// DOM grid builder for Light Houses
import { LighthouseIcon } from '../../../components/ui/lighthouseIcon.js';

export function makeGrid({ size, getState, onCell }) {
  const root = document.createElement('div');
  root.className = 'stack';
  // Center grid within available space
  root.style.display = 'flex';
  root.style.justifyContent = 'center';
  root.style.alignItems = 'flex-start';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  const GAP = 6;
  grid.style.gap = GAP + 'px';
  grid.style.width = 'max-content';

  const cells = [];
  const n = size * size;
  for (let i = 0; i < n; i++) {
    const btn = document.createElement('button');
    btn.className = 'button';
    btn.style.padding = '0';
    btn.style.borderRadius = 'var(--radius, 6px)';
    btn.style.borderWidth = 'var(--border, 1px)';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.setAttribute('aria-pressed', 'false');
    btn.dataset.idx = String(i);
    btn.addEventListener('click', () => onCell?.(i));
    cells.push(btn);
    grid.append(btn);
  }

  root.append(grid);

  let cellSize = 40;

  function layout() {
    // Compute a reasonable cell size based on container width and size
    const host = root.parentElement || document.body;
    const hostWidth = host?.clientWidth || 600;
    // Reserve some padding; clamp to avoid giant tiles
    const available = Math.min(640, hostWidth - 32);
    const cell = Math.floor(
      Math.max(28, Math.min(72, (available - (size - 1) * GAP) / size))
    );
    grid.style.gridTemplateColumns = `repeat(${size}, ${cell}px)`;
    grid.style.gridAutoRows = `${cell}px`;
    cellSize = cell;
    for (const el of cells) {
      el.style.width = `${cell}px`;
      el.style.height = `${cell}px`;
      // icon sized during paint
    }
  }

  function paint() {
    const board = getState();
    for (let i = 0; i < n; i++) {
      const on = !!board[i];
      const el = cells[i];
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      // Near-white warm tint for lit cells
      el.style.background = on ? 'linear-gradient(#fffef8, #fff3c4)' : '';
      el.style.boxShadow = on ? 'inset 0 0 0 1px #e9cf88' : '';
      // icon
      el.innerHTML = '';
      // Double previous icon scale (~0.6 -> ~1.2) but clamp to cell with small padding
      const icon = LighthouseIcon(on ? 'lit' : 'unlit', { size: Math.max(16, Math.floor(cellSize * 0.95)) });
      el.appendChild(icon);
    }
  }

  return { root, paint, layout };
}
