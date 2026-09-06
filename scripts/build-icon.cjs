const fs = require('node:fs');
const path = require('node:path');
const sharp = require('./script-utils.cjs').dependency('sharp');
(async () => {
  const assets = path.join(__dirname, '..', 'src', 'assets');
  const source = path.join(assets, 'prism-icon.svg');
  await sharp(source).png().toFile(path.join(assets, 'prism-icon.png'));
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
  const directory = Buffer.alloc(6 + sizes.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(sizes.length, 4);
  let offset = directory.length;
  buffers.forEach((buffer, i) => {
    const entry = 6 + i * 16;
    directory[entry] = directory[entry + 1] = sizes[i] === 256 ? 0 : sizes[i];
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(buffer.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });
  fs.writeFileSync(path.join(assets, 'prism.ico'), Buffer.concat([directory, ...buffers]));
  console.log(JSON.stringify({sizes, bytes: offset}));
})().catch(error => { console.error(error); process.exitCode = 1; });
