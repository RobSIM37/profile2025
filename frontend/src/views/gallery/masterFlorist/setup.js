import { Button } from '../../../components/ui/button.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { setAppSolid } from '../../../lib/appShell.js';

export const meta = {
  title: 'Master Florist - Setup',
  description: 'Prep the studio, choose customers, and launch a new floral challenge.',
};

export function render(options = {}) {
  return buildSetupView({ ...options, includeSubheader: true });
}

export function renderSetupPane(options = {}) {
  const includeSubheader = options.includeSubheader ?? true;
  return buildSetupView({ ...options, includeSubheader });
}

function buildSetupView({ includeSubheader = true } = {}) {
  setAppSolid(true);

  const frag = document.createDocumentFragment();
  let sub = null;

  if (includeSubheader) {
    sub = makeGallerySubheader({
      title: 'Master Florist',
      href: '#/gallery/master-florist',
      emitInitial: false,
    });
    frag.append(sub.root);
  }

  const section = document.createElement('section');
  section.className = 'stack';

  const heading = document.createElement('h2');
  heading.textContent = 'Studio Setup';
  heading.style.fontSize = '1.6rem';
  heading.style.fontWeight = '800';

  const intro = document.createElement('p');
  intro.textContent = 'Pick the clients for today, review your tools, and start arranging when you are ready.';

  const detailList = document.createElement('ul');
  detailList.className = 'list';
  ['Customer roster preview', 'Bench layout presets', 'Optional time limits (coming soon)'].forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    detailList.append(li);
  });

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.style.justifyContent = 'center';

  const newGameBtnWrap = document.createElement('div');
  newGameBtnWrap.innerHTML = Button({ label: 'New Game', attrs: { 'data-role': 'new-game' } });
  const howToBtnWrap = document.createElement('div');
  howToBtnWrap.innerHTML = Button({ label: 'How to Play', variant: 'secondary', attrs: { 'data-role': 'how-to' } });

  actions.append(newGameBtnWrap.firstElementChild, howToBtnWrap.firstElementChild);

  section.append(heading, intro, detailList, actions);
  frag.append(section);

  const newGameBtn = section.querySelector('[data-role="new-game"]');
  const howToBtn = section.querySelector('[data-role="how-to"]');

  newGameBtn?.addEventListener('click', () => {
    try {
      sessionStorage.setItem('mf:chosen', '1');
    } catch {}
    location.hash = '#/gallery/master-florist/game';
  });

  howToBtn?.addEventListener('click', () => {
    location.hash = '#/gallery/master-florist/how-to';
  });

  return frag;
}