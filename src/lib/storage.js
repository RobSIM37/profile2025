// Tiny JSON-safe localStorage helpers

export function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const val = JSON.parse(raw);
    return (val && typeof val === 'object') || Array.isArray(val) ? val : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function remove(key) {
  try { localStorage.removeItem(key); } catch {}
}

export function removeByPrefixes(prefixes = []) {
  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (prefixes.some((p) => k.startsWith(p))) localStorage.removeItem(k);
    }
  } catch {}
}

