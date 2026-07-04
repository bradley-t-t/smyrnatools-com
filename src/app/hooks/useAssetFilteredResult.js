import { useMemo } from 'react'

import AssetStatsUtility from '../../utils/AssetStatsUtility'

/**
 * Builds the filtered/sorted result set for an asset list, including a
 * secondary "potential matches" bucket for items that satisfy the search
 * but fall outside the active filter chips.
 */
export default function useAssetFilteredResult({ config, data, exactMatch, filters }) {
    const districtPlantCodes = useMemo(() => {
        if (!filters.selectedPlant?.startsWith('DISTRICT:')) return null
        const districtName = filters.selectedPlant.slice(9)
        const codes = new Set()
        data.plants.forEach((p) => {
            const plantCode = p.plantCode || p.plant_code || ''
            const districts = p.districts || []
            districts.forEach((d) => {
                const name = typeof d === 'string' ? d : d?.name
                if (name === districtName) codes.add(plantCode.trim().toUpperCase())
            })
        })
        return codes
    }, [filters.selectedPlant, data.plants])

    const filteredResult = useMemo(() => {
        const q = filters.searchText.trim().toLowerCase()
        const normalizedSearch = q.replace(/\s+/g, '')
        const filtered = []
        const potentialMatches = []
        const hasActiveFilters =
            (filters.selectedPlant && filters.selectedPlant !== 'All') ||
            (filters.statusFilter && filters.statusFilter !== 'All Statuses' && filters.statusFilter !== '') ||
            !!filters.freightFilter ||
            !!filters.extraTypeFilter

        data.items.forEach((item) => {
            let matchesSearch = true
            if (normalizedSearch) {
                if (config.searchFields) {
                    if (exactMatch && config.exactMatchFn) {
                        matchesSearch = config.exactMatchFn(item, normalizedSearch)
                    } else {
                        matchesSearch = config.searchFields(item, q, {
                            exactMatch,
                            operators: data.operators,
                            tractors: data.tractors
                        })
                    }
                }
            }

            const itemPlantCode = String(item.assignedPlant || '')
                .trim()
                .toUpperCase()
            const matchesPlant =
                !filters.selectedPlant ||
                filters.selectedPlant === 'All' ||
                (districtPlantCodes
                    ? districtPlantCodes.has(itemPlantCode)
                    : itemPlantCode === filters.selectedPlant.toUpperCase())

            const matchesRegion =
                !data.regionPlantCodes ||
                data.regionPlantCodes.size === 0 ||
                data.regionPlantCodes.has(
                    String(item.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )

            let matchesStatus = true
            if (filters.statusFilter && filters.statusFilter !== 'All Statuses' && filters.statusFilter !== '') {
                const specialFilter = config.specialStatusFilters?.[filters.statusFilter]
                if (specialFilter) {
                    matchesStatus = specialFilter(item)
                } else {
                    matchesStatus = String(item.status || '').trim() === filters.statusFilter
                }
            }

            const matchesFreight =
                !filters.freightFilter ||
                filters.freightFilter === 'All Freight' ||
                item.freight === filters.freightFilter

            let matchesExtraType = true
            if (filters.extraTypeFilter && config.extraTypeFilter) {
                matchesExtraType = config.extraTypeFilter.matchFn(item, filters.extraTypeFilter)
            }

            if (matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesFreight && matchesExtraType) {
                filtered.push(item)
            } else if (config.hasPotentialMatches && matchesSearch && hasActiveFilters && filters.searchText.trim()) {
                potentialMatches.push(item)
            }
        })

        const sortFn = (a, b) => {
            if (!filters.sortKey) {
                return AssetStatsUtility.compareByStatusThenNumber(
                    a,
                    b,
                    config.defaultSortFields.statusField,
                    config.defaultSortFields.numberField
                )
            }
            const customComparator = config.customSortComparators?.[filters.sortKey]
            if (customComparator) {
                const result = customComparator(a, b, {
                    operators: data.operators,
                    plants: data.plants,
                    sortDirection: filters.sortDirection,
                    tractors: data.tractors
                })
                return filters.sortDirection === 'asc' ? result : -result
            }
            const prop = config.sortMappings[filters.sortKey]
            if (!prop) return 0
            const aVal = a[prop]
            const bVal = b[prop]
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return filters.sortDirection === 'asc' ? aVal - bVal : bVal - aVal
            }
            const aStr = String(aVal || '').toLowerCase()
            const bStr = String(bVal || '').toLowerCase()
            if (aStr < bStr) return filters.sortDirection === 'asc' ? -1 : 1
            if (aStr > bStr) return filters.sortDirection === 'asc' ? 1 : -1
            return 0
        }

        return {
            filtered: AssetStatsUtility.sortWithRetiredLast(filtered, sortFn, 'status'),
            potentialMatches: AssetStatsUtility.sortWithRetiredLast(potentialMatches, sortFn, 'status')
        }
    }, [
        config,
        data.items,
        data.operators,
        data.plants,
        data.regionPlantCodes,
        data.tractors,
        districtPlantCodes,
        exactMatch,
        filters.extraTypeFilter,
        filters.freightFilter,
        filters.searchText,
        filters.selectedPlant,
        filters.sortDirection,
        filters.sortKey,
        filters.statusFilter
    ])

    return { districtPlantCodes, filteredResult }
}
