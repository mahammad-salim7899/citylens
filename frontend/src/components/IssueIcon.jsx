import React from 'react'
import { Construction, CircleParkingOff, Trash2 } from 'lucide-react'
import { ISSUE_TYPES } from '../config/issueTypes'

const ICONS = { pothole: Construction, illegal_parking: CircleParkingOff, garbage_dumping: Trash2 }

export default function IssueIcon({ issue, size = 'md' }) {
  const Icon = ICONS[issue] || Construction
  const t = ISSUE_TYPES[issue]
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-xl' : 'h-10 w-10 rounded-xl'
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
  return (
    <span className={`flex shrink-0 items-center justify-center ${box}`} style={{ backgroundColor: t?.light, color: t?.color }} aria-hidden="true">
      <Icon className={icon} strokeWidth={2.25} />
    </span>
  )
}
