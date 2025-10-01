import { makeGallerySubheader } from '../../../components/ui/subheader.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { Tag } from '../../../components/ui/tag.js';

export const meta = {
  title: 'Master Florist - How to Play',
  description: 'Learn the flow for greeting customers, prepping stems, and assembling bouquets.',
};

export function render() {
  setAppSolid(true);

  const frag = document.createDocumentFragment();

  const sub = makeGallerySubheader({
    title: 'Master Florist',
    href: '#/gallery/master-florist',
    emitInitial: false,
  });
  frag.append(sub.root);

  const section = document.createElement('section');
  section.className = 'stack';

  const heading = document.createElement('h2');
  heading.textContent = 'How to Play';
  heading.style.fontSize = '1.6rem';
  heading.style.fontWeight = '800';

  const intro = document.createElement('p');
  intro.textContent = 'Serve a steady stream of customers, balance color palettes, and keep an eye on the clock to earn top marks.';

  const stepList = document.createElement('ol');
  stepList.className = 'list';
  ['Greet the next customer and review the request card.', 'Drag stems from the pantry onto the workbench canvas, snapping them into slots.', 'Rotate trays or trim stems to match the desired silhouette.', 'Deliver the finished bouquet before the patience meter empties.'].forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    stepList.append(li);
  });

  const tipsHeading = document.createElement('h3');
  tipsHeading.textContent = 'Tips';

  const tipsList = document.createElement('ul');
  tipsList.className = 'list';
  ['Stems highlight on hover when they can snap into a vase segment.', 'Color tags show whether you are meeting palette rules.', 'Power tools unlock between days, adding automation to repetitive prep.'].forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    tipsList.append(li);
  });

  const tagsRow = document.createElement('div');
  tagsRow.className = 'actions';
  tagsRow.style.flexWrap = 'wrap';
  tagsRow.style.gap = 'var(--space-3)';
  ['Relaxed', 'Controller Friendly', 'In Development'].forEach((label) => {
    const tag = Tag({ text: label });
    tagsRow.append(tag);
  });

  section.append(heading, intro, stepList, tipsHeading, tipsList, tagsRow);
  frag.append(section);

  return frag;
}