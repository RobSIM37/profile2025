import { initRouter } from './router.js';
import { routes as ROUTES, beforeResolve as BEFORE_RESOLVE } from './consts/routes.js';
import { Brand } from './components/brand.js';
import { Tag } from './components/ui/tag.js';
import { mountCodeRain, getEnabled, setEnabled } from './components/codeRain/index.js';
import { RAIN_OPTIONS } from './consts/code-rain.js';
import ws from './lib/ws.js';

// Keep the footer year current
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const routes = ROUTES;

// Detect localhost to highlight local builds
const isLocalHost = (() => {
  try {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch {
    return false;
  }
})();

// Mount persistent header brand
const brandHost = document.getElementById('brand');
if (brandHost) {
  brandHost.innerHTML = Brand({ name: 'Rob Lewis', local: isLocalHost });
}

// Keep document title aligned with local marker
const baseTitle = isLocalHost ? 'Rob Lewis — LOCAL' : 'Rob Lewis';
initRouter({ routes, baseTitle, beforeResolve: BEFORE_RESOLVE });

// Initialize WebSocket connection (token is attached per-message)
ws.connect();
// Bootstrap a guest token if none present
ws.ensureGuest && ws.ensureGuest();

// Header auth state slot: shows Log in or a signed-in chip
function decodeJwtPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '='));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function renderAuthSlot() {
  const slot = document.getElementById('auth-slot');
  if (!slot) return;
  while (slot.firstChild) slot.removeChild(slot.firstChild);
  let token = null;
  try { token = localStorage.getItem('auth:jwt'); } catch {}
  if (!token) {
    const a = document.createElement('a');
    a.setAttribute('data-route', '');
    a.href = '#/auth';
    a.textContent = 'Log in';
    slot.append(a);
    return;
  }
  const claims = decodeJwtPayload(token) || {};
  const who = claims.sub || 'user';
  const roles = Array.isArray(claims.roles) ? claims.roles.join(', ') : (claims.role || '');
  const a = document.createElement('a');
  a.setAttribute('data-route', '');
  a.href = '#/auth';
  a.setAttribute('title', 'View account');
  const tag = Tag({ text: roles ? `${who} (${roles})` : who });
  a.append(tag);
  slot.append(a);
}

function initAuthSlot() {
  renderAuthSlot();
  window.addEventListener('storage', (e) => {
    if (e && e.key === 'auth:jwt') renderAuthSlot();
  });
  window.addEventListener('auth:changed', renderAuthSlot);
}

// Mount background Code Rain after DOM is ready
function initRainToggle() {
  const btn = document.getElementById('rain-toggle');
  if (!btn) return;
  const updateUI = () => {
    const on = getEnabled();
    btn.classList.toggle('on', on);
    btn.classList.toggle('off', !on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('title', on ? 'Code Rain: on' : 'Code Rain: off');
  };
  btn.addEventListener('click', () => {
    setEnabled(!getEnabled());
    updateUI();
  });
  updateUI();
}

const mountRain = () => {
  mountCodeRain(RAIN_OPTIONS);
  initRainToggle();
};
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', mountRain);
} else {
  mountRain();
}

// Accessibility: ensure Skip to content focuses <main> without changing route
function initSkipLinkFocus() {
  const skip = document.querySelector('a.skip-link[href="#app"]');
  if (!skip) return;
  skip.addEventListener('click', (e) => {
    e.preventDefault();
    const app = document.getElementById('app');
    if (app) {
      try { app.focus({ preventScroll: false }); } catch { app.focus(); }
    }
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initSkipLinkFocus);
} else {
  initSkipLinkFocus();
}

// Init header auth slot after DOM is ready
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initAuthSlot);
} else {
  initAuthSlot();
}
