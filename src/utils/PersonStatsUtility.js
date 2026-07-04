export const MILLIS_PER_DAY = 1000 * 60 * 60 * 24

export const RETIRED_STATUSES = ['Terminated', 'No Hire']

/** Role names that disqualify a manager from "active" metrics. Matched
 *  case-insensitively. Guests and terminated accounts shouldn't contribute
 *  to coverage / role-tier / plant-distribution counts — only to surfaces
 *  that are specifically about them. */
export const EXCLUDED_MANAGER_ROLE_NAMES = new Set(['guest', 'terminated', 'no hire'])

export const RATING_BUCKETS = [
    { label: '0 ★', max: 0 },
    { label: '1 ★', max: 1 },
    { label: '2 ★', max: 2 },
    { label: '3 ★', max: 3 },
    { label: '4 ★', max: 4 },
    { label: '5 ★', max: 5 }
]

export const LAST_LOGIN_BUCKETS = [
    { label: '< 7 d', max: 7 },
    { label: '7–30 d', max: 30 },
    { label: '31–90 d', max: 90 },
    { label: '91–180 d', max: 180 },
    { label: '> 180 d', max: Infinity }
]

/** Returns true when a manager record should be excluded from general
 *  metrics: guest / terminated role, or no plant assigned. Plant
 *  assignment is treated as a hard requirement because every other
 *  metric (coverage gaps, per-plant rollups, role tiers in scope) keys
 *  off it. */
export const isExcludedManager = (person) => {
    if (!person) return true
    const role = String(person.roleName || '')
        .trim()
        .toLowerCase()
    if (EXCLUDED_MANAGER_ROLE_NAMES.has(role)) return true
    if (!String(person.plantCode || '').trim()) return true
    return false
}

export const daysSince = (input) => {
    if (!input) return null
    const value = typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00` : input
    const time = new Date(value).getTime()
    if (!Number.isFinite(time)) return null
    return Math.max(0, Math.floor((Date.now() - time) / MILLIS_PER_DAY))
}

/** Bucket a numeric days value into the first bucket whose `max` it does
 *  not exceed; falls through to the trailing bucket otherwise. */
export const bucket = (buckets, days) => {
    if (days == null) return null
    const found = buckets.find((b) => days <= b.max)
    return (found || buckets[buckets.length - 1]).label
}

const upperTrim = (value) =>
    String(value || '')
        .trim()
        .toUpperCase()

/** Headline KPI rollup — counts, missing-data, plant spread, and
 *  entity-specific signals (rating for operators, login recency for
 *  managers). Terminated / no-hire operators are excluded from every
 *  derived count except `retiredCount`. */
export const computePersonSummary = ({ activeItems, isOperators, scopedItemsLength }) => {
    const total = activeItems.length
    const retired = scopedItemsLength - activeItems.length
    const plantSet = new Set()
    let missingPlant = 0
    let missingName = 0
    let missingPhone = 0
    let trainerCount = 0
    let ratingSum = 0
    let ratingSamples = 0
    let lastLoginSum = 0
    let lastLoginSamples = 0
    let neverLoggedIn = 0

    activeItems.forEach((person) => {
        if (!person.plantCode) missingPlant += 1
        else plantSet.add(upperTrim(person.plantCode))
        const displayName = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email
        if (!displayName) missingName += 1
        if (isOperators && !person.phone) missingPhone += 1
        if (isOperators && person.isTrainer) trainerCount += 1
        if (isOperators && Number.isFinite(Number(person.rating))) {
            ratingSum += Number(person.rating)
            ratingSamples += 1
        }
        if (!isOperators) {
            const loginDays = daysSince(person.lastLoginAt)
            if (loginDays == null) neverLoggedIn += 1
            else {
                lastLoginSum += loginDays
                lastLoginSamples += 1
            }
        }
    })

    return {
        activeCount: total,
        avgLastLoginDays: lastLoginSamples > 0 ? Math.round(lastLoginSum / lastLoginSamples) : null,
        avgRating: ratingSamples > 0 ? ratingSum / ratingSamples : null,
        isOperators,
        missingName,
        missingPhone,
        missingPlant,
        neverLoggedIn,
        plantsRepresented: plantSet.size,
        ratingSamples,
        retiredCount: retired,
        total,
        trainerCount
    }
}

/** Operator rating distribution — rounds ratings to nearest whole star,
 *  bins by `RATING_BUCKETS`. Unrated (rating === 0 / non-finite) collected
 *  into a leading "Unrated" row when present. */
export const computeRatingDistribution = (activeItems) => {
    const counts = new Map(RATING_BUCKETS.map((b) => [b.label, 0]))
    let unrated = 0
    activeItems.forEach((person) => {
        const value = Number(person.rating)
        if (!Number.isFinite(value) || value === 0) {
            unrated += 1
            return
        }
        const rounded = Math.round(value)
        const label = `${Math.max(0, Math.min(5, rounded))} ★`
        counts.set(label, (counts.get(label) || 0) + 1)
    })
    const rows = RATING_BUCKETS.filter((b) => b.label !== '0 ★').map((b) => ({
        count: counts.get(b.label) || 0,
        label: b.label
    }))
    if (unrated > 0) rows.unshift({ count: unrated, label: 'Unrated' })
    return rows
}

/** Manager last-login histogram — bins recency of last login using
 *  `LAST_LOGIN_BUCKETS`. Never-logged-in collected into a trailing
 *  "Never" row when present. */
export const computeLastLoginDistribution = (activeItems) => {
    const counts = new Map(LAST_LOGIN_BUCKETS.map((b) => [b.label, 0]))
    let never = 0
    activeItems.forEach((person) => {
        const value = daysSince(person.lastLoginAt)
        if (value == null) {
            never += 1
            return
        }
        const label = bucket(LAST_LOGIN_BUCKETS, value)
        counts.set(label, (counts.get(label) || 0) + 1)
    })
    const rows = LAST_LOGIN_BUCKETS.map((b) => ({ count: counts.get(b.label) || 0, label: b.label }))
    if (never > 0) rows.push({ count: never, label: 'Never' })
    return rows
}

/** Top 15 managers by days-since-last-login. Never-logged-in sorts first
 *  (treated as Infinity). */
export const computeStaleManagers = (activeItems) =>
    activeItems
        .map((manager) => ({
            daysSince: daysSince(manager.lastLoginAt),
            id: manager.id,
            name: `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email || '—',
            plant: manager.plantCode || '—',
            role: manager.roleName || '—'
        }))
        .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity))
        .slice(0, 15)

/** Top 15 lowest-rated active operators (1–3 stars, explicit ratings only). */
export const computeLowestRatedOperators = (activeItems) =>
    activeItems
        .filter((op) => Number.isFinite(Number(op.rating)) && Number(op.rating) > 0 && Number(op.rating) <= 3)
        .map((op) => ({
            id: op.employeeId,
            name: op.name || op.employeeId,
            plant: op.plantCode || '—',
            position: op.position || '—',
            rating: Number(op.rating),
            status: op.status
        }))
        .sort((a, b) => a.rating - b.rating || b.id?.localeCompare(a.id || ''))
        .slice(0, 15)

/** Distinct, sorted, upper-cased plant codes that have at least one active
 *  person. Filters out blank codes. */
export const computeAvailablePlantCodes = (activeItems) => {
    const set = new Set()
    activeItems.forEach((person) => {
        const code = upperTrim(person.plantCode)
        if (code) set.add(code)
    })
    return [...set].sort()
}

/** Manager coverage / risk derivations — uncovered plants, SPOF plants,
 *  role tiers, recent additions, email-domain composition, login health. */
export const computeManagerCoverage = ({ activeItems, perPlant, plantNames, regionPlantCodes }) => {
    const plantsInRegion = regionPlantCodes && regionPlantCodes.size > 0 ? [...regionPlantCodes] : []
    const plantsWithManagers = new Set(perPlant.map((p) => p.code))
    const uncoveredPlants = plantsInRegion
        .filter((code) => code && !plantsWithManagers.has(code) && code !== 'UNASSIGNED')
        .map((code) => ({ code, name: plantNames.get(code) || code }))
        .sort((a, b) => a.code.localeCompare(b.code))

    const spofPlants = perPlant
        .filter((p) => p.active === 1 && p.code !== 'UNASSIGNED')
        .map((p) => ({ code: p.code, count: p.active, name: p.name }))
        .sort((a, b) => a.code.localeCompare(b.code))

    const roleTiers = { admin: 0, lead: 0, manager: 0, viewer: 0 }
    const tierMembers = { admin: [], lead: [], manager: [], viewer: [] }
    activeItems.forEach((person) => {
        const weight = Number(person.roleWeight) || 0
        let tier
        if (weight >= 70) tier = 'admin'
        else if (weight >= 40) tier = 'lead'
        else if (weight >= 20) tier = 'manager'
        else tier = 'viewer'
        roleTiers[tier] += 1
        tierMembers[tier].push(person)
    })

    const recentAdditions = activeItems
        .map((person) => ({
            createdAt: person.createdAt || null,
            daysSince: daysSince(person.createdAt),
            email: person.email || null,
            id: person.id,
            name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email || person.id || '—',
            plant: person.plantCode || '—',
            role: person.roleName || '—'
        }))
        .filter((row) => row.daysSince != null && row.daysSince <= 30)
        .sort((a, b) => (a.daysSince ?? Infinity) - (b.daysSince ?? Infinity))

    const domainCounts = new Map()
    activeItems.forEach((person) => {
        const email = String(person.email || '')
            .trim()
            .toLowerCase()
        const at = email.indexOf('@')
        if (at === -1 || at === email.length - 1) return
        const domain = email.slice(at + 1)
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
    })
    const domainBreakdown = [...domainCounts.entries()]
        .map(([label, count]) => ({ count, label }))
        .sort((a, b) => b.count - a.count)

    const loginHealth = { never: 0, recent: 0, stale: 0, warm: 0 }
    activeItems.forEach((person) => {
        const days = daysSince(person.lastLoginAt)
        if (days == null) loginHealth.never += 1
        else if (days <= 30) loginHealth.recent += 1
        else if (days <= 90) loginHealth.warm += 1
        else loginHealth.stale += 1
    })

    return {
        domainBreakdown,
        loginHealth,
        recentAdditions,
        roleTiers,
        spofPlants,
        tierMembers,
        uncoveredPlants
    }
}

const personRow = (person, extras = {}) => ({
    createdAt: person.createdAt || null,
    id: person.employeeId,
    name: person.name || person.employeeId,
    plant: person.plantCode || '—',
    position: person.position || '—',
    status: person.status || 'Active',
    ...extras
})

/** Hiring & training pipeline — operators-only. Snapshot lists (pending
 *  starts, in-training, trainer roster, plants missing trainers) always
 *  read the full region+plant pool; period-bound counts / lists filter by
 *  lifecycle event date against `isWithinRange`. */
export const computeHiringTraining = ({ isWithinRange, perPlant, regionPlantScopedItems }) => {
    /* ── Snapshot lists (region+plant scope, no date filter) ───────── */

    const pendingStarts = regionPlantScopedItems
        .filter((person) => person.status === 'Pending Start')
        .map((person) => {
            const startTime = person.pendingStartDate ? new Date(`${person.pendingStartDate}T00:00:00`).getTime() : null
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const daysUntilStart = Number.isFinite(startTime)
                ? Math.round((startTime - today.getTime()) / MILLIS_PER_DAY)
                : null
            return personRow(person, {
                daysUntilStart,
                pendingStartDate: person.pendingStartDate || null
            })
        })
        .sort((a, b) => {
            if (a.daysUntilStart == null && b.daysUntilStart == null) return 0
            if (a.daysUntilStart == null) return 1
            if (b.daysUntilStart == null) return -1
            return a.daysUntilStart - b.daysUntilStart
        })

    const trainerMenteeCount = new Map()
    regionPlantScopedItems.forEach((person) => {
        const trainerId = person.assignedTrainer
        if (!trainerId) return
        trainerMenteeCount.set(trainerId, (trainerMenteeCount.get(trainerId) || 0) + 1)
    })

    const trainers = regionPlantScopedItems
        .filter((person) => person.isTrainer && !RETIRED_STATUSES.includes(person.status))
        .map((person) =>
            personRow(person, {
                mentees: trainerMenteeCount.get(person.employeeId) || 0
            })
        )
        .sort((a, b) => b.mentees - a.mentees || a.name.localeCompare(b.name))

    const trainerNameById = new Map(trainers.map((t) => [t.id, t.name]))

    const inTraining = regionPlantScopedItems
        .filter((person) => person.status === 'Training')
        .map((person) => {
            const days = daysSince(person.createdAt)
            return personRow(person, {
                assignedTrainerId: person.assignedTrainer || null,
                assignedTrainerName: person.assignedTrainer
                    ? trainerNameById.get(person.assignedTrainer) || null
                    : null,
                daysInTraining: days
            })
        })
        .sort((a, b) => (b.daysInTraining ?? 0) - (a.daysInTraining ?? 0))

    const plantsWithTrainers = new Set(
        trainers.filter((t) => t.plant && t.plant !== '—').map((t) => upperTrim(t.plant))
    )
    const plantsMissingTrainers = perPlant
        .filter((row) => row.code !== 'UNASSIGNED' && !plantsWithTrainers.has(upperTrim(row.code)))
        .map((row) => ({ active: row.active, code: row.code, name: row.name }))
        .slice(0, 10)

    /* ── Period-bound counts + lists ──────────────────────────────── */

    const isInPeriod = isWithinRange ? isWithinRange : () => true
    const periodActive = !!isWithinRange

    const buildPeriodList = (filter, dateField, extras = {}) =>
        regionPlantScopedItems
            .filter(filter)
            .filter((person) => isInPeriod(person[dateField]))
            .map((person) =>
                personRow(person, {
                    eventDate: person[dateField] || null,
                    ...(typeof extras === 'function' ? extras(person) : extras)
                })
            )
            .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''))

    const hiresInPeriod = buildPeriodList((person) => !!person.createdAt && person.status !== 'No Hire', 'createdAt')
    const startedTrainingInPeriod = buildPeriodList((person) => person.status === 'Training', 'statusChangedAt')
    const activatedInPeriod = buildPeriodList((person) => person.status === 'Active', 'statusChangedAt')
    const terminatedInPeriod = buildPeriodList((person) => person.status === 'Terminated', 'statusChangedAt')
    const noHireInPeriod = buildPeriodList((person) => person.status === 'No Hire', 'statusChangedAt')

    /* Retention rate — of the operators hired inside the active window
       (or lifetime when no window is set), the share whose CURRENT status
       is still on the working roster (not Terminated / No Hire). 'No Hire'
       is already excluded from the denominator by `hiresInPeriod`, but
       checking RETIRED_STATUSES keeps the numerator self-evidently correct
       if that filter ever loosens. */
    const hiredRetained = hiresInPeriod.filter((row) => !RETIRED_STATUSES.includes(row.status)).length
    const retentionRate = hiresInPeriod.length > 0 ? hiredRetained / hiresInPeriod.length : null

    const recentHires = regionPlantScopedItems
        .filter((person) => !RETIRED_STATUSES.includes(person.status))
        .map((person) => personRow(person, { tenureDays: daysSince(person.createdAt) }))
        .filter((row) => row.tenureDays != null && row.tenureDays <= 90)
        .sort((a, b) => (a.tenureDays ?? Infinity) - (b.tenureDays ?? Infinity))

    const noHireList = regionPlantScopedItems
        .filter((person) => person.status === 'No Hire')
        .map((person) => personRow(person))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

    return {
        activatedInPeriod,
        counts: {
            activated: activatedInPeriod.length,
            hired: hiresInPeriod.length,
            noHire: noHireInPeriod.length,
            startedTraining: startedTrainingInPeriod.length,
            terminated: terminatedInPeriod.length
        },
        hiredRetained,
        hiresInPeriod,
        inTraining,
        noHireInPeriod,
        noHireList,
        pendingStarts,
        periodActive,
        plantsMissingTrainers,
        recentHires,
        retentionRate,
        startedTrainingInPeriod,
        terminatedInPeriod,
        trainers
    }
}
