// Centralized route table for the hash router
// Each entry maps a path to a loader that resolves to a module

import { makeBeforeResolve, allow } from '../lib/routeGuards.js';

export const routes = {
  '/': () => import('../views/landing.js'),
  '/gallery': () => import('../views/gallery.js'),
  '/gallery/pips-solver': () => import('../views/gallery/pips-solver.js'),
  '/gallery/timesweeper': () => import('../views/gallery/timesweeper/page.js'),
  '/gallery/timesweeper/how-to': () => import('../views/gallery/timesweeper/howto.js'),
  '/gallery/timesweeper/game': () => import('../views/gallery/timesweeper/index.js'),
  '/gallery/knock-it-off': () => import('../views/gallery/knockitoff/page.js'),
  '/gallery/knock-it-off/how-to': () => import('../views/gallery/knockitoff/howto.js'),
  '/gallery/knock-it-off/game': () => import('../views/gallery/knockitoff/game.js'),
  '/gallery/light-houses': () => import('../views/gallery/lighthouses/page.js'),
  '/gallery/memory': () => import('../views/gallery/memory/page.js'),
  '/gallery/memory/game': () => import('../views/gallery/memory/game2.js'),
  '/gallery/snake-plus': () => import('../views/gallery/snakeplus/page.js'),
  '/gallery/fizzbuzz': () => import('../views/gallery/fizzbuzz/page.js'),
  '/gallery/fizzbuzz/game': () => import('../views/gallery/fizzbuzz/game.js'),
  '/gallery/knuckle-bones': () => import('../views/gallery/knucklebones/page.js'),
  '/gallery/knuckle-bones/how-to': () => import('../views/gallery/knucklebones/howto.js'),
  '/gallery/knuckle-bones/game': () => import('../views/gallery/knucklebones/game.js'),
  '/about': () => import('../views/about.js'),
  '/contact': () => import('../views/contact.js'),
  '/rain': () => import('../views/coderain.js'),
  '/404': async () => ({
    meta: { title: 'Not Found' },
    render: () => `
      <section class="stack">
        <h2>Page not found</h2>
        <p>Try the <a href="#/">home page</a>.</p>
      </section>
    `,
  }),
};

// Optional: centralize route guards alongside the table
export const beforeResolve = makeBeforeResolve([
  {
    match: '/gallery/fizzbuzz/game',
    allow: allow.sessionKey('fb:chosen'),
    redirect: '/gallery/fizzbuzz',
  },
  {
    match: '/gallery/timesweeper/game',
    allow: allow.sessionKey('ts:chosen'),
    redirect: '/gallery/timesweeper',
  },
  {
    match: '/gallery/knock-it-off/game',
    allow: allow.sessionKey('kio:chosen'),
    redirect: '/gallery/knock-it-off',
  },
  {
    match: '/gallery/knock-it-off/how-to',
    allow: allow.sessionKey('kio:howto'),
    redirect: '/gallery/knock-it-off',
  },
  {
    match: '/gallery/memory/game',
    allow: allow.sessionKey('memory:chosen'),
    redirect: '/gallery/memory',
  },
  {
    match: '/gallery/knuckle-bones/game',
    allow: allow.sessionKey('kb:chosen'),
    redirect: '/gallery/knuckle-bones',
  },
]);

