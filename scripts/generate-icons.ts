/**
 * Generate app icons from a master SVG.
 *
 * Prerequisites: npm install sharp
 * Usage: npx tsx scripts/generate-icons.ts
 *
 * This creates all required iOS and PWA icon sizes in public/icons/
 * For App Store submission you'll also need a 1024x1024 PNG.
 */

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const SIZES = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512, 1024]
const OUT_DIR = path.join(process.cwd(), 'public', 'icons')

// URA Pages icon: Burnt Rose background with "U" in Off-white
const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#8E2937"/>
  <text x="256" y="340" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="320" fill="#F5F2EC">U</text>
</svg>
`

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  const svgBuffer = Buffer.from(SVG)

  for (const size of SIZES) {
    const filename = size === 180
      ? 'apple-touch-icon.png'
      : `icon-${size}.png`

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, filename))

    console.log(`Created ${filename} (${size}x${size})`)
  }

  // Also create favicon.ico from 32px
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(OUT_DIR, 'favicon.png'))

  console.log('Done! Icons generated in public/icons/')
}

main().catch(console.error)
