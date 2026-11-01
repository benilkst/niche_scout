import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.join(rootDir, 'public', 'icon.svg');
const outputDir = path.join(rootDir, 'public', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Membuat icon PNG dari public/icon.svg...');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`Berkas SVG tidak ditemukan di ${svgPath}`);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. icon-192.png (192x192)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));
  console.log('✓ public/icons/icon-192.png');

  // 2. icon-512.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));
  console.log('✓ public/icons/icon-512.png');

  // 3. icon-512-maskable.png (512x512 with 15% safe padding)
  // Scale icon to 80% (approx 410px) and composite onto a 512x512 background (#0f172a)
  const innerSize = Math.round(512 * 0.8); // 410px
  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
    },
  })
    .composite([
      {
        input: innerBuffer,
        top: Math.round((512 - innerSize) / 2),
        left: Math.round((512 - innerSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(outputDir, 'icon-512-maskable.png'));
  console.log('✓ public/icons/icon-512-maskable.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('✓ public/icons/apple-touch-icon.png');

  console.log('Semua ikon PWA berhasil dibuat!');
}

generateIcons().catch((err) => {
  console.error('Gagal membuat ikon:', err);
  process.exit(1);
});
