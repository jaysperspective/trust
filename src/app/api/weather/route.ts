import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ZIP = '10001'
const WEATHER_TIMEZONE = process.env.NEWS_TIMEZONE || 'America/New_York'
const ASTRO_SERVICE_URL = process.env.ASTRO_SERVICE_URL || 'http://127.0.0.1:3002'

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

function lonToZodiac(lon: number) {
  const signIndex = Math.floor(lon / 30) % 12
  return { sign: ZODIAC_SIGNS[signIndex], degree: lon % 30 }
}

export const dynamic = 'force-dynamic'

type ZipResult = {
  places: { 'place name': string; state: string; latitude: string; longitude: string }[]
}

function formatError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

async function geocodeZip(zip: string) {
  const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ZIP lookup failed (status ${res.status})`)
  const data = (await res.json()) as ZipResult
  const place = data.places?.[0]
  if (!place) throw new Error('ZIP lookup had no places')
  return {
    city: place['place name'],
    state: place.state,
    latitude: parseFloat(place.latitude),
    longitude: parseFloat(place.longitude)
  }
}

async function fetchWeather(lat: number, lon: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current_weather', 'true')
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('windspeed_unit', 'mph')
  url.searchParams.set('precipitation_unit', 'inch')
  url.searchParams.set('forecast_days', '10')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('daily', [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_probability_max',
    'weathercode'
  ].join(','))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`Weather fetch failed (status ${res.status})`)
  return res.json()
}

async function fetchAstronomy(lat: number, lon: number) {
  const url = new URL('https://api.open-meteo.com/v1/astronomy')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('daily', ['moon_phase', 'moonrise', 'moonset'].join(','))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`Astronomy fetch failed (status ${res.status})`)
  return res.json()
}

async function fetchSpaceWeather() {
  const res = await fetch('https://services.swpc.noaa.gov/products/alerts.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Space weather fetch failed (status ${res.status})`)
  const alerts = await res.json()
  return Array.isArray(alerts) ? alerts.slice(0, 5) : []
}

async function fetchTropicalPositions(lat: number, lon: number) {
  const now = new Date()
  const res = await fetch(`${ASTRO_SERVICE_URL}/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      latitude: lat,
      longitude: lon,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) throw new Error(`Astro service responded ${res.status}`)
  const json = await res.json()
  if (!json.ok || !json.data?.planets) throw new Error('Invalid astro service response')

  const DISPLAY_BODIES: [string, string][] = [
    ['sun', 'Sun'], ['moon', 'Moon'], ['mercury', 'Mercury'],
    ['venus', 'Venus'], ['mars', 'Mars'], ['jupiter', 'Jupiter'],
    ['saturn', 'Saturn'], ['uranus', 'Uranus'], ['neptune', 'Neptune'],
    ['pluto', 'Pluto'], ['chiron', 'Chiron'], ['northNode', 'North Node'],
  ]

  return DISPLAY_BODIES
    .filter(([key]) => json.data.planets[key])
    .map(([key, label]) => {
      const { sign, degree } = lonToZodiac(json.data.planets[key].lon)
      return { body: label, sign, degree }
    })
}

async function fetchWeatherNews() {
  const res = await fetch('https://api.weather.gov/alerts/active', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Weather news fetch failed (status ${res.status})`)
  const data = await res.json()
  if (!data?.features) return []
  return data.features.slice(0, 5).map((f: any) => ({
    title: f.properties?.headline || 'Weather alert',
    url: f.properties?.uri || '',
    source: f.properties?.senderName || 'weather.gov',
    publishedAt: f.properties?.sent
  }))
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const zip = url.searchParams.get('zip')
    || request.cookies.get('weather_zip')?.value
    || DEFAULT_ZIP

  if (!zip || !/^[0-9]{5}$/.test(zip)) {
    return formatError('Invalid or missing ZIP code')
  }

  try {
    const location = await geocodeZip(zip)

    const weatherPromise = fetchWeather(location.latitude, location.longitude)
    const astronomyPromise = fetchAstronomy(location.latitude, location.longitude).catch((err) => {
      console.error('Astronomy fetch failed', err)
      return null
    })
    const newsPromise = fetchWeatherNews().catch((err) => {
      console.error('Weather news fetch failed', err)
      return []
    })
    const astroPromise = fetchTropicalPositions(location.latitude, location.longitude).catch((err) => {
      console.error('Astro service fetch failed', err)
      return null
    })

    const [weather, astronomy, weatherNews, tropicalConfig] = await Promise.all([
      weatherPromise,
      astronomyPromise,
      newsPromise,
      astroPromise
    ])

    const batchTime = new Date()

    const response = NextResponse.json({
      location,
      current: weather.current_weather,
      daily: weather.daily,
      astronomy,
      weatherNews,
      tropicalConfig,
      batchTime,
      timezone: WEATHER_TIMEZONE,
    })

    response.cookies.set('weather_zip', zip, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Weather API error', message)
    return formatError(message, 500)
  }
}
