// Formatting helpers

export function formatTenths(ms) {
  if (!ms || ms <= 0) return '--:--.-';
  const tenths = Math.floor(ms / 100);
  const s = Math.floor(tenths / 10);
  const t = tenths % 10;
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}.${t}`;
}

