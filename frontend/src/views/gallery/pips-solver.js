import { mountPipsSolver } from './pipsSolver/runner.js';
import { makeGallerySubheader } from '../../components/ui/subheader.js';
import { setAppSolid } from '../../lib/appShell.js';

export const meta = {
  title: 'Pips Solver',
  description: 'Legacy project: interactive domino puzzle solver',
};

export function render() {
  const frag = document.createDocumentFragment();
  // Ensure opaque app background (black)
  setAppSolid(true);
  const appEl = document.getElementById('app');
  if (appEl) {
    // Use default container sizing; avoid forcing max-content which can collapse width
    try {
      appEl.style.removeProperty('max-width');
      appEl.style.removeProperty('width');
      appEl.style.removeProperty('background');
      appEl.style.removeProperty('color');
    } catch {}
  }

  const wrap = document.createElement('section');
  wrap.className = 'stack';

  const demoPane = document.createElement('div');
  demoPane.className = 'pips-demo-pane';
  // Keep demo surface white regardless of app background
  demoPane.style.background = '#ffffff';
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';
  // Unified subheader with title and tabs
  const sub = makeGallerySubheader({
    title: 'Pips Solver',
    href: '#/gallery/pips-solver',
    onChange(id){
      const showDemo = id === 'demo';
      srcPane.style.display = showDemo ? 'none' : '';
      demoPane.style.display = showDemo ? '' : 'none';
      if (showDemo) {
        if (!mounted) mounted = mountPipsSolver(demoPane);
      } else {
        if (mounted) { mounted.destroy(); mounted = null; demoPane.innerHTML = ''; }
        renderSourceBrowser(srcPane);
      }
    }
  });
  // Ensure Source accordions use styled, scoped scrollbars
  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  wrap.append(sub.root, demoPane, srcPane);
  frag.append(wrap);

  let mounted = null;
  // Initial onChange is fired by the subheader component to mount the demo.
  return frag;
}

// Keep this list in sync with the modules that power the demo
const FILES = [
  'runner.js',
  'app.js',
  'src/constants.js',
  'src/controller.js',
  'src/puzzle.js',
  'src/sidebar.js',
  'src/board.js',
  'src/solver.js',
  'src/panels/boardToolsPanel.js',
  'src/panels/areasPanel.js',
  'src/panels/dominoesPanel.js',
  'src/utils/ui.js',
];

function renderSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files copied into this repository under src/views/gallery/pipsSolver/';
  list.append(note);
  FILES.forEach(path => {
    const item = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = path;
    item.append(sum);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'Loading…';
    pre.append(code);
    item.append(pre);
    item.addEventListener('toggle', async () => {
      if (!item.open) return;
      try {
        const res = await fetch(`src/views/gallery/pipsSolver/${path}`, { cache: 'no-cache' });
        const txt = await res.text();
        code.textContent = txt;
      } catch (e) {
        code.textContent = 'Unable to load file in this context.';
      }
    }, { once: true });
    list.append(item);
  });
  host.append(list);
}
