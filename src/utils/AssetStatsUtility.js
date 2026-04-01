/**
 * Shared asset statistics logic used across Mixer, Tractor, Equipment, and Trailer utilities.
 * Consolidates service-overdue checks, plant/status distribution counts,
 * service-needed tallies, fleet sorting, and operator-assignment helpers.
 */

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24

const RETIRED_STATUSES = ['Retired', 'Terminated']

const STATUS_PRIORITY = { Active: 0, Stationary: 1, Spare: 2, 'In Shop': 3, Retired: 4, Sold: 5 }

const VALID_STATUSES = ['Active', 'Spare', 'In Shop', 'Retired']

const AssetStatsUtility = {
    /**
     * Compares two items by status priority, then by numeric portion of a number field.
     * Status order: Active -> Stationary -> Spare -> In Shop -> Retired -> Sold.
     */
    compareByStatusThenNumber(a, b, statusField = 'status', numberField = 'truckNumber') {
        const statusA = STATUS_PRIORITY[a?.[statusField]] ?? 99
        const statusB = STATUS_PRIORITY[b?.[statusField]] ?? 99
        if (statusA !== statusB) return statusA - statusB

        const extractedNumberA = parseInt(String(a?.[numberField] ?? '').replace(/\D/g, '') || '0')
        const extractedNumberB = parseInt(String(b?.[numberField] ?? '').replace(/\D/g, '') || '0')
        if (!isNaN(extractedNumberA) && !isNaN(extractedNumberB)) return extractedNumberA - extractedNumberB

        return String(a?.[numberField] ?? '').localeCompare(String(b?.[numberField] ?? ''))
    },

    /**
     * Counts active operators not assigned to any active item, with optional
     * search text, position, plant, and region filtering.
     */
    countUnassignedActiveOperators(
        items,
        operators,
        searchText,
        {
            position,
            selectedPlant,
            regionPlantCodes,
            operatorIdField = 'employeeId',
            assignedOperatorField = 'assignedOperator',
            assignedPlantField = 'assignedPlant'
        }
    ) {
        const normalizedSearch = String(searchText || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')

        const filteredOperators = (operators || []).filter((op) => {
            if (op?.status !== 'Active') return false
            if (position && op?.position !== position) return false
            if (selectedPlant && op?.plantCode !== selectedPlant) return false
            if (regionPlantCodes && !regionPlantCodes.has(op?.plantCode)) return false
            if (!normalizedSearch) return true

            const nameCollapsed = String(op?.name || '')
                .toLowerCase()
                .replace(/\s+/g, '')
            const smyrnaId = String(op?.smyrnaId || '').toLowerCase()
            return nameCollapsed.includes(normalizedSearch) || smyrnaId.includes(normalizedSearch)
        })

        const activeItems = (items || []).filter(
            (it) =>
                it?.status === 'Active' &&
                (!selectedPlant || selectedPlant === 'All' || it?.[assignedPlantField] === selectedPlant) &&
                (!regionPlantCodes || regionPlantCodes.has(it?.[assignedPlantField]))
        )

        return filteredOperators.filter(
            (op) => !activeItems.some((it) => it?.[assignedOperatorField] === op?.[operatorIdField])
        ).length
    },

    /**
     * Counts total active operators in scope (by position, plant, and region).
     * Used alongside countUnassignedActiveOperators to derive assigned count.
     */
    countActiveOperatorsInScope(operators, { position, selectedPlant, regionPlantCodes }) {
        return (operators || []).filter((op) => {
            if (op?.status !== 'Active') return false
            if (position && op?.position !== position) return false
            if (selectedPlant && selectedPlant !== 'All' && op?.plantCode !== selectedPlant) return false
            if (regionPlantCodes && regionPlantCodes.size > 0 && !regionPlantCodes.has(op?.plantCode)) return false
            return true
        }).length
    },

    /**
     * Returns the number of items whose service date exceeds the threshold.
     * Defaults to 180 days (override to 90 for trailers).
     */
    getNeedServiceCount(items, serviceDateField = 'lastServiceDate', thresholdDays = 180) {
        if (!Array.isArray(items)) return 0
        return items.filter((item) => AssetStatsUtility.isServiceOverdue(item[serviceDateField], thresholdDays)).length
    },

    /**
     * Counts items grouped by plant assignment.
     * Items without a plant are bucketed under 'Unassigned'.
     */
    getPlantCounts(items, plantField = 'assignedPlant') {
        if (!Array.isArray(items)) return {}
        return items.reduce((counts, item) => {
            const plant = item[plantField] || 'Unassigned'
            counts[plant] = (counts[plant] || 0) + 1
            return counts
        }, {})
    },

    /**
     * Counts items grouped by status (Active, In Shop, Retired, Spare).
     * Includes a Total key with the full array length.
     */
    getStatusCounts(items, statusField = 'status') {
        if (!Array.isArray(items)) return {}
        const counts = { Active: 0, 'In Shop': 0, Retired: 0, Spare: 0, Total: items.length }
        items.forEach((item) => {
            const status = item[statusField] || 'Unknown'
            if (VALID_STATUSES.includes(status)) counts[status]++
        })
        return counts
    },

    /** Trailer-specific: counts by trailer type (Cement / End Dump) */
    getTrailerStatusCounts(trailers) {
        if (!Array.isArray(trailers)) return {}
        const counts = { Total: trailers.length }
        ;['Cement', 'End Dump'].forEach((type) => {
            counts[type] = trailers.filter((t) => t.trailerType === type).length
        })
        return counts
    },

    /**
     * Returns true if a date exceeds the given day threshold from today.
     * Mixer/Tractor/Equipment default to 180 days; Trailer uses 90; Chip checks use 90.
     */
    isServiceOverdue(serviceDate, thresholdDays = 180) {
        if (!serviceDate) return false
        try {
            const daysSinceService = Math.ceil((new Date() - new Date(serviceDate)) / MILLIS_PER_DAY)
            return daysSinceService > thresholdDays
        } catch {
            return false
        }
    },

    /** Trailer-specific: weekly verification with history-aware staleness */
    isTrailerVerified(updatedLast, updatedAt, updatedBy, latestHistoryDate = null) {
        if (!updatedLast || !updatedBy) return false

        const lastVerification = new Date(updatedLast)
        const lastUpdate = new Date(updatedAt)
        const lastHistory = latestHistoryDate ? new Date(latestHistoryDate) : null
        const now = new Date()
        const lastSunday = new Date(now)
        lastSunday.setDate(now.getDate() - now.getDay())
        lastSunday.setHours(0, 0, 0, 0)

        if (lastHistory && lastHistory > lastVerification) return false
        return lastUpdate <= lastVerification && lastVerification >= lastSunday
    },

    /**
     * Sorts items with retired/terminated entries pushed to the end,
     * applying an optional sort function to each partition independently.
     */
    sortWithRetiredLast(items, sortFn, statusField = 'status') {
        if (!items?.length) return items

        const activeItems = items.filter((item) => !RETIRED_STATUSES.includes(item?.[statusField]))
        const retiredItems = items.filter((item) => RETIRED_STATUSES.includes(item?.[statusField]))

        return [
            ...(sortFn ? activeItems.sort(sortFn) : activeItems),
            ...(sortFn ? retiredItems.sort(sortFn) : retiredItems)
        ]
    }
}

export default AssetStatsUtility
