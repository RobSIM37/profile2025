// Tag: pill-like small label element
// Signature: Tag({ text }) -> Element

export function Tag({ text = '' } = {}) {
  const el = document.createElement('span');
  el.textContent = String(text);
  el.style.border = '1px solid var(--border)';
  el.style.borderRadius = '999px';
  el.style.padding = '2px 8px';
  el.style.background = 'var(--bg)';
  el.style.display = 'inline-block';
  return el;
}

