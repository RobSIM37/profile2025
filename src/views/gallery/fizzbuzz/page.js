import { meta as gameMeta } from './game.js';
import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';

export const meta = {
  title: 'FizzBuzz — Challenge Mode',
  description: gameMeta?.description || 'Human vs AI with challenge-only validation',
};

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();

  const chrome = document.createElement('section');
  chrome.className = 'stack';

  // Minimal two-tab chrome: Demo / Source
  const tabs = document.createElement('div');
  tabs.className = 'pips-tabs';
  const startBtn = document.createElement('a'); startBtn.href = '#'; startBtn.textContent = 'Demo'; startBtn.className = 'button';
  const srcBtn = document.createElement('a'); srcBtn.href = '#'; srcBtn.textContent = 'Source'; srcBtn.className = 'button button-secondary';
  tabs.append(startBtn, srcBtn);

  const startPane = document.createElement('div');
  startPane.className = 'gallery-demo-pane';
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  // Start view: header + how-to + New Game
  const intro = document.createElement('section');
  // Match Knock It Off background using shared kio-wrap style
  intro.className = 'stack kio-wrap';
  const headerEl = document.createElement('header');
  headerEl.className = 'stack';
  const h = document.createElement('h2');
  h.textContent = 'FizzBuzz — Challenge Mode';
  h.style.fontSize = '1.8rem';
  h.style.lineHeight = '1.2';
  h.style.fontWeight = '800';
  const tag = document.createElement('p');
  tag.textContent = 'A friendly Human vs AI take on FizzBuzz. You play the number or a word combo — or press Challenge. Only challenges decide correctness.';
  tag.style.color = 'var(--muted)';
  headerEl.append(h, tag);

  const howBody = document.createElement('div');
  const ul = document.createElement('ul');
  ul.className = 'list';
  [
    'Turns alternate Human ↔ AI. You must act before the timer hits 0.',
    'Actions: play “The Number” or a word combo (e.g., FizzBuzz), or press Challenge.',
    'Timeouts record an empty move — not an auto-loss.',
    'Human wins a level-up by correctly challenging an invalid AI move. A new rule is added.',
    'AI can challenge your move. A correct challenge ends the game.',
  ].forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
  howBody.append(ul);
  const how = document.createElement('section');
  how.className = 'stack';
  const howTitle = document.createElement('h3');
  howTitle.textContent = 'How to Play';
  howTitle.style.fontSize = '1.35rem';
  howTitle.style.lineHeight = '1.2';
  howTitle.style.fontWeight = '800';
  how.append(howTitle, howBody);

  // Very basic FizzBuzz explanation with examples
  const basicsBody = document.createElement('div');
  const basicsP = document.createElement('p');
  basicsP.textContent = 'Classic FizzBuzz: say the number unless it is divisible by 3 or 5. If divisible by 3 say “Fizz”, if divisible by 5 say “Buzz”, if divisible by both say “FizzBuzz”.';
  const ex = document.createElement('ul');
  ex.className = 'list';
  [
    '1 → "1" (not divisible by 3 or 5)',
    '3 → "Fizz" (divisible by 3)',
    '5 → "Buzz" (divisible by 5)',
    '15 → "FizzBuzz" (divisible by 3 and 5)'
  ].forEach((t)=>{ const li = document.createElement('li'); li.textContent = t; ex.append(li); });
  const note = document.createElement('p');
  note.className = 'text-muted';
  note.textContent = 'In this mode, new rules get added as you level up (e.g., 7: Bazz). The buttons show all possible word combos for the current rules.';
  basicsBody.append(basicsP, ex, note);
  const basics = document.createElement('section');
  basics.className = 'stack';
  const basicsTitle = document.createElement('h3');
  basicsTitle.textContent = 'FizzBuzz Basics (with examples)';
  basicsTitle.style.fontSize = '1.35rem';
  basicsTitle.style.lineHeight = '1.2';
  basicsTitle.style.fontWeight = '800';
  basics.append(basicsTitle, basicsBody);

  // New Game button (uses global Button component)
  const newGameWrap = document.createElement('div');
  newGameWrap.style.display = 'flex';
  newGameWrap.style.justifyContent = 'center';
  newGameWrap.style.marginTop = 'var(--space-4)';
  newGameWrap.innerHTML = Button({ id: 'fb-new', label: 'New Game' });
  const newGameBtn = newGameWrap.firstElementChild;
  newGameBtn.addEventListener('click', (e) => {
    e.preventDefault();
    try { sessionStorage.setItem('fb:chosen', '1'); } catch {}
    window.location.hash = '#/gallery/fizzbuzz/game';
  });

  // Order: Basics first, then How To
  intro.append(headerEl, basics, how, newGameWrap);
  startPane.append(intro);

  chrome.append(tabs, startPane, srcPane);
  frag.append(chrome);

  const showStart = () => {
    srcPane.style.display = 'none';
    startPane.style.display = '';
    startBtn.className = 'button';
    srcBtn.className = 'button button-secondary';
  };
  const showSrc = () => {
    startPane.style.display = 'none';
    srcPane.style.display = '';
    startBtn.className = 'button button-secondary';
    srcBtn.className = 'button';
    renderSourceBrowser(srcPane);
  };
  startBtn.addEventListener('click', function(e){ e.preventDefault(); showStart(); });
  srcBtn.addEventListener('click', function(e){ e.preventDefault(); showSrc(); });
  showStart();

  return frag;
}

const FILES = [ 'page.js', 'game.js' ];

function renderSourceBrowser(host){
  host.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'stack';
  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/fizzbuzz/';
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
        const res = await fetch('src/views/gallery/fizzbuzz/' + path, { cache: 'no-cache' });
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
