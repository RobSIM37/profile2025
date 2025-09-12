import { meta as gameMeta, render as renderGame } from './game.js';

export const meta = {
  title: 'Snake+',
  description: gameMeta?.description || 'Classic Snake with level twists',
};

export function render() {
  const frag = document.createDocumentFragment();

  const chrome = document.createElement('section');
  chrome.className = 'stack';
  const tabs = document.createElement('div');
  tabs.className = 'pips-tabs';
  const demoBtn = document.createElement('a'); demoBtn.href = '#'; demoBtn.textContent = 'Demo'; demoBtn.className = 'button button-subtle';
  const srcBtn = document.createElement('a'); srcBtn.href = '#'; srcBtn.textContent = 'Source'; srcBtn.className = 'button button-secondary button-subtle';
  tabs.append(demoBtn, srcBtn);

  const demoPane = document.createElement('div');
  demoPane.className = 'gallery-demo-pane';
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  // Mount Game view
  const gameFrag = renderGame();
  demoPane.append(gameFrag);

  chrome.append(tabs, demoPane, srcPane);
  frag.append(chrome);

  const showDemo = () => {
    srcPane.style.display = 'none';
    demoPane.style.display = '';
    demoBtn.className = 'button button-subtle';
    srcBtn.className = 'button button-secondary button-subtle';
  };
  const showSrc = () => {
    demoPane.style.display = 'none';
    srcPane.style.display = '';
    demoBtn.className = 'button button-secondary button-subtle';
    srcBtn.className = 'button button-subtle';
    renderSourceBrowser(srcPane);
  };
  demoBtn.addEventListener('click', function(e){ e.preventDefault(); showDemo(); });
  srcBtn.addEventListener('click', function(e){ e.preventDefault(); showSrc(); });
  showDemo();

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

