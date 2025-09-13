import { meta as startMeta, render as renderStart } from './start.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';

export const meta = {
  title: startMeta?.title || 'Timesweeper',
  description: startMeta?.description || 'Minesweeper with a timed twist',
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

  // Mount Start view
  const startFrag = renderStart();
  demoPane.append(startFrag);

  // Unified subheader with title and tabs
  const sub = makeGallerySubheader({
    title: 'Timesweeper',
    href: '#/gallery/timesweeper',
    onChange(id){
      const showDemo = id === 'demo';
      srcPane.style.display = showDemo ? 'none' : '';
      demoPane.style.display = showDemo ? '' : 'none';
      if (!showDemo) renderTsSourceBrowser(srcPane);
    },
  });
  // Ensure Source accordions have styled scrollbars
  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  chrome.append(sub.root, demoPane, srcPane);
  frag.append(chrome);

  // Initial selection handled by subheader (emits onChange for activeId)
  return frag;
}

const TS_FILES = [
  'index.js',
  'engine.js',
];

function renderTsSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/timesweeper/';
  list.append(note);
  TS_FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = path;
    item.append(sum);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'Loading.';
    pre.append(code);
    item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try {
        const res = await fetch('src/views/gallery/timesweeper/' + path, { cache: 'no-cache' });
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
