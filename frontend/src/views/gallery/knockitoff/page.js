import { meta as startMeta, render as renderStart } from './start.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';

export const meta = {
  title: startMeta?.title || 'Knock It Off!',
  description: startMeta?.description || 'Be the last checker standing',
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

  // Mount Start view into demo pane
  const startFrag = renderStart();
  demoPane.append(startFrag);

  // Use unified gallery subheader (title + Demo/Source tabs)
  const sub = makeGallerySubheader({
    title: 'Knock it Off',
    href: '#/gallery/knock-it-off',
    onChange(id){
      const showDemo = id === 'demo';
      srcPane.style.display = showDemo ? 'none' : '';
      demoPane.style.display = showDemo ? '' : 'none';
      if (!showDemo) renderKioSourceBrowser(srcPane);
    },
  });
  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  chrome.append(sub.root, demoPane, srcPane);
  frag.append(chrome);

  return frag;
}

const KIO_FILES = [
  // top-level
  'index.js','start.js','game.js','howto.js','masks.js','rules.js','state.js',
  // subfolders
  'ai/evaluate.js','ai/memory.js','ai/profiles.js','ai/turns.js',
  'engine/directions.js','engine/moves.js',
  'flow/autostart.js','flow/startGame.js',
  'play/perform.js',
  'setup/phase.js','setup/planner.js',
  'ui/inputs.js','ui/racks.js','ui/renderers.js','ui/setupBoard.js',
  'util/players.js',
];

function renderKioSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/knockitoff/';
  list.append(note);
  KIO_FILES.forEach(function(path){
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
        const res = await fetch('src/views/gallery/knockitoff/' + path, { cache: 'no-cache' });
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
