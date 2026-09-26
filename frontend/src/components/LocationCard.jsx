import React, { useState } from 'react'
import { MapPin, CheckCircle2, AlertCircle, LocateFixed, ChevronDown, Map as MapIcon } from 'lucide-react'
import Button from './Button'
import MapView from './MapView'

export default function LocationCard({ location, onUseDeviceLocation, resolving, onConfirm, confirmed, error }) {
  const [showMap, setShowMap] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!location) {
    return (
      <div className="animate-fade-up rounded-2xl border border-ink-300/60 bg-white p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-signal-amber" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold text-ink-900">Location information unavailable</h3>
            <p className="mt-1 text-sm text-ink-500">This image does not contain GPS location information.</p>
            <Button className="mt-4" variant="secondary" icon={LocateFixed} onClick={onUseDeviceLocation} loading={resolving}>
              {resolving ? 'Getting your location…' : 'Use Current Device Location'}
            </Button>
            {error && <p className="mt-3 text-sm text-signal-red" role="alert">{error}</p>}
            <p className="mt-3 text-xs text-ink-400">
              Your browser will ask for permission. We only use it to place this report on the map.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const fromPhoto = location.location_source === 'image_exif'

  return (
    <div className="animate-fade-up rounded-2xl border border-ink-300/60 bg-white p-6">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-civic-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-ink-900">Location detected</h3>
          <p className="mt-1 text-base font-medium text-ink-900">{location.address}</p>
          <p className="mt-0.5 text-sm text-ink-500">
            {fromPhoto ? 'Location captured from your photo' : 'Location captured from your device (not from the photo)'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={MapIcon} onClick={() => setShowMap((v) => !v)} aria-expanded={showMap}>
              {showMap ? 'Hide map' : 'View on Map'}
            </Button>
            <Button variant={confirmed ? 'success' : 'primary'} size="sm" icon={CheckCircle2} onClick={onConfirm} disabled={confirmed}>
              {confirmed ? 'Location confirmed' : 'Confirm Location'}
            </Button>
          </div>

          {showMap && (
            <div className="mt-4">
              <MapView complaints={[{ id: 'preview', issue: null, latitude: location.latitude, longitude: location.longitude }]} height="h-48" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="focus-ring mt-4 flex items-center gap-1 rounded text-xs font-medium text-ink-400 hover:text-ink-600"
          >
            Advanced location details
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {showAdvanced && (
            <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-0.5 rounded-lg bg-ink-100 px-3 py-2 font-mono text-xs text-ink-600">
              <dt>latitude</dt><dd>{location.latitude.toFixed(6)}</dd>
              <dt>longitude</dt><dd>{location.longitude.toFixed(6)}</dd>
              <dt>location_source</dt><dd>{location.location_source}</dd>
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
