import { renderSetupPane, meta as setupMeta } from './setup.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';

export const meta = {
  title: 'Master Florist',
  description: setupMeta?.description || 'Compose breathtaking bouquets in a calm botanical studio.',
};

export function render() {
  const frag = document.createDocumentFragment();

  const chrome = document.createElement('section');
  chrome.className = 'stack';

  const demoPane = document.createElement('div');
  demoPane.className = 'gallery-demo-pane';
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  const setupFrag = renderSetupPane({ includeSubheader: false });
  demoPane.append(setupFrag);

  const sub = makeGallerySubheader({
    title: 'Master Florist',
    href: '#/gallery/master-florist',
    onChange(id) {
      const showDemo = id === 'demo';
      demoPane.style.display = showDemo ? '' : 'none';
      srcPane.style.display = showDemo ? 'none' : '';
      if (!showDemo) renderMfSourceBrowser(srcPane);
    },
  });

  try {
    sub.attachSourcePane(srcPane, { maxHeight: '60vh' });
  } catch {}

  chrome.append(sub.root, demoPane, srcPane);
  frag.append(chrome);
  return frag;
}

const MF_SOURCE_FILES = [
  'page.js',
  'setup.js',
  'game.js',
  'howto.js',
  'canvas/constants.js',
  'canvas/controller.js',
  'canvas/sizer.js',
  'render/scene.js',
  'loop/ticker.js',
  'state/store.js',
];

function renderMfSourceBrowser(host) {
  if (!host) return;
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/masterFlorist/';
  list.append(note);

  MF_SOURCE_FILES.forEach((path) => {
    const detail = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = path;
    detail.append(summary);

    const pre = document.createElement('pre');
    pre.className = 'scroll-themed';
    const code = document.createElement('code');
    code.textContent = 'Loading...';
    pre.append(code);
    detail.append(pre);

    detail.addEventListener('toggle', async () => {
      if (!detail.open) return;
      try {
        const res = await fetch(`src/views/gallery/masterFlorist/${path}`, { cache: 'no-cache' });
        const txt = await res.text();
        code.textContent = txt;
      } catch (err) {
        code.textContent = 'Unable to load file in this context.';
      }
    }, { once: true });

    list.append(detail);
  });

  host.append(list);
}
