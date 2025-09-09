// Placement masks for Knock It Off!
// Legend: b=black, r=red, g=green, u=blue, .=no placement

export const MASK_2P = [
  'brbrbrbr', // 8
  'rbrbrbrb', // 7
  'brbrbrbr', // 6
  'rbrbrbrb', // 5
  'brbrbrbr', // 4
  'rbrbrbrb', // 3
  'brbrbrbr', // 2
  'rbrbrbrb', // 1
];

export const MASK_4P = [
  'ururbgbg', // 8
  'gurbrbgu', // 7
  'ugurbgug', // 6
  'gugbrugu', // 5
  'ugbgurug', // 4
  'rbrugbrb', // 3
  'brurbgbr', // 2
  'rurbrbgb', // 1
];

export const COLORS = {
  b: 'black',
  r: 'red',
  g: 'green',
  u: 'blue',
};

export function maskToGrid(mask) {
  // returns array of 64 entries with '.', 'b','r','g','u'
  const rows = mask.slice();
  const out = [];
  for (let y = 0; y < 8; y++) {
    const line = rows[y] || '........';
    for (let x = 0; x < 8; x++) out.push(line[x] || '.');
  }
  return out;
}

