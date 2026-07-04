/**
 * PlanStatisticsDates — pure date helpers for the Plan Statistics
 * analytics graph. ISO parsing and calendar-boundary calculations (week /
 * month / quarter / year). No fetching, no React, no business logic —
 * just calendar math.
 */
import { parseIsoLocal } from './PlanStatisticsFormatUtility'

import { ONE_DAY_MS } from './PlanStatisticsConstants'

export const isoDate = (date) => {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export const offsetIso = (iso, days) => {
    const base = parseIsoLocal(iso)
    if (!base) return iso
    base.setDate(base.getDate() + days)
    return isoDate(base)
}

export const daysBetween = (startIso, endIso) => {
    const a = parseIsoLocal(startIso)
    const b = parseIsoLocal(endIso)
    if (!a || !b) return 0
    return Math.round((b.getTime() - a.getTime()) / ONE_DAY_MS) + 1
}

/** Returns the Monday of the calendar week containing `date`. Sunday rolls
 *  back to the prior Monday so the work-week is always Mon–Sat. */
export const mondayOf = (date) => {
    const d = new Date(date)
    const day = d.getDay() // 0 Sun … 6 Sat
    const offset = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + offset)
    d.setHours(0, 0, 0, 0)
    return d
}

export const startOfMonth = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), 1)
    d.setHours(0, 0, 0, 0)
    return d
}

export const endOfMonth = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    d.setHours(0, 0, 0, 0)
    return d
}

export const startOfQuarter = (date) => {
    const q = Math.floor(date.getMonth() / 3)
    const d = new Date(date.getFullYear(), q * 3, 1)
    d.setHours(0, 0, 0, 0)
    return d
}

export const endOfQuarter = (date) => {
    const q = Math.floor(date.getMonth() / 3)
    const d = new Date(date.getFullYear(), q * 3 + 3, 0)
    d.setHours(0, 0, 0, 0)
    return d
}

export const startOfYear = (date) => {
    const d = new Date(date.getFullYear(), 0, 1)
    d.setHours(0, 0, 0, 0)
    return d
}

export const endOfYear = (date) => {
    const d = new Date(date.getFullYear(), 11, 31)
    d.setHours(0, 0, 0, 0)
    return d
}
