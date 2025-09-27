import { Button } from '../../../components/ui/button.js';
import { numberField, selectField, textField } from '../../../components/ui/inputs.js';
import { setAppSolid } from '../../../lib/appShell.js';

export const meta = {
  title: 'Predict Four — Setup',
  description: 'Choose player types, scoring, and AI preferences before launching the game.',
};

const STORAGE_KEY = 'pf:config';
const CONFIG_VERSION = 2;
const DEFAULT_PREDICT_POINTS = 4;

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack pf-setup';

  const intro = document.createElement('p');
  intro.textContent = 'Configure players, scoring values, and AI tendencies before you drop the first chip.';
  wrap.append(intro);

  const playersSection = document.createElement('section');
  playersSection.className = 'stack pf-players';

  const playerFieldsets = createPlayerFieldsets();
  playerFieldsets.forEach(fs => playersSection.append(fs.fieldset));
  wrap.append(playersSection);

  const scoringSection = document.createElement('section');
  scoringSection.className = 'stack pf-scoring';
  const scoringLegend = document.createElement('h3');
  scoringLegend.textContent = 'Scoring';
  scoringSection.append(scoringLegend);
  const winField = numberField({ id: 'pf-win-points', label: 'Win points', value: 10, min: 1, max: 50, step: 1 });
  const predictField = numberField({ id: 'pf-predict-points', label: 'Correct prediction points', value: DEFAULT_PREDICT_POINTS, min: 0, max: 20, step: 1 });
  winField.input.setAttribute('aria-description', 'Points awarded to the player who wins the match.');
  predictField.input.setAttribute('aria-description', "Points awarded when a player correctly predicts the opponent's move.");
  const scoringGrid = document.createElement('div');
  scoringGrid.className = 'pf-scoring-grid';
  scoringGrid.style.display = 'grid';
  scoringGrid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  scoringGrid.style.columnGap = 'var(--space-4)';
  scoringGrid.style.rowGap = 'var(--space-4)';
  scoringGrid.style.width = '100%';
  scoringGrid.style.alignItems = 'start';
  scoringGrid.style.justifyItems = 'stretch';
  winField.wrapper.style.margin = '0';
  predictField.wrapper.style.margin = '0';
  [winField.wrapper, predictField.wrapper].forEach((wrapper) => {
    wrapper.style.margin = '0';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = 'none';
    const control = wrapper.querySelector('.ui-control');
    if (control) { control.style.width = '100%'; control.style.maxWidth = 'none'; }
    const input = wrapper.querySelector('input, select');
    if (input) { input.style.width = '100%'; input.style.maxWidth = 'none'; }
  });
  scoringGrid.append(winField.wrapper, predictField.wrapper);
  scoringSection.append(scoringGrid);
  wrap.append(scoringSection);

  const actionRow = document.createElement('div');
  actionRow.className = 'pf-actions';
  actionRow.innerHTML = `
    ${Button({ id: 'pf-start', label: 'Start Game' })}
    ${Button({ id: 'pf-howto', label: 'How to Play', variant: 'secondary' })}
  `;
  wrap.append(actionRow);

  frag.append(wrap);

  const startBtn = actionRow.querySelector('#pf-start');
  const howBtn = actionRow.querySelector('#pf-howto');

  let savedConfig = null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) savedConfig = JSON.parse(raw);
  } catch {
    savedConfig = null;
  }
  if (savedConfig) applySavedConfig(savedConfig, playerFieldsets, winField, predictField);
  else presetDefaults(playerFieldsets);

  playerFieldsets.forEach(entry => updatePlayerUi(entry));

  startBtn?.addEventListener('click', () => {
    const config = collectConfig(playerFieldsets, winField, predictField);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      sessionStorage.setItem('pf:chosen', '1');
    } catch {}
    location.hash = '#/gallery/predict-four/game';
  });

  howBtn?.addEventListener('click', () => {
    location.hash = '#/gallery/predict-four/how-to';
  });

  return frag;
}

function createPlayerFieldsets() {
  const players = [];
  for (let i = 0; i < 2; i++) {
    const idx = i + 1;
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'pf-player stack';
    fieldset.style.width = '100%';
    const legend = document.createElement('legend');
    legend.textContent = `Player ${idx}`;
    fieldset.append(legend);

    const grid = document.createElement('div');
    grid.className = 'pf-player-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    grid.style.columnGap = 'var(--space-4)';
    grid.style.rowGap = 'var(--space-4)';
    grid.style.width = '100%';
    grid.style.alignItems = 'start';
    grid.style.justifyItems = 'stretch';

    const typeField = selectField({
      id: `pf-player-${idx}-type`,
      label: 'Type',
      value: 'human',
      options: [
        { value: 'human', label: 'Human' },
        { value: 'ai', label: 'AI' },
      ],
    });
    typeField.wrapper.style.gridColumn = '1 / span 1';

    const nameField = textField({
      id: `pf-player-${idx}-name`,
      label: 'Display name',
      value: idx === 1 ? 'Red' : 'Yellow',
      placeholder: idx === 1 ? 'Red' : 'Yellow',
    });
    nameField.wrapper.style.gridColumn = '2 / span 1';

    const depthField = numberField({
      id: `pf-player-${idx}-depth`,
      label: 'Search depth',
      value: idx === 1 ? 4 : 3,
      min: 1,
      max: 9,
      step: 1,
    });
    depthField.wrapper.style.gridColumn = '1 / span 1';
    depthField.wrapper.style.display = 'none';

    const noiseField = numberField({
      id: `pf-player-${idx}-noise`,
      label: 'Predictability %',
      value: 10,
      min: 0,
      max: 100,
      step: 5,
    });
    noiseField.wrapper.style.gridColumn = '2 / span 1';
    noiseField.wrapper.style.display = 'none';

    [typeField.wrapper, nameField.wrapper, depthField.wrapper, noiseField.wrapper].forEach((wrapper) => {
      wrapper.style.margin = '0';
      wrapper.style.width = '100%';
      wrapper.style.maxWidth = 'none';
      const control = wrapper.querySelector('.ui-control');
      if (control) { control.style.width = '100%'; control.style.maxWidth = 'none'; }
      const input = wrapper.querySelector('input, select');
      if (input) { input.style.width = '100%'; input.style.maxWidth = 'none'; }
    });
    grid.append(typeField.wrapper, nameField.wrapper, depthField.wrapper, noiseField.wrapper);
    fieldset.append(grid);

    const entry = {
      index: idx,
      fieldset,
      grid,
      typeField,
      nameField,
      depthField,
      noiseField,
      depthWrapper: depthField.wrapper,
      noiseWrapper: noiseField.wrapper,
    };
    typeField.input.addEventListener('change', () => updatePlayerUi(entry));
    players.push(entry);
  }
  return players;
}

function updatePlayerUi(entry) {
  const isAi = entry.typeField.input.value === 'ai';
  entry.depthWrapper.style.display = isAi ? '' : 'none';
  entry.noiseWrapper.style.display = isAi ? '' : 'none';
  entry.depthField.input.disabled = !isAi;
  entry.noiseField.input.disabled = !isAi;

  if (!isAi) {
    if (!entry.depthField.input.value) entry.depthField.input.value = '4';
    if (!entry.noiseField.input.value) entry.noiseField.input.value = '10';
  }
}



function presetDefaults(entries) {
  if (entries[1]) {
    entries[1].typeField.input.value = 'ai';
    entries[1].depthField.input.value = '3';
    entries[1].noiseField.input.value = '20';
  }
}

function applySavedConfig(config, entries, winField, predictField) {
  if (typeof config.winPoints === 'number') winField.input.value = String(config.winPoints);
  const version = Number(config?.version) || 1;
  predictField.input.value = String(normalizePredictPoints(config.predictPoints, version));
  if (Array.isArray(config.players)) {
    config.players.slice(0, 2).forEach((player, i) => {
      const entry = entries[i];
      if (!entry || !player) return;
      if (player.kind === 'ai') {
        entry.typeField.input.value = 'ai';
        if (typeof player.depth === 'number') entry.depthField.input.value = String(player.depth);
        if (typeof player.noise === 'number') entry.noiseField.input.value = String(player.noise);
      } else {
        entry.typeField.input.value = 'human';
      }
      if (player.name) entry.nameField.input.value = player.name;
    });
  }
}

function normalizePredictPoints(value, version = CONFIG_VERSION) {
  const safeVersion = Number.isFinite(version) ? version : 1;
  if (!Number.isFinite(value)) return DEFAULT_PREDICT_POINTS;
  if (safeVersion < CONFIG_VERSION && value === 3) return DEFAULT_PREDICT_POINTS;
  return clampNumber(value, 0, 50, DEFAULT_PREDICT_POINTS);
}

function collectConfig(entries, winField, predictField) {
  const winPoints = clampNumber(parseFloat(winField.input.value), 1, 100, 10);
  const predictPoints = clampNumber(parseFloat(predictField.input.value), 0, 50, DEFAULT_PREDICT_POINTS);
  const players = entries.map((entry, order) => {
    const kind = entry.typeField.input.value === 'ai' ? 'ai' : 'human';
    const name = (entry.nameField.input.value || '').trim() || (order === 0 ? 'Red' : 'Yellow');
    if (kind === 'ai') {
      const depth = clampNumber(parseFloat(entry.depthField.input.value), 1, 12, 4);
      const noise = clampNumber(parseFloat(entry.noiseField.input.value), 0, 100, 10);
      return { kind, name, depth, noise };
    }
    return { kind, name };
  });
  return { version: CONFIG_VERSION, winPoints, predictPoints, players };
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return Math.round(value * 1000) / 1000;
}










