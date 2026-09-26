// ─────────────────────────────────────────────────────────────
// departments.js — configurable issue → authority routing.
// Change the mapping here (or later load it from the backend)
// without touching any UI component. The backend keeps the same
// table in backend/app/config.py.
// ─────────────────────────────────────────────────────────────

export const DEPARTMENTS = {
  roads: {
    id: 'roads',
    name: 'Road / Public Works Department',
    short: 'Public Works',
  },
  traffic: {
    id: 'traffic',
    name: 'Traffic / Municipal Enforcement Department',
    short: 'Traffic Enforcement',
  },
  sanitation: {
    id: 'sanitation',
    name: 'Municipal Solid Waste / Sanitation Department',
    short: 'Sanitation',
  },
}

export const ISSUE_ROUTING = {
  pothole: 'roads',
  illegal_parking: 'traffic',
  garbage_dumping: 'sanitation',
}

export const departmentFor = (issueId) => ISSUE_ROUTING[issueId] || null
export const departmentName = (deptId) => DEPARTMENTS[deptId]?.name || 'Unassigned'
export const departmentShort = (deptId) => DEPARTMENTS[deptId]?.short || 'Unassigned'
