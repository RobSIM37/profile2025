// Simple bounded memory of seen cards: remembers id -> list of indices seen up

export function makeAIMemory(capacity) {
  const queue = [];
  const seenById = new Map(); // id -> Set(idx)
  const seenIdx = new Set();
  return {
    remember(id, idx) {
      if (seenIdx.has(idx)) return;
      seenIdx.add(idx);
      queue.push({ id, idx });
      if (!seenById.has(id)) seenById.set(id, new Set());
      seenById.get(id).add(idx);
      while (queue.length > capacity) {
        const { id: rid, idx: ridx } = queue.shift();
        const set = seenById.get(rid);
        if (set) { set.delete(ridx); if (set.size === 0) seenById.delete(rid); }
        seenIdx.delete(ridx);
      }
    },
    forget(idx) {
      // optional; not needed in memory game
    },
    knownPair() {
      for (const [id, set] of seenById) {
        if (set.size >= 2) {
          const arr = Array.from(set);
          return { id, a: arr[0], b: arr[1] };
        }
      }
      return null;
    },
    knowMate(id, excludeIdx) {
      const set = seenById.get(id);
      if (!set) return null;
      for (const idx of set) if (idx !== excludeIdx) return idx;
      return null;
    },
    seenIdx,
  };
}

