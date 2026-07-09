const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const output = path.join(dist, 'spectral-chromatin-coiler.zip');
const files = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'content.js',
  'src/compressor.js',
  'README.md'
];

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const now = new Date();
  const { dosTime, dosDate } = dosDateTime(now);

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/\\/g, '/'));
    const data = fs.readFileSync(entry.path);
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(8), u16(dosTime), u16(dosDate),
      u32(crc), u32(compressed.length), u32(data.length), u16(name.length), u16(0), name
    ]);
    locals.push(localHeader, compressed);

    const centralHeader = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(dosTime), u16(dosDate),
      u32(crc), u32(compressed.length), u32(data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name
    ]);
    centrals.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralSize = centrals.reduce((sum, buffer) => sum + buffer.length, 0);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralSize), u32(offset), u16(0)
  ]);

  return Buffer.concat([...locals, ...centrals, end]);
}

for (const file of files) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) throw new Error(`missing build input: ${file}`);
}

fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(output, makeZip(files.map(name => ({ name, path: path.join(root, name) }))));
console.log(`wrote ${path.relative(root, output)}`);
