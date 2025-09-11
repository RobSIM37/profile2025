// Select-driven panel switcher using site UI styles
// makeSelectPanels({ id?, label, options: [{ id, label }], panels: Record<string, Element|()=>Element>, value?, noneId?, noneLabel?, onChange? })
// -> { root, wrapper, select, panelHost, setActive(id, emit?), getActive() }

export function makeSelectPanels({ id, label = '', options = [], panels = {}, value, noneId = 'none', noneLabel = 'None', onChange } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-field';

  const lab = document.createElement('label');
  if (id) lab.setAttribute('for', id);
  lab.textContent = label || '';

  const control = document.createElement('div');
  control.className = 'ui-control';

  const select = document.createElement('select');
  if (id) select.id = id;
  select.className = 'control';

  // Build options (prepend None)
  const allOptions = [{ id: noneId, label: noneLabel }, ...options];
  for (const opt of allOptions) {
    const o = document.createElement('option');
    o.value = String(opt.id);
    o.textContent = String(opt.label);
    select.appendChild(o);
  }

  control.append(select);
  wrapper.append(lab, control);

  const panelHost = document.createElement('div');
  panelHost.className = 'stack';

  let active = noneId;

  function buildPanel(id) {
    const def = panels[id];
    if (!def) return null;
    try {
      return typeof def === 'function' ? def() : def;
    } catch { return null; }
  }

  function setActive(id, emit = true) {
    active = id;
    while (panelHost.firstChild) panelHost.removeChild(panelHost.firstChild);
    if (id && id !== noneId) {
      const panel = buildPanel(id);
      if (panel) {
        const wrap = document.createElement('div');
        wrap.className = 'ui-panel stack';
        wrap.append(panel);
        panelHost.append(wrap);
      }
    }
    if (emit && typeof onChange === 'function') onChange(active);
  }

  function getActive(){ return active; }

  const initial = value !== undefined ? String(value) : String(noneId);
  select.value = initial;
  setActive(initial, false);

  select.addEventListener('change', () => setActive(select.value, true));

  const root = document.createDocumentFragment();
  root.append(wrapper, panelHost);
  return { root, wrapper, select, panelHost, setActive, getActive };
}
