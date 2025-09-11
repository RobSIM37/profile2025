import { meta as startMeta, render as renderStart } from './start.js';

export const meta = {
  title: 'Memory',
  description: startMeta?.description || 'Flip to find matching pictures',
};

export function render() {
  const frag = document.createDocumentFragment();

  const chrome = document.createElement('section');
  chrome.className = 'stack';
  const tabs = document.createElement('div');
  tabs.className = 'pips-tabs';
  const demoBtn = document.createElement('a'); demoBtn.href = '#'; demoBtn.textContent = 'Demo'; demoBtn.className = 'button';
  const srcBtn = document.createElement('a'); srcBtn.href = '#'; srcBtn.textContent = 'Source'; srcBtn.className = 'button button-secondary';
  tabs.append(demoBtn, srcBtn);

  const demoPane = document.createElement('div');
  demoPane.className = 'gallery-demo-pane';
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  // Mount Start view
  const startFrag = renderStart();
  demoPane.append(startFrag);

  chrome.append(tabs, demoPane, srcPane);
  frag.append(chrome);

  const showDemo = () => {
    srcPane.style.display = 'none';
    demoPane.style.display = '';
    demoBtn.className = 'button';
    srcBtn.className = 'button button-secondary';
  };
  const showSrc = () => {
    demoPane.style.display = 'none';
    srcPane.style.display = '';
    demoBtn.className = 'button button-secondary';
    srcBtn.className = 'button';
    renderMemorySourceBrowser(srcPane);
  };
  demoBtn.addEventListener('click', function(e){ e.preventDefault(); showDemo(); });
  srcBtn.addEventListener('click', function(e){ e.preventDefault(); showSrc(); });
  showDemo();

  return frag;
}

const MEM_FILES = [
  'page.js','start.js','game2.js',
  'engine/deck.js','engine/state.js','engine/rules.js',
  'ai/memory.js','ai/choose.js',
  'ui/card.js','ui/board.js','ui/icons/index.js'
];

function renderMemorySourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/memory/';
  list.append(note);
  MEM_FILES.forEach(function(path){
    const item = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = path;
    item.append(sum);
    const pre = document.createElement('pre'); pre.className = 'scroll-themed';
    const code = document.createElement('code');
    code.textContent = 'Loading…';
    pre.append(code);
    item.append(pre);
    item.addEventListener('toggle', async function(){
      if (!item.open) return;
      try {
        const res = await fetch('src/views/gallery/memory/' + path, { cache: 'no-cache' });
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
