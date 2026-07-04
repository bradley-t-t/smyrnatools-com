import { useMemo } from 'react'

import {
    computeAvailablePlantCodes,
    computeHiringTraining,
    computeLastLoginDistribution,
    computeLowestRatedOperators,
    computeManagerCoverage,
    computePersonSummary,
    computeRatingDistribution,
    computeStaleManagers,
    isExcludedManager,
    RETIRED_STATUSES
} from '../../utils/PersonStatsUtility'

/**
 * Statistics derivation for people roster views (operators, managers).
 * Keeps a parallel shape to `useAssetStatistics` so the visual surfaces can
 * reuse the same Panel / chart / table primitives. The `kind` discriminator
 * lets the hook tailor logic per entity:
 *   - 'operators' → status mix + position + rating + tenure
 *   - 'managers'  → role mix + plant + last-login + tenure
 *
 * All metrics are pure memoizations of the items already loaded by the
 * caller — no fetches happen here.
 */
export default function usePersonStatistics({ dateRange, items, kind, plants, regionPlantCodes, selectedPlant }) {
    const isOperators = kind === 'operators'

    const plantNames = useMemo(() => {
        const map = new Map()
        plants?.forEach((p) => {
            const code = p?.plantCode || p?.code
            if (code) map.set(String(code).trim().toUpperCase(), p?.name || p?.plantName || code)
        })
        return map
    }, [plants])

    /** Region + plant scope, no date filter. Used by snapshot lists (Pending
     *  Starts, Currently in Training, Trainer Roster, etc.) so those tables
     *  always show the live pipeline regardless of the selected time
     *  range. */
    const regionPlantScopedItems = useMemo(() => {
        if (!Array.isArray(items)) return []
        const upper = (v) =>
            String(v || '')
                .trim()
                .toUpperCase()
        const plant = upper(selectedPlant)
        return items.filter((person) => {
            const personPlant = upper(person.plantCode)
            if (regionPlantCodes && regionPlantCodes.size > 0 && personPlant && !regionPlantCodes.has(personPlant)) {
                return false
            }
            if (plant && plant !== 'ALL' && personPlant !== plant) return false
            return true
        })
    }, [items, regionPlantCodes, selectedPlant])

    const dateRangeStartTime = useMemo(
        () => (dateRange?.start ? new Date(`${dateRange.start}T00:00:00`).getTime() : null),
        [dateRange?.start]
    )
    const dateRangeEndTime = useMemo(
        () => (dateRange?.end ? new Date(`${dateRange.end}T23:59:59.999`).getTime() : null),
        [dateRange?.end]
    )

    const isWithinRange = useMemo(() => {
        if (dateRangeStartTime == null || dateRangeEndTime == null) return null
        return (iso) => {
            if (!iso) return false
            const t = new Date(iso).getTime()
            if (!Number.isFinite(t)) return false
            return t >= dateRangeStartTime && t <= dateRangeEndTime
        }
    }, [dateRangeEndTime, dateRangeStartTime])

    /** Items in scope = region+plant-scoped items further narrowed by
     *  activity time when a date range is active. Used by every section
     *  that's interpreted as "activity in the period" (status, plants,
     *  ratings, logins, etc.). Hiring & Training intentionally uses
     *  `regionPlantScopedItems` plus its own period filters so the live
     *  pipeline lists never disappear when the user scopes to a window. */
    const scopedItems = useMemo(() => {
        if (!isWithinRange) return regionPlantScopedItems
        return regionPlantScopedItems.filter((person) => {
            const activity = person.updatedAt || person.createdAt || person.lastLoginAt || null
            return isWithinRange(activity)
        })
    }, [isWithinRange, regionPlantScopedItems])

    /** "Active" set per entity kind:
     *   - Operators: drops Terminated / No Hire (status-driven)
     *   - Managers: drops Guest / Terminated role names AND any record
     *     without a plant assignment — those records shouldn't influence
     *     coverage, role tiers, plant rollups, or any other general metric
     *     unless a surface is specifically about them.
     *
     *  Surfaces that are intentionally about excluded records (e.g. the
     *  operator Roster Status chart, the Hiring & Training "Terminated in
     *  period" list) read from `scopedItems` directly so they still
     *  surface those rows. */
    const activeItems = useMemo(() => {
        if (isOperators) {
            return scopedItems.filter((person) => !RETIRED_STATUSES.includes(person.status))
        }
        return scopedItems.filter((person) => !isExcludedManager(person))
    }, [isOperators, scopedItems])

    /** Headline KPI surface — counts, missing-data, plant spread, and
     *  entity-specific signals (rating for operators, login recency for
     *  managers). Terminated / No-Hire operators are intentionally excluded
     *  from every derived count except `retiredCount` itself — those
     *  records show up only in surfaces that are specifically about them
     *  (Roster Status chart, Hiring & Training period lists). */
    const summary = useMemo(
        () => computePersonSummary({ activeItems, isOperators, scopedItemsLength: scopedItems.length }),
        [activeItems, isOperators, scopedItems.length]
    )

    /** Status distribution — operators have rich statuses (Active, Light
     *  Duty, Pending Start, Training, Terminated, No Hire). Managers don't
     *  have a status field, so this collapses to an empty array there. */
    const statusDistribution = useMemo(() => {
        if (!isOperators) return []
        const counts = new Map()
        scopedItems.forEach((person) => {
            const label = person.status || 'Unknown'
            counts.set(label, (counts.get(label) || 0) + 1)
        })
        return [...counts.entries()].map(([label, count]) => ({ count, label })).sort((a, b) => b.count - a.count)
    }, [isOperators, scopedItems])

    /** Position (operators) or role (managers) breakdown. Keyed by the
     *  appropriate field. Excludes terminated / no-hire operators — their
     *  position/role data isn't operationally meaningful. */
    const roleDistribution = useMemo(() => {
        const counts = new Map()
        activeItems.forEach((person) => {
            const label = isOperators ? person.position || 'Unassigned' : person.roleName || 'No Role'
            counts.set(label, (counts.get(label) || 0) + 1)
        })
        return [...counts.entries()].map(([label, count]) => ({ count, label })).sort((a, b) => b.count - a.count)
    }, [activeItems, isOperators])

    /** Per-plant rollup — counts active roster only and (for operators)
     *  trainer coverage. Terminated / no-hire records aren't part of any
     *  plant's working roster, so they're excluded entirely. */
    const perPlant = useMemo(() => {
        const map = new Map()
        activeItems.forEach((person) => {
            const code =
                String(person.plantCode || '')
                    .trim()
                    .toUpperCase() || 'UNASSIGNED'
            if (!map.has(code)) {
                map.set(code, {
                    active: 0,
                    code,
                    name: plantNames.get(code) || code,
                    total: 0,
                    trainers: 0
                })
            }
            const row = map.get(code)
            row.total += 1
            row.active += 1
            if (isOperators && person.isTrainer) row.trainers += 1
        })
        return [...map.values()].sort((a, b) => b.active - a.active || a.code.localeCompare(b.code))
    }, [activeItems, isOperators, plantNames])

    /** Hiring & training pipeline — operators-only. Snapshot lists always
     *  read the full region+plant pool; period-bound counts / lists filter
     *  by lifecycle event date against the active range. See
     *  `computeHiringTraining` for the full breakdown. */
    const hiringTraining = useMemo(
        () => (isOperators ? computeHiringTraining({ isWithinRange, perPlant, regionPlantScopedItems }) : null),
        [isOperators, isWithinRange, perPlant, regionPlantScopedItems]
    )

    /** Operator rating distribution — rounds ratings to the nearest whole
     *  star for binning. Excludes unrated operators (rating === 0 with no
     *  signal) and terminated / no-hire records, since their ratings are
     *  historical noise rather than a working signal. */
    const ratingDistribution = useMemo(
        () => (isOperators ? computeRatingDistribution(activeItems) : []),
        [activeItems, isOperators]
    )

    /** Manager last-login histogram — bins recency of last login so it's
     *  obvious who hasn't been around in a while. */
    const lastLoginDistribution = useMemo(
        () => (isOperators ? [] : computeLastLoginDistribution(activeItems)),
        [activeItems, isOperators]
    )

    /** Stale managers — top 15 managers by days-since-last-login (or
     *  never). Useful for cleaning up dormant accounts. */
    const staleManagers = useMemo(
        () => (isOperators ? [] : computeStaleManagers(activeItems)),
        [activeItems, isOperators]
    )

    /** Lowest-rated operators — surfaces active operators with explicit low
     *  ratings (1–3 stars). Terminated / no-hire excluded. */
    const lowestRatedOperators = useMemo(
        () => (isOperators ? computeLowestRatedOperators(activeItems) : []),
        [activeItems, isOperators]
    )

    /** Manager-specific coverage / risk derivations — uncovered plants,
     *  SPOF plants, role tiers, recent additions, login health, email-
     *  domain mix. Returns null for operators. */
    const managerCoverage = useMemo(
        () => (isOperators ? null : computeManagerCoverage({ activeItems, perPlant, plantNames, regionPlantCodes })),
        [activeItems, isOperators, perPlant, plantNames, regionPlantCodes]
    )

    /** Available plants for the Statistics plant filter — only plants with
     *  at least one ACTIVE person show up. */
    const availablePlantCodes = useMemo(() => computeAvailablePlantCodes(activeItems), [activeItems])

    return {
        availablePlantCodes,
        hiringTraining,
        lastLoginDistribution,
        lowestRatedOperators,
        managerCoverage,
        perPlant,
        plantNames,
        ratingDistribution,
        roleDistribution,
        scopedItems,
        staleManagers,
        statusDistribution,
        summary
    }
}
