import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// YouTube channels — add new sources here as { handle, channelId, name } entries
const channels: { handle: string; channelId: string; name: string }[] = [
  { handle: 'plusntrust', channelId: 'UCPx8Jwbky3uQXqLmBe74r2A', name: 'plustrust' },
  { handle: 'COLORSxSTUDIOS', channelId: 'UC2Qw1dzXDBAZPwS7zm37g8g', name: 'COLORS' },
  { handle: 'nprmusic', channelId: 'UC4eYXhJI4-7wSWc8UNRwD4A', name: 'NPR Music' },
  { handle: 'NOOCHIESFRONTPORCH', channelId: 'UCVbA1MgqXiRTi1zEK-5q4_w', name: 'Noochie' },
  { handle: 'hyperbolicclub', channelId: 'UCd6CY32LpsfcbMwUJSJXZQw', name: 'Hyperbolic Club' },
  { handle: 'TheWalnutLounge', channelId: 'UCtAUckFUnkwRPrPCUsmMQxA', name: 'The Walnut Lounge' },
  { handle: 'jayzslifeandtimes', channelId: 'UCN-sc1xJr-QQNj_uNIM9wTA', name: 'JAY-Z' },
  { handle: 'joebuddentv', channelId: 'UC23_r1bpkTWaBltbXsQxysA', name: 'Joe Budden TV' },
  { handle: 'Complex', channelId: 'UCE_--R1P5-kfBzHTca0dsnw', name: 'Complex' },
  { handle: 'TheEbroLauraRosenbergShow', channelId: 'UCRTR2HfPiuZ5jMUf9iMpYgQ', name: 'The Ebro Laura Rosenberg Show' },
  { handle: 'BreakfastClubPower1051FM', channelId: 'UChi08h4577eFsNXGd3sxYhw', name: 'Breakfast Club Power 105.1 FM' },
  { handle: 'Big.Boy.', channelId: 'UCvIFYR01Rp0VX5vegE_uHKQ', name: 'BigBoyTV' },
  { handle: 'ziwe', channelId: 'UCY3L5on78KPyltbhEyiLDmA', name: 'Ziwe' },
  { handle: 'revolt', channelId: 'UCqISR0F9-nCth-V2r4Qy75Q', name: 'REVOLT' },
  { handle: 'kendricklamar', channelId: 'UC3lBXcrKFnFAFkfVk5WuKcQ', name: 'Kendrick Lamar' },
  { handle: 'jcole', channelId: 'UCnc6db-y3IU7CkT_yeVXdVg', name: 'J. Cole' },
  { handle: 'DrakeOfficial', channelId: 'UCByOQJjav0CUDwxCk-jVNRQ', name: 'Drake' },
  { handle: 'grounded.shaispace', channelId: 'UCU-3ec2K0hdD4r8-KzNSTAg', name: 'Shai Space' },
  { handle: 'threetwenty_ncs', channelId: 'UCvZZYTd4kQCs0sCOi_Abaug', name: 'threetwenty_ncs' },
]

async function main() {
  console.log('Seeding YouTube channels...')

  for (const ch of channels) {
    const existing = await prisma.youTubeChannel.findUnique({
      where: { channelId: ch.channelId },
    })

    if (existing) {
      console.log(`  Skipping ${ch.name} (already exists)`)
      continue
    }

    await prisma.youTubeChannel.create({
      data: {
        channelId: ch.channelId,
        name: ch.name,
        url: `https://www.youtube.com/@${ch.handle}`,
        enabled: true,
      },
    })
    console.log(`  Added ${ch.name}`)
  }

  console.log(`Done! ${channels.length} channels processed.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
