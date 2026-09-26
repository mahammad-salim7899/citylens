// The in-progress report (image, location, detection) lives in
// sessionStorage so a page refresh mid-flow doesn't lose it.
const KEY = 'citylens_report_draft'

export function saveDraft(draft) {
  try { sessionStorage.setItem(KEY, JSON.stringify(draft)) } catch { /* private mode / full: router state still works */ }
}

export function loadDraft() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null }
}

export function clearDraft() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}
