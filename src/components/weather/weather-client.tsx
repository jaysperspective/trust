'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDateTimeTz } from '@/lib/utils'

type Daily = {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_probability_max: number[]
  weathercode: number[]
}

type WeatherResponse = {
  location: { city: string; state: string }
  current: { temperature: number; windspeed: number; weathercode: number }
  daily: Daily
  astronomy: { daily?: { time: string[]; moon_phase: number[] } } | null
  spaceWeather: unknown[]
  weatherNews?: { title: string; url: string; source: string; publishedAt?: string }[]
  tropicalConfig: null | { body: string; sign: string; degree: number }[]
  batchTime: string
  timezone: string
}

const WEATHER_MAP: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Heavy showers',
}

function moonPhaseName(value: number | undefined) {
  if (value === undefined) return '—'
  const phases = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent'
  ]
  const index = Math.round((value / 360) * 7) % 8
  return phases[index]
}

export function WeatherClient({ initialZip }: { initialZip?: string }) {
  const [zip, setZip] = useState(initialZip || '')
  const [data, setData] = useState<WeatherResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (z: string) => {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(`/api/weather?zip=${encodeURIComponent(z)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      const json = await res.json()
      setData(json)
      setStatus('idle')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to load weather')
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('weather_zip')
    const effective = saved || zip || '10001'
    setZip(effective)
    fetchData(effective)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (zip) {
      localStorage.setItem('weather_zip', zip)
    }
  }, [zip])

  const forecast = useMemo(() => {
    if (!data?.daily) return []
    const days = data.daily.time.length
    const entries = []
    for (let i = 0; i < days; i++) {
      entries.push({
        date: data.daily.time[i],
        high: data.daily.temperature_2m_max[i],
        low: data.daily.temperature_2m_min[i],
        precip: data.daily.precipitation_probability_max[i],
        weather: WEATHER_MAP[data.daily.weathercode[i]] || '—'
      })
    }
    return entries
  }, [data])

  const moonPhase = data?.astronomy?.daily?.moon_phase?.[0]
  const moonSign = data?.tropicalConfig?.find(p => p.body === 'Moon')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP code"
          className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
        />
        <button
          onClick={() => fetchData(zip)}
          className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--bg-base)] text-sm font-semibold disabled:opacity-60"
          disabled={status === 'loading' || !zip}
        >
          {status === 'loading' ? 'Loading...' : 'Update'}
        </button>
        {data?.batchTime && (
          <span className="text-meta text-sm">
            Refreshed {formatDateTimeTz(data.batchTime, data.timezone)}
          </span>
        )}
      </div>

      {error && (
        <div className="text-sm text-[var(--status-warning)]">{error}</div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-meta">Location</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {data.location.city}, {data.location.state}
              </p>
            </div>
            <div>
              <p className="text-sm text-meta">Current</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {Math.round(data.current.temperature)}°F · {WEATHER_MAP[data.current.weathercode] || '—'}
              </p>
              <p className="text-meta text-sm">Wind {Math.round(data.current.windspeed)} mph</p>
            </div>
            <div>
              <p className="text-sm text-meta">Moon</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {moonPhase !== undefined ? moonPhaseName(moonPhase) : 'Unavailable'}
              </p>
              {moonSign && (
                <p className="text-meta text-sm">
                  {moonSign.sign} {moonSign.degree.toFixed(0)}°
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-wider text-meta mb-2">10-day forecast</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {forecast.map((day) => (
                <div key={day.date} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{day.date}</p>
                    <p className="text-meta text-sm">{day.weather}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{Math.round(day.high)}° / {Math.round(day.low)}°F</p>
                    <p className="text-meta text-xs">Precip {day.precip ?? 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm uppercase tracking-wider text-meta mb-2">Astrology (Tropical)</h3>
            {Array.isArray(data.tropicalConfig) && data.tropicalConfig.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.tropicalConfig.map((p) => (
                  <div key={p.body} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-primary)]">{p.body}</span>
                    <span className="text-meta">{p.sign} {p.degree.toFixed(1)}°</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-meta text-sm">
                Planet positions unavailable. Configure an astrology API to enable.
              </p>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-sm uppercase tracking-wider text-meta mb-2">Weather News</h3>
            {Array.isArray(data.weatherNews) && data.weatherNews.length > 0 ? (
              <ul className="space-y-2">
                {data.weatherNews.map((story, idx) => (
                  <li key={idx} className="text-sm">
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-primary)] hover:underline"
                    >
                      {story.title}
                    </a>
                    <span className="text-meta ml-2">
                      {story.source}{story.publishedAt ? ` • ${story.publishedAt}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sm">No weather headlines right now.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
