import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import StepIndicator from '../components/StepIndicator'
import UploadBox from '../components/UploadBox'
import ImagePreview from '../components/ImagePreview'
import LocationCard from '../components/LocationCard'
import Button from '../components/Button'
import { useToast } from '../components/Toast'
import { resolveLocationFromImage, resolveLocationFromDevice } from '../services/locationService'
import { prepareImage } from '../lib/image'
import { saveDraft, clearDraft } from '../lib/draft'

export default function ReportIssue() {
  const navigate = useNavigate()
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [prepared, setPrepared] = useState(null) // { dataUrl, width, height }
  const [location, setLocation] = useState(null)
  const [readingExif, setReadingExif] = useState(false)
  const [locationChecked, setLocationChecked] = useState(false)
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [resolvingDevice, setResolvingDevice] = useState(false)
  const [deviceError, setDeviceError] = useState(null)

  useEffect(() => { clearDraft() }, [])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const reset = () => {
    setFile(null); setPreviewUrl(null); setPrepared(null); setLocation(null)
    setLocationChecked(false); setLocationConfirmed(false); setDeviceError(null)
  }

  const handleFileSelected = async (f) => {
    reset()
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setReadingExif(true)
    // EXIF must be read from the original file, before downscaling.
    const [loc, img] = await Promise.all([
      resolveLocationFromImage(f),
      prepareImage(f).catch(() => null),
    ])
    setReadingExif(false)
    if (!img) {
      toast.show('We could not read that image. Please try a different photo.', 'error')
      reset()
      return
    }
    setPrepared(img)
    setLocation(loc)
    setLocationChecked(true)
    if (loc) toast.show('Location found in your photo.', 'success', 3000)
  }

  const handleUseDeviceLocation = async () => {
    setResolvingDevice(true)
    setDeviceError(null)
    try {
      setLocation(await resolveLocationFromDevice())
    } catch (e) {
      setDeviceError(e.message)
    } finally {
      setResolvingDevice(false)
    }
  }

  const handleAnalyze = () => {
    const draft = { image: { ...prepared, fileName: file.name }, location }
    saveDraft(draft)
    navigate('/report/analyze', { state: draft })
  }

  const canAnalyze = Boolean(prepared && location && locationConfirmed)
  const hint = !file ? null
    : readingExif ? null
    : !location ? 'Add your location to continue.'
    : !locationConfirmed ? 'Confirm the location to continue.'
    : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <StepIndicator current={1} />

      <h1 className="mt-8 font-display text-3xl font-bold tracking-tight text-ink-900">Report a civic issue</h1>
      <p className="mt-2 text-ink-500">Capture a photo of the problem or upload an existing image.</p>

      <div className="mt-8 space-y-5">
        {!file && <UploadBox onFileSelected={handleFileSelected} onError={(m) => toast.show(m, 'error')} />}

        {file && previewUrl && <ImagePreview file={file} previewUrl={previewUrl} onRemove={reset} />}

        {file && readingExif && (
          <div className="flex items-center gap-2 rounded-2xl border border-ink-300/60 bg-white p-5 text-sm text-ink-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reading location from your photo…
          </div>
        )}

        {file && locationChecked && (
          <LocationCard
            location={location}
            resolving={resolvingDevice}
            error={deviceError}
            onUseDeviceLocation={handleUseDeviceLocation}
            confirmed={locationConfirmed}
            onConfirm={() => setLocationConfirmed(true)}
          />
        )}

        {file && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Button size="lg" className="w-full sm:w-auto" icon={ArrowRight} iconPosition="right" disabled={!canAnalyze} onClick={handleAnalyze}>
              Analyze Image
            </Button>
            {hint && <p className="text-sm text-ink-500">{hint}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
