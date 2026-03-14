import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const channels = [
  { handle: 'GoodPoliticGuy', channelId: 'UCIRXSi2NhGlX7GlC4H4Lm_A', name: 'Good Politic Guy' },
  { handle: 'NativeLandPod', channelId: 'UCPwDm9ID1xdHlHnkYDizCCA', name: 'Native Land Pod' },
  { handle: 'stephenasmithspeaks', channelId: 'UC2OREBiIbDChxvmDeg30Bsg', name: 'Stephen A. Smith' },
  { handle: 'aljazeeraenglish', channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg', name: 'Al Jazeera English' },
  { handle: 'zeteo', channelId: 'UCVG72F2Q5yCmLQfctNK6M2A', name: 'Zeteo' },
  { handle: 'ProfJiangMedia', channelId: 'UC7IbHQjb06TX1JIQomGXC3A', name: 'Prof Jiang Media' },
  { handle: 'BadFaithPodcast', channelId: 'UCLNw2JNuTUWFdilpzOXLa5A', name: 'Bad Faith Podcast' },
  { handle: 'Iancarrollshow', channelId: 'UCCgpGpylCfrJIV-RwA_L7tg', name: 'Ian Carroll Show' },
  { handle: 'SabineHossenfelder', channelId: 'UC1yNl2E66ZzKApQdRuTQ4tw', name: 'Sabine Hossenfelder' },
  { handle: 'theinneroperator', channelId: 'UCAFqzhDwJd12pBDgdk-2GqA', name: 'The Inner Operator' },
  { handle: 'WorldAstrologyReport', channelId: 'UC0aTKbKUCDvl5Zj3zmCOHsA', name: 'World Astrology Report' },
  { handle: 'AlfredStreetBaptistChurch', channelId: 'UCKFkEcTQsLP7j6DFo-O4xrg', name: 'Alfred Street Baptist Church' },
  { handle: 'TheDailyShow', channelId: 'UCwWhs_6x42TyRM4Wstoq8HA', name: 'The Daily Show' },
  { handle: 'SpaceWeatherNewsS0s', channelId: 'UCTiL1q9YbrVam5nP2xzFTWQ', name: 'Space Weather News' },
  { handle: 'TYTInvestigatesReports', channelId: 'UCwNJt9PYyN1uyw2XhNIQMMA', name: 'TYT Investigates' },
  { handle: 'TheJoyReidShow', channelId: 'UCvKGiwSwqd92gUoxJI3W_fw', name: 'The Joy Reid Show' },
  { handle: 'marclamonthillnetwork', channelId: 'UCvP5iwPBzl0Wn0-GBAzGryg', name: 'Marc Lamont Hill' },
  { handle: 'heathercoxrichardson', channelId: 'UCnbKOlm6H9njgmN-Yil90Rg', name: 'Heather Cox Richardson' },
  { handle: 'trevornoah', channelId: 'UC8bTQzxgvKkXDAaWkeuUlkg', name: 'Trevor Noah' },
  { handle: 'michelleobama', channelId: 'UC64L9OK6WkM0STVxysAWBuA', name: 'Michelle Obama' },
  { handle: 'breakingpoints', channelId: 'UCDRIjKy6eZOvKtOELtTdeUA', name: 'Breaking Points' },
  { handle: 'MoonOmens', channelId: 'UCEauk7bv9ULXE8oveqMXHdA', name: 'Moon Omens' },
  { handle: 'lo-fijungle', channelId: 'UCbnO7aNm91r5RgRYLIhG9Cg', name: 'Lo-Fi Jungle' },
  { handle: 'CSPAN', channelId: 'UCb--64Gl51jIEVE-GLDAVTg', name: 'C-SPAN' },
  { handle: 'GritsAndEggsPodcast', channelId: 'UCI0e3NKL_ZnTGNlGFuiwRTA', name: 'Grits And Eggs Podcast' },
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
