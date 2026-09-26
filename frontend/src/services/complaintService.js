// ─────────────────────────────────────────────────────────────
// complaintService.js
//
// REAL MODE endpoints (backend/app/main.py):
//   POST  /api/complaints                              create (multipart)
//   GET   /api/complaints                              citizen's complaints
//   GET   /api/complaints/{id}                         track one
//   GET   /api/authority/complaints?department=…       department queue
//   GET   /api/authority/complaints/{id}
//   PATCH /api/authority/complaints/{id}/status        change status
//   POST  /api/authority/complaints/{id}/action        add action note
//   POST  /api/authority/complaints/{id}/evidence      after-action photo
//
// MOCK MODE keeps complaints in this browser's localStorage so the
// citizen → authority → citizen loop can be demonstrated without a
// server (open the citizen and authority views in two tabs — they
// stay in sync).
// ─────────────────────────────────────────────────────────────

import { MOCK_MODE, apiGet, apiPatch, apiPostForm, apiPostJson, assetUrl, wait } from './api'
import { MOCK_COMPLAINTS } from '../data/mockData'
import { departmentFor, departmentName } from '../config/departments'
import { allowedNextStatuses, NOTE_REQUIRED, STATUS_META } from '../config/statuses'
import { isSupportedIssue } from '../config/issueTypes'
import { dataUrlToBlob } from '../lib/image'

const STORAGE_KEY = 'citylens_complaints_v2'
const CHANGE_EVENT = 'citylens:complaints-changed'

// ── change notifications (so open pages refresh) ─────────────────
export function subscribeToComplaints(callback) {
  const onStorage = (e) => { if (e.key === STORAGE_KEY) callback() }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}
const notifyChange = () => window.dispatchEvent(new Event(CHANGE_EVENT))

// Make image paths absolute (backend serves /uploads/...).
const withUrls = (c) => c && { ...c, image_url: assetUrl(c.image_url), after_image_url: assetUrl(c.after_image_url) }

// ── MOCK store ───────────────────────────────────────────────────
function loadMock() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* fall back to seed data */ }
  saveMock(MOCK_COMPLAINTS)
  return structuredClone(MOCK_COMPLAINTS)
}

function saveMock(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || /quota/i.test(e?.message || '')) {
      throw new Error('This browser\'s demo storage is full. Use "Reset demo data" in the footer, then try again.')
    }
    throw e
  }
}

function nextComplaintId(list) {
  const year = new Date().getFullYear()
  const nums = list.map((c) => Number(c.id.split('-').pop())).filter(Number.isFinite)
  const next = (nums.length ? Math.max(...nums) : 100) + 1
  return `CL-${year}-${String(next).padStart(5, '0')}`
}

export async function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY)
  loadMock()
  notifyChange()
}

// ── Validation shared by mock mode (backend repeats it) ──────────
function validateUpdate(complaint, { status, note }) {
  const isNoteOnly = status === complaint.status
  if (!isNoteOnly && !allowedNextStatuses(complaint.status).includes(status)) {
    throw new Error(`Cannot change status from "${STATUS_META[complaint.status]?.authority}" to "${STATUS_META[status]?.authority}".`)
  }
  if ((isNoteOnly || NOTE_REQUIRED.includes(status)) && !note?.trim()) {
    throw new Error(status === 'resolved'
      ? 'Describe the action taken before marking this complaint resolved.'
      : 'Please enter a note describing the action.')
  }
}

// ── Public API ───────────────────────────────────────────────────

/** Citizen's complaints (the prototype has a single citizen). */
export async function listComplaints() {
  if (!MOCK_MODE) return (await apiGet('/api/complaints')).map(withUrls)
  return loadMock()
}

export async function getComplaint(id) {
  if (!MOCK_MODE) {
    try { return withUrls(await apiGet(`/api/complaints/${encodeURIComponent(id)}`)) } catch (e) {
      if (/404|not found/i.test(e.message)) return null
      throw e
    }
  }
  return loadMock().find((c) => c.id === id) || null
}

export async function listAuthorityComplaints(departmentId) {
  if (!MOCK_MODE) {
    return (await apiGet(`/api/authority/complaints?department=${encodeURIComponent(departmentId)}`)).map(withUrls)
  }
  return loadMock().filter((c) => c.department === departmentId)
}

export async function getAuthorityComplaint(id) {
  if (!MOCK_MODE) {
    try { return withUrls(await apiGet(`/api/authority/complaints/${encodeURIComponent(id)}`)) } catch (e) {
      if (/404|not found/i.test(e.message)) return null
      throw e
    }
  }
  return loadMock().find((c) => c.id === id) || null
}

/**
 * @param {object} p
 * @param {string} p.issue            final issue id (after citizen confirmation)
 * @param {string} p.severity         Low | Medium | High
 * @param {'model'|'citizen'} p.severity_source
 * @param {object} p.detection        normalized AI result (+ corrected_by_citizen)
 * @param {{dataUrl:string,fileName:string}} p.image
 * @param {object} p.location         { latitude, longitude, address, location_source }
 * @param {string} p.description
 */
export async function createComplaint(p) {
  if (!isSupportedIssue(p.issue)) throw new Error('Please choose one of the supported issue types.')
  if (!p.location || !Number.isFinite(p.location.latitude)) throw new Error('A confirmed location is required.')

  const data = {
    issue: p.issue,
    severity: p.severity,
    severity_source: p.severity_source,
    description: p.description?.trim() || '',
    latitude: p.location.latitude,
    longitude: p.location.longitude,
    address: p.location.address,
    location_source: p.location.location_source,
    detection: {
      ai_issue: p.detection.issue,
      ai_confidence: p.detection.confidence,
      detections: p.detection.detections,
      image_width: p.detection.imageWidth,
      image_height: p.detection.imageHeight,
      source: p.detection.source,
      model: p.detection.model,
      severity_reason: p.detection.severityReason,
      corrected_by_citizen: p.detection.issue !== p.issue,
    },
  }

  if (!MOCK_MODE) {
    const form = new FormData()
    form.append('image', await dataUrlToBlob(p.image.dataUrl), p.image.fileName || 'report.jpg')
    form.append('data', JSON.stringify(data))
    const created = withUrls(await apiPostForm('/api/complaints', form))
    notifyChange()
    return created
  }

  await wait(500)
  const list = loadMock()
  const now = new Date().toISOString()
  const department = departmentFor(p.issue)
  const complaint = {
    id: nextComplaintId(list),
    ...data,
    confidence: data.detection.corrected_by_citizen ? null : data.detection.ai_confidence,
    image_url: p.image.dataUrl,
    after_image_url: null,
    department,
    status: 'new',
    created_at: now,
    history: [
      { status: 'new', at: now, by: 'Citizen', department: null, note: 'Complaint submitted.', kind: 'submitted' },
      { status: 'new', at: now, by: 'CityLens', department, note: `Routed to ${departmentName(department)}.`, kind: 'routed' },
    ],
  }
  saveMock([complaint, ...list])
  notifyChange()
  return complaint
}

/**
 * Authority update. `status` equal to the current status = add a note only.
 * @param {string} id
 * @param {{status:string, note:string, officer:string, department:string, afterImageDataUrl?:string}} u
 */
export async function updateComplaint(id, u) {
  if (!MOCK_MODE) {
    const current = await getAuthorityComplaint(id)
    if (!current) throw new Error('Complaint not found.')
    validateUpdate(current, u)
    if (u.afterImageDataUrl) {
      const form = new FormData()
      form.append('image', await dataUrlToBlob(u.afterImageDataUrl), 'after.jpg')
      form.append('officer', u.officer)
      form.append('department', u.department)
      await apiPostForm(`/api/authority/complaints/${encodeURIComponent(id)}/evidence`, form)
    }
    const body = { note: u.note?.trim() || null, officer: u.officer, department: u.department }
    const updated = u.status === current.status
      ? await apiPostJson(`/api/authority/complaints/${encodeURIComponent(id)}/action`, body)
      : await apiPatch(`/api/authority/complaints/${encodeURIComponent(id)}/status`, { ...body, status: u.status })
    notifyChange()
    return withUrls(updated)
  }

  await wait(350)
  const list = loadMock()
  const current = list.find((c) => c.id === id)
  if (!current) throw new Error('Complaint not found.')
  if (current.department !== u.department) throw new Error('This complaint belongs to another department.')
  validateUpdate(current, u)

  const now = new Date().toISOString()
  const entries = []
  if (u.afterImageDataUrl) {
    entries.push({ status: current.status, at: now, by: u.officer, department: u.department, note: 'Resolution photo uploaded.', kind: 'evidence' })
  }
  const statusChanged = u.status !== current.status
  entries.push({
    status: u.status,
    at: now,
    by: u.officer,
    department: u.department,
    note: u.note?.trim() || `Status updated to ${STATUS_META[u.status].authority}.`,
    kind: statusChanged ? 'status' : 'action',
  })

  const updated = {
    ...current,
    status: u.status,
    after_image_url: u.afterImageDataUrl || current.after_image_url,
    history: [...current.history, ...entries],
  }
  saveMock(list.map((c) => (c.id === id ? updated : c)))
  notifyChange()
  return updated
}
