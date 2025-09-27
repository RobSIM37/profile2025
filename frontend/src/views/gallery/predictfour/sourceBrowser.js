const DEFAULT_FILES = ['start.js', 'howto.js', 'game.js', 'AI.js'];

export function renderPredictFourSourceBrowser(host, files = DEFAULT_FILES) {
  if (!host) return;
  host.innerHTML = '';

  const list = document.createElement('div');
  list.className = 'stack';

  const note = document.createElement('p');
  note.textContent = 'Source files under src/views/gallery/predictfour/';
  list.append(note);

  files.forEach((path) => {
    const item = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = path;
    item.append(summary);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'Loading...';
    pre.append(code);
    item.append(pre);

    item.addEventListener('toggle', async () => {
      if (!item.open) return;
      try {
        const res = await fetch('src/views/gallery/predictfour/' + path, { cache: 'no-cache' });
        const text = await res.text();
        code.textContent = text;
      } catch (err) {
        code.textContent = 'Unable to load file in this context.';
      }
    }, { once: true });

    list.append(item);
  });

  host.append(list);
  return host;
}
