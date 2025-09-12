import { Button } from '../../../components/ui/button.js';

export const meta = {
  title: 'How to Play — Knuckle Bones',
  description: 'Rules, scoring, and strategy notes',
};

export function render() {
  const frag = document.createDocumentFragment();
  const main = document.createElement('section');
  main.className = 'stack kio-wrap';

  const h2 = document.createElement('h2');
  h2.textContent = 'How to Play';
  h2.style.fontSize = '1.6rem';
  h2.style.fontWeight = '800';
  main.append(h2);

  const p1 = document.createElement('p');
  p1.textContent = 'Two players alternate rolling a d6 and placing it into an empty cell on their own 3×3 board.';
  main.append(p1);

  const ul = document.createElement('ul');
  ul.className = 'list';
  [
    'On placement: remove all opponent dice in the same column that match the placed value.',
    'Scoring is by column: each die scores its face value multiplied by how many of that value are in that column (clumps score more).',
    'Game ends immediately when the first board is full. Ties are allowed.',
    'Tip: clumping can be powerful but risky — opponents can erase a clump with a single matching die in that column.',
  ].forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
  main.append(ul);

  const btnRow = document.createElement('div');
  btnRow.className = 'kio-buttons';
  btnRow.style.justifyContent = 'center';
  btnRow.innerHTML = Button({ id: 'kb-back', label: 'Back', variant: 'secondary' });
  const backBtn = btnRow.firstElementChild;
  backBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/gallery/knuckle-bones'; });
  main.append(btnRow);

  frag.append(main);
  return frag;
}
