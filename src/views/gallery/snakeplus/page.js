import { meta as gameMeta, render as renderGame } from './game.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';

export const meta = {
  title: 'Snake+',
  description: gameMeta?.description || 'Classic Snake with level twists',
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

  // Mount Game view
  const gameFrag = renderGame();
  demoPane.append(gameFrag);

  // Unified subheader with title and tabs
  const sub = makeGallerySubheader({
    title: 'Snake+',
    href: '#/gallery/snake-plus',
    onChange(id){
      const showDemo = id === 'demo';
      srcPane.style.display = showDemo ? 'none' : '';
      demoPane.style.display = showDemo ? '' : 'none';
      if (!showDemo) renderSourceBrowser(srcPane);
    },
  });
  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  chrome.append(sub.root, demoPane, srcPane);
  frag.append(chrome);

  return frag;
}

const FILES = [ 'page.js', 'game.js' ];

function renderSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/snakeplus/';
  list.append(note);
  FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = path;
    item.append(sum);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'Loading…';
    pre.append(code);
    item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try {
        const res = await fetch('src/views/gallery/snakeplus/' + path, { cache: 'no-cache' });
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

