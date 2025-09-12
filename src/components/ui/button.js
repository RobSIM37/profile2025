// Simple Button component generator.
// Usage (string HTML): Button({ id, label, variant: 'primary'|'secondary', size: 'sm'|'md', attrs })
// Returns an HTML string you can interpolate into templates.

export function Button({
  id,
  label = 'Button',
  variant = 'primary',
  size = 'md',
  attrs = {},
  type,
  className,
} = {}) {
  const classes = ['button'];
  if (variant === 'secondary') classes.push('button-secondary');
  if (variant === 'warning') classes.push('button-warning');
  if (variant === 'subtle') classes.push('button-subtle');
  if (size === 'sm' || size === 'small') classes.push('small');
  if (className) {
    String(className)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => classes.push(c));
  }
  const idPart = id ? ` id="${escapeHTML(id)}"` : '';
  const typePart = type ? ` type="${escapeHTML(type)}"` : '';
  const rest = Object.entries(attrs || {})
    .map(([k, v]) => ` ${escapeHTML(k)}="${escapeHTML(String(v))}"`)
    .join('');
  return `<button${idPart}${typePart} class="${classes.join(' ')}"${rest}>${escapeHTML(label)}</button>`;
}

export function escapeHTML(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

