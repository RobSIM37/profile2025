// Reusable Smiley/Frowny face SVG
// FaceIcon('smiley'|'frowny', { size=24, strokeWidth=2.2 }) => SVGElement

export function FaceIcon(kind, { size = 24, strokeWidth = 2.2 } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.width = `${size}px`;
  svg.style.height = `${size}px`;
  const dark = '#111827';
  const yellow = '#fde047';
  const faceBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  faceBg.setAttribute('cx', '12'); faceBg.setAttribute('cy', '12'); faceBg.setAttribute('r', '9');
  faceBg.setAttribute('fill', yellow);
  faceBg.setAttribute('stroke', dark); faceBg.setAttribute('stroke-width', String(strokeWidth - 0.7));
  svg.appendChild(faceBg);
  if (kind === 'smiley') {
    const eyeL = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); eyeL.setAttribute('cx', '8.5'); eyeL.setAttribute('cy', '10'); eyeL.setAttribute('r', '1.4'); eyeL.setAttribute('fill', dark);
    const eyeR = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); eyeR.setAttribute('cx', '15.5'); eyeR.setAttribute('cy', '10'); eyeR.setAttribute('r', '1.4'); eyeR.setAttribute('fill', dark);
    const mouth = document.createElementNS('http://www.w3.org/2000/svg', 'path'); mouth.setAttribute('d', 'M7.2 14.2c1.9 2.2 3.8 3 4.8 3s2.9-.8 4.8-3'); mouth.setAttribute('fill','none'); mouth.setAttribute('stroke', dark); mouth.setAttribute('stroke-width', String(strokeWidth)); mouth.setAttribute('stroke-linecap','round');
    svg.append(eyeL, eyeR, mouth);
  } else if (kind === 'frowny') {
    const lx1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); lx1.setAttribute('d','M7.4 9.2l2.4 2.4'); lx1.setAttribute('stroke', dark); lx1.setAttribute('stroke-width', String(strokeWidth)); lx1.setAttribute('stroke-linecap','round');
    const lx2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); lx2.setAttribute('d','M9.8 9.2l-2.4 2.4'); lx2.setAttribute('stroke', dark); lx2.setAttribute('stroke-width', String(strokeWidth)); lx2.setAttribute('stroke-linecap','round');
    const rx1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); rx1.setAttribute('d','M14.0 9.2l2.4 2.4'); rx1.setAttribute('stroke', dark); rx1.setAttribute('stroke-width', String(strokeWidth)); rx1.setAttribute('stroke-linecap','round');
    const rx2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); rx2.setAttribute('d','M16.4 9.2l-2.4 2.4'); rx2.setAttribute('stroke', dark); rx2.setAttribute('stroke-width', String(strokeWidth)); rx2.setAttribute('stroke-linecap','round');
    const mouth = document.createElementNS('http://www.w3.org/2000/svg', 'path'); mouth.setAttribute('d','M7.2 17.5c1.9-2.2 3.8-3 4.8-3s2.9.8 4.8 3'); mouth.setAttribute('fill','none'); mouth.setAttribute('stroke', dark); mouth.setAttribute('stroke-width', String(strokeWidth)); mouth.setAttribute('stroke-linecap','round');
    svg.append(lx1, lx2, rx1, rx2, mouth);
  }
  return svg;
}

