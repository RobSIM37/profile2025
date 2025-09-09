export const meta = {
  title: 'About',
  description: 'Data usage and privacy notes for this site',
};

import { Button } from '../components/ui/button.js';
import { removeByPrefixes } from '../lib/storage.js';
import { setAppSolid } from '../lib/appShell.js';

export function render() {
  const frag = document.createDocumentFragment();
  const sec = document.createElement('section');
  sec.className = 'stack about-wrap';
  setAppSolid(true);
  sec.innerHTML = `
    <h2>About This Site</h2>
    <p>This site is a static, client‑side app. It does not use analytics, ads, trackers, or send your gameplay data to any server.</p>
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
      ${Button({ id: 'about-clear-all', label: 'Clear All Site Data', variant: 'secondary' })}
    </div>
    <p class="note">Clearing data will reset stored best times, wins/losses, and Custom fuse settings.</p>
  `;
  frag.append(sec);

  queueMicrotask(() => {
    const clearTS = sec.querySelector('#about-clear-timesweeper');
    const clearAll = sec.querySelector('#about-clear-all');
    const clearCR = sec.querySelector('#about-clear-coderain');
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
      removeByPrefixes(['timesweeper:', 'coderain:']);
      alert('Site data cleared.');
    });
  });

  return frag;
}
