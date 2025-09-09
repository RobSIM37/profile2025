export function rgbaFromHex(hex, alpha) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function hex6(v, fallback = '#3f48cc') {
  if (!v || typeof v !== 'string') return fallback;
  const h = v.replace('#', '');
  if (h.length === 3) return '#' + h.split('').map((c) => c + c).join('');
  if (h.length >= 6) return '#' + h.slice(0, 6);
  return fallback;
}

