// Brand component: icon + name, links to home
// Usage: Brand({ name, src, alt, size, local }) -> HTML string

export function Brand({
  name = 'Rob Lewis',
  src = 'assets/IconTrimmed.png',
  alt = 'Rob Lewis logo',
  size = 28,
  local = false,
} = {}) {
  const safeName = String(name);
  const safeAlt = String(alt);
  const s = Number.isFinite(size) ? size : 28;
  const localBadge = local ? ' <span class="brand__local text-warning">(LOCAL)</span>' : '';
  return `
    <a href="#/" class="brand" aria-label="${safeName} home">
      <img class="brand__logo" src="${src}" alt="${safeAlt}" width="${s}" height="${s}" />
      <span class="brand__name">${safeName}${localBadge}</span>
    </a>
  `;
}
