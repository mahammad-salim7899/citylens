export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const percent = (x) => (typeof x === 'number' ? `${Math.round(x * 100)}%` : '—')

// "Kottara, Mangaluru, Karnataka" → "Kottara, Mangaluru"
export const shortAddress = (address = '') => address.split(',').slice(0, 2).join(',').trim()
