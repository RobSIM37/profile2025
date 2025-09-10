// Placeholder icon set: simple SVGs without letters/words.
// Each returns a string of inline SVG sized via width/height.

const LABELS = {
  apple: 'Apple', ball: 'Ball', cat: 'Cat', dog: 'Dog bone', egg: 'Egg', fish: 'Fish', grapes: 'Grapes', hat: 'Hat', icecream: 'Ice cream', jellyfish: 'Jellyfish',
  kite: 'Kite', leaf: 'Leaf', moon: 'Moon', nest: 'Nest', orange: 'Orange', pizza: 'Pizza slice', rainbow: 'Rainbow', sun: 'Sun', tree: 'Tree', umbrella: 'Umbrella',
  violin: 'Violin', whale: 'Whale', xylophone: 'Xylophone', yoyo: 'Yo-yo', zebra: 'Zebra'
};

export function iconLabel(id){ return LABELS[id] || id; }

export function iconSvg(id, { size = 64 } = {}) {
  const s = Number(size) || 64;
  const ctx = { s, c: s/2 };
  switch (id) {
    case 'apple': return apple(ctx);
    case 'ball': return ball(ctx);
    case 'cat': return cat(ctx);
    case 'dog': return bone(ctx);
    case 'egg': return egg(ctx);
    case 'fish': return fish(ctx);
    case 'grapes': return grapes(ctx);
    case 'hat': return hat(ctx);
    case 'icecream': return icecream(ctx);
    case 'jellyfish': return jellyfish(ctx);
    case 'kite': return kite(ctx);
    case 'leaf': return leaf(ctx);
    case 'moon': return moon(ctx);
    case 'nest': return nest(ctx);
    case 'orange': return orange(ctx);
    case 'pizza': return pizza(ctx);
    case 'rainbow': return rainbow(ctx);
    case 'sun': return sun(ctx);
    case 'tree': return tree(ctx);
    case 'umbrella': return umbrella(ctx);
    case 'violin': return violin(ctx);
    case 'whale': return whale(ctx);
    case 'xylophone': return xylophone(ctx);
    case 'yoyo': return yoyo(ctx);
    case 'zebra': return zebra(ctx);
    default: return ball(ctx);
  }
}

const svg = (s, body) => `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" role="img" aria-hidden="true">${body}</svg>`;

function apple({ s, c }){
  const r = s*0.35; const stemX = c-6;
  return svg(s, `
    <circle cx="${c}" cy="${c+4}" r="${r}" fill="#ef4444" stroke="#1f2937" stroke-width="3"/>
    <path d="M${stemX},${c-r-4} q8,-10 16,0" fill="#10b981" stroke="#065f46" stroke-width="3"/>
    <line x1="${c}" y1="${c-r-6}" x2="${c+2}" y2="${c-r-18}" stroke="#374151" stroke-width="3"/>
  `);
}
function ball({ s, c }){
  const r = s*0.4; return svg(s, `
    <circle cx="${c}" cy="${c}" r="${r}" fill="#3b82f6" stroke="#1f2937" stroke-width="3"/>
    <path d="M${c-r},${c} A${r},${r} 0 0 1 ${c+r},${c}" stroke="#93c5fd" stroke-width="4" fill="none"/>
  `);
}
function cat({ s, c }){
  const r = s*0.3; const ear = s*0.16; return svg(s, `
    <circle cx="${c}" cy="${c+6}" r="${r}" fill="#9ca3af" stroke="#111827" stroke-width="3"/>
    <polygon points="${c-r*0.6},${c-4} ${c-r*1.1},${c-10} ${c-r*0.2},${c-10}" fill="#9ca3af" stroke="#111827" stroke-width="3"/>
    <polygon points="${c+r*0.6},${c-4} ${c+r*1.1},${c-10} ${c+r*0.2},${c-10}" fill="#9ca3af" stroke="#111827" stroke-width="3"/>
  `);
}
function bone({ s, c }){ return svg(s, `
  <rect x="${c-12}" y="${c-4}" width="24" height="8" rx="4" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
  <circle cx="${c-14}" cy="${c-4}" r="6" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
  <circle cx="${c-14}" cy="${c+4}" r="6" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
  <circle cx="${c+14}" cy="${c-4}" r="6" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
  <circle cx="${c+14}" cy="${c+4}" r="6" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
`);} 
function egg({ s, c }){ return svg(s, `
  <path d="M${c},${c-18} c10,6 16,16 16,26 a16,16 0 0 1 -32,0 c0,-10 6,-20 16,-26z" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
`);} 
function fish({ s, c }){ return svg(s, `
  <ellipse cx="${c}" cy="${c}" rx="18" ry="12" fill="#60a5fa" stroke="#1e3a8a" stroke-width="3"/>
  <polygon points="${c+18},${c} ${c+28},${c-8} ${c+28},${c+8}" fill="#60a5fa" stroke="#1e3a8a" stroke-width="3"/>
`);} 
function grapes({ s, c }){ return svg(s, `
  ${[[-8,-6],[0,-8],[8,-6],[-4,0],[4,0],[0,8]].map(([dx,dy],i)=>`<circle cx="${c+dx}" cy="${c+dy}" r="7" fill="#8b5cf6" stroke="#4c1d95" stroke-width="3"/>`).join('')}
`);} 
function hat({ s, c }){ return svg(s, `
  <rect x="${c-16}" y="${c-10}" width="32" height="16" rx="3" fill="#1f2937" stroke="#111827" stroke-width="3"/>
  <rect x="${c-24}" y="${c+4}" width="48" height="6" rx="3" fill="#374151" stroke="#111827" stroke-width="3"/>
`);} 
function icecream({ s, c }){ return svg(s, `
  <circle cx="${c}" cy="${c-6}" r="12" fill="#f472b6" stroke="#9d174d" stroke-width="3"/>
  <polygon points="${c-6},${c-2} ${c+6},${c-2} ${c},${c+18}" fill="#f59e0b" stroke="#92400e" stroke-width="3"/>
`);} 
function jellyfish({ s, c }){ return svg(s, `
  <ellipse cx="${c}" cy="${c-2}" rx="14" ry="10" fill="#67e8f9" stroke="#155e75" stroke-width="3"/>
  ${[-8,-4,0,4,8].map(dx=>`<line x1="${c+dx}" y1="${c+6}" x2="${c+dx}" y2="${c+16}" stroke="#155e75" stroke-width="3"/>`).join('')}
`);} 
function kite({ s, c }){ return svg(s, `
  <polygon points="${c},${c-16} ${c-12},${c} ${c},${c+16} ${c+12},${c}" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>
`);} 
function leaf({ s, c }){ return svg(s, `
  <path d="M${c-16},${c} q16,-16 32,0 q-16,16 -32,0z" fill="#10b981" stroke="#065f46" stroke-width="3"/>
`);} 
function moon({ s, c }){ return svg(s, `
  <path d="M${c-2},${c-18} a18,18 0 1 0 0,36 a14,14 0 1 1 0,-36z" fill="#fcd34d" stroke="#92400e" stroke-width="3"/>
`);} 
function nest({ s, c }){ return svg(s, `
  <ellipse cx="${c}" cy="${c+8}" rx="18" ry="8" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>
  <ellipse cx="${c}" cy="${c+6}" rx="22" ry="10" fill="none" stroke="#92400e" stroke-width="3"/>
`);} 
function orange({ s, c }){ return svg(s, `
  <circle cx="${c}" cy="${c}" r="16" fill="#fb923c" stroke="#7c2d12" stroke-width="3"/>
  <path d="M${c-4},${c-18} q6,-6 12,0" stroke="#065f46" fill="#10b981" stroke-width="3"/>
`);} 
function pizza({ s, c }){ return svg(s, `
  <polygon points="${c},${c-18} ${c-14},${c+16} ${c+14},${c+16}" fill="#fcd34d" stroke="#92400e" stroke-width="3"/>
  ${[-6,0,6].map(dx=>`<circle cx="${c+dx}" cy="${c+4}" r="3" fill="#ef4444"/>`).join('')}
`);} 
function rainbow({ s, c }){ return svg(s, `
  ${[12,9,6,3].map((r,i)=>`<path d="M${c-r},${c} A${r},${r} 0 0 1 ${c+r},${c}" stroke="${['#ef4444','#f59e0b','#10b981','#3b82f6'][i]}" stroke-width="3" fill="none"/>`).join('')}
`);} 
function sun({ s, c }){ return svg(s, `
  <circle cx="${c}" cy="${c}" r="12" fill="#fde047" stroke="#a16207" stroke-width="3"/>
  ${Array.from({length:8},(_,i)=>i).map(i=>{
    const a = (i*Math.PI/4); const x1=c+Math.cos(a)*16; const y1=c+Math.sin(a)*16; const x2=c+Math.cos(a)*22; const y2=c+Math.sin(a)*22;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#a16207" stroke-width="3"/>`;
  }).join('')}
`);} 
function tree({ s, c }){ return svg(s, `
  <rect x="${c-3}" y="${c+6}" width="6" height="16" fill="#92400e"/>
  <polygon points="${c},${c-14} ${c-14},${c+6} ${c+14},${c+6}" fill="#10b981" stroke="#065f46" stroke-width="3"/>
`);} 
function umbrella({ s, c }){ return svg(s, `
  <path d="M${c-16},${c} q16,-16 32,0" fill="#ec4899" stroke="#9d174d" stroke-width="3"/>
  <line x1="${c}" y1="${c}" x2="${c}" y2="${c+18}" stroke="#111827" stroke-width="3"/>
`);} 
function violin({ s, c }){ return svg(s, `
  <rect x="${c-6}" y="${c-10}" width="12" height="22" rx="6" fill="#d97706" stroke="#7c2d12" stroke-width="3"/>
`);} 
function whale({ s, c }){ return svg(s, `
  <path d="M${c-20},${c} q14,-12 28,0 q-2,10 -12,10 h-16" fill="#60a5fa" stroke="#1e3a8a" stroke-width="3"/>
`);} 
function xylophone({ s, c }){ return svg(s, `
  ${[-8,-4,0,4,8].map((dx,i)=>`<rect x="${c+dx-6}" y="${c-10+i*3}" width="12" height="6" rx="2" fill="${['#ef4444','#f59e0b','#eab308','#10b981','#3b82f6'][i]}" stroke="#111827" stroke-width="2"/>`).join('')}
`);} 
function yoyo({ s, c }){ return svg(s, `
  <circle cx="${c}" cy="${c}" r="13" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/>
  <line x1="${c-13}" y1="${c-13}" x2="${c-22}" y2="${c-22}" stroke="#111827" stroke-width="3"/>
`);} 
function zebra({ s, c }){ return svg(s, `
  <rect x="${c-16}" y="${c-12}" width="32" height="24" fill="#f9fafb" stroke="#111827" stroke-width="3"/>
  ${[-12,-6,0,6,12].map(dx=>`<rect x="${c+dx-2}" y="${c-12}" width="4" height="24" fill="#111827"/>`).join('')}
`);} 
