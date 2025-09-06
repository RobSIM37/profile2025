// Brand component: icon + name, links to home
// Usage: Brand({ name, src, alt, size }) -> HTML string

export function Brand({
  name = 'Rob Lewis',
  src = 'assets/IconTrimmed.png',
  alt = 'Rob Lewis logo',
  size = 28,
} = {}) {
  const safeName = String(name);
  const safeAlt = String(alt);
  const s = Number.isFinite(size) ? size : 28;
  return `
    <a href="#/" class="brand" aria-label="${safeName} home">
      <img class="brand__logo" src="${src}" alt="${safeAlt}" width="${s}" height="${s}" />
      <span class="brand__name">${safeName}</span>
    </a>
  `;
}

