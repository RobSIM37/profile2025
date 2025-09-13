// Minimal accessible modal utility
// Usage: const m = openModal({ title, body, actions: [{ label, variant, onClick }] })
// Returns handle with close()

export function openModal({ title = '', body = '', actions = [], actionsAlign = 'flex-end', titleAlign = 'left', titleVariant, onClose, onBackdropClick } = {}) {
  const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.createElement('div');
  overlay.className = 'ui-modal-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', display: 'grid', placeItems: 'center',
    background: 'rgba(0,0,0,0.55)', zIndex: '10000'
  });

  const card = document.createElement('div');
  card.className = 'ui-modal-card';
  Object.assign(card.style, {
    background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: '10px',
    minWidth: '260px', maxWidth: 'min(92vw, 720px)', padding: '18px 22px',
    boxShadow: '0 10px 24px rgba(0,0,0,0.35)'
  });

  const h = document.createElement('div');
  h.className = 'ui-modal-title';
  h.textContent = title;
  h.style.fontWeight = '800';
  h.style.fontSize = '20px';
  h.style.textAlign = titleAlign || 'left';
  // Optional themed title color
  try {
    if (titleVariant === 'primary') h.style.color = 'var(--primary)';
    else if (titleVariant === 'warning') h.style.color = 'var(--warning)';
  } catch {}
  const titleId = `modal-title-${Math.random().toString(36).slice(2,8)}`;
  h.id = titleId;
  card.appendChild(h);

  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'ui-modal-body';
  bodyWrap.style.marginTop = '8px';
  if (typeof body === 'string') bodyWrap.innerHTML = body;
  else if (body instanceof Element) bodyWrap.append(body);
  const bodyId = `modal-body-${Math.random().toString(36).slice(2,8)}`;
  bodyWrap.id = bodyId;
  card.appendChild(bodyWrap);

  if (actions?.length) {
    const bar = document.createElement('div');
    bar.className = 'ui-modal-actions';
    bar.style.display = 'flex';
    bar.style.gap = '8px';
    bar.style.justifyContent = actionsAlign || 'flex-end';
    bar.style.marginTop = '12px';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.className = `button${a.variant === 'secondary' ? ' button-secondary' : ''}`;
      btn.textContent = a.label || 'OK';
      btn.addEventListener('click', () => {
        a.onClick?.();
        close();
      });
      bar.append(btn);
    }
    card.appendChild(bar);
  }

  let routeClosing = false;
  const onRoute = () => { try { routeClosing = true; } catch {} close(); };

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keydown', onTrap);
    try { window.removeEventListener('hashchange', onRoute); } catch {}
    try { window.removeEventListener('popstate', onRoute); } catch {}
    if (prevFocus) {
      try { prevFocus.focus(); } catch {}
    }
    if (!routeClosing) onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  // Focus trap within modal content
  const getFocusables = () => Array.from(card.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  const onTrap = (e) => {
    if (e.key !== 'Tab') return;
    const f = getFocusables();
    if (!f.length) return;
    const first = f[0]; const last = f[f.length-1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('keydown', onTrap);
  // Always close on navigation changes; ignore onClose in that case
  try { window.addEventListener('hashchange', onRoute, { once: true }); } catch {}
  try { window.addEventListener('popstate', onRoute, { once: true }); } catch {}
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      try { onBackdropClick?.(); } catch {}
      close();
    }
  });

  overlay.append(card);
  document.body.append(overlay);
  // ARIA dialog semantics
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', titleId);
  card.setAttribute('aria-describedby', bodyId);
  // focus first focusable
  setTimeout(()=> card.querySelector('button')?.focus(), 0);
  return { close };
}

