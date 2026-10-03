// ─────────────────────────────────────────────────────────────
// detectionService.js
//
// REAL MODE:  POST /api/detect   (multipart: image)
//   React → FastAPI → OpenCV preprocessing → YOLO → severity engine
//   → department routing → JSON (see backend/app/main.py)
//
//   The Garbage Dumping model is your trained weights at
//   runs/detect/citylens_garbage-2/weights/best.pt — it runs on the
//   backend, never in the browser.
//
// MOCK MODE:  mockDetectImage() returns a SIMULATED response with
//   the same shape, flagged `mock: true`. The UI shows a visible
//   "Demo mode" notice whenever a result is simulated.
// ─────────────────────────────────────────────────────────────

import { apiPostForm, isMockMode, wait } from './api'
import { ISSUE_TYPES, isSupportedIssue, normalizeIssueId } from '../config/issueTypes'
import { dataUrlToBlob } from '../lib/image'

const SEVERITIES = ['Low', 'Medium', 'High']

/**
 * Convert any backend/mock response into the one shape the UI uses:
 * {
 *   issue, label, confidence, severity, severityReason,
 *   detections: [{ issue, className, confidence, bbox:[x1,y1,x2,y2],
 *                  polygon:[[x,y],…]|null,   // instance mask (segmentation models)
 *                  footpath:0–1|null }],     // vehicles: share of ground contact on sidewalk
 *   signs: [{ kind: 'no_parking'|'parking_allowed', text, source: 'ocr'|'symbol', bbox, confidence }],
 *   noParkingSign: 'NO PARKING' | null,
 *   imageWidth, imageHeight, source: 'mock' | 'model', model
 * }
 * `issue` is null when nothing supported was found.
 */
export function normalizeDetection(raw = {}, fallbackSize = {}) {
  const detections = (raw.detections || [])
    .map((d) => ({
      issue: normalizeIssueId(d.issue || d.class || d.class_name || d.name),
      className: d.class || d.class_name || d.name || d.issue,
      confidence: Number(d.confidence ?? d.conf ?? 0),
      bbox: Array.isArray(d.bbox) && d.bbox.length === 4 ? d.bbox.map(Number) : null,
      polygon: Array.isArray(d.polygon) && d.polygon.length >= 3 ? d.polygon : null,
      footpath: typeof d.footpath === 'number' ? d.footpath : null,
    }))
    .filter((d) => d.bbox)

  let issue = normalizeIssueId(raw.issue)
  if (!issue && detections.length) {
    issue = [...detections].sort((a, b) => b.confidence - a.confidence)[0].issue
  }
  if (!isSupportedIssue(issue)) issue = null

  const confidence = typeof raw.confidence === 'number'
    ? raw.confidence
    : detections.filter((d) => d.issue === issue).reduce((m, d) => Math.max(m, d.confidence), 0) || null

  return {
    issue,
    label: issue ? ISSUE_TYPES[issue].label : null,
    confidence: issue ? confidence : null,
    severity: SEVERITIES.includes(raw.severity) ? raw.severity : null,
    severityReason: raw.severity_reason || null,
    // Why nothing was reported when something was seen (e.g. legally parked cars).
    note: raw.note || null,
    // Parking signs read in the photo (OCR text or the no-parking symbol).
    signs: (raw.signs || [])
      .filter((s) => Array.isArray(s.bbox) && s.bbox.length === 4)
      .map((s) => ({ kind: s.kind, text: s.text, source: s.source, bbox: s.bbox.map(Number), confidence: Number(s.confidence || 0) })),
    noParkingSign: raw.no_parking_sign || null,
    detections,
    imageWidth: raw.image_width || fallbackSize.width || null,
    imageHeight: raw.image_height || fallbackSize.height || null,
    source: raw.mock ? 'mock' : 'model',
    model: raw.model || null,
  }
}

// ── MOCK (simulated) ─────────────────────────────────────────────
// Fixed, reproducible results so a demo behaves the same every time.
// The issue is guessed from the FILE NAME only (e.g. "pothole.jpg");
// anything else defaults to Garbage Dumping, the model you trained.
const MOCK_PRESETS = {
  garbage_dumping: { confidence: 0.91, box: [0.22, 0.3, 0.74, 0.86], severity: 'High', reason: 'Garbage covers about 29% of the photo.' },
  pothole: { confidence: 0.86, box: [0.32, 0.5, 0.66, 0.76], severity: 'Medium', reason: 'Pothole covers about 9% of the road area in view.' },
  illegal_parking: { confidence: 0.88, box: [0.18, 0.28, 0.76, 0.8], severity: 'High', reason: 'Vehicle occupies about 30% of the frame, likely blocking the road.' },
}

function guessIssueFromName(name = '') {
  const n = name.toLowerCase()
  if (/pothole|road|crack/.test(n)) return 'pothole'
  if (/park|vehicle|car|truck|bike|scooter/.test(n)) return 'illegal_parking'
  return 'garbage_dumping'
}

export async function mockDetectImage({ fileName, width, height }) {
  await wait(1600)
  const issue = guessIssueFromName(fileName)
  const p = MOCK_PRESETS[issue]
  const bbox = [p.box[0] * width, p.box[1] * height, p.box[2] * width, p.box[3] * height].map(Math.round)
  return {
    issue,
    confidence: p.confidence,
    severity: p.severity,
    severity_reason: p.reason,
    image_width: width,
    image_height: height,
    detections: [{ class: issue, confidence: p.confidence, bbox }],
    model: 'simulated',
    mock: true,
  }
}

/**
 * @param {{dataUrl: string, fileName: string, width: number, height: number}} image
 * @param {{latitude: number, longitude: number}} [location]  lets the backend
 *        check no-parking zones for the Illegal Parking rule
 */
export async function detectImage(image, location) {
  let raw
  if (isMockMode()) {
    raw = await mockDetectImage(image)
  } else {
    const form = new FormData()
    form.append('image', await dataUrlToBlob(image.dataUrl), image.fileName || 'report.jpg')
    if (location) {
      form.append('latitude', String(location.latitude))
      form.append('longitude', String(location.longitude))
    }
    raw = await apiPostForm('/api/detect', form)
  }
  return normalizeDetection(raw, image)
}
