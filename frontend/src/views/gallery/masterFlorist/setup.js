import { Button } from '../../../components/ui/button.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { getMasterFloristSettings, setMasterFloristSettings } from './state/store.js';

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

  const settingsPanel = createSettingsPanel();

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.style.justifyContent = 'center';

  const newGameBtnWrap = document.createElement('div');
  newGameBtnWrap.innerHTML = Button({ label: 'New Game', attrs: { 'data-role': 'new-game' } });
  const howToBtnWrap = document.createElement('div');
  howToBtnWrap.innerHTML = Button({ label: 'How to Play', variant: 'secondary', attrs: { 'data-role': 'how-to' } });

  actions.append(newGameBtnWrap.firstElementChild, howToBtnWrap.firstElementChild);

  section.append(heading, intro, detailList, settingsPanel, actions);
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

function createSettingsPanel() {
  const settings = getMasterFloristSettings();

  const panel = document.createElement('div');
  panel.className = 'stack';
  panel.style.gap = 'var(--space-3)';

  const subheading = document.createElement('h3');
  subheading.textContent = 'Customer Flow';
  subheading.style.fontSize = '1.1rem';
  subheading.style.fontWeight = '700';

  const footTrafficRow = createSettingRow({
    label: 'Foot Traffic',
    description: 'Controls how quickly customers arrive at the shop.',
    name: 'footTraffic',
    value: settings.footTraffic,
    options: [
      { value: 'relaxed', text: 'Relaxed' },
      { value: 'steady', text: 'Steady' },
      { value: 'brisk', text: 'Brisk' },
    ],
  });

  const atmosphereRow = createSettingRow({
    label: 'Atmosphere',
    description: 'Sets the baseline patience for queued customers.',
    name: 'atmosphere',
    value: settings.atmosphere,
    options: [
      { value: 'soothing', text: 'Soothing' },
      { value: 'balanced', text: 'Balanced' },
      { value: 'tense', text: 'Tense' },
    ],
  });

  panel.append(subheading, footTrafficRow, atmosphereRow);
  return panel;
}

function createSettingRow({ label, description, name, value, options }) {
  const wrap = document.createElement('div');
  wrap.className = 'stack';
  wrap.style.gap = 'var(--space-1)';

  const labelEl = document.createElement('label');
  labelEl.className = 'stack';
  labelEl.style.gap = 'var(--space-1)';
  labelEl.setAttribute('for', `mf-setup-${name}`);

  const title = document.createElement('span');
  title.textContent = label;
  title.style.fontWeight = '600';

  const select = document.createElement('select');
  select.name = name;
  select.id = `mf-setup-${name}`;
  select.className = 'input';

  options.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    select.append(opt);
  });

  if (options.some((option) => option.value === value)) {
    select.value = value;
  }

  select.addEventListener('change', () => {
    setMasterFloristSettings(null, { [name]: select.value });
  });

  const hint = document.createElement('span');
  hint.className = 'note';
  hint.textContent = description;

  labelEl.append(title, select, hint);
  wrap.append(labelEl);
  return wrap;
}
