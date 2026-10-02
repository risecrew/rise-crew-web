// Generates public/textures/stamp-grain.png: a tileable alpha mask that gives inked stamps an
// uneven rubber-stamp impression (mostly solid, with sparse pale specks and short dry streaks).
// Deterministic (seeded), dependency-free PNG encoder. Run: node scripts/generate-stamp-grain.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 128;
let seed = 0x52495345; // "RISE"
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const alpha = new Float32Array(SIZE * SIZE).fill(1);
const wrap = (v) => (v + SIZE) % SIZE;
// Pale specks: small soft holes where the ink did not take.
for (let n = 0; n < 220; n++) {
  const cx = rand() * SIZE,
    cy = rand() * SIZE,
    r = 0.6 + rand() * 1.6,
    depth = 0.35 + rand() * 0.55;
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dy) / r;
      if (d < 1) {
        const i = wrap(Math.round(cy + dy)) * SIZE + wrap(Math.round(cx + dx));
        alpha[i] = Math.min(alpha[i], 1 - depth * (1 - d));
      }
    }
}
// Dry streaks: short diagonal runs of lighter ink.
for (let n = 0; n < 18; n++) {
  let x = rand() * SIZE,
    y = rand() * SIZE;
  const len = 6 + rand() * 14,
    fade = 0.25 + rand() * 0.3;
  for (let k = 0; k < len; k++) {
    const i = wrap(Math.round(y)) * SIZE + wrap(Math.round(x));
    alpha[i] = Math.min(alpha[i], 1 - fade);
    x += 1;
    y += 0.4;
  }
}

// RGBA, black with varying alpha (only alpha matters for a CSS mask).
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    const o = y * (SIZE * 4 + 1) + 1 + x * 4;
    raw[o + 3] = Math.round(alpha[y * SIZE + x] * 255);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync('public/textures/stamp-grain.png', png);
console.log(`wrote public/textures/stamp-grain.png (${png.length} bytes)`);
