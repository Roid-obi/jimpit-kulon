const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const logoPath = path.join(rootDir, 'public', 'jimpit-kulon-logo.png');

async function main() {
  console.log('--- Generating Jimpit Kulon Branding & Icons ---');

  if (!fs.existsSync(logoPath)) {
    throw new Error('Logo file not found: ' + logoPath);
  }

  // 1. Dapatkan logo putih (white on transparent) dari logo asli
  const logoMeta = await sharp(logoPath).metadata();
  const alphaMask = await sharp(logoPath).extractChannel(3).toBuffer();

  const whiteLogoBuffer = await sharp({
    create: {
      width: logoMeta.width,
      height: logoMeta.height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).joinChannel(alphaMask).png().toBuffer();

  // 2. Buat App Icon (512x512)
  // Background: Coklat hangat (#6e3321), squircle elegan dengan aksen border tipis emas
  const icon512Svg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iconBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5a2718" />
        <stop offset="100%" stop-color="#733623" />
      </linearGradient>
    </defs>
    <!-- Squircle base -->
    <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#iconBg)" stroke="#f5b553" stroke-width="6" stroke-opacity="0.35" />
    <!-- Inner soft gold glow -->
    <circle cx="256" cy="180" r="160" fill="#f5b553" opacity="0.08" />
  </svg>
  `;

  const iconBase = await sharp(Buffer.from(icon512Svg)).png().toBuffer();

  // Logo di-resize proporsional agar muat pas di tengah 512x512
  const logoForIcon = await sharp(whiteLogoBuffer)
    .resize({ width: 380, height: 260, fit: 'inside' })
    .toBuffer();

  const icon512 = await sharp(iconBase)
    .composite([{ input: logoForIcon, gravity: 'center' }])
    .png()
    .toBuffer();

  // Simpan icon 512 & apple-icon (180x180)
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'icon.png'), icon512);
  fs.writeFileSync(path.join(rootDir, 'public', 'icon.png'), icon512);
  console.log('✓ Created src/app/icon.png and public/icon.png (512x512)');

  const appleIcon = await sharp(icon512).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'apple-icon.png'), appleIcon);
  fs.writeFileSync(path.join(rootDir, 'public', 'apple-touch-icon.png'), appleIcon);
  console.log('✓ Created apple-icon.png (180x180)');

  // 3. Buat Multi-resolution favicon.ico (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    icoSizes.map(s => sharp(icon512).resize(s, s).png().toBuffer())
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(icoSizes.length, 4); // count

  let offset = 6 + icoSizes.length * 16;
  const dirEntries = [];
  for (let i = 0; i < icoSizes.length; i++) {
    const entry = Buffer.alloc(16);
    const s = icoSizes[i];
    entry.writeUInt8(s === 256 ? 0 : s, 0);
    entry.writeUInt8(s === 256 ? 0 : s, 1);
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(pngBuffers[i].length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    offset += pngBuffers[i].length;
    dirEntries.push(entry);
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.ico'), icoBuffer);
  console.log('✓ Replaced src/app/favicon.ico and public/favicon.ico with Jimpit Kulon icon');

  // 4. Buat Open Graph Image (1200 x 630)
  // Cocok untuk WhatsApp, Facebook, Telegram, Twitter
  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ogBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4e1f12" />
        <stop offset="45%" stop-color="#6e3321" />
        <stop offset="100%" stop-color="#7d3b27" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#ogBg)" />

    <!-- Decorative Circles -->
    <circle cx="1080" cy="90" r="280" fill="#f5b553" opacity="0.10" />
    <circle cx="120" cy="540" r="220" fill="#ffffff" opacity="0.04" />
    <circle cx="600" cy="230" r="300" fill="#f5b553" opacity="0.06" />

    <!-- Wave divider at bottom -->
    <path d="M0,540 C340,580 860,490 1200,550 L1200,630 L0,630 Z" fill="rgba(0,0,0,0.25)" />

    <!-- Top Badge -->
    <g transform="translate(600, 75)">
      <rect x="-185" y="-18" width="370" height="36" rx="18" fill="rgba(245, 181, 83, 0.16)" stroke="#f5b553" stroke-width="1.5" />
      <text text-anchor="middle" y="5" fill="#f5b553" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" letter-spacing="2.5">PEMUDA TUNAS MANUNGGAL</text>
    </g>

    <!-- Subtitle / Village info -->
    <g transform="translate(600, 395)">
      <text text-anchor="middle" y="0" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="bold" letter-spacing="-0.5">Jimpitan Warga Dusun Ngowan</text>
      <text text-anchor="middle" y="44" fill="#f5b553" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="600">RT 01 / RW 02</text>
    </g>

    <!-- Feature Pills -->
    <g transform="translate(600, 495)">
      <g transform="translate(-300, 0)">
        <rect x="-95" y="-18" width="190" height="36" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" />
        <text text-anchor="middle" y="5" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">Saldo Realtime</text>
      </g>
      <g transform="translate(0, 0)">
        <rect x="-105" y="-18" width="210" height="36" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" />
        <text text-anchor="middle" y="5" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">Riwayat Transparan</text>
      </g>
      <g transform="translate(300, 0)">
        <rect x="-95" y="-18" width="190" height="36" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" />
        <text text-anchor="middle" y="5" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">Scan QR Rumah</text>
      </g>
    </g>

    <!-- Footer tagline -->
    <text text-anchor="middle" x="600" y="595" fill="rgba(255,255,255,0.55)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">Aplikasi Terbuka untuk Seluruh Warga • Tanpa Perlu Login</text>
  </svg>
  `;

  const ogBgBuffer = await sharp(Buffer.from(ogSvg)).png().toBuffer();

  // Resize logo putih untuk diletakkan di tengah OG banner (lebar ~480px, tinggi ~200px)
  const logoForOg = await sharp(whiteLogoBuffer)
    .resize({ width: 480, height: 200, fit: 'inside' })
    .toBuffer();

  const ogMeta = await sharp(ogBgBuffer).metadata();
  const logoPlacedMeta = await sharp(logoForOg).metadata();

  // Posisi logo di tengah horizontal, di y ~ 140
  const logoLeft = Math.round((ogMeta.width - logoPlacedMeta.width) / 2);
  const logoTop = 145;

  const finalOgImage = await sharp(ogBgBuffer)
    .composite([
      {
        input: logoForOg,
        left: logoLeft,
        top: logoTop
      }
    ])
    .png({ quality: 90, compressionLevel: 8 })
    .toBuffer();

  // Simpan ke Next.js metadata locations
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'opengraph-image.png'), finalOgImage);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'twitter-image.png'), finalOgImage);
  fs.writeFileSync(path.join(rootDir, 'public', 'og-image.png'), finalOgImage);

  console.log(`✓ Created opengraph-image.png & twitter-image.png (${finalOgImage.length} bytes, ideal < 300KB for WhatsApp)`);
  console.log('--- All assets generated successfully! ---');
}

main().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
