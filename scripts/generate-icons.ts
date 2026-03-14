/**
 * Generate app icons from a master image.
 *
 * Prerequisites: npm install sharp
 * Usage: npx tsx scripts/generate-icons.ts
 */

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const SIZES = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512, 1024]
const OUT_DIR = path.join(process.cwd(), 'public', 'icons')
const SOURCE = path.join(process.cwd(), 'public', 'icons', 'appstoreicon3.png')

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  for (const size of SIZES) {
    const filename = size === 180
      ? 'apple-touch-icon.png'
      : `icon-${size}.png`

    await sharp(SOURCE)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, filename))

    console.log(`Created ${filename} (${size}x${size})`)
  }

  // Favicon
  await sharp(SOURCE)
    .resize(32, 32)
    .png()
    .toFile(path.join(OUT_DIR, 'favicon.png'))

  console.log('Done!')
}

main().catch(console.error)
