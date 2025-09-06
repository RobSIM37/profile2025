import { initRouter } from './router.js';
import * as Landing from './views/landing.js';
import { Brand } from './components/brand.js';
import { mountCodeRain, getEnabled, setEnabled } from './components/codeRain/index.js';

// Keep the footer year current
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const routes = {
  '/': async () => Landing,
  '/gallery': () => import('./views/gallery.js'),
  '/contact': () => import('./views/contact.js'),
  '/rain': () => import('./views/coderain.js'),
  '/404': async () => ({
    meta: { title: 'Not Found' },
    render: () => `
      <section class="stack">
        <h2>Page not found</h2>
        <p>Try the <a href="#/">home page</a>.</p>
      </section>
    `,
  }),
};

// Mount persistent header brand
const brandHost = document.getElementById('brand');
if (brandHost) brandHost.innerHTML = Brand();

initRouter({ routes, baseTitle: 'Rob Lewis' });

// Mount background Code Rain after DOM is ready
const RAIN_OPTIONS = {
  glyphSize: 24,
  colorHead: '#c8d7ffff',
  colorTrail: '#3f48cc',
  // Flicker chance per trail glyph draw (0..1). You can also use `flicker`.
  switchRate: 0.05,
  // Chance per frame the head glyph changes (0..1)
  headSwitchRate: 0.1,
  // Speed in rows per second
  speedMin: 7,
  speedMax: 20,
  // Trail length in rows
  trailMin: 10,
  trailMax: 28,
  // Canvas background: 'auto' uses body background color
  background: '#000',
  // Max simultaneous heads per column
  dropsPerColumn: 2,
  // Trail fade speed range (higher = faster fade)
  minFade: 0.8,
  maxFade: 1.8,
  // Use sharper digital type for glyphs
  fontFamily: "'Share Tech Mono', monospace",
};
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
