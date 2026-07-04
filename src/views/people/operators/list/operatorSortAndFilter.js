/**
 * Pure derivation: filter the operators list by search/plant/region/status/
 * position, then sort with a manual default ordering or by the chosen column.
 * Behavior is byte-for-byte identical to the original inline IIFE in
 * OperatorsView so live re-renders produce the same order and matches.
 */

const STATUS_VALUES = ['Active', 'Light Duty', 'Pending Start', 'Training', 'Terminated', 'No Hire']
const TERMINATED_STATUSES = ['Terminated', 'No Hire']

const SORT_PROPERTY_BY_LABEL = {
    Name: 'name',
    Phone: 'phone',
    Plant: 'plantCode',
    Rating: 'rating',
    Status: 'status',
    Trainer: null
}

const matchesSearchPredicate = (operator, searchText, exactMatch) => {
    if (searchText.trim() === '') return true
    const needle = searchText.trim().toLowerCase()
    const name = operator.name.toLowerCase()
    const id = operator.employeeId.toLowerCase()
    if (exactMatch) return name === needle || id === needle
    return name.includes(searchText.toLowerCase()) || id.includes(searchText.toLowerCase())
}

const matchesPlantPredicate = (operator, selectedPlant) =>
    selectedPlant === '' || selectedPlant === 'All' || operator.plantCode === selectedPlant

const matchesRegionPredicate = (operator, regionPlantCodes) => {
    if (!regionPlantCodes || regionPlantCodes.size === 0) return true
    return regionPlantCodes.has(
        String(operator.plantCode || '')
            .trim()
            .toUpperCase()
    )
}

const matchesStatusPredicate = (operator, statusFilter, assignedOperatorsSet) => {
    if (!statusFilter || statusFilter === 'All Statuses') return true
    if (STATUS_VALUES.includes(statusFilter)) return operator.status === statusFilter
    if (statusFilter === 'Trainer') {
        return operator.isTrainer === true || String(operator.isTrainer).toLowerCase() === 'true'
    }
    if (statusFilter === 'Not Trainer') {
        return operator.isTrainer !== true && String(operator.isTrainer).toLowerCase() !== 'true'
    }
    if (statusFilter === 'Unassigned Active') {
        return operator.status === 'Active' && !assignedOperatorsSet.has(operator.employeeId)
    }
    return true
}

const matchesPositionPredicate = (operator, positionFilter) => {
    if (!positionFilter) return true
    const pos = String(operator.position || '')
        .trim()
        .toLowerCase()
    if (positionFilter === 'Mixer') return pos === 'mixer operator' || pos === 'mixer'
    if (positionFilter === 'Tractor') return pos === 'tractor operator' || pos === 'tractor'
    return true
}

const defaultStatusOrder = (a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1
    if (a.status !== 'Active' && b.status === 'Active') return 1
    if (a.status === 'Training' && b.status !== 'Training') return -1
    if (a.status !== 'Training' && b.status === 'Training') return 1
    if (a.status === 'Pending Start' && b.status !== 'Pending Start') return -1
    if (a.status !== 'Pending Start' && b.status === 'Pending Start') return 1
    if (a.status !== b.status) return a.status.localeCompare(b.status)
    const nameA = a.name.split(' ').pop().toLowerCase()
    const nameB = b.name.split(' ').pop().toLowerCase()
    return nameA.localeCompare(nameB)
}

const buildSortComparator = ({ sortKey, sortDirection, trainers }) => {
    return (a, b) => {
        if (!sortKey) return defaultStatusOrder(a, b)
        const prop = SORT_PROPERTY_BY_LABEL[sortKey]
        if (!prop && sortKey !== 'Trainer') return 0
        let aVal, bVal
        if (sortKey === 'Trainer') {
            aVal = trainers.find((t) => t.employeeId === a.assignedTrainer)?.name || ''
            bVal = trainers.find((t) => t.employeeId === b.assignedTrainer)?.name || ''
        } else {
            aVal = a[prop]
            bVal = b[prop]
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }
        aVal = String(aVal || '').toLowerCase()
        bVal = String(bVal || '').toLowerCase()
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
    }
}

/**
 * Builds the set of operator IDs already assigned to active equipment under the
 * current position + plant filters. Used to back the "Unassigned Active"
 * status pseudo-filter.
 */
export const buildAssignedOperatorsSet = ({ mixers, tractors, positionFilter, selectedPlant }) => {
    const assigned = new Set()
    let equipment = []
    if (positionFilter === 'Mixer') equipment = mixers
    else if (positionFilter === 'Tractor') equipment = tractors
    else equipment = mixers.concat(tractors)
    equipment
        .filter(
            (eq) =>
                eq.status === 'Active' &&
                (!selectedPlant || selectedPlant === 'All' || eq.assignedPlant === selectedPlant)
        )
        .forEach((eq) => {
            if (eq.assignedOperator) assigned.add(eq.assignedOperator)
        })
    return assigned
}

/**
 * Filters + sorts the operators list. Terminated rows are always pushed below
 * non-terminated ones, regardless of the active sort column.
 */
export const deriveFilteredOperators = ({
    operators,
    searchText,
    exactMatch,
    selectedPlant,
    regionPlantCodes,
    statusFilter,
    positionFilter,
    assignedOperatorsSet,
    sortKey,
    sortDirection,
    trainers
}) => {
    const filtered = operators.filter(
        (operator) =>
            matchesSearchPredicate(operator, searchText, exactMatch) &&
            matchesPlantPredicate(operator, selectedPlant) &&
            matchesRegionPredicate(operator, regionPlantCodes) &&
            matchesStatusPredicate(operator, statusFilter, assignedOperatorsSet) &&
            matchesPositionPredicate(operator, positionFilter)
    )
    const sortFn = buildSortComparator({ sortDirection, sortKey, trainers })
    const nonTerminated = []
    const terminated = []
    filtered.forEach((op) => {
        if (TERMINATED_STATUSES.includes(op.status)) terminated.push(op)
        else nonTerminated.push(op)
    })
    return [...nonTerminated.sort(sortFn), ...terminated.sort(sortFn)]
}
