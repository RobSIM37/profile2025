// Card element with simple 3D flip animation

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return; stylesInjected = true;
  const css = `
  .mem-card{ perspective: 800px; }
  .mem-card-inner{ position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 350ms ease; border-radius: var(--radius,10px); }
  .mem-card.is-up .mem-card-inner{ transform: rotateY(180deg); }
  .mem-card-face{ position: absolute; inset: 0; backface-visibility: hidden; border: 1px solid var(--border); border-radius: inherit; display: grid; place-items: center; }
  .mem-card-back{ background: var(--bg-elevated, #0b1220); }
  .mem-card-front{ background: #ffffff; transform: rotateY(180deg); }
  .mem-card.is-found .mem-card-front{ background: #ffffff; }
  .mem-back-icon{ width: 32px; height: 32px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.35); }
  .mem-tip{ position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: #0b1220; color: #e6e8ee; border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; font-size: 12px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4); pointer-events: none; opacity: 0; transition: opacity 120ms ease; }
  .mem-card.show-tip .mem-tip{ opacity: 1; }
  @media (prefers-reduced-motion: reduce) {
    .mem-card-inner{ transition: none; }
    .mem-tip{ transition: none; }
  }
  `;
  const tag = document.createElement('style'); tag.id = 'memory-card-css'; tag.textContent = css; document.head.append(tag);
}

export function createCard({ idx, iconSvg, title = '', onFlip }){
  ensureStyles();
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'mem-card';
  root.setAttribute('aria-pressed', 'false');
  root.style.border = 'none';
  root.style.background = 'transparent';
  root.style.padding = '0';
  root.style.cursor = 'pointer';
  root.style.position = 'relative';

  const inner = document.createElement('div'); inner.className = 'mem-card-inner';
  const back = document.createElement('div'); back.className = 'mem-card-face mem-card-back'; back.innerHTML = backGlyph();
  const front = document.createElement('div'); front.className = 'mem-card-face mem-card-front'; front.innerHTML = iconSvg;
  const tip = document.createElement('div'); tip.className = 'mem-tip'; tip.textContent = title || '';
  inner.append(back, front); root.append(inner, tip);

  let isUp = false; let isLocked = false;

  function setUp(up){
    isUp = !!up;
    root.classList.toggle('is-up', isUp);
    root.setAttribute('aria-pressed', isUp ? 'true' : 'false');
    // Native title disabled; use custom tip on hover only
  }
  function lock(){ isLocked = true; root.disabled = true; root.classList.add('is-found'); tip.textContent = title ? `Found — ${title}` : 'Found!'; }
  function unlock(){ if (!isLocked) root.disabled = false; }

  root.addEventListener('click', () => {
    if (isLocked) return;
    onFlip?.(idx);
  });

  function showTip(){ if (isUp && (title || isLocked)) { root.classList.add('show-tip'); } }
  function hideTip(){ root.classList.remove('show-tip'); }
  root.addEventListener('mouseenter', showTip);
  root.addEventListener('mouseleave', hideTip);

  return { root, setUp, lock, unlock, setFront(html){ front.innerHTML = html; } };
}

function backGlyph(){
  return `<img class="mem-back-icon" src="assets/IconTrimmed.png" alt="" />`;
}
