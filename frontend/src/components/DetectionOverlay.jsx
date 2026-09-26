import React, { useState } from 'react'
import { ISSUE_TYPES, issueLabel } from '../config/issueTypes'

/**
 * Draws YOLO boxes on top of an image.
 * bbox = [x1, y1, x2, y2] in the ORIGINAL image's pixel coordinates
 * (what Ultralytics returns as `xyxy`). The SVG uses the image's own
 * width/height as its viewBox, so boxes line up at any display size.
 */
export default function DetectionOverlay({
  src,
  alt = 'Reported issue',
  detections = [],
  imageWidth,
  imageHeight,
  showBoxes = true,
  maxHeight = 'max-h-[26rem]',
}) {
  const [natural, setNatural] = useState(null)
  const w = imageWidth || natural?.w
  const h = imageHeight || natural?.h
  const boxes = showBoxes && w && h ? detections.filter((d) => d.bbox) : []
  const fontSize = w ? Math.max(12, Math.round(w / 40)) : 14

  return (
    <div className="flex justify-center bg-ink-950">
      <div className="relative inline-block">
        <img
          src={src}
          alt={alt}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className={`block h-auto w-auto max-w-full ${maxHeight}`}
        />
        {boxes.length > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {boxes.map((d, i) => {
              const [x1, y1, x2, y2] = d.bbox
              const color = ISSUE_TYPES[d.issue]?.color || '#B91C1C'
              const label = `${issueLabel(d.issue)} · ${Math.round(d.confidence * 100)}%`
              const labelW = label.length * fontSize * 0.58 + fontSize
              const labelY = y1 - fontSize * 1.6 < 0 ? y1 : y1 - fontSize * 1.6
              return (
                <g key={i}>
                  <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={color} fillOpacity="0.08"
                    stroke={color} strokeWidth={Math.max(2, w / 250)} rx={w / 200} />
                  <rect x={x1} y={labelY} width={labelW} height={fontSize * 1.6} fill={color} rx={w / 300} />
                  <text x={x1 + fontSize * 0.5} y={labelY + fontSize * 1.15} fill="#fff"
                    fontSize={fontSize} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                    {label}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
