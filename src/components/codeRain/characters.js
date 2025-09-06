// Character set: digits 0-9 and Katakana only

export function buildCharSet() {
  const chars = [];
  // Digits
  for (let i = 0; i <= 9; i++) chars.push(String(i));
  // Katakana: U+30A1 (ァ) to U+30FA (ヺ) plus prolonged sound mark U+30FC
  for (let cp = 0x30a1; cp <= 0x30fa; cp++) {
    chars.push(String.fromCharCode(cp));
  }
  chars.push(String.fromCharCode(0x30fc));
  return chars;
}

export function randomChar(charSet) {
  const i = (Math.random() * charSet.length) | 0;
  return charSet[i];
}

