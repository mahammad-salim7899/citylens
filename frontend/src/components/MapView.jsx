import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { WifiOff } from 'lucide-react'
import { ISSUE_TYPES, issueLabel } from '../config/issueTypes'

// Free OpenStreetMap tiles — no API key, no paid service.
// If tiles can't load (no internet), a schematic fallback still shows
// each marker at its correct relative position.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const pinSvg = (color, big) => `
  <svg width="${big ? 34 : 28}" height="${big ? 44 : 36}" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 35s11-11.2 11-20A11 11 0 0 0 3 15c0 8.8 11 20 11 20z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14.5" r="4.2" fill="#fff"/>
  </svg>`

const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function SchematicFallback({ points, selectedId }) {
  const lats = points.map((c) => c.latitude)
  const lngs = points.map((c) => c.longitude)
  const pad = 0.006
  const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad
  const minLng = Math.min(...lngs) - pad, maxLng = Math.max(...lngs) + pad
  return (
    <div className="absolute inset-0 z-[500] bg-civic-900">
      <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={`${(i / 8) * 100}%`} y1="0" x2={`${(i / 8) * 100}%`} y2="100%" stroke="#A3AEE6" />)}
        {Array.from({ length: 7 }).map((_, i) => <line key={`h${i}`} x1="0" y1={`${(i / 6) * 100}%`} x2="100%" y2={`${(i / 6) * 100}%`} stroke="#A3AEE6" />)}
      </svg>
      {points.map((c) => {
        const x = ((c.longitude - minLng) / (maxLng - minLng)) * 100
        const y = 100 - ((c.latitude - minLat) / (maxLat - minLat)) * 100
        return (
          <span key={c.id} title={c.address || c.id} className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${x}%`, top: `${y}%` }}
            dangerouslySetInnerHTML={{ __html: pinSvg(ISSUE_TYPES[c.issue]?.color || '#28348A', c.id === selectedId) }} />
        )
      })}
      <p className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-civic-950/80 px-2 py-1 text-[11px] text-civic-100">
        <WifiOff className="h-3 w-3" aria-hidden="true" /> Map tiles need internet — showing positions only
      </p>
    </div>
  )
}

/**
 * complaints: [{ id, issue, latitude, longitude, address? }]
 * linkFor(c): optional URL for a "View details" link in each popup
 */
export default function MapView({ complaints = [], height = 'h-64', zoom = 16, linkFor, selectedId, showLegend = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [offline, setOffline] = useState(false)

  const points = useMemo(
    () => complaints.filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude)),
    [complaints]
  )
  const pointsKey = points.map((p) => `${p.id}:${p.latitude}:${p.longitude}:${p.issue}`).join('|')

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: true })
    let loaded = false
    let errors = 0
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION })
    tiles.on('tileload', () => { loaded = true; setOffline(false) })
    tiles.on('tileerror', () => { errors += 1; if (!loaded && errors >= 3) setOffline(true) })
    tiles.addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    map.setView([12.87, 74.84], 13)
    const t = setTimeout(() => map.invalidateSize(), 0)
    return () => { clearTimeout(t); map.remove(); mapRef.current = null }
  }, [])

  // Sync markers.
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    points.forEach((c) => {
      const color = ISSUE_TYPES[c.issue]?.color || '#28348A'
      const big = c.id === selectedId || points.length === 1
      const icon = L.divIcon({
        html: pinSvg(color, big),
        className: 'citylens-pin',
        iconSize: big ? [34, 44] : [28, 36],
        iconAnchor: big ? [17, 43] : [14, 35],
        popupAnchor: [0, -36],
      })
      const marker = L.marker([c.latitude, c.longitude], { icon, keyboard: true, title: c.address || c.id })
      if (c.id && c.id !== 'preview') {
        const link = linkFor ? `<a href="${escapeHtml(linkFor(c))}" class="citylens-popup-link">View details →</a>` : ''
        marker.bindPopup(
          `<div class="citylens-popup"><strong>${escapeHtml(c.id)}</strong><br/>${escapeHtml(issueLabel(c.issue))}` +
          `${c.address ? `<br/><span>${escapeHtml(c.address)}</span>` : ''}${link}</div>`
        )
      }
      marker.addTo(layer)
    })
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], zoom)
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), { padding: [36, 36], maxZoom: 16 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, selectedId, zoom])

  return (
    <div>
      <div className={`relative isolate ${height} overflow-hidden rounded-xl border border-ink-300/60 bg-ink-100`}>
        <div ref={containerRef} className="h-full w-full" role="region" aria-label="Map of reported locations" />
        {points.length === 0 && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-ink-100 text-sm text-ink-500">No locations to display</div>
        )}
        {offline && points.length > 0 && <SchematicFallback points={points} selectedId={selectedId} />}
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-500">
          {Object.values(ISSUE_TYPES).map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" /> {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
