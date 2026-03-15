import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { WeatherClient } from '@/components/weather/weather-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Weather & Sky | URA Pages',
  description: 'Local weather forecast, moon phase, planetary positions, and space weather alerts. Updated in real-time by ZIP code.',
  openGraph: {
    title: 'Weather & Sky | URA Pages',
    description: 'Local weather forecast, moon phase, planetary positions, and space weather alerts.',
    type: 'website',
  },
}

const WEATHER_MAP: Record<number, string> = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Freezing fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
}

async function getDefaultWeather(zip: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/weather?zip=${zip}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function WeatherPage() {
  const cookieStore = await cookies()
  const zip = cookieStore.get('weather_zip')?.value || '10001'
  const data = await getDefaultWeather(zip)

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

        {/* Server-rendered weather summary for crawlers */}
        {data && (
          <noscript>
            <div className="card p-4">
              <h2 className="text-lg font-semibold">
                Current Weather — {data.location?.city}, {data.location?.state}
              </h2>
              <p>{Math.round(data.current?.temperature)}°F · {WEATHER_MAP[data.current?.weathercode] || 'N/A'} · Wind {Math.round(data.current?.windspeed)} mph</p>
              {data.daily && (
                <div>
                  <h3 className="mt-4 font-semibold">10-Day Forecast</h3>
                  <ul>
                    {data.daily.time?.map((date: string, i: number) => (
                      <li key={date}>
                        {date}: High {Math.round(data.daily.temperature_2m_max[i])}°F / Low {Math.round(data.daily.temperature_2m_min[i])}°F — {WEATHER_MAP[data.daily.weathercode[i]] || 'N/A'}, Precip {data.daily.precipitation_probability_max[i] ?? 0}%
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </noscript>
        )}

        {/* Static summary visible to all (including crawlers) */}
        {data && (
          <div className="sr-only" aria-hidden="false">
            <h2>Current Weather for {data.location?.city}, {data.location?.state}</h2>
            <p>Temperature: {Math.round(data.current?.temperature)}°F. Conditions: {WEATHER_MAP[data.current?.weathercode] || 'N/A'}. Wind: {Math.round(data.current?.windspeed)} mph.</p>
            {data.daily?.time?.map((date: string, i: number) => (
              <p key={date}>
                {date}: High {Math.round(data.daily.temperature_2m_max[i])}°F, Low {Math.round(data.daily.temperature_2m_min[i])}°F. {WEATHER_MAP[data.daily.weathercode[i]] || 'N/A'}. Precipitation chance: {data.daily.precipitation_probability_max[i] ?? 0}%.
              </p>
            ))}
          </div>
        )}

        <WeatherClient initialZip={zip} initialData={data} />
      </div>
    </section>
  )
}
