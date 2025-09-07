export const meta = {
  title: 'About',
  description: 'Data usage and privacy notes for this site',
};

export function render() {
  const frag = document.createDocumentFragment();
  const sec = document.createElement('section');
  sec.className = 'stack about-wrap';
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
      <button id="about-clear-timesweeper" class="button button-secondary">Clear Timesweeper Data</button>
      <button id="about-clear-coderain" class="button button-secondary">Clear Code Rain Settings</button>
      <button id="about-clear-all" class="button button-secondary">Clear All Site Data</button>
    </div>
    <p class="note">Clearing data will reset stored best times, wins/losses, and Custom fuse settings.</p>
  `;
  frag.append(sec);

  // Fill the blue-frame area with a solid backdrop for legibility
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.style.background = 'var(--bg)';
    appEl.style.color = 'var(--text)';
  }

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
      try {
        // Scope to a few known prefixes to avoid being too destructive
        const prefixes = ['timesweeper:', 'coderain:'];
        Object.keys(localStorage)
          .filter((k) => prefixes.some((p) => k.startsWith(p)))
          .forEach((k) => localStorage.removeItem(k));
        alert('Site data cleared.');
      } catch {}
    });
  });

  return frag;
}
