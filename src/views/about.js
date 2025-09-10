export const meta = {
  title: 'About',
  description: 'Data usage and privacy notes for this site',
};

import { Button } from '../components/ui/button.js';
import { makeTabs } from '../components/ui/tabs.js';
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
  const patchesPane = document.createElement('div');
  patchesPane.style.display = 'none';

  aboutPane.innerHTML = `
    <h2>About This Site</h2>
    <p>This site is a static, client-side app. It does not use analytics, ads, trackers, or send your gameplay data to any server.</p>
    <h3>Local Storage Only</h3>
    <ul>
      <li>Timesweeper: stores best times, wins/losses per difficulty (size), and Custom fuse time.</li>
      <li>Code Rain: stores your visual preferences (size, density, colors, speeds) so the background looks the same when you return.</li>
      <li>Purpose: keep your preferences between visits without tracking. Nothing is sent anywhere.</li>
      <li>No cookies are set. Nothing leaves your device.</li>
    </ul>
    <h3>Managing Your Data</h3>
    <p>You can clear the saved data anytime using the buttons below (applies only to this browser):</p>
    <div class="actions">
      ${Button({ id: 'about-clear-timesweeper', label: 'Clear Timesweeper Data', variant: 'secondary' })}
      ${Button({ id: 'about-clear-coderain', label: 'Clear Code Rain Settings', variant: 'secondary' })}

      ${Button({ id: 'about-clear-lighthouses', label: 'Reset Light Houses Data', variant: 'secondary' })}
      ${Button({ id: 'about-clear-all', label: 'Clear All Site Data', variant: 'secondary' })}
    </div>
    <p class="note">Clearing data will reset stored best times, wins/losses, and Custom fuse settings.</p>
  `;

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
    }
  } catch {}
  frag.append(sec);

  queueMicrotask(() => {
    const clearTS = sec.querySelector('#about-clear-timesweeper');
    const clearAll = sec.querySelector('#about-clear-all');
    const clearCR = sec.querySelector('#about-clear-coderain');
    const clearLH = sec.querySelector('#about-clear-lighthouses');
    clearTS?.addEventListener('click', () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('timesweeper:'))
          .forEach((k) => localStorage.removeItem(k));
        alert('Timesweeper data cleared.');
      } catch {}
    });
    clearCR?.addEventListener('click', () => {
      try {
        localStorage.removeItem('coderain:options');
        alert('Code Rain settings cleared.');
      } catch {}
    });
    clearAll?.addEventListener('click', () => {
      if (!confirm('Clear all data saved by this site in this browser?')) return;
      removeByPrefixes(['timesweeper:', 'coderain:', 'lighthouses:']);
      alert('Site data cleared.');
    });

    clearLH?.addEventListener('click', () => {
      try {
        removeByPrefixes(['lighthouses:']);
        alert('Light Houses data reset.');
      } catch {}
    });
  });

  return frag;
}








