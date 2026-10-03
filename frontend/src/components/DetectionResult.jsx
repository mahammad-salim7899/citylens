import React from 'react'
import { SearchX } from 'lucide-react'
import SeverityBadge from './SeverityBadge'
import DetectionOverlay from './DetectionOverlay'
import { issueLabel } from '../config/issueTypes'
import { percent } from '../lib/format'

/**
 * result = normalized detection from detectionService
 * finalIssue = issue after citizen confirmation / correction
 */
export default function DetectionResult({ image, result, finalIssue }) {
  const corrected = finalIssue && result.issue && finalIssue !== result.issue
  const nothingFound = !result.issue

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-300/60 bg-white">
      <DetectionOverlay
        src={image}
        alt="Your report photo"
        detections={result.detections}
        signs={result.signs}
        imageWidth={result.imageWidth}
        imageHeight={result.imageHeight}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        {nothingFound ? (
          <div className="flex items-start gap-3">
            <SearchX className="mt-1 h-5 w-5 shrink-0 text-signal-amber" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">No supported issue detected</p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink-900">Please choose the issue yourself</h3>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              {corrected ? 'Issue (corrected by you)' : 'Issue detected'}
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-ink-900">{issueLabel(finalIssue || result.issue)}</h3>
            {corrected && (
              <p className="mt-1 text-sm text-ink-500">
                AI suggested {issueLabel(result.issue)} ({percent(result.confidence)})
              </p>
            )}
          </div>
        )}

        {!nothingFound && (
          <div className="flex items-center gap-4">
            {!corrected && (
              <div className="text-right">
                <p className="text-xs font-medium text-ink-400">Confidence</p>
                <p className="font-display text-lg font-bold text-civic-800">{percent(result.confidence)}</p>
              </div>
            )}
            <SeverityBadge severity={result.severity} />
          </div>
        )}
      </div>

      {result.note && nothingFound && (
        <p className="border-t border-ink-200 bg-signal-amberLight/40 px-5 py-3 text-sm text-ink-700">
          <span className="font-medium text-ink-900">What we saw:</span> {result.note}
        </p>
      )}

      {result.severityReason && !nothingFound && (
        <p className="border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
          <span className="font-medium text-ink-700">Why this severity:</span> {result.severityReason}
        </p>
      )}
    </div>
  )
}
