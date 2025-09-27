import { Button } from '../../../components/ui/button.js';
import { Tag } from '../../../components/ui/tag.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { renderPredictFourSourceBrowser } from './sourceBrowser.js';

export const meta = {
  title: 'Predict Four - How to Play',
  description: 'Turn structure, prediction flow, and scoring overview.',
};

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();

  const demoPane = document.createElement('section');
  demoPane.className = 'stack pf-howto';

  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  let sourceLoaded = false;
  const sub = makeGallerySubheader({
    title: 'Predict Four',
    href: '#/gallery/predict-four',
    emitInitial: false,
    onChange(id) {
      const showDemo = id === 'demo';
      demoPane.style.display = showDemo ? '' : 'none';
      srcPane.style.display = showDemo ? 'none' : '';
      if (!showDemo && !sourceLoaded) {
        renderPredictFourSourceBrowser(srcPane, ['howto.js', 'start.js']);
        sourceLoaded = true;
      }
    },
  });

  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  frag.append(sub.root, demoPane, srcPane);

  demoPane.innerHTML = `
    <h2>How to Play</h2>
    <p>Predict Four layers a secret prediction challenge on top of a classic seven-column, six-row connect-four match.</p>
  `;

  demoPane.append(buildFlowList(), buildScoring(), buildTips());

  const ctaRow = document.createElement('div');
  ctaRow.className = 'pf-actions';
  ctaRow.innerHTML = Button({ id: 'pf-back-setup', label: 'Back to Setup', variant: 'secondary' });
  demoPane.append(ctaRow);

  ctaRow.querySelector('#pf-back-setup')?.addEventListener('click', () => {
    location.hash = '#/gallery/predict-four';
  });

  return frag;
}
function buildFlowList() {
  const section = document.createElement('section');
  section.className = 'stack';
  const heading = document.createElement('h3');
  heading.textContent = 'Turn Flow';
  section.append(heading);

  const tokens = document.createElement('div');
  tokens.className = 'pf-rule-tags';
  ['Drag and drop', 'Hidden prediction', 'Alternate turns'].forEach(text => tokens.append(Tag({ text })));
  section.append(tokens);

  const list = document.createElement('ol');
  list.className = 'pf-steps';
  [
    'Randomly determine which player starts. Chips drop from the top of a selected column until they rest on the lowest available slot.',
    'After placing a chip, the active player secretly predicts which column the opponent will play next. A phantom chip shows their guess.',
    'Predictions remain private; the opponent only sees their own board state.',
    'Play alternates until a player connects four in a row (horizontal, vertical, or diagonal) or the grid fills (draw).',
  ].forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    list.append(li);
  });
  section.append(list);
  return section;
}

function buildScoring() {
  const section = document.createElement('section');
  section.className = 'stack';
  const heading = document.createElement('h3');
  heading.textContent = 'Scoring';
  section.append(heading);

  const bulletList = document.createElement('ul');
  bulletList.className = 'stack';
  const items = [
    { label: 'Win Bonus', body: 'The victor takes the configured win points (default 10).' },
    { label: 'Prediction Bonus', body: 'Each accurate guess grants the configured prediction points (default 4).' },
    { label: 'Break Ties', body: 'Totals combine win and prediction bonuses, so a player can steal the match on points even if the board is drawn.' },
  ];
  items.forEach(({ label, body }) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    li.append(strong, document.createTextNode(body));
    bulletList.append(li);
  });
  section.append(bulletList);
  return section;
}

function buildTips() {
  const section = document.createElement('section');
  section.className = 'stack';
  const heading = document.createElement('h3');
  heading.textContent = 'Strategy Notes';
  section.append(heading);

  const notes = document.createElement('ul');
  notes.className = 'stack';
  [
    'Use mid-depth AI profiles with higher predictability % to simulate fallible play.',
    'Low predictability (high noise) makes the AI harder to read but may lower its odds of winning.',
    'Watch your personal prediction tally in the HUD: your opponent sees only their own progress.',
  ].forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    notes.append(li);
  });
  section.append(notes);
  return section;
}
















