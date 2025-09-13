export function createColumns({
  width,
  height,
  glyphSize,
  speedMin = 8, // rows/sec
  speedMax = 18,
  trailMin = 8, // rows
  trailMax = 24,
  dropsPerColumn = 1,
  minFade = 0.8,
  maxFade = 1.8,
}) {
  const colCount = Math.max(1, Math.floor(width / glyphSize));
  const rowCount = Math.max(1, Math.floor(height / glyphSize));

  function newDrop() {
    return {
      headRow: -Math.floor(rand(0, rowCount)),
      speed: rand(speedMin, speedMax),
      trail: Math.floor(rand(trailMin, trailMax)),
      headChar: null,
      prevHeadRowI: null,
      fadePow: rand(minFade, maxFade),
    };
  }

  function newColumn(i) {
    const drops = [];
    for (let d = 0; d < dropsPerColumn; d++) drops.push(newDrop());
    return { i, drops, glyphs: new Map() };
  }

  function resetDrop(drop) {
    drop.speed = rand(speedMin, speedMax);
    drop.trail = Math.floor(rand(trailMin, trailMax));
    drop.headRow = -Math.floor(rand(0, rowCount));
    drop.prevHeadRowI = null;
    drop.headChar = null;
    drop.fadePow = rand(minFade, maxFade);
  }

  function resetColumn(col) {
    col.glyphs.clear();
    col.drops.length = 0;
    for (let d = 0; d < dropsPerColumn; d++) col.drops.push(newDrop());
  }

  const columns = new Array(colCount).fill(0).map((_, i) => newColumn(i));

  return { columns, colCount, rowCount, resetColumn, newDrop, resetDrop };
}

export function rand(min, max) {
  return Math.random() * (max - min) + min;
}
