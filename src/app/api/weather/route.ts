import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ZIP = '10001'
const WEATHER_TIMEZONE = process.env.NEWS_TIMEZONE || 'America/New_York'

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

    const [weather, astronomy, spaceWeather] = await Promise.all([
      fetchWeather(location.latitude, location.longitude),
      fetchAstronomy(location.latitude, location.longitude),
      fetchSpaceWeather().catch(() => [])
    ])

    const batchTime = new Date()

    const response = NextResponse.json({
      location,
      current: weather.current_weather,
      daily: weather.daily,
      astronomy,
      spaceWeather,
      tropicalConfig: null,
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
