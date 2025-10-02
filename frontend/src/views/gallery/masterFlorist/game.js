import { createCustomerArea } from './components/customerArea.js';
import { createWorkingArea } from './components/workingArea.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { createMasterFloristState, updateMasterFloristClock, updateMasterFloristViewport } from './state/store.js';
import { createMasterFloristCanvasController } from './canvas/controller.js';
import { createMasterFloristRenderer } from './render/scene.js';
import { createMasterFloristCanvasSizer } from './canvas/sizer.js';
import { createMasterFloristLoop } from './loop/ticker.js';

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

  section.append(workingArea, customerArea);
  layout.append(section);
  frag.append(layout);

  const state = createMasterFloristState();
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

  const controller = createMasterFloristCanvasController({
    canvas: canvasElement,
    state,
    onStateChange: () => renderer.render(),
    toCanvasPoint: (event) => sizer.toCanvasPoint(event.clientX, event.clientY),
  });

  const loop = createMasterFloristLoop({ tickRateMs: 1000 / 30, routeMatch: '#/gallery/master-florist/game' });
  const unsubscribe = loop.subscribe((info) => {
    updateMasterFloristClock(state, info);
    renderer.render();
  });
  loop.start();

  controller.mount();
  renderer.render();

  frag.cleanup = () => {
    unsubscribe();
    loop.dispose();
    sizer.unmount();
    controller.unmount();
    renderer.dispose();
  };

  return frag;
}
