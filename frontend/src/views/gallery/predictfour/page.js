import { meta as startMeta, render as renderStart } from './start.js';
import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { renderPredictFourSourceBrowser } from './sourceBrowser.js';

export const meta = {
  title: startMeta?.title || 'Predict Four',
  description: startMeta?.description || 'Predict the future while connecting four in a row.',
};

export function render() {
  const frag = document.createDocumentFragment();
  const chrome = document.createElement('section');
  chrome.className = 'stack';

  const demoPane = document.createElement('div');
  demoPane.className = 'gallery-demo-pane';
  const srcPane = document.createElement('div');
  srcPane.className = 'pips-src-pane';
  srcPane.style.display = 'none';

  const startFrag = renderStart();
  demoPane.append(startFrag);

  let sourceLoaded = false;
  const sub = makeGallerySubheader({
    title: 'Predict Four',
    href: '#/gallery/predict-four',
    onChange(id) {
      const showDemo = id === 'demo';
      demoPane.style.display = showDemo ? '' : 'none';
      srcPane.style.display = showDemo ? 'none' : '';
      if (!showDemo && !sourceLoaded) {
        renderPredictFourSourceBrowser(srcPane);
        sourceLoaded = true;
      }
    },
  });

  try { sub.attachSourcePane(srcPane, { maxHeight: '60vh' }); } catch {}

  chrome.append(sub.root, demoPane, srcPane);
  frag.append(chrome);
  return frag;
}
