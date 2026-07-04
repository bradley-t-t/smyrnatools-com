import { useEffect, useMemo, useState } from 'react'

import { PlantService } from '../../services/PlantService'

/** Sorts plants by the leading numeric portion of plantCode. Non-numeric codes resolve to 0 (collapse together). */
const byPlantCodeNumeric = (a, b) => {
    const aCode = String(a.plantCode || a.plant_code || '')
    const bCode = String(b.plantCode || b.plant_code || '')
    return parseInt(aCode.replace(/\D/g, '') || '0') - parseInt(bCode.replace(/\D/g, '') || '0')
}

/**
 * Shared plant-picker state for asset Add views. Centralizes the plant list,
 * selection, modal open/close, optional region-scoped filtering, and the
 * display string for the picker button.
 *
 * @param {Object} args
 * @param {Object[]} [args.plants] - Plant records when the parent supplies them
 *                                   (Tractor/Trailer/Equipment Add views).
 * @param {boolean} [args.regionFilter=false] - When true, fetches the active
 *   region's plants and filters the input list accordingly (Mixer & Pickup).
 * @param {string}  [args.regionCode] - Active region code (from preferences).
 * @param {boolean} [args.loadAllPlants=false] - When true, fetches the full
 *   plant list itself (PickupTruck Add view did this internally).
 */
export default function usePlantPicker({ plants, regionCode = '', regionFilter = false, loadAllPlants = false } = {}) {
    const [assignedPlant, setAssignedPlant] = useState('')
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [loadedPlants, setLoadedPlants] = useState([])

    useEffect(() => {
        if (!loadAllPlants) return undefined
        let cancelled = false
        async function load() {
            try {
                const data = await PlantService.fetchPlants()
                if (!cancelled) setLoadedPlants(Array.isArray(data) ? data : [])
            } catch {
                if (!cancelled) setLoadedPlants([])
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [loadAllPlants])

    useEffect(() => {
        if (!regionFilter) return undefined
        let cancelled = false
        async function loadRegionPlants() {
            if (!regionCode) {
                setRegionPlantCodes(null)
                return
            }
            try {
                const regionPlants = await PlantService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(regionPlants.map((p) => p.plantCode))
                setRegionPlantCodes(codes)
                if (assignedPlant && !codes.has(assignedPlant)) setAssignedPlant('')
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }
        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [regionFilter, regionCode, assignedPlant])

    const sourcePlants = useMemo(
        () => (loadAllPlants ? loadedPlants : Array.isArray(plants) ? plants : []),
        [loadAllPlants, loadedPlants, plants]
    )

    const visiblePlants = useMemo(() => {
        const filtered =
            regionFilter && regionCode && regionPlantCodes
                ? sourcePlants.filter((p) => {
                      const code = String(p.plantCode || p.plant_code || '')
                          .trim()
                          .toUpperCase()
                      return regionPlantCodes.has(code) || regionPlantCodes.has(p.plantCode)
                  })
                : sourcePlants
        return filtered.slice().sort(byPlantCodeNumeric)
    }, [sourcePlants, regionPlantCodes, regionFilter, regionCode])

    const selectedPlant = visiblePlants.find((p) => (p.plantCode || p.plant_code) === assignedPlant)
    const plantCode = selectedPlant?.plantCode || selectedPlant?.plant_code
    const plantName = selectedPlant?.plantName || selectedPlant?.plant_name
    const plantDisplayText = assignedPlant ? `(${plantCode}) ${plantName}` : 'Select Plant'

    return {
        assignedPlant,
        closePicker: () => setIsPlantModalOpen(false),
        isPlantModalOpen,
        openPicker: () => setIsPlantModalOpen(true),
        plantDisplayText,
        plants: visiblePlants,
        selectPlant: (code) => {
            setAssignedPlant(code)
            setIsPlantModalOpen(false)
        },
        setAssignedPlant
    }
}
