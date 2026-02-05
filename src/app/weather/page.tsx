import { cookies } from 'next/headers'
import { WeatherClient } from '@/components/weather/weather-client'

export const dynamic = 'force-dynamic'

export default async function WeatherPage() {
  const cookieStore = await cookies()
  const zip = cookieStore.get('weather_zip')?.value

  return (
    <section className="container-page py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">Weather & Sky</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Local forecast, moon phase, and space weather. ZIP code is remembered for next visit.
          </p>
        </div>

        <WeatherClient initialZip={zip} />
      </div>
    </section>
  )
}
