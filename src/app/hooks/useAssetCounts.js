import { useMemo } from 'react'

import AssetStatsUtility from '../../utils/AssetStatsUtility'

/**
 * Computes the operator + status count summary used by `AssetView`'s header
 * badge. Scoped to the same plant/region/search constraints as the list
 * itself, but deliberately ignores the active status filter so the chips
 * keep showing the totals for the underlying scope.
 */
export default function useAssetCounts({ config, data, districtPlantCodes, filters }) {
    const { activeOperatorsCount, unassignedActiveOperatorsCount } = useMemo(() => {
        if (!config.operatorConfig) return { activeOperatorsCount: 0, unassignedActiveOperatorsCount: 0 }

        const effectivePlant = districtPlantCodes ? '' : filters.selectedPlant
        const effectiveRegionCodes = districtPlantCodes || data.regionPlantCodes

        const scopeOpts = {
            position: config.operatorConfig.position,
            regionPlantCodes: effectiveRegionCodes,
            selectedPlant: effectivePlant
        }
        const total = AssetStatsUtility.countActiveOperatorsInScope(data.operators, scopeOpts)
        const unassigned = AssetStatsUtility.countUnassignedActiveOperators(
            data.items,
            data.operators,
            filters.searchText,
            {
                assignedOperatorField: config.operatorConfig.assignedField,
                assignedPlantField: 'assignedPlant',
                operatorIdField: 'employeeId',
                ...scopeOpts
            }
        )
        return { activeOperatorsCount: total - unassigned, unassignedActiveOperatorsCount: unassigned }
    }, [
        data.operators,
        data.items,
        districtPlantCodes,
        filters.selectedPlant,
        filters.searchText,
        data.regionPlantCodes,
        config.operatorConfig
    ])

    const { activeCount, shopCount, spareCount, totalCount } = useMemo(() => {
        if (!data.items?.length) return { activeCount: 0, shopCount: 0, spareCount: 0, totalCount: 0 }
        const q = filters.searchText.trim().toLowerCase()
        const scoped = data.items.filter((item) => {
            let matchesSearch = true
            if (q && config.searchFields) {
                matchesSearch = config.searchFields(item, q, {
                    operators: data.operators,
                    tractors: data.tractors
                })
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
                !data.regionPlantCodes || data.regionPlantCodes.size === 0 || data.regionPlantCodes.has(itemPlantCode)
            return matchesSearch && matchesPlant && matchesRegion
        })
        const counts = AssetStatsUtility.getStatusCounts(scoped)
        return {
            activeCount: counts.Active || 0,
            shopCount: counts['In Shop'] || 0,
            spareCount: counts.Spare || 0,
            totalCount: counts.Total || 0
        }
    }, [
        data.items,
        data.operators,
        data.tractors,
        data.regionPlantCodes,
        filters.searchText,
        filters.selectedPlant,
        districtPlantCodes,
        config
    ])

    return {
        activeCount,
        activeOperatorsCount,
        shopCount,
        spareCount,
        totalCount,
        unassignedActiveOperatorsCount
    }
}
