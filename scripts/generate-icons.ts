/**
 * Generate app icons from a master image with off-white border.
 *
 * Prerequisites: npm install sharp
 * Usage: npx tsx scripts/generate-icons.ts
 */

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const SIZES = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512, 1024]
const OUT_DIR = path.join(process.cwd(), 'public', 'icons')
const SOURCE = path.join(process.cwd(), 'public', 'icons', 'appstoreicon4.png')
const BORDER_COLOR = { r: 245, g: 242, b: 236, alpha: 1 } // #F5F2EC off-white
const BORDER_PERCENT = 0.03 // 3% border on each side

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  for (const size of SIZES) {
    const border = Math.max(1, Math.round(size * BORDER_PERCENT))
    const innerSize = size - border * 2

    // Resize source to fit inside the border
    const inner = await sharp(SOURCE)
      .resize(innerSize, innerSize)
      .png()
      .toBuffer()

    // Create the final icon with border background
    const filename = size === 180
      ? 'apple-touch-icon.png'
      : `icon-${size}.png`

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BORDER_COLOR,
      },
    })
      .png()
      .composite([{ input: inner, top: border, left: border }])
      .toFile(path.join(OUT_DIR, filename))

    console.log(`Created ${filename} (${size}x${size}, ${border}px border)`)
  }

  // Favicon
  await sharp(SOURCE)
    .resize(32, 32)
    .png()
    .toFile(path.join(OUT_DIR, 'favicon.png'))

  console.log('Done!')
}

main().catch(console.error)
