// Minimal hash-based router for a static site

export function initRouter({ routes, baseTitle = document.title }) {
  const getPath = () => {
    const hash = window.location.hash || '#/';
    const raw = hash.slice(1); // remove '#'
    return raw.startsWith('/') ? raw : `/${raw}`;
  };

  const resolve = (path) => routes[path] || routes['/404'] || routes['/'];

  async function render() {
    const path = getPath();
    const loader = resolve(path);
    const mod = await loader();
    const app = document.getElementById('app');
    if (!app) return;

    // Reset any view-specific inline styles on the app container
    app.removeAttribute('style');

    const out = typeof mod.render === 'function' ? mod.render() : '';
    if (typeof out === 'string') {
      app.innerHTML = out;
    } else if (out instanceof Element || out instanceof DocumentFragment) {
      app.replaceChildren(out);
    } else {
      app.textContent = '';
    }

    // Title management
    const title = mod.meta?.title ? `${baseTitle} — ${mod.meta.title}` : baseTitle;
    if (document.title !== title) document.title = title;

    // Nav active state
    document.querySelectorAll('a[data-route]')?.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const active = href === `#${path}`;
      a.classList.toggle('active', active);
      a.setAttribute('aria-current', active ? 'page' : 'false');
    });

    // Focus main for accessibility after navigation
    app.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', render);

  return { render };
}
