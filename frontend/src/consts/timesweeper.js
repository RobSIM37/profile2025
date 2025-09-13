// Timesweeper constants and presets

export const PRESETS = {
  Easy: { W: 9, H: 9, M: 10 },
  Intermediate: { W: 16, H: 16, M: 40 },
  Hard: { W: 30, H: 16, M: 99 },
};

export const DEFAULT_FUSE_MS = {
  Easy: 60_000,
  Intermediate: 180_000,
  Hard: 300_000,
};

export const STORAGE = {
  statsPrefix: 'timesweeper:stats:',
  customFuseKey: 'timesweeper:customFuse',
};

