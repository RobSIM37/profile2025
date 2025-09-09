// Default Code Rain visual options
// Exported as a constant built at import-time so callers can just import and use.

export const RAIN_OPTIONS = (() => {
  const PRIMARY = (typeof window !== 'undefined' && document?.documentElement)
    ? (getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3f48cc')
    : '#3f48cc';
  return {
    glyphSize: 24,
    colorHead: '#c8d7ffff',
    colorTrail: PRIMARY,
    // Flicker chance per trail glyph draw (0..1). You can also use `flicker`.
    switchRate: 0.05,
    // Speed in rows per second
    speedMin: 7,
    speedMax: 20,
    // Trail length in rows
    trailMin: 10,
    trailMax: 28,
    // Canvas background: 'auto' uses body background color
    background: '#000',
    // Max simultaneous heads per column
    dropsPerColumn: 2,
    // Trail fade speed range (higher = faster fade)
    minFade: 0.8,
    maxFade: 1.8,
    // Use sharper digital type for glyphs
    fontFamily: "'Share Tech Mono', monospace",
  };
})();

