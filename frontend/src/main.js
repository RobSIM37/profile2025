import { initRouter } from './router.js';
import { routes as ROUTES, beforeResolve as BEFORE_RESOLVE } from './consts/routes.js';
import { Brand } from './components/brand.js';
import { mountCodeRain, getEnabled, setEnabled } from './components/codeRain/index.js';
import { RAIN_OPTIONS } from './consts/code-rain.js';

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
