import { Button } from '../../../components/ui/button.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { MF_CANVAS_WIDTH, MF_CANVAS_HEIGHT } from './canvas/constants.js';
import { createMasterFloristCanvasSizer } from './canvas/sizer.js';
import { getMasterFloristSettings, setMasterFloristSettings } from './state/store.js';

export const meta = {
  title: 'Master Florist - Setup',
  description: 'Prep the studio, choose customers, and launch a new floral challenge.',
};

const BLANK_BACKGROUND_SRC = new URL('./assets/backgrounds/blankBackground.png', import.meta.url).href;
const THUMBNAIL_SRC = new URL('../../../../assets/masterFloristThumbnail.png', import.meta.url).href;
let setupStylesInjected = false;

export function render(options = {}) {
  return buildSetupView({ ...options, includeSubheader: true });
}

export function renderSetupPane(options = {}) {
  const includeSubheader = options.includeSubheader ?? true;
  return buildSetupView({ ...options, includeSubheader });
}

function buildSetupView({ includeSubheader = true } = {}) {
  setAppSolid(true);
  ensureSetupStyles();

  const frag = document.createDocumentFragment();
  const settings = getMasterFloristSettings();

  if (includeSubheader) {
    const sub = makeGallerySubheader({
      title: 'Master Florist',
      href: '#/gallery/master-florist',
      emitInitial: false,
    });
    frag.append(sub.root);
  }

  const stage = createSetupStage();
  const layout = document.createElement('section');
  layout.className = 'mf-setup-root';
  layout.append(stage.root);

  const controls = document.createElement('div');
  controls.className = 'mf-setup-controls';
  const settingDefs = getSettingDefinitions(settings);
  settingDefs.forEach((def) => {
    controls.append(createSettingCard(def));
  });

  const howToBtn = createActionButton({
    label: 'How to Play',
    variant: 'secondary',
    role: 'how-to',
    extraClass: 'is-secondary',
  });
  const newGameBtn = createActionButton({
    label: 'New Game',
    role: 'new-game',
    extraClass: 'is-primary',
  });

  const helpDock = document.createElement('div');
  helpDock.className = 'mf-setup-help';
  helpDock.append(howToBtn);

  const preview = createSetupPreview();

  const startDock = document.createElement('div');
  startDock.className = 'mf-setup-start';
  startDock.append(newGameBtn);

  stage.overlay.append(controls, helpDock, preview, startDock);
  frag.append(layout);

  howToBtn?.addEventListener('click', () => {
    location.hash = '#/gallery/master-florist/how-to';
  });

  newGameBtn?.addEventListener('click', () => {
    try {
      sessionStorage.setItem('mf:chosen', '1');
    } catch {}
    location.hash = '#/gallery/master-florist/game';
  });

  frag.cleanup = () => {
    stage.dispose();
  };

  return frag;
}

function getSettingDefinitions(settings = {}) {
  return [
    {
      key: 'difficulty',
      label: 'Difficulty',
      description: 'Determines how many flowers the customers ask for.',
      value: settings.difficulty || 'normal',
      options: [
        { value: 'insane', label: 'Insane' },
        { value: 'hard', label: 'Hard' },
        { value: 'normal', label: 'Normal' },
        { value: 'easy', label: 'Easy' },
      ],
    },
    {
      key: 'footTraffic',
      label: 'Foot Traffic',
      description: 'Determines how quickly new customers arrive.',
      value: settings.footTraffic,
      options: [
        { value: 'relaxed', label: 'Relaxed' },
        { value: 'steady', label: 'Steady' },
        { value: 'brisk', label: 'Brisk' },
      ],
    },
    {
      key: 'atmosphere',
      label: 'Atmosphere',
      description: 'Determines how quickly customers moods change.',
      value: settings.atmosphere,
      options: [
        { value: 'soothing', label: 'Soothing' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'tense', label: 'Tense' },
      ],
    },
  ];
}

function createSettingCard({ key, label, description, value, options }) {
  const card = document.createElement('div');
  card.className = 'mf-setup-card';

  const labelEl = document.createElement('label');
  labelEl.className = 'mf-setup-card-label';
  labelEl.setAttribute('for', `mf-setup-${key}`);

  const title = document.createElement('span');
  title.className = 'mf-setup-card-title';
  title.textContent = label;

  const hint = document.createElement('span');
  hint.className = 'mf-setup-card-hint';
  hint.textContent = description;

  const header = document.createElement('div');
  header.className = 'mf-setup-card-header';
  header.append(title, hint);

  const select = document.createElement('select');
  select.className = 'mf-setup-select';
  select.name = key;
  select.id = `mf-setup-${key}`;

  options.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    select.append(opt);
  });

  if (options.some((opt) => opt.value === value)) {
    select.value = value;
  }

  select.addEventListener('change', () => {
    setMasterFloristSettings(null, { [key]: select.value });
  });

  labelEl.append(header, select);
  card.append(labelEl);
  return card;
}

function createActionButton({ label, variant = 'primary', role, extraClass }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = Button({
    label,
    variant,
    className: ['mf-setup-button', extraClass].filter(Boolean).join(' '),
    attrs: { 'data-role': role },
  });
  return wrapper.firstElementChild;
}

function createSetupPreview() {
  const wrap = document.createElement('div');
  wrap.className = 'mf-setup-preview';

  const img = document.createElement('img');
  img.src = THUMBNAIL_SRC;
  img.alt = 'Fresh bouquet waiting on the workbench';
  img.decoding = 'async';
  img.loading = 'lazy';

  wrap.append(img);
  return wrap;
}

function createSetupStage() {
  const root = document.createElement('div');
  root.className = 'mf-setup-stage';

  const frame = document.createElement('div');
  frame.className = 'mf-setup-frame';

  const canvas = document.createElement('canvas');
  canvas.className = 'mf-setup-canvas';
  canvas.width = MF_CANVAS_WIDTH;
  canvas.height = MF_CANVAS_HEIGHT;

  frame.append(canvas);
  root.append(frame);

  const overlay = document.createElement('div');
  overlay.className = 'mf-setup-overlay';
  root.append(overlay);

  const ctx = canvas.getContext('2d');
  const backgroundImage = new Image();
  backgroundImage.decoding = 'async';
  backgroundImage.src = BLANK_BACKGROUND_SRC;

  const sizer = createMasterFloristCanvasSizer({
    canvas,
    container: frame,
    onResize: () => drawBackground(ctx, backgroundImage),
  });
  sizer.mount();

  backgroundImage.addEventListener('load', () => {
    drawBackground(ctx, backgroundImage);
  });
  backgroundImage.addEventListener('error', () => {
    drawBackground(ctx, null);
  });

  drawBackground(ctx, backgroundImage.complete && backgroundImage.naturalWidth > 0 ? backgroundImage : null);

  function dispose() {
    sizer.unmount();
  }

  return { root, frame, canvas, overlay, dispose };
}

function drawBackground(ctx, image) {
  if (!ctx) return;
  const width = ctx.canvas?.width || MF_CANVAS_WIDTH;
  const height = ctx.canvas?.height || MF_CANVAS_HEIGHT;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fdf7f1';
  ctx.fillRect(0, 0, width, height);
  if (image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    ctx.drawImage(image, 0, 0, width, height);
  } else {
    const stripeHeight = 24;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let y = 0; y < height; y += stripeHeight * 2) {
      ctx.fillRect(0, y, width, stripeHeight);
    }
  }
  ctx.restore();
}

function ensureSetupStyles() {
  if (setupStylesInjected) {
    return;
  }
  setupStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .mf-setup-root {
      display: flex;
      justify-content: center;
      padding: var(--space-6, 48px) var(--space-4, 24px);
    }

    .mf-setup-stage {
      position: relative;
      display: inline-block;
      max-width: min(100%, 1100px);
      margin: 0 auto;
    }

    .mf-setup-frame {
      position: relative;
      width: min(100%, 960px);
      border-radius: 32px;
      overflow: hidden;
      box-shadow: 0 28px 60px rgba(34, 21, 12, 0.24);
      background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.65), rgba(251, 241, 226, 0.6));
    }

    .mf-setup-canvas {
      display: block;
      width: 100%;
      height: auto;
      background: transparent;
    }

    .mf-setup-overlay {
      pointer-events: none;
      position: absolute;
      inset: 0;
    }

    .mf-setup-controls {
      pointer-events: auto;
      position: absolute;
      top: 50%;
      left: clamp(24px, 6vw, 72px);
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .mf-setup-card {
      width: clamp(364px, 36vw, 476px);
      background: linear-gradient(180deg, rgba(255, 251, 243, 0.95), rgba(246, 229, 206, 0.9));
      border-radius: 24px;
      border: 4px solid rgba(255, 192, 146, 0.8);
      box-shadow: 0 16px 32px rgba(74, 44, 28, 0.25);
      padding: 18px 28px 22px;
    }

    .mf-setup-card-label {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .mf-setup-card-title {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #452c1a;
    }

    .mf-setup-card-header {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    @media (min-width: 720px) {
      .mf-setup-card-header {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
      }

      .mf-setup-card-title {
        flex: 0 0 60%;
        white-space: nowrap;
      }
    }

    @media (max-width: 719px) {
      .mf-setup-card-title {
        white-space: normal;
      }
    }

    .mf-setup-select {
      appearance: none;
      width: 100%;
      border-radius: 18px;
      border: 0;
      padding: 14px 16px;
      font-size: 1.05rem;
      font-weight: 700;
      background: linear-gradient(135deg, #ffe2c4, #f9c694);
      color: #3a2312;
      box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.15), 0 8px 20px rgba(74, 44, 28, 0.18);
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .mf-setup-select:focus {
      outline: 4px solid rgba(255, 158, 88, 0.6);
      outline-offset: 4px;
    }

    .mf-setup-select:hover {
      transform: translateY(-2px);
      box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.15), 0 12px 26px rgba(74, 44, 28, 0.26);
    }

    .mf-setup-card-hint {
      font-size: 0.85rem;
      color: rgba(52, 30, 18, 0.78);
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .mf-setup-help,
    .mf-setup-preview,
    .mf-setup-start {
      position: absolute;
      pointer-events: auto;
    }

    .mf-setup-help {
      top: clamp(28px, 5vw, 48px);
      right: clamp(28px, 5vw, 64px);
    }

    .mf-setup-preview {
      top: 50%;
      right: clamp(28px, 5vw, 64px);
      transform: translateY(-50%);
      pointer-events: none;
    }

    .mf-setup-start {
      right: clamp(32px, 6vw, 72px);
      bottom: clamp(32px, 6vw, 72px);
    }

    .mf-setup-preview img {
      display: block;
      width: clamp(180px, 22vw, 320px);
      max-width: 100%;
      border-radius: 22px;
      box-shadow: 0 14px 34px rgba(60, 38, 24, 0.28);
    }

    .mf-setup-button {
      font-size: 1.05rem;
      font-weight: 800;
      border-radius: 18px;
      padding: 16px 28px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 18px 32px rgba(74, 44, 28, 0.3);
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .mf-setup-button.is-primary {
      background: linear-gradient(135deg, #ff9f56, #ff7a45);
      color: #2f1509;
    }

    .mf-setup-button.is-secondary {
      background: linear-gradient(135deg, #fff4d4, #ffe1a8);
      color: #3a2312;
    }

    .mf-setup-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 24px 40px rgba(74, 44, 28, 0.34);
    }

    @media (max-width: 900px) {
      .mf-setup-stage {
        display: block;
        width: 100%;
        max-width: none;
      }

      .mf-setup-frame {
        width: 100%;
      }

      .mf-setup-controls {
        position: static;
        transform: none;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        padding: 32px clamp(16px, 5vw, 32px);
        gap: 18px;
      }

      .mf-setup-card {
        width: 100%;
      }

      .mf-setup-help {
        position: static;
        display: flex;
        justify-content: center;
        margin: 18px 0 0;
      }

      .mf-setup-preview {
        position: static;
        transform: none;
        margin: 12px 0;
      }

      .mf-setup-preview img {
        width: min(320px, 90vw);
      }

      .mf-setup-start {
        position: static;
        display: flex;
        justify-content: center;
        margin: 18px 0 32px;
      }

      .mf-setup-overlay {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: clamp(16px, 4vw, 32px);
        gap: 16px;
        position: static;
        pointer-events: auto;
      }

      .mf-setup-stage {
        width: 100%;
      }

      .mf-setup-root {
        padding: var(--space-4, 24px);
      }
    }
  `;
  document.head.append(style);
}
