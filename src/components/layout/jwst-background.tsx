import Image from 'next/image'
import { prisma } from '@/lib/db'
import { getDailyImageIndex } from '@/lib/utils'

interface JWSTBackgroundProps {
  className?: string
  variant?: 'hero' | 'subtle'
}

export async function JWSTBackground({ className = '', variant = 'hero' }: JWSTBackgroundProps) {
  // Get images from database
  let imageUrl = ''
  let credit = ''

  // Fallback image
  const fallbackUrl = 'https://stsci-opo.org/STScI-01GA6KKWG229B16K4Q38CH3BXS.png'
  const fallbackCredit = 'NASA, ESA, CSA, STScI'

  try {
    const images = await prisma.jWSTImage.findMany()
    if (images.length > 0) {
      const index = getDailyImageIndex(images.length)
      const selected = images[index]
      imageUrl = selected.imageUrl
      credit = selected.credit
    } else {
      imageUrl = fallbackUrl
      credit = fallbackCredit
    }
  } catch {
    // Fallback if DB not available
    imageUrl = fallbackUrl
    credit = fallbackCredit
  }

  const overlayIntensity = variant === 'hero'
    ? 'from-[var(--background)]/30 via-[var(--background)]/70 to-[var(--background)]'
    : 'from-[var(--background)]/60 via-[var(--background)]/85 to-[var(--background)]'

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <Image
        src={imageUrl}
        alt="JWST Space Image"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />
      {/* Gradient overlay for readability */}
      <div className={`absolute inset-0 bg-gradient-to-b ${overlayIntensity}`} />

      {/* Credit line */}
      <div className="absolute bottom-2 right-2 text-xs text-[var(--foreground-subtle)]/50">
        Image: {credit}
      </div>
    </div>
  )
}

// Client component version that doesn't fetch from DB
export function JWSTBackgroundClient({
  imageUrl,
  credit,
  variant = 'hero'
}: {
  imageUrl: string
  credit: string
  variant?: 'hero' | 'subtle'
}) {
  const overlayIntensity = variant === 'hero'
    ? 'from-[var(--background)]/30 via-[var(--background)]/70 to-[var(--background)]'
    : 'from-[var(--background)]/60 via-[var(--background)]/85 to-[var(--background)]'

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src={imageUrl}
        alt="JWST Space Image"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlayIntensity}`} />
      <div className="absolute bottom-2 right-2 text-xs text-[var(--foreground-subtle)]/50">
        Image: {credit}
      </div>
    </div>
  )
}
