// Route guard utilities
// Define small, composable guards and feed them to the router's beforeResolve.

/**
 * Create a beforeResolve(fn) from a list of rules.
 * Each rule: { match, allow, redirect }
 * - match: string | RegExp | (path)=>boolean
 * - allow: () => boolean
 * - redirect: string | (path)=>string
 */
export function makeBeforeResolve(rules = []) {
  return function beforeResolve(path) {
    try {
      for (const r of rules) {
        const matched = typeof r.match === 'function'
          ? !!r.match(path)
          : (r.match instanceof RegExp ? r.match.test(path) : path === r.match);
        if (!matched) continue;
        const ok = typeof r.allow === 'function' ? !!r.allow(path) : !!r.allow;
        if (!ok) {
          const dest = typeof r.redirect === 'function' ? r.redirect(path) : r.redirect;
          if (dest && dest !== path) return dest;
        }
      }
    } catch (err) {
      // Non-fatal; fall through to original path
      console.warn('[guards] error', err);
    }
    return path;
  };
}

// Helpers for common conditions
export const allow = {
  always: () => true,
  sessionKey: (key) => () => {
    try { return !!sessionStorage.getItem(key); } catch { return false; }
  },
  localKey: (key) => () => {
    try { return !!localStorage.getItem(key); } catch { return false; }
  },
};

