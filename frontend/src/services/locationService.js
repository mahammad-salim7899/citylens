// ─────────────────────────────────────────────────────────────
// locationService.js — REAL, not mocked.
//
//   image → read EXIF → GPS lat/long? → reverse geocode → address
//
// If the photo has no GPS, the UI offers the device's location and
// marks it location_source: "device_gps". Coordinates are never
// invented or guessed from the picture's contents.
// ─────────────────────────────────────────────────────────────

import exifr from 'exifr'
import { MOCK_MODE, apiGet } from './api'

export async function readExifGps(file) {
  try {
    const gps = await exifr.gps(file)
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      return { latitude: gps.latitude, longitude: gps.longitude }
    }
  } catch {
    // No/invalid EXIF — normal for screenshots, WhatsApp images, edited photos.
  }
  return null
}

// Build a short, citizen-friendly address from Nominatim's parts:
// "Kottara, Mangaluru, Karnataka" instead of a 9-part string.
function readableAddress(data) {
  const a = data?.address || {}
  const locality = a.suburb || a.neighbourhood || a.quarter || a.village || a.hamlet || a.road
  const city = a.city || a.town || a.municipality || a.county || a.state_district
  const parts = [locality, city, a.state].filter(Boolean)
  const unique = parts.filter((p, i) => parts.indexOf(p) === i)
  return unique.length ? unique.join(', ') : data?.display_name || null
}

async function nominatimReverse(latitude, longitude) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 7000)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&accept-language=en`,
      { headers: { Accept: 'application/json' }, signal: ctrl.signal }
    )
    if (!res.ok) return null
    const data = await res.json()
    return { address: readableAddress(data), address_full: data?.display_name || null }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function reverseGeocode(latitude, longitude) {
  let result = null
  if (MOCK_MODE) {
    result = await nominatimReverse(latitude, longitude)
  } else {
    try {
      result = await apiGet(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`)
    } catch {
      result = await nominatimReverse(latitude, longitude)
    }
  }
  if (result?.address) return result
  // Offline / lookup failed: we still have exact coordinates for the
  // map and the authority; we just can't name the place.
  return { address: 'Address lookup unavailable — exact position saved', address_full: null }
}

export function getDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const msg = err.code === 1
          ? 'Location permission was denied. Allow location access in your browser and try again.'
          : 'Could not get your current location. Please try again.'
        reject(new Error(msg))
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  })
}

export async function resolveLocationFromImage(file) {
  const gps = await readExifGps(file)
  if (!gps) return null
  const geo = await reverseGeocode(gps.latitude, gps.longitude)
  return { ...gps, ...geo, location_source: 'image_exif' }
}

export async function resolveLocationFromDevice() {
  const gps = await getDeviceLocation()
  const geo = await reverseGeocode(gps.latitude, gps.longitude)
  return { latitude: gps.latitude, longitude: gps.longitude, ...geo, location_source: 'device_gps' }
}
