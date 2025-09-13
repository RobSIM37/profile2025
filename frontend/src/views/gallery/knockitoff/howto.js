import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';

export const meta = { title: 'Knock It Off! — How to Play', description: 'Rules and examples' };

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();

  // Build the How To content
  const wrap = document.createElement('section');
  wrap.className = 'stack kio-wrap';
  try { sessionStorage.removeItem('kio:howto'); } catch {}
  wrap.innerHTML = `
    <section class="stack kio-rules" id="kio-rules">
      <h2>How to Play</h2>
      <ol class="kio-list">
        <li>Each player secretly places their pieces on their colored dots (1 Frowny, 3 Smiley, the rest Blank).</li>
        <li>On your turn, choose one of your pieces and a direction (orthogonal or diagonal).</li>
        <li>Your piece slides in that direction until it hits another piece, then stops; the hit piece continues in the same direction. Repeat until a piece is knocked off the board.</li>
        <li>Your move must knock off an opponent’s piece — you may not eliminate your own piece.</li>
        <li>Lose your Frowny — you are out. Lose all three Smileys — you win!</li>
      </ol>
      <div class="kio-examples">
        <figure>
          ${exampleSVG('orth','before')}
          <figcaption>Before</figcaption>
        </figure>
        <figure>
          ${exampleSVG('orth','after')}
          <figcaption>After</figcaption>
        </figure>
        <figure>
          ${exampleSVG('diag','before')}
          <figcaption>Before</figcaption>
        </figure>
        <figure>
          ${exampleSVG('diag','after')}
          <figcaption>After</figcaption>
        </figure>
      </div>
    </section>
  `;

  // Panes
  const demoPane = document.createElement('div');
  demoPane.className = 'gallery-demo-pane';
  demoPane.append(wrap);
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  // Subheader with title + tabs
  const sub = makeGallerySubheader({
    title: 'Knock it Off',
    href: '#/gallery/knock-it-off',
    emitInitial: false,
    onChange(id){
      const showDemo = id === 'demo';
      demoPane.style.display = showDemo ? '' : 'none';
      srcPane.style.display = showDemo ? 'none' : '';
      if (!showDemo) renderKioSourceBrowser(srcPane);
    },
  });

  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}
  frag.append(sub.root, demoPane, srcPane);

  // Back navigation removed; use subheader title link instead

  return frag;
}

// Minimal source browser mirroring other KIO views
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

export function exampleSVG(kind, stage='before') {
  const cell = 44, size = cell*5;
  const board = (x,y)=>`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="${(x+y)%2? '#e2e8f0':'#f1f5f9'}"/>`;
  const disc = (x,y,fill)=>`<circle cx="${x*cell+cell/2}" cy="${y*cell+cell/2}" r="${cell*0.42}" fill="${fill}" stroke="#1f2937" stroke-width="2.5"/>`;
  const arrow = (x1,y1,x2,y2)=>`<defs><marker id="kio-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#111827"/></marker></defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="3" marker-end="url(#kio-arrow)"/>`;
  let pieces='', arrows='';
  if (kind==='orth') {
    if (stage==='before') {
      pieces += disc(0,2,'#3b82f6');
      pieces += disc(2,2,'#ef4444');
      pieces += disc(3,2,'#10b981');
      arrows = arrow(cell*0.5,cell*2.5, cell*4.5, cell*2.5);
    } else {
      pieces += disc(2,2,'#3b82f6');
      pieces += disc(3,2,'#ef4444');
    }
  } else {
    if (stage==='before') {
      pieces += disc(1,1,'#ef4444');
      pieces += disc(2,2,'#3b82f6');
      pieces += disc(3,3,'#10b981');
      arrows = arrow(cell*1.5,cell*1.5, cell*3.7, cell*3.7);
    } else {
      pieces += disc(2,2,'#ef4444');
      pieces += disc(3,3,'#3b82f6');
    }
  }
  let squares='';
  for (let y=0;y<5;y++) for (let x=0;x<5;x++) squares += board(x,y);
  const label = `${kind==='orth'?'Orthogonal':'Diagonal'} ${stage}`;
  return `<svg class="kio-example" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">${squares}${pieces}${arrows}</svg>`;
}
