/**
 * Shared asset statistics logic used across Mixer, Tractor, Equipment, and Trailer utilities.
 * Consolidates duplicated service-overdue checks, cleanliness averages,
 * plant/status distribution counts, service-needed tallies,
 * fleet sorting, and operator-assignment helpers.
 */

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24

const AssetStatsUtility = {
    /**
     * Compares two items by status priority, then by numeric portion of a number field.
     * Status order: Active → Stationary → Spare → In Shop → Retired → Sold.
     */
    compareByStatusThenNumber(a, b, statusField = 'status', numberField = 'truckNumber') {
        const order = { Active: 0, 'In Shop': 3, Retired: 4, Sold: 5, Spare: 2, Stationary: 1 }
        const sa = order[a?.[statusField]] ?? 99
        const sb = order[b?.[statusField]] ?? 99
        if (sa !== sb) return sa - sb
        const aNum = parseInt(String(a?.[numberField] ?? '').replace(/\D/g, '') || '0')
        const bNum = parseInt(String(b?.[numberField] ?? '').replace(/\D/g, '') || '0')
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
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
        const normalized = String(searchText || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
        const ops = (operators || []).filter((op) => {
            if (op?.status !== 'Active') return false
            if (position && op?.position !== position) return false
            if (selectedPlant && op?.plantCode !== selectedPlant) return false
            if (regionPlantCodes && !regionPlantCodes.has(op?.plantCode)) return false
            if (!normalized) return true
            const nameNoSpace = String(op?.name || '')
                .toLowerCase()
                .replace(/\s+/g, '')
            const smyrna = String(op?.smyrnaId || '').toLowerCase()
            return nameNoSpace.includes(normalized) || smyrna.includes(normalized)
        })
        const active = (items || []).filter(
            (it) =>
                it?.status === 'Active' &&
                (!selectedPlant || selectedPlant === 'All' || it?.[assignedPlantField] === selectedPlant) &&
                (!regionPlantCodes || regionPlantCodes.has(it?.[assignedPlantField]))
        )
        let count = 0
        for (const op of ops) {
            const isAssigned = active.some((it) => it?.[assignedOperatorField] === op?.[operatorIdField])
            if (!isAssigned) count++
        }
        return count
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
     * Computes the average of a numeric rating field across items.
     * Returns 'N/A' when no valid ratings exist.
     */
    getCleanlinessAverage(items, ratingField = 'cleanlinessRating') {
        if (!Array.isArray(items) || !items.length) return 'N/A'
        const ratings = items.filter((item) => item[ratingField] != null).map((item) => Number(item[ratingField]))
        return ratings.length ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : 'N/A'
    },

    /**
     * Equipment-specific: average condition rating across the fleet.
     * Returns 'N/A' when no valid ratings exist.
     */
    getConditionAverage(equipments) {
        if (!Array.isArray(equipments) || !equipments.length) return 'N/A'
        const ratings = equipments.filter((e) => e.conditionRating != null).map((e) => Number(e.conditionRating))
        return ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : 'N/A'
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
        const validStatuses = ['Active', 'Spare', 'In Shop', 'Retired']
        items.forEach((item) => {
            const status = item[statusField] || 'Unknown'
            if (validStatuses.includes(status)) counts[status]++
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

    /** Trailer-specific: counts by operational status */
    getTrailerStatusCountsByStatus(trailers) {
        if (!Array.isArray(trailers)) return {}
        const statuses = ['Active', 'Spare', 'In Shop', 'Retired']
        const counts = {}
        statuses.forEach((status) => {
            counts[status] = trailers.filter((t) => t.status === status).length
        })
        return counts
    },

    /** Mixer-specific: chips are overdue after 90 days */
    isChipOverdue(chipDate) {
        if (!chipDate) return false
        try {
            const diffDays = Math.ceil((new Date() - new Date(chipDate)) / MILLIS_PER_DAY)
            return diffDays > 90
        } catch {
            return false
        }
    },

    /**
     * Returns true if a service date exceeds the given threshold.
     * Mixer/Tractor/Equipment default to 180 days; Trailer uses 90.
     */
    isServiceOverdue(serviceDate, thresholdDays = 180) {
        if (!serviceDate) return false
        try {
            const diffDays = Math.ceil((new Date() - new Date(serviceDate)) / MILLIS_PER_DAY)
            return diffDays > thresholdDays
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
        if (!items || items.length === 0) return items
        const retiredStatuses = ['Retired', 'Terminated']
        const retiredItems = []
        const activeItems = []
        items.forEach((item) => {
            const status = item?.[statusField]
            if (retiredStatuses.includes(status)) {
                retiredItems.push(item)
            } else {
                activeItems.push(item)
            }
        })
        const sortedActive = sortFn ? activeItems.sort(sortFn) : activeItems
        const sortedRetired = sortFn ? retiredItems.sort(sortFn) : retiredItems
        return [...sortedActive, ...sortedRetired]
    }
}

export default AssetStatsUtility
