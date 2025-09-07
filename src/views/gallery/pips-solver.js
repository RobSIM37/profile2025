import { mountPipsSolver } from './pipsSolver/runner.js';

export const meta = {
  title: 'Pips Solver',
  description: 'Legacy project: interactive domino puzzle solver',
};

export function render() {
  const frag = document.createDocumentFragment();
  const appEl = document.getElementById('app');
  if (appEl) {
    // Expand the blue frame to fit content width when needed
    appEl.style.maxWidth = 'none';
    appEl.style.width = 'max-content';
  }

  const wrap = document.createElement('section');
  wrap.className = 'stack';

  // Tabs: Demo | Source
  const tabs = document.createElement('div');
  tabs.className = 'pips-tabs';
  const demoBtn = document.createElement('a'); demoBtn.href = '#'; demoBtn.textContent = 'Demo'; demoBtn.className = 'button';
  const srcBtn = document.createElement('a'); srcBtn.href = '#'; srcBtn.textContent = 'Source'; srcBtn.className = 'button button-secondary';
  tabs.append(demoBtn, srcBtn);

  const demoPane = document.createElement('div');
  demoPane.className = 'pips-demo-pane';
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  wrap.append(tabs, demoPane, srcPane);
  frag.append(wrap);

  let mounted = null;
  const showDemo = () => {
    srcPane.style.display = 'none';
    demoPane.style.display = '';
    demoBtn.className = 'button';
    srcBtn.className = 'button button-secondary';
    if (!mounted) mounted = mountPipsSolver(demoPane);
  };
  const showSrc = () => {
    demoPane.style.display = 'none';
    srcPane.style.display = '';
    demoBtn.className = 'button button-secondary';
    srcBtn.className = 'button';
    if (mounted) { mounted.destroy(); mounted = null; demoPane.innerHTML = ''; }
    renderSourceBrowser(srcPane);
  };
  demoBtn.addEventListener('click', (e)=>{ e.preventDefault(); showDemo(); });
  srcBtn.addEventListener('click', (e)=>{ e.preventDefault(); showSrc(); });

  showDemo();
  return frag;
}

const FILES = [
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
        const res = await fetch(`src/views/gallery/pipsSolver/${path}`);
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
