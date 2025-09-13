export const meta = { title: 'Timesweeper — How to Play', description: 'Learn the rules and controls' };
import { setAppSolid } from '../../../lib/appShell.js';

export function render(){
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  const section = document.createElement('section'); section.className='stack';
  const h = document.createElement('h2'); h.textContent='How to Play'; h.style.fontSize='1.6rem'; h.style.fontWeight='800';
  const p1 = document.createElement('p'); p1.textContent = 'Timesweeper is classic Minesweeper with a twist: one mine is a time bomb. You win by revealing all safe cells and leaving all mines flagged.';
  const p2 = document.createElement('p'); p2.textContent = 'Basics: numbers show how many adjacent mines surround a cell (8-neighborhood). Use them to deduce where mines are.';
  const ul = document.createElement('ul'); ul.className='list';
  ['Primary click: reveal a cell (first click is always safe).','Secondary click (right-click): toggle a flag on a cell you think is a mine.','Double-click (or chord on a number): if the right number of adjacent flags are placed, reveal all remaining neighbors.']
    .forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.append(li);});
  const p3 = document.createElement('p'); p3.textContent = 'Time bomb: one mine is lit with a fuse. When the fuse runs out, the bomb explodes unless you have it flagged. Mark it before time expires!';
  const p4 = document.createElement('p'); p4.textContent = 'Your best clear time for a difficulty becomes the default fuse time for future games. Beating your best will shorten the fuse, making the pressure real.';
  const back = document.createElement('p'); back.innerHTML = '<a href="#/gallery/timesweeper">Back to Start</a>';
  section.append(h); section.append(p1); section.append(p2); section.append(ul); section.append(p3); section.append(p4); section.append(back);
  frag.append(section);
  return frag;
}
