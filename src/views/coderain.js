import { getOptions, setOptions } from '../components/codeRain/index.js';

export const meta = {
  title: 'Code Rain',
  description: 'Adjust Code Rain options in real-time',
};

export function render() {
  const opts = getOptions();

  const frag = document.createDocumentFragment();
  const section = document.createElement('section');
  section.className = 'stack';
  section.innerHTML = `
    <h2>Code Rain Controls</h2>
    <p>Changes apply immediately.</p>
    <form class="stack" id="rain-form">
      <div class="form-columns">
        <div class="form-grid" style="--control-w: 120px;">
          <label for="glyphSize">Glyph Size</label>
          <input class="control" type="number" id="glyphSize" min="12" max="64" step="1" value="${num(opts.glyphSize, 24)}" />

        <label for="dropsPerColumn">Drops / Column</label>
        <input class="control" type="number" id="dropsPerColumn" min="1" max="8" step="1" value="${num(opts.dropsPerColumn, 1)}" />

        <label for="speedMin">Speed Min (rows/s)</label>
        <input class="control" type="number" id="speedMin" min="1" max="60" step="1" value="${num(opts.speedMin, 10)}" />

        <label for="speedMax">Speed Max (rows/s)</label>
        <input class="control" type="number" id="speedMax" min="1" max="60" step="1" value="${num(opts.speedMax, 22)}" />

        <label for="trailMin">Trail Min (rows)</label>
        <input class="control" type="number" id="trailMin" min="1" max="100" step="1" value="${num(opts.trailMin, 10)}" />

        <label for="trailMax">Trail Max (rows)</label>
          <input class="control" type="number" id="trailMax" min="1" max="100" step="1" value="${num(opts.trailMax, 28)}" />
        </div>

        <div class="form-grid" style="--control-w: 120px;">
          <label for="minFade">Min Fade</label>
          <input class="control" type="number" id="minFade" min="0.1" max="4" step="0.05" value="${num(opts.minFade, 0.8)}" />

          <label for="maxFade">Max Fade</label>
          <input class="control" type="number" id="maxFade" min="0.1" max="4" step="0.05" value="${num(opts.maxFade, 1.8)}" />

          <label for="headSwitchRate">Head Change</label>
          <input class="control" type="range" id="headSwitchRate" min="0" max="1" step="0.001" value="${num(opts.headSwitchRate, 0.06)}" />

          <label for="switchRate">Trail Change</label>
          <input class="control" type="range" id="switchRate" min="0" max="1" step="0.001" value="${num(opts.switchRate, 0.05)}" />

          <label for="colorHead">Head Color</label>
          <input class="control" type="color" id="colorHead" value="${hex6(opts.colorHead || '#3f48cc')}" />

          <label for="colorTrail">Trail Color</label>
          <input class="control" type="color" id="colorTrail" value="${hex6(opts.colorTrail || '#3f48cc')}" />

          <label for="background">Background</label>
          <input class="control" type="color" id="background" value="${hex6(typeof opts.background === 'string' ? opts.background : '#0f1115')}" />
        </div>
      </div>
      <div style="display:flex; justify-content:center; margin-top: var(--space-6);">
        <button type="button" id="restore-defaults" class="button button-secondary">Restore Defaults</button>
      </div>
    </form>
  `;
  frag.appendChild(section);

  // Wire up auto-update handlers after nodes exist
  queueMicrotask(() => {
    const fields = [
      'glyphSize','dropsPerColumn','speedMin','speedMax','trailMin','trailMax','switchRate','headSwitchRate','minFade','maxFade','colorHead','colorTrail','background'
    ];
    section.addEventListener('input', (e) => {
      const t = e.target;
      if (t && fields.includes(t.id)) {
        const patch = {};
        if (t.type === 'number' || t.type === 'range') {
          const v = t.value === '' ? undefined : Number(t.value);
          patch[t.id] = isFinite(v) ? v : undefined;
        } else if (t.type === 'color' || t.type === 'text') {
          patch[t.id] = t.value;
        }
        // Keep invariants for min/max
        const data = { ...getOptions(), ...patch };
        if (data.speedMin > data.speedMax) data.speedMax = data.speedMin;
        if (data.trailMin > data.trailMax) data.trailMax = data.trailMin;
        if (data.minFade > data.maxFade) data.maxFade = data.minFade;
        setOptions(data);
      }
    });

    // Restore Defaults button
    const restoreBtn = section.querySelector('#restore-defaults');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', async () => {
        const mod = await import('../components/codeRain/index.js');
        mod.resetOptions();
        const current = mod.getOptions();
        for (const id of fields) {
          const el = section.querySelector('#' + id);
          if (!el) continue;
          if (el.type === 'color') el.value = hex6(current[id]);
          else if (el.type === 'range' || el.type === 'number') el.value = String(num(current[id], 0));
          else el.value = current[id] ?? '';
        }
      });
    }
  });

  return frag;
}

function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
function hex6(v) {
  if (!v || typeof v !== 'string') return '#3f48cc';
  const h = v.replace('#','');
  if (h.length === 3) return '#' + h.split('').map((c)=>c+c).join('');
  if (h.length >= 6) return '#' + h.slice(0,6);
  return '#3f48cc';
}
