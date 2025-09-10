// LighthouseIcon('lit'|'unlit', { size=24, strokeWidth=1.6 }) => SVGElement

export function LighthouseIcon(kind = 'unlit', { size = 24, strokeWidth = 1.6 } = {}) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.width = `${size}px`;
  svg.style.height = `${size}px`;

  const base = '#94a3b8'; // slate-400
  const body = '#cbd5e1'; // slate-300
  const roof = '#334155'; // slate-700
  const windowLit = '#ffd56b';
  const beamColor = '#ffae42'; // warmer orange for beams
  const windowDim = '#64748b'; // slate-500

  // Tower base
  const tower = document.createElementNS(svgNS, 'path');
  tower.setAttribute('d', 'M9 21h6l-1.6-10H10.6L9 21z');
  tower.setAttribute('fill', body);
  tower.setAttribute('stroke', base);
  tower.setAttribute('stroke-width', String(strokeWidth * 0.75));
  svg.appendChild(tower);

  // Clip path to confine stripes within tower silhouette
  const defs = document.createElementNS(svgNS, 'defs');
  const clip = document.createElementNS(svgNS, 'clipPath');
  clip.setAttribute('id', 'lh-clip');
  const clipPath = document.createElementNS(svgNS, 'path');
  clipPath.setAttribute('d', 'M9 21h6l-1.6-10H10.6L9 21z');
  clip.appendChild(clipPath);
  defs.appendChild(clip);
  svg.appendChild(defs);

  // Two red stripes (horizontal bands)
  const stripeColor = '#ef4444'; // red-500
  const stripe1 = document.createElementNS(svgNS, 'rect');
  stripe1.setAttribute('x', '7');
  stripe1.setAttribute('y', '15.2');
  stripe1.setAttribute('width', '10');
  stripe1.setAttribute('height', '1.2');
  stripe1.setAttribute('fill', stripeColor);
  stripe1.setAttribute('clip-path', 'url(#lh-clip)');
  const stripe2 = document.createElementNS(svgNS, 'rect');
  stripe2.setAttribute('x', '7');
  stripe2.setAttribute('y', '18.2');
  stripe2.setAttribute('width', '10');
  stripe2.setAttribute('height', '1.2');
  stripe2.setAttribute('fill', stripeColor);
  stripe2.setAttribute('clip-path', 'url(#lh-clip)');
  svg.append(stripe1, stripe2);

  // Lantern room
  const room = document.createElementNS(svgNS, 'rect');
  room.setAttribute('x', '9.5'); room.setAttribute('y', '5');
  room.setAttribute('width', '5'); room.setAttribute('height', '6');
  room.setAttribute('fill', roof);
  svg.appendChild(room);

  // Light window
  const win = document.createElementNS(svgNS, 'circle');
  win.setAttribute('cx', '12'); win.setAttribute('cy', '7'); win.setAttribute('r', '1.6');
  win.setAttribute('fill', kind === 'lit' ? windowLit : windowDim);
  svg.appendChild(win);

  // Cap/roof
  const cap = document.createElementNS(svgNS, 'path');
  cap.setAttribute('d', 'M8.8 5l6.4 0L14.5 3.8a2 2 0 0 0-1.9-1.3h-1.2a2 2 0 0 0-1.9 1.3L8.8 5z');
  cap.setAttribute('fill', roof);
  svg.appendChild(cap);

  // Beams (only when lit)
  if (kind === 'lit') {
    const beamL = document.createElementNS(svgNS, 'polygon');
    beamL.setAttribute('points', '12,7 2,4 2,10');
    beamL.setAttribute('fill', beamColor);
    beamL.setAttribute('opacity', '0.4');
    const beamR = document.createElementNS(svgNS, 'polygon');
    beamR.setAttribute('points', '12,7 22,4 22,10');
    beamR.setAttribute('fill', beamColor);
    beamR.setAttribute('opacity', '0.4');
    svg.append(beamL, beamR);
  }

  return svg;
}
