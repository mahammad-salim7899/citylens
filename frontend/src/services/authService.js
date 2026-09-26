// ─────────────────────────────────────────────────────────────
// authService.js — MOCK authority sign-in for the prototype.
//
// Picks one of AUTHORITY_ACCOUNTS and remembers it in this browser.
// Later: replace with a real login (e.g. POST /api/auth/login → JWT)
// and let the backend enforce which department's complaints an
// officer may see. The backend already filters by department.
// ─────────────────────────────────────────────────────────────

import { AUTHORITY_ACCOUNTS } from '../data/mockData'

const KEY = 'citylens_authority_session'

export function getCurrentAuthority() {
  try {
    const id = localStorage.getItem(KEY)
    return AUTHORITY_ACCOUNTS.find((a) => a.id === id) || null
  } catch {
    return null
  }
}

export function signInAuthority(accountId) {
  const account = AUTHORITY_ACCOUNTS.find((a) => a.id === accountId)
  if (!account) throw new Error('Unknown account')
  localStorage.setItem(KEY, account.id)
  return account
}

export function signOutAuthority() {
  localStorage.removeItem(KEY)
}

export const listAuthorityAccounts = () => AUTHORITY_ACCOUNTS
