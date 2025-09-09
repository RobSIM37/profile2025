import { meta as gameMeta, render as renderGame } from './index.js';

export const meta = {
  title: gameMeta?.title || 'Timesweeper',
  description: gameMeta?.description || 'Minesweeper with a timed twist',
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

  // Mount existing Timesweeper view
  const gameFrag = renderGame();
  demoPane.append(gameFrag);

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
    renderTsSourceBrowser(srcPane);
  };
  demoBtn.addEventListener('click', function(e){ e.preventDefault(); showDemo(); });
  srcBtn.addEventListener('click', function(e){ e.preventDefault(); showSrc(); });
  showDemo();

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
    code.textContent = 'Loading…';
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

