import sharp from 'sharp'
import path from 'path'

const OUT_DIR = path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset')
const ICON_PATH = path.join(process.cwd(), 'public', 'icons', 'appstoreicon4.png')
const SIZE = 2732
const LOGO_SIZE = 400

async function main() {
  // Create background
  const background = sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 232, g: 228, b: 220, alpha: 1 }, // #E8E4DC
    },
  }).png()

  // Resize the logo
  const logo = await sharp(ICON_PATH)
    .resize(LOGO_SIZE, LOGO_SIZE)
    .png()
    .toBuffer()

  // Composite logo centered on background
  const offset = Math.round((SIZE - LOGO_SIZE) / 2)

  for (const suffix of ['', '-1', '-2']) {
    await background
      .clone()
      .composite([{ input: logo, top: offset, left: offset }])
      .toFile(path.join(OUT_DIR, `splash-2732x2732${suffix}.png`))
    console.log(`Created splash-2732x2732${suffix}.png`)
  }

  console.log('Done! Splash images generated.')
}

main().catch(console.error)
