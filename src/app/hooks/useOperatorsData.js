import { useCallback, useEffect, useState } from 'react'

import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { TractorService } from '../../services/TractorService'

const ONE_HOUR_MS = 3600000

const hydrateFromCache = (setOperators, fetchCommentCounts) => {
    const cachedData = localStorage.getItem('cachedOperators')
    const cacheDate = localStorage.getItem('cachedOperatorsDate')
    if (!cachedData || !cacheDate) return
    const cachedTime = new Date(cacheDate).getTime()
    if (cachedTime <= new Date().getTime() - ONE_HOUR_MS) return
    const parsedData = JSON.parse(cachedData)
    setOperators(parsedData)
    fetchCommentCounts(parsedData)
}

/**
 * Data-fetching hook for OperatorsView. Owns operators/plants/trainers/mixers/
 * tractors/regionPlantCodes/isLoading state and exposes the same loader
 * functions the view previously declared inline. Behavior — including the
 * 1-hour localStorage cache fallback for operators — is unchanged.
 */
export default function useOperatorsData(regionCode) {
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [trainers, setTrainers] = useState([])
    const [mixers, setMixers] = useState([])
    const [tractors, setTractors] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchCommentCounts = useCallback(async (operatorsList) => {
        if (!operatorsList || operatorsList.length === 0) return
        const operatorIds = operatorsList.map((op) => op.employeeId).filter(Boolean)
        if (operatorIds.length === 0) return
        try {
            const commentsCounts = await OperatorService.fetchAllCommentsCounts(operatorIds)
            setOperators((prev) =>
                prev.map((op) => ({
                    ...op,
                    commentsCount: commentsCounts[op.employeeId] || 0
                }))
            )
        } catch (e) {
            console.error('Error loading operator comment counts:', e)
        }
    }, [])

    const fetchOperators = useCallback(
        async (codes) => {
            try {
                const data = await OperatorService.fetchOperators(codes)
                setOperators(data)
                localStorage.setItem('cachedOperators', JSON.stringify(data))
                localStorage.setItem('cachedOperatorsDate', new Date().toISOString())
                fetchCommentCounts(data)
            } catch {
                hydrateFromCache(setOperators, fetchCommentCounts)
            }
        },
        [fetchCommentCounts]
    )

    const fetchAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            const codes = await PlantService.getAllowedPlantCodes(regionCode)
            setRegionPlantCodes(codes)
            await Promise.all([
                fetchOperators(codes),
                PlantService.fetchPlants(codes).then(setPlants, () => setPlants([])),
                OperatorService.fetchTrainers().then(setTrainers, () => setTrainers([])),
                MixerService.fetchMixers(codes).then(setMixers, () => setMixers([])),
                TractorService.fetchTractors(codes).then(setTractors, () => setTractors([]))
            ])
        } catch {
        } finally {
            setIsLoading(false)
        }
    }, [regionCode, fetchOperators])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    return {
        fetchAllData,
        fetchOperators,
        isLoading,
        mixers,
        operators,
        plants,
        regionPlantCodes,
        setOperators,
        setRegionPlantCodes,
        tractors,
        trainers
    }
}
