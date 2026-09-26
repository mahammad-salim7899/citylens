// ─────────────────────────────────────────────────────────────
// issueTypes.js — the ONLY three civic issues CityLens supports.
// Every dropdown, filter, card, chart and detection result reads
// from here. Keys match the backend's `issue` values exactly.
// ─────────────────────────────────────────────────────────────

export const ISSUE_TYPES = {
  pothole: {
    id: 'pothole',
    label: 'Pothole',
    description: 'Road damage detected using computer vision.',
    color: '#B45309',
    light: '#FEF3C7',
  },
  illegal_parking: {
    id: 'illegal_parking',
    label: 'Illegal Parking',
    description: 'Vehicles causing road obstruction or improper parking.',
    color: '#3548B4',
    light: '#E7EAF9',
  },
  garbage_dumping: {
    id: 'garbage_dumping',
    label: 'Garbage Dumping',
    description: 'Garbage accumulation or dumping in inappropriate areas.',
    color: '#15803D',
    light: '#DCFCE7',
  },
}

export const ISSUE_IDS = Object.keys(ISSUE_TYPES)

export const issueLabel = (id) => ISSUE_TYPES[id]?.label || 'Unidentified issue'
export const isSupportedIssue = (id) => Boolean(ISSUE_TYPES[id])

// Raw model class names → CityLens issue ids.
// Your YOLO models may use different class names ("garbage", "trash",
// "potholes"…). Add them here; the backend applies the same mapping
// in backend/app/config.py, so both sides agree.
export const CLASS_ALIASES = {
  garbage_dumping: 'garbage_dumping',
  garbage: 'garbage_dumping',
  trash: 'garbage_dumping',
  waste: 'garbage_dumping',
  litter: 'garbage_dumping',
  rubbish: 'garbage_dumping',
  dump: 'garbage_dumping',
  pothole: 'pothole',
  potholes: 'pothole',
  illegal_parking: 'illegal_parking',
  parked_vehicle: 'illegal_parking',
}

export const normalizeIssueId = (raw) => {
  if (!raw) return null
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_')
  return CLASS_ALIASES[key] || null
}
