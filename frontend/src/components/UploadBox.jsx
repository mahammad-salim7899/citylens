import React, { useRef, useState } from 'react'
import { Camera, UploadCloud, ImageUp } from 'lucide-react'
import Button from './Button'
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from '../lib/image'

/**
 * Capture Photo uses the browser's native camera input
 * (`capture="environment"`): on phones it opens the rear camera
 * directly; on laptops it falls back to a file picker. A live
 * in-page camera (getUserMedia) can replace it later without
 * changing the onFileSelected contract.
 */
export default function UploadBox({ onFileSelected, onError }) {
  const uploadRef = useRef(null)
  const cameraRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files) => {
    const file = files?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError?.('Please choose a JPG, JPEG or PNG image.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      onError?.('That image is larger than 15 MB. Please choose a smaller photo.')
      return
    }
    onFileSelected(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      // Ignore dragleave events fired when moving between child elements.
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
      className={`group flex animate-scale-in flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-[border-color,background-color,box-shadow] duration-300 sm:py-14 ${
        dragOver ? 'border-civic-600 bg-civic-50 shadow-[0_0_0_6px_rgba(53,72,180,0.08)]' : 'border-ink-300 bg-white hover:border-civic-300'
      }`}
      style={{ '--d': '80ms' }}
    >
      <div className="relative">
        {/* A slow halo that grows while a file is dragged over. */}
        <span className={`absolute inset-0 rounded-full bg-civic-200 transition-[transform,opacity] duration-500 ease-out-expo ${dragOver ? 'scale-[1.6] opacity-60' : 'scale-100 opacity-0'}`} aria-hidden="true" />
        <div className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-civic-100 text-civic-700 transition-transform duration-500 ease-out-expo ${dragOver ? '-translate-y-1.5 scale-110' : 'animate-float'}`}>
          <ImageUp className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 font-display text-base font-semibold text-ink-900">
        <span className="sm:hidden">Take or choose a photo</span>
        <span className="hidden sm:inline">{dragOver ? 'Drop it — we’ll take it from here' : 'Drag and drop a photo here'}</span>
      </p>
      <p className="mt-1 text-sm text-ink-500">JPG, JPEG or PNG · up to 15 MB</p>

      <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
        <Button variant="primary" icon={Camera} onClick={() => cameraRef.current?.click()}>Capture Photo</Button>
        <Button variant="secondary" icon={UploadCloud} onClick={() => uploadRef.current?.click()}>Upload Image</Button>
      </div>

      <input ref={cameraRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden"
        aria-label="Capture photo with camera" onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
      <input ref={uploadRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
        aria-label="Upload image" onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
    </div>
  )
}
