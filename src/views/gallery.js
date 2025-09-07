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
  { title: 'Pips Solver', img: 'assets/pipsSolverThumbnail.webp', alt: 'Pips Solver', link: '#/gallery/pips-solver' },
];

export function render() {
  const cards = items
    .map(
      (i) => `
      <article class="card">
        <a href="${i.link}" class="card-link">
          <div class="card-media">
            <img loading="lazy" src="${i.img}" alt="${i.alt}" />
          </div>
          <div class="card-body">
            <h3 class="card-title">${i.title}</h3>
          </div>
        </a>
      </article>
    `
    )
    .join('');

  return `
    <section class="stack">
      <h2>Gallery</h2>
      <p>A few highlights from my projects.</p>
      <div class="grid">${cards}</div>
    </section>
  `;
}
