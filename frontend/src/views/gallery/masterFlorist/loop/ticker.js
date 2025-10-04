const MIN_TICK_MS = 1000 / 144; // ~6.9ms upper limit
const REDUCED_MOTION_MIN_MS = 1000 / 30; // cap at ~33ms when reduced motion is requested

export function createMasterFloristLoop({ tickRateMs = 1000 / 60, autoStart = false, routeMatch } = {}) {
  let effectiveTickMs = normalizeTickRate(tickRateMs);
  let running = false;
  let rafId = 0;
  let lastTime = 0;
  let accumulator = 0;
  let tickCount = 0;
  let startedAt = 0;
  const listeners = new Set();
  const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  let mqHandler = null;
  const routeMatcher = createRouteMatcher(routeMatch);
  const handleRouteChange = routeMatcher
    ? () => {
        if (!routeMatcher()) stop();
      }
    : null;

  if (mediaQuery) {
    mqHandler = () => {
      effectiveTickMs = normalizeTickRate(effectiveTickMs, { respectReducedMotion: true, mediaQuery });
    };
    mediaQuery.addEventListener?.('change', mqHandler);
    effectiveTickMs = normalizeTickRate(effectiveTickMs, { respectReducedMotion: true, mediaQuery });
  }

  if (handleRouteChange) {
    window.addEventListener('hashchange', handleRouteChange, { passive: true });
  }

  function start() {
    if (running) return;
    if (routeMatcher && !routeMatcher()) return;
    running = true;
    tickCount = 0;
    accumulator = 0;
    lastTime = performance.now();
    startedAt = lastTime;
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    if (!running) return;
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function step(timestamp) {
    if (!running) return;
    const delta = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += delta;

    while (accumulator >= effectiveTickMs) {
      accumulator -= effectiveTickMs;
      tickCount += 1;
      const info = {
        tick: tickCount,
        deltaMs: effectiveTickMs,
        elapsedMs: timestamp - startedAt,
      };
      listeners.forEach((listener) => {
        try {
          listener(info);
        } catch (err) {
          console.error('Master Florist loop listener error', err);
        }
      });
    }

    rafId = requestAnimationFrame(step);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setTickRate(ms) {
    effectiveTickMs = normalizeTickRate(ms, { respectReducedMotion: true, mediaQuery });
  }

  function dispose() {
    stop();
    listeners.clear();
    if (mediaQuery && mqHandler) {
      mediaQuery.removeEventListener?.('change', mqHandler);
    }
    if (handleRouteChange) {
      window.removeEventListener('hashchange', handleRouteChange);
    }
  }

  const api = {
    start,
    stop,
    subscribe,
    setTickRate,
    dispose,
    get isRunning() {
      return running;
    },
  };

  if (autoStart) start();
  return api;
}

function normalizeTickRate(value, { respectReducedMotion = false, mediaQuery = null } = {}) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) && numeric > 0 ? Math.max(numeric, MIN_TICK_MS) : 1000 / 60;
  if (respectReducedMotion || mediaQuery?.matches) {
    return Math.max(safe, REDUCED_MOTION_MIN_MS);
  }
  return safe;
}

function createRouteMatcher(routeMatch) {
  if (!routeMatch) return null;
  if (typeof routeMatch === 'function') {
    return () => Boolean(routeMatch());
  }
  if (typeof routeMatch === 'string') {
    return () => window.location.hash.startsWith(routeMatch);
  }
  if (routeMatch instanceof RegExp) {
    return () => routeMatch.test(window.location.hash);
  }
  return null;
}