function generateEthAddress(): string {
  const bytes = new Uint8Array(20);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const rankData = Array.from({ length: 10 }, () => ({
  account: generateEthAddress(),
  wPoints: randomInt(10, 1000),
  fPoints: randomInt(10, 5000),
}));

export const myData = {
  account: generateEthAddress(),
  wPoints: randomInt(10, 1000),
  fPoints: randomInt(10, 5000),
  isMy: true,
}
