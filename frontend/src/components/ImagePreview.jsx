import React from 'react'
import { X, FileImage, RefreshCw } from 'lucide-react'
import { formatBytes } from '../lib/image'

export default function ImagePreview({ file, previewUrl, onRemove }) {
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-ink-300/60 bg-white">
      <div className="flex max-h-80 justify-center bg-ink-950">
        <img src={previewUrl} alt="Selected upload preview" className="max-h-80 w-auto max-w-full object-contain" />
      </div>
      <div className="flex items-center gap-3 p-4">
        <FileImage className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{file.name}</p>
          <p className="text-xs text-ink-500">{formatBytes(file.size)}</p>
        </div>
        <button type="button" onClick={onRemove}
          className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-600 hover:border-civic-500 hover:text-civic-700">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Change
        </button>
        <button type="button" onClick={onRemove} aria-label="Remove image"
          className="focus-ring shrink-0 rounded-lg border border-ink-300 p-2 text-ink-500 hover:border-signal-red hover:text-signal-red">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
