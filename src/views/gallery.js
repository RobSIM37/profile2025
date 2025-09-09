import { setAppTransparent } from '../lib/appShell.js';
import { Card } from '../components/ui/card.js';

export const meta = {
  title: 'Gallery',
  description: 'Selected projects and builds',
};

const ph = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
  <defs>
    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
      <stop offset='0%' stop-color='#1b2333'/>
      <stop offset='100%' stop-color='#0f141f'/>
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#7cb3ff' font-size='32' font-family='Segoe UI, Roboto, Arial'>Placeholder</text>
</svg>`);

const items = [
  {
    title: 'Pips Solver',
    tagline: 'A tool for solving the NYT Game "Pips"',
    img: 'assets/pipsSolverThumbnail.webp',
    link: '#/gallery/pips-solver',
  },
  {
    title: 'Timesweeper',
    tagline: 'Minesweeper with TIMED twist!',
    img: 'assets/timesweeperThumbnail.webp',
    link: '#/gallery/timesweeper',
  },
  {
    title: 'Knock It Off!',
    tagline: 'Be the last checker standing',
    img: 'assets/knockItOffThumbnail.png',
    link: '#/gallery/knock-it-off',
  },
];

export function render() {
  setAppTransparent();
  const cards = items
    .map((i) => Card({ title: i.title, tagline: i.tagline, img: i.img, link: i.link, alt: i.tagline || i.title }))
    .join('');

  return `
    <section class="stack">
      <h2>Gallery</h2>
      <p>A few highlights from my projects.</p>
      <div class="grid">${cards}</div>
    </section>
  `;
}
