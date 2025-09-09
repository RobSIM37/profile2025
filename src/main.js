import { initRouter } from './router.js';
import { routes as ROUTES, beforeResolve as BEFORE_RESOLVE } from './consts/routes.js';
import { Brand } from './components/brand.js';
import { mountCodeRain, getEnabled, setEnabled } from './components/codeRain/index.js';
import { RAIN_OPTIONS } from './consts/code-rain.js';

// Keep the footer year current
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const routes = ROUTES;

// Mount persistent header brand
const brandHost = document.getElementById('brand');
if (brandHost) brandHost.innerHTML = Brand();

initRouter({ routes, baseTitle: 'Rob Lewis', beforeResolve: BEFORE_RESOLVE });

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
