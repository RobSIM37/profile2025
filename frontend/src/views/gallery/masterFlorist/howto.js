import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { setAppSolid } from '../../../lib/appShell.js';

export const meta = {
  title: 'Master Florist - How to Play',
  description: 'Learn the flow for greeting customers, prepping stems, and assembling bouquets.',
};

let howToStylesInjected = false;

export function render() {
  setAppSolid(true);
  ensureHowToStyles();

  const frag = document.createDocumentFragment();

  const sub = makeGallerySubheader({
    title: 'Master Florist',
    href: '#/gallery/master-florist',
    emitInitial: false,
  });
  frag.append(sub.root);

  const layout = document.createElement('div');
  layout.className = 'mf-howto-shell';

  const section = document.createElement('section');
  section.className = 'mf-howto stack';

  section.append(
    createParagraphBlock('Welcome to Master Florist', [
      'You run the coziest flower shop in town. Match each bouquet to a customer\'s hidden order before the patience of the waiting customers wilts.',
      'Keep your complaint-free streak alive for 100 in-game days to earn the Master Florist crown!',
    ]),
    createListBlock('Game Goal', [
      'Fulfill every bouquet quickly and accurately.',
      'Stay complaint-free for 100 in-game days.',
    ]),
    createListBlock('Controls', [
      'Drag and drop flowers into the bouquet slots.',
      'Press Show Customer (or tap Enter/Left Shift) to check your arrangement against the order.',
      'Keyboard shortcuts: A = rose, S = marigold, D = daisy, J = violet, K = iris, L = lily.',
      'Press H to remove the last flower you placed.',
      'Press Space to clear the workbench and start fresh.',
    ]),
    createListBlock('Puzzle Rules', [
      'Each customer is thinking of an arrangement, including flower types and exact slot order.',
      'Arrange your best guess and review the feedback.',
      'Feedback shows whether a flower is perfect, misplaced, or not needed.',
      'Empty slots are ignored until you fill them.',
    ]),
    createListBlock('Customer Mood', [
      'Customers arrive happy but their mood will sour over time.',
      'Atmosphere determines how quickly their mood fades.',
      'Mood sets both their patience and bouquet complexity, so happier guests want more flowers.',
      'If someone becomes angry enough to complain, they leave the store, never to return. Lose too many customers this way and the game ends.',
    ]),
    createListBlock('Timing', [
      'Each day lasts 30 seconds.',
      'Your streak of complaint-free days updates automatically.',
    ]),
  );

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'mf-howto-back-btn';
  backButton.textContent = 'Back to Setup';
  backButton.addEventListener('click', () => {
    try {
      location.hash = '#/gallery/master-florist';
    } catch (err) {
      console.error('Unable to navigate back to setup', err);
    }
  });
  layout.append(section, backButton);
  frag.append(layout);
  return frag;
}

function createParagraphBlock(title, paragraphs = []) {
  const block = document.createElement('div');
  block.className = 'mf-howto-block';

  const heading = document.createElement('p');
  heading.className = 'mf-howto-heading';
  heading.innerHTML = `<strong>${title}</strong>`;
  block.append(heading);

  paragraphs.forEach((text) => {
    const p = document.createElement('p');
    p.className = 'mf-howto-body';
    p.textContent = text;
    block.append(p);
  });

  return block;
}

function createListBlock(title, items = []) {
  const block = document.createElement('div');
  block.className = 'mf-howto-block';

  const heading = document.createElement('p');
  heading.className = 'mf-howto-heading';
  heading.innerHTML = `<strong>${title}</strong>`;
  block.append(heading);

  const list = document.createElement('ul');
  list.className = 'mf-howto-list';
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    list.append(li);
  });
  block.append(list);

  return block;
}

function ensureHowToStyles() {
  if (howToStylesInjected) return;
  howToStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .mf-howto-shell {
      width: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 0;
      padding: clamp(24px, 5vw, 40px);
      margin: 0;
      margin-top: calc(var(--space-4, 16px) * -1);
      box-sizing: border-box;
      flex: 1 1 auto;
      align-self: stretch;
      min-height: 0;
    }

    .mf-howto {
      background: #ffe797;
      color: #000;
      margin: 0;
      padding: 10px;
      border-radius: 24px;
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.12);
      width: 100%;
      max-width: min(880px, 100%);
      max-height: min(860px, calc(100dvh - 440px));
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .mf-howto:focus-visible {
      outline: 2px solid rgba(0, 0, 0, 0.6);
      outline-offset: 4px;
    }

    .mf-howto-back-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      font-weight: 800;
      border-radius: 18px;
      padding: 16px 28px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: none;
      cursor: pointer;
      background: linear-gradient(135deg, #fff4d4, #ffe1a8);
      color: #3a2312;
      box-shadow: 0 18px 32px rgba(74, 44, 28, 0.3);
      transition: transform 120ms ease, box-shadow 120ms ease;
      align-self: center;
      margin-top: clamp(12px, 3vw, 24px);
    }

    .mf-howto-back-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 24px 40px rgba(74, 44, 28, 0.34);
    }

    .mf-howto-back-btn:active {
      transform: translateY(0);
      box-shadow: 0 12px 24px rgba(74, 44, 28, 0.3);
    }

    .mf-howto-back-btn:focus-visible {
      outline: 2px solid rgba(58, 35, 18, 0.6);
      outline-offset: 4px;
    }

    .mf-howto-block + .mf-howto-block {
      margin-top: var(--space-4, 24px);
    }

    .mf-howto-heading {
      margin: 0 0 8px;
      font-size: 1rem;
      line-height: 1.3;
      letter-spacing: 0.01em;
      font-weight: 700;
    }

    .mf-howto-body {
      margin: 0;
      line-height: 1.6;
    }

    .mf-howto-list {
      margin: 0;
      padding-left: 1.2em;
      display: grid;
      gap: 0.6em;
      line-height: 1.6;
    }

    .mf-howto::-webkit-scrollbar {
      width: 12px;
    }

    .mf-howto::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 999px;
    }

    .mf-howto::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 640px) {
      .mf-howto-shell {
        padding: clamp(16px, 6vw, 24px);
      }

      .mf-howto {
        max-height: calc(100dvh - 260px);
      }

      .mf-howto-back-btn {
        margin-top: clamp(10px, 4vw, 18px);
      }
    }
  `;
  document.head.append(style);
}








