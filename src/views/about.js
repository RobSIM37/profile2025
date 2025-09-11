export const meta = {

  title: 'About',

  description: 'Data usage and privacy notes for this site',

};



import { Button } from '../components/ui/button.js';
import { makeTabs } from '../components/ui/tabs.js';
import { makeSelectPanels } from '../components/ui/selectPanels.js';
import { removeByPrefixes } from '../lib/storage.js';
import { setAppSolid } from '../lib/appShell.js';

// Simple Patch Entry component (scoped to About page for now)

function PatchEntry(dateStr, iteration, items = []) {

  const wrap = document.createElement('article');

  wrap.className = 'stack';

  const title = document.createElement('h4');

  title.textContent = `${dateStr}--${String(iteration).padStart(2,'0')}`;

  const ul = document.createElement('ul'); ul.style.listStyleType = 'disc'; ul.style.paddingLeft = '18px';

  for (const s of items) {

    const li = document.createElement('li');

    li.textContent = String(s);

    ul.appendChild(li);

  }

  wrap.append(title, ul);

  return wrap;

}



function formatDateYMD(d) {

  const y = d.getFullYear();

  const m = String(d.getMonth()+1).padStart(2,'0');

  const day = String(d.getDate()).padStart(2,'0');

  return `${y}-${m}-${day}`;

}



export function render() {

  const frag = document.createDocumentFragment();

  const sec = document.createElement('section');

  sec.className = 'stack about-wrap';

  setAppSolid(true);



  // Tabs header

  const tabs = makeTabs({

    items: [

      { id: 'about', label: 'About This Site' },

      { id: 'patches', label: 'Patch History' },

    ],

    activeId: 'about',

    onChange: (id) => showTab(id),

  });



  // Panes
  const aboutPane = document.createElement('div');
  aboutPane.classList.add('stack');
  const patchesPane = document.createElement('div');
  patchesPane.className = 'about-patches scroll-themed';
  patchesPane.style.display = 'none';


  aboutPane.innerHTML = `
    <p>This site is a static, client-side app.<br>It does not use analytics, ads, trackers, or send your gameplay data to any server.</p>
  `;

  // Remove game-specific storage bullets and generic clear-data blurb/actions
  try { aboutPane.querySelector('ul')?.remove(); } catch {}
  try {
    const clearPara = Array.from(aboutPane.querySelectorAll('p')).find(p => /clear the saved data/i.test(p.textContent || ''));
    clearPara?.remove();
  } catch {}
  try { aboutPane.querySelector('.actions')?.remove(); } catch {}
  try { aboutPane.querySelectorAll('p.note')?.forEach(n => n.remove()); } catch {}
  try { const hs = aboutPane.querySelectorAll('h3'); for (const el of hs) { if (/Managing Your Data/i.test(el.textContent || '')) { el.textContent = 'Manage Saved Data'; break; } } } catch {}

  // Styled Select -> Panel flow for clear actions
  const panels = {
    ts: (() => {
      const wrap = document.createElement('div'); wrap.className = 'stack';
      const p1 = document.createElement('p'); p1.textContent = 'Clears best times and win/loss statistics for each difficulty.';
      const p2 = document.createElement('p'); p2.className = 'note'; p2.textContent = 'Also removes your Custom fuse time preset.';
      const btnWrap = document.createElement('div'); btnWrap.innerHTML = Button({ id: 'about-clear-timesweeper', label: 'Clear', variant: 'warning' });
      wrap.append(p1, p2, btnWrap.firstElementChild);
      return wrap;
    }),
    cr: (() => {
      const wrap = document.createElement('div'); wrap.className = 'stack';
      const p1 = document.createElement('p'); p1.textContent = 'Clears background visual preferences (size, density, colors, speeds).';
      const btnWrap = document.createElement('div'); btnWrap.innerHTML = Button({ id: 'about-clear-coderain', label: 'Clear', variant: 'warning' });
      wrap.append(p1, btnWrap.firstElementChild);
      return wrap;
    }),
    lh: (() => {
      const wrap = document.createElement('div'); wrap.className = 'stack';
      const p1 = document.createElement('p'); p1.textContent = 'Clears Light Houses progress (highest level reached, last level, and last generated seed).';
      const btnWrap = document.createElement('div'); btnWrap.innerHTML = Button({ id: 'about-clear-lighthouses', label: 'Clear', variant: 'warning' });
      wrap.append(p1, btnWrap.firstElementChild);
      return wrap;
    }),
    sn: (() => {
      const wrap = document.createElement('div'); wrap.className = 'stack';
      const p1 = document.createElement('p'); p1.textContent = 'Clears Snake+ data: highest level reached, last level, longest snake length, and custom color palette.';
      const btnWrap = document.createElement('div'); btnWrap.innerHTML = Button({ id: 'about-clear-snake', label: 'Clear', variant: 'warning' });
      wrap.append(p1, btnWrap.firstElementChild);
      return wrap;
    }),
    all: (() => {
      const wrap = document.createElement('div'); wrap.className = 'stack';
      const p1 = document.createElement('p'); p1.textContent = 'Clears all data saved by this site in this browser.';
      const p2 = document.createElement('p'); p2.className = 'note'; p2.textContent = 'This includes Timesweeper, Code Rain, and Light Houses.';
      const btnWrap = document.createElement('div'); btnWrap.innerHTML = Button({ id: 'about-clear-all', label: 'Clear', variant: 'warning' });
      wrap.append(p1, p2, btnWrap.firstElementChild);
      return wrap;
    }),
  };

  const selector = makeSelectPanels({
    id: 'about-clear-select',
    label: 'Clear site Memory',
    options: [
      { id: 'ts', label: 'Timesweeper data' },
      { id: 'cr', label: 'Code Rain data' },
      { id: 'lh', label: 'Light Houses data' },
      { id: 'sn', label: 'Snake+ data' },
      { id: 'all', label: 'All data' },
    ],
    panels,
    value: 'none',
  });

  aboutPane.append(selector.root);


  patchesPane.innerHTML = `

    <div id="patch-list" class="stack"></div>

  `;



  function showTab(id) {

    const isAbout = id === 'about';

    aboutPane.style.display = isAbout ? '' : 'none';

    patchesPane.style.display = isAbout ? 'none' : '';

  }



  sec.append(tabs.root, aboutPane, patchesPane);

  // Populate Patch History (newest on top)

  try {
    const list = patchesPane.querySelector('#patch-list');
    if (list) {
      const snakePlus = PatchEntry('2025-09-11', 1, [
        'Added Snake+ mini game to Gallery (canvas-based)',
        'New objective: cover the highlighted path simultaneously to level up',
        'Seamless level-ups: keep position/length; symmetric obstacles added each level',
        'Wrap-around edges enabled; collisions pause 3 ticks then drop a level',
        'Obstacle placement ensures no unreachable pockets',
        'Status now shows Level and Longest Snake; apples stop at 150% of path length',
        'Path lights brighter when long enough to cover it',
        'Pause to customize colors (snake, food, path, ready-path, bg, grid, obstacles); settings persist',
        'Global buttons updated with white inner ring + dark outer ring',
        'About: Snake+ clear now removes custom colors',
      ]);
      const todayLocal = PatchEntry('2025-09-10', 4, [
        'Header brand shows (LOCAL) when running on localhost',
        'LOCAL badge uses warning color for visibility',
        'Browser tab title includes LOCAL marker on localhost',
        'Skip to content focuses main without changing route',
        'Route changes announced to screen readers',
        'Breadcrumbs updated: a11y made a top priority and warning tokens documented',
      ]);
      const todayLocal5 = PatchEntry('2025-09-10', 5, [
        'Accessibility: live route announcements and improved skip link focus',
        'Utility: added screen-reader-only class for hidden announcements',
        'Navigation: aria-current applied only on active link',
      ]);
      // Patch titles follow YYYY-MM-DD--NN where NN increments during the day
      const aboutRev = PatchEntry('2025-09-10', 3, [
        'About: streamlined copy and clearer data controls',
        'New select-driven panels for clearing saved data',
        'Destructive Clear buttons use warning styling',
        'Panels now have borders and improved spacing',
      ]);
      const latest = PatchEntry('2025-09-10', 2, [
        'New Controls Grid for stable multi-control rows; adopted in Memory and Knock It Off setup',
        'Player Configurator component supports N players with cascading None logic',
        'Memory setup: per-AI Memory Length inline; widened Name column; Face Up Time aligned',
        'Knock It Off setup: migrated to Controls Grid; fixed conditional row visibility',
        'Modal accessibility: focus trap + ARIA dialog semantics; returns focus to opener',
        'Reduced Motion: Memory card flip respects prefers-reduced-motion',
        'Timer helper prevents overlapping timeouts; used by Memory AI/mismatch timers',
        'Themed scrollbars: reusable .scroll-themed class applied to Patch History, KIO log, and Memory source viewer',
      ]);

      const memEntry = PatchEntry('2025-09-10', 1, [
        'Added Memory game: Demo/Source wrapper and gallery card',
        'Start screen: 1–4 players with Human/AI (Easy/Medium/Hard/Perfect) and Face Up Time control',
        'Play UI: smooth flip, white face-up cards, branded back icon, descriptive hover tooltips',
        'Game flow: New Game keeps setup and reshuffles; Back returns without losing selections',
        'Persistence: player choices and Face Up Time persist during the session',
        'Accessibility/feedback: active player highlighted in theme blue; Game Over uses global modal',
        'Stability: guarded timers to prevent early flip-downs',
        'Docs: breadcrumbs updated to require using global UI components'
      ]);

      const lhEntry = PatchEntry('2025-09-09', 2, [
        'Added Light Houses gallery game with level-based difficulty and lighthouse icons',
        'Seeds now encode puzzle state; shareable links with level + seed (router supports query in hash)',
        'Progress advances only on legitimate wins; added light anti-cheat and one-click detection',
        'New performance rules: max moves and minimum lights-on requirement',
        'Centered, cleaner modals; outside-click on Game Over resets appropriately',
        'Updated gallery art to illuminated lighthouse thumbnail',
        'New global components: Accordion and LighthouseIcon',
        'About page: added �Reset Light Houses Data�; Clear All includes Light Houses'
      ]);
      // Historical entry
      const entry = PatchEntry('2025-09-09', 1, [
        'Added Demo and Source tabs to Timesweeper and Knock It Off projects',

        'Created shared Tabs header and integrated into Pips Solver; added Patch History tab to About',

        'Created shared numberField input; updated Pips Board Tools to use it',
        'Added GPT Breadcrumbs guide and component manifest in /docs',]);

            // Newest first: 2025-09-10--01 (Memory), 2025-09-09--02 (Light Houses), 2025-09-09--01 (Foundational tabs/inputs)
            list.prepend(entry);
            list.prepend(lhEntry);
            list.prepend(memEntry);
            list.prepend(latest);
            list.prepend(aboutRev);
            list.prepend(todayLocal);
            list.prepend(todayLocal5);
            list.prepend(snakePlus);
    }
  } catch {}
  frag.append(sec);



  queueMicrotask(() => {
    function showToast(btn, msg) {
      try {
        const toast = document.createElement('span');
        toast.textContent = String(msg);
        toast.style.marginLeft = '10px';
        toast.style.color = 'var(--accent)';
        toast.style.fontWeight = '700';
        toast.style.fontSize = '0.95rem';
        toast.style.whiteSpace = 'nowrap';
        // Place directly after the button
        btn.insertAdjacentElement('afterend', toast);
        setTimeout(() => { try { toast.remove(); } catch {} }, 2400);
      } catch {}
    }
    sec.addEventListener('click', (ev) => {
      const t = ev.target;
      if (!t || !('id' in t)) return;
      const id = t.id || '';
      if (id === 'about-clear-timesweeper') {
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith('timesweeper:'))
            .forEach((k) => localStorage.removeItem(k));
          showToast(t, 'Timesweeper data cleared');
        } catch {}
      }
      else if (id === 'about-clear-coderain') {
        try { localStorage.removeItem('coderain:options'); showToast(t, 'Code Rain settings cleared'); } catch {}
      }
      else if (id === 'about-clear-lighthouses') {
        try { removeByPrefixes(['lighthouses:']); showToast(t, 'Light Houses data reset'); } catch {}
      }
      else if (id === 'about-clear-snake') {
        try { removeByPrefixes(['snake:']); showToast(t, 'Snake+ data cleared'); } catch {}
      }
      else if (id === 'about-clear-all') {
        if (!confirm('Clear all data saved by this site in this browser?')) return;
        removeByPrefixes(['timesweeper:', 'coderain:', 'lighthouses:', 'snake:']);
        showToast(t, 'Site data cleared');
      }
    });
  });


  return frag;

}













