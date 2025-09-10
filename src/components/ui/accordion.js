// Simple reusable Accordion built on <details>/<summary>

export function Accordion({ summary = '', content = null, open = false } = {}) {
  const details = document.createElement('details');
  details.className = 'accordion';
  if (open) details.open = true;

  const sum = document.createElement('summary');
  sum.textContent = String(summary);

  if (content == null) content = document.createElement('div');

  details.append(sum, content);
  return details;
}

export function makeAccordionGroup(items = []) {
  const root = document.createElement('div');
  root.className = 'stack';
  items.forEach((opts) => root.append(Accordion(opts)));
  return root;
}

