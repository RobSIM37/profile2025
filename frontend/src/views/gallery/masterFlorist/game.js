import { createCustomerArea } from './components/customerArea.js';
import { createWorkingArea } from './components/workingArea.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { openModal } from '../../../components/ui/modal.js';
import { setAppSolid } from '../../../lib/appShell.js';
import {
  createMasterFloristState,
  updateMasterFloristClock,
  updateMasterFloristViewport,
  syncMasterFloristChat,
  submitMasterFloristGuess,
  hasActiveMasterFloristCustomer,
  canSubmitMasterFloristGuess,
} from './state/store.js';
import { createMasterFloristCanvasController } from './canvas/controller.js';
import { createMasterFloristRenderer } from './render/scene.js';
import { createMasterFloristCanvasSizer } from './canvas/sizer.js';
import { createMasterFloristLoop } from './loop/ticker.js';
import { loadCustomerSpriteLibrary } from './state/spriteLibrary.js';
import {
  initializeCustomerParade,
  updateCustomerParade,
  disposeCustomerParade,
  handleMasterFloristGuessResult,
} from './state/customers.js';

export const meta = {
  title: 'Master Florist - Game',
  description: 'Arrange stems on a shared canvas and fulfill custom bouquet requests.',
};

export function render() {
  setAppSolid(true);

  const frag = document.createDocumentFragment();

  const sub = makeGallerySubheader({
    title: 'Master Florist',
    href: '#/gallery/master-florist',
    emitInitial: false,
  });

  const layout = document.createElement('div');
  layout.className = 'mf-game-layout';
  layout.append(sub.root);
  sub.root.classList.add('mf-game-subheader');

  const section = document.createElement('section');
  section.className = 'stack mf-game-section';

  const customerArea = createCustomerArea();
  const { workingArea, canvasHost, canvasElement } = createWorkingArea();

  section.append(workingArea, customerArea.root);
  layout.append(section);
  frag.append(layout);

  let gameOverModal = null;

  const state = createMasterFloristState();
  const navigateToSetup = () => {
    try {
      if (location.hash !== '#/gallery/master-florist') {
        location.hash = '#/gallery/master-florist';
      }
    } catch {}
  };

  state.onGameOver = (message) => {
    if (gameOverModal) return;
    const note = document.createElement('p');
    note.textContent = message || 'The flower shop had to close due to too many complaints.';
    gameOverModal = openModal({
      title: 'Flower Shop Closed',
      body: note,
      actions: [
        {
          label: 'OK',
          onClick() {
            navigateToSetup();
          },
        },
      ],
      onClose: () => {
        gameOverModal = null;
        navigateToSetup();
      },
    });
  };
  state.customerUi = customerArea;
  syncMasterFloristChat(state);

  const renderer = createMasterFloristRenderer({ canvas: canvasElement, state });

  const sizer = createMasterFloristCanvasSizer({
    canvas: canvasElement,
    container: canvasHost,
    onResize: (metrics) => {
      updateMasterFloristViewport(state, metrics);
      renderer.render();
    },
  });
  sizer.mount();
  updateMasterFloristViewport(state, sizer.getMetrics());

  const handleStateChange = () => {
    renderer.render();
    syncMasterFloristChat(state);
  };

  const handleShowCustomer = () => {
    if (state.gameOver) {
      return;
    }
    if (!hasActiveMasterFloristCustomer(state)) {
      return;
    }
    if (!canSubmitMasterFloristGuess(state)) {
      return;
    }
    const evaluation = submitMasterFloristGuess(state);
    if (!evaluation) {
      return;
    }
    handleMasterFloristGuessResult(state, evaluation);
    renderer.render();
    syncMasterFloristChat(state);
  };

  const controller = createMasterFloristCanvasController({
    canvas: canvasElement,
    state,
    onStateChange: handleStateChange,
    toCanvasPoint: (event) => sizer.toCanvasPoint(event.clientX, event.clientY),
    onShowCustomer: handleShowCustomer,
  });

  let paradeReady = false;
  loadCustomerSpriteLibrary()
    .then((library) => {
      initializeCustomerParade(state, { spriteLibrary: library, chat: customerArea });
      paradeReady = true;
      renderer.render();
      syncMasterFloristChat(state);
    })
    .catch((err) => {
      console.error('Unable to load customer sprites', err);
    });

  const loop = createMasterFloristLoop({ tickRateMs: 1000 / 30, routeMatch: '#/gallery/master-florist/game' });
  const unsubscribe = loop.subscribe((info) => {
    updateMasterFloristClock(state, info);
    if (state.gameOver) {
      renderer.render();
      syncMasterFloristChat(state);
      return;
    }
    if (paradeReady) {
      updateCustomerParade(state, info);
    }
    renderer.render();
    syncMasterFloristChat(state);
  });
  loop.start();

  controller.mount();
  renderer.render();
  syncMasterFloristChat(state);

  frag.cleanup = () => {
    unsubscribe();
    loop.dispose();
    sizer.unmount();
    controller.unmount();
    renderer.dispose();
    disposeCustomerParade(state);
    if (gameOverModal && typeof gameOverModal.close === 'function') {
      try {
        gameOverModal.close();
      } catch {}
      gameOverModal = null;
    }
    paradeReady = false;
  };

  return frag;
}
