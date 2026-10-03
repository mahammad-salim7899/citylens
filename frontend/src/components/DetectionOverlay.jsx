import React, { useState } from 'react'
import { ISSUE_TYPES, issueLabel } from '../config/issueTypes'

/**
 * Draws YOLO boxes on top of an image.
 * bbox = [x1, y1, x2, y2] in the ORIGINAL image's pixel coordinates
 * (what Ultralytics returns as `xyxy`). The SVG uses the image's own
 * width/height as its viewBox, so boxes line up at any display size.
 */
/**
 * animate: draw each box's outline, then fade its label in — the "AI
 *          found it" moment. `delay` (ms) shifts the whole sequence.
 *
 * When a detection carries a `polygon` (instance mask from a segmentation
 * model), the mask is drawn filled and outlined, and the box becomes a
 * thin dashed guide — the mask is what severity was measured from.
 *
 * `signs` (parking signs read by OCR / the no-parking symbol) are drawn as
 * dashed amber boxes labelled with what was read, after the detections.
 */
export default function DetectionOverlay({
  src,
  alt = 'Reported issue',
  detections = [],
  signs = [],
  imageWidth,
  imageHeight,
  showBoxes = true,
  maxHeight = 'max-h-[26rem]',
  animate = true,
  delay = 0,
}) {
  const [natural, setNatural] = useState(null)
  const w = imageWidth || natural?.w
  const h = imageHeight || natural?.h
  const boxes = showBoxes && w && h ? detections.filter((d) => d.bbox) : []
  const signBoxes = showBoxes && w && h ? signs.filter((s) => s.bbox) : []
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
        {(boxes.length > 0 || signBoxes.length > 0) && (
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
              const t = delay + i * 180 // each box starts a little after the previous one
              const stroke = Math.max(2, w / 250)
              const points = d.polygon ? d.polygon.map(([px, py]) => `${px},${py}`).join(' ') : null
              return (
                <g key={i}>
                  {points ? (
                    <>
                      {/* segmentation mask: filled shape + outline that draws itself */}
                      <polygon points={points} fill={color} fillOpacity="0.28"
                        className={animate ? 'animate-fade-in' : undefined} style={{ '--d': `${t + 450}ms` }} />
                      <polygon points={points} fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round"
                        pathLength="1" className={animate ? 'svg-draw' : undefined} style={{ '--d': `${t + 150}ms` }} />
                      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="none"
                        stroke={color} strokeOpacity="0.55" strokeWidth={stroke * 0.6} strokeDasharray={`${stroke * 3} ${stroke * 2}`}
                        rx={w / 200} className={animate ? 'animate-fade-in' : undefined} style={{ '--d': `${t}ms` }} />
                    </>
                  ) : (
                    <>
                      {/* tinted fill fades in, outline draws itself around the object */}
                      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={color} fillOpacity="0.08"
                        rx={w / 200} className={animate ? 'animate-fade-in' : undefined} style={{ '--d': `${t + 500}ms` }} />
                      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="none"
                        stroke={color} strokeWidth={stroke} rx={w / 200}
                        pathLength="1" className={animate ? 'svg-draw' : undefined} style={{ '--d': `${t}ms` }} />
                    </>
                  )}
                  <g className={animate ? 'animate-fade-in' : undefined} style={{ '--d': `${t + 650}ms` }}>
                    <rect x={x1} y={labelY} width={labelW} height={fontSize * 1.6} fill={color} rx={w / 300} />
                    <text x={x1 + fontSize * 0.5} y={labelY + fontSize * 1.15} fill="#fff"
                      fontSize={fontSize} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                      {label}
                    </text>
                  </g>
                </g>
              )
            })}
            {signBoxes.map((s, i) => {
              const [x1, y1, x2, y2] = s.bbox
              const color = s.kind === 'no_parking' ? '#B45309' : '#047857' // amber = no parking, green = allowed
              const label = s.source === 'symbol' ? 'No-parking sign' : `Sign: ${s.text}`
              const labelW = label.length * fontSize * 0.58 + fontSize
              const labelY = y2 + fontSize * 1.6 > h ? y1 - fontSize * 1.6 : y2 // below the sign, unless off-image
              const t = delay + (boxes.length + i) * 180
              const stroke = Math.max(2, w / 250)
              return (
                <g key={`sign-${i}`}>
                  <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="none" stroke={color}
                    strokeWidth={stroke} strokeDasharray={`${stroke * 3} ${stroke * 2}`} rx={w / 200}
                    className={animate ? 'animate-fade-in' : undefined} style={{ '--d': `${t}ms` }} />
                  <g className={animate ? 'animate-fade-in' : undefined} style={{ '--d': `${t + 300}ms` }}>
                    <rect x={x1} y={Math.max(0, labelY)} width={labelW} height={fontSize * 1.6} fill={color} rx={w / 300} />
                    <text x={x1 + fontSize * 0.5} y={Math.max(0, labelY) + fontSize * 1.15} fill="#fff"
                      fontSize={fontSize} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                      {label}
                    </text>
                  </g>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
