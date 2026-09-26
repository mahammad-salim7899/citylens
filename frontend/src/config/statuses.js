// ─────────────────────────────────────────────────────────────
// statuses.js — one status model shared by citizen and authority.
// Stored value is the key (e.g. "under_review"); each audience
// sees its own wording ("Submitted" for the citizen, "New" for the
// authority) so the two views never disagree.
// ─────────────────────────────────────────────────────────────

export const STATUS_META = {
  new: { citizen: 'Submitted', authority: 'New', step: 'Reported', tone: 'civic' },
  under_review: { citizen: 'Under Review', authority: 'Under Review', step: 'Under Review', tone: 'amber' },
  action_assigned: { citizen: 'Action Assigned', authority: 'Action Assigned', step: 'Action Assigned', tone: 'amber' },
  action_in_progress: { citizen: 'Action in Progress', authority: 'Action in Progress', step: 'Action in Progress', tone: 'civic' },
  resolved: { citizen: 'Resolved', authority: 'Resolved', step: 'Resolved', tone: 'green' },
  rejected: { citizen: 'Rejected / Invalid', authority: 'Rejected / Invalid', step: 'Rejected / Invalid', tone: 'red' },
}

// The main workflow (rejection can happen from any open state).
export const STATUS_FLOW = ['new', 'under_review', 'action_assigned', 'action_in_progress', 'resolved']

export const CLOSED_STATUSES = ['resolved', 'rejected']

// Statuses that cannot be set without an "Action taken" note.
export const NOTE_REQUIRED = ['resolved', 'rejected']

export const statusLabel = (status, audience = 'citizen') =>
  STATUS_META[status]?.[audience] || status

// Authority can move forward (skipping allowed) or reject — never backwards.
export function allowedNextStatuses(current) {
  if (CLOSED_STATUSES.includes(current)) return []
  const idx = STATUS_FLOW.indexOf(current)
  return [...STATUS_FLOW.slice(idx + 1), 'rejected']
}
