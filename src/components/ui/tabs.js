// Generic Tabs header component extracted from Pips Solver styles
// Usage:
//   const tabs = makeTabs({ items: [{ id: 'About', label: 'About' }, ...], activeId: 'About', onChange: (id)=>{} });
//   container.append(tabs.root);
//   tabs.setActive('About'); // programmatic

export function makeTabs({ items = [], activeId, onChange } = {}) {
  const root = document.createElement('div');
  root.className = 'tabs';
  const buttons = new Map();
  let _active = activeId ?? (items[0] && items[0].id);

  function setActive(id, emit = false) {
    buttons.forEach((btn, key) => {
      btn.classList.toggle('is-active', key === id);
    });
    const changed = _active !== id;
    _active = id;
    if (emit && changed && typeof onChange === 'function') onChange(id);
  }

  items.forEach(({ id, label }) => {
    const b = document.createElement('button');
    b.className = 'pips-tab';
    b.textContent = String(label ?? id);
    b.addEventListener('click', () => setActive(id, true));
    buttons.set(id, b);
    root.append(b);
  });

  // initialize state
  if (_active != null) setActive(_active, false);

  return {
    root,
    setActive,
    getActive: () => _active,
  };
}
