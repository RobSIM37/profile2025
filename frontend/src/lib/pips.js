const NS = 'http://www.w3.org/2000/svg';

const REL_COORDS = {
  tl: [0.28, 0.28],
  tm: [0.5 , 0.28],
  tr: [0.72, 0.28],
  ml: [0.28, 0.5 ],
  mm: [0.5 , 0.5 ],
  mr: [0.72, 0.5 ],
  bl: [0.28, 0.72],
  bm: [0.5 , 0.72],
  br: [0.72, 0.72],
};

const PIP_LAYOUTS = {
  0: [],
  1: ['mm'],
  2: ['tl', 'br'],
  3: ['tl', 'mm', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'mm', 'bl', 'br'],
  6: ['tl', 'ml', 'bl', 'tr', 'mr', 'br'],
};

function applyValue(circles, value) {
  const active = PIP_LAYOUTS[value] || [];
  for (const [name, circle] of circles.entries()) {
    if (!circle) continue;
    circle.style.display = active.includes(name) ? '' : 'none';
  }
}

/**
 * Create an SVG containing the pips for a die or domino face.
 * Returns the svg node along with helpers to update its value later.
 */
export function createPipSVG(value = 0, {
  size = 56,
  pipColor = '#111111',
  pipRadius,
  hideWhenZero = true,
} = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.pointerEvents = 'none';

  const r = pipRadius ?? Math.max(3, Math.floor(size * 0.08));
  const circles = new Map();
  for (const [name, [rx, ry]] of Object.entries(REL_COORDS)) {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', String(rx * size));
    circle.setAttribute('cy', String(ry * size));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', pipColor);
    circle.style.display = 'none';
    circle.setAttribute('vector-effect', 'non-scaling-stroke');
    circle.style.pointerEvents = 'none';
    svg.appendChild(circle);
    circles.set(name, circle);
  }

  const setValue = (nextValue = 0) => {
    applyValue(circles, nextValue);
    if (hideWhenZero) svg.style.visibility = nextValue > 0 ? 'visible' : 'hidden';
  };

  if (!hideWhenZero) svg.style.visibility = 'visible';
  setValue(value);

  return {
    svg,
    setValue,
    circles,
  };
}

/**
 * Create a fully-framed die face suitable for general display.
 */
export function createDieFace(value = 1, {
  size = 56,
  background = '#ffffff',
  borderColor = '#111111',
  borderWidth = 2,
  cornerRadius = Math.max(4, Math.floor(size * 0.18)),
  pipColor = '#111111',
} = {}) {
  const { svg, setValue, circles } = createPipSVG(value, { size, pipColor, hideWhenZero: false });
  const rect = document.createElementNS(NS, 'rect');
  const inset = borderWidth;
  rect.setAttribute('x', String(inset));
  rect.setAttribute('y', String(inset));
  rect.setAttribute('width', String(size - inset * 2));
  rect.setAttribute('height', String(size - inset * 2));
  rect.setAttribute('rx', String(cornerRadius));
  rect.setAttribute('fill', background);
  rect.setAttribute('stroke', borderColor);
  rect.setAttribute('stroke-width', String(borderWidth));
  rect.style.pointerEvents = 'none';
  svg.insertBefore(rect, svg.firstChild || null);

  const wrap = document.createElement('div');
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.style.display = 'grid';
  wrap.style.placeItems = 'center';
  wrap.appendChild(svg);

  return {
    root: wrap,
    svg,
    rect,
    circles,
    setValue,
  };
}

export function isValidPipValue(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}
