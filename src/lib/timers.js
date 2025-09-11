// Small helper to manage a single timeout without overlaps
// Usage:
//   const t = makeTimer();
//   t.after(300, () => { ... });
//   t.clear();

export function makeTimer(){
  let id = null;
  function clear(){ if (id) { clearTimeout(id); id = null; } }
  function after(ms, fn){ clear(); id = setTimeout(()=>{ id=null; fn?.(); }, Math.max(0, ms|0)); return id; }
  return { after, clear, get id(){ return id; } };
}

