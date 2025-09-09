// Read and clear the chosen players payload from sessionStorage
export function pullAutostartChosen(key = 'kio:chosen') {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const chosen = JSON.parse(raw);
    try { sessionStorage.removeItem(key); } catch {}
    if (Array.isArray(chosen) && chosen.length >= 2) return chosen;
  } catch {}
  return null;
}

