import { useEffect, useMemo, useState } from 'react'

import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { UserService } from '../../services/UserService'
import { DateUtility } from '../../utils/DateUtility'
import { usePreferences } from '../context/PreferencesContext'

/**
 * Loads all backing data for the mixer detail view (mixer, operators, plants,
 * comments, issues, region-scoped plant filtering, current-region lookup, and
 * delete permission). Returns both raw state and setters so the parent view
 * can mutate as the user edits.
 */
export default function useMixerDetailData(mixerId) {
    const { preferences } = usePreferences()
    const [mixer, setMixer] = useState(null)
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [mixers, setMixers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [updatedByEmail, setUpdatedByEmail] = useState(null)
    const [canDeleteMixer, setCanDeleteMixer] = useState(false)
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [currentRegion, setCurrentRegion] = useState(null)
    const [comments, setComments] = useState([])
    const [issues, setIssues] = useState([])
    const [initialMixer, setInitialMixer] = useState(null)

    useEffect(() => {
        let cancelled = false
        async function fetchData() {
            setIsLoading(true)
            try {
                const [mixerData, operatorsData, plantsData, allMixers] = await Promise.all([
                    MixerService.fetchMixerById(mixerId),
                    OperatorService.fetchOperators(),
                    PlantService.fetchPlants(),
                    MixerService.getAllMixers()
                ])
                if (cancelled) return
                setMixer(mixerData)
                setOperators(operatorsData)
                setPlants(plantsData)
                setMixers(allMixers)
                setInitialMixer(mixerData)
                document.documentElement.style.setProperty('--rating-value', mixerData?.cleanlinessRating || 0)
                if (mixerData?.updatedBy) {
                    try {
                        const userName = await UserService.getUserDisplayName(mixerData.updatedBy)
                        if (!cancelled) setUpdatedByEmail(userName)
                    } catch {
                        if (!cancelled) setUpdatedByEmail('Unknown User')
                    }
                }
            } catch {
                // best-effort load; downstream UI handles missing mixer
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        fetchData()
        return () => {
            cancelled = true
        }
    }, [mixerId])

    useEffect(() => {
        let cancelled = false
        async function checkDeletePermission() {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (!userId) {
                    if (!cancelled) setCanDeleteMixer(false)
                    return
                }
                const hasPermission = await UserService.hasPermission(userId, 'detailview.delete')
                if (!cancelled) setCanDeleteMixer(hasPermission)
            } catch {
                if (!cancelled) setCanDeleteMixer(false)
            }
        }
        checkDeletePermission()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        async function loadAllowedPlants() {
            let regionCode = preferences.selectedRegion?.code || ''
            try {
                if (!regionCode) {
                    const user = await UserService.getCurrentUser()
                    const uid = user?.id || ''
                    if (uid) {
                        const profilePlant = await UserService.getUserPlant(uid)
                        const plantCode =
                            typeof profilePlant === 'string'
                                ? profilePlant
                                : profilePlant?.plant_code || profilePlant?.plantCode || ''
                        if (plantCode) {
                            const regions = await PlantService.fetchRegionsByPlantCode(plantCode)
                            const region = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = region ? region.regionCode || region.region_code || '' : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await PlantService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(
                    regionPlants
                        .map((p) =>
                            String(p.plantCode || p.plant_code || '')
                                .trim()
                                .toUpperCase()
                        )
                        .filter(Boolean)
                )
                setRegionPlantCodes(codes)
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }
        loadAllowedPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    useEffect(() => {
        let cancelled = false
        async function fetchCommentsAndIssues() {
            if (!mixerId) return
            try {
                const [commentData, issueData] = await Promise.all([
                    MixerService.fetchComments(mixerId).catch(() => []),
                    MixerService.fetchIssues(mixerId).catch(() => [])
                ])
                if (cancelled) return
                const normalizedComments = Array.isArray(commentData)
                    ? commentData.map((c) => ({
                          author: c.author,
                          created_at: c.createdAt || c.created_at,
                          id: c.id,
                          text: c.text
                      }))
                    : []
                setComments(normalizedComments)
                setIssues(
                    Array.isArray(issueData) ? issueData.filter((i) => i && (i.issue || i.title || i.description)) : []
                )
            } catch {
                if (cancelled) return
                setComments([])
                setIssues([])
            }
        }
        fetchCommentsAndIssues()
        return () => {
            cancelled = true
        }
    }, [mixerId])

    useEffect(() => {
        let cancelled = false
        if (!mixer?.assignedPlant) return undefined
        PlantService.fetchRegionsByPlantCode(mixer.assignedPlant)
            .then((regions) => {
                if (cancelled) return
                setCurrentRegion(regions && regions.length > 0 ? regions[0].regionCode : null)
            })
            .catch(() => {
                if (!cancelled) setCurrentRegion(null)
            })
        return () => {
            cancelled = true
        }
    }, [mixer?.assignedPlant])

    const filteredPlants = useMemo(() => {
        if (!regionPlantCodes || regionPlantCodes.size === 0) return []
        return plants.filter((p) =>
            regionPlantCodes.has(
                String(p.plantCode || p.plant_code || '')
                    .trim()
                    .toUpperCase()
            )
        )
    }, [plants, regionPlantCodes])

    return {
        canDeleteMixer,
        comments,
        currentRegion,
        filteredPlants,
        initialMixer,
        isLoading,
        issues,
        mixer,
        mixers,
        operators,
        plants,
        setMixer,
        setOperators,
        setUpdatedByEmail,
        updatedByEmail
    }
}

/**
 * Returns the parsed local-date or null fall-through for a date-like value.
 * Centralized here so both the data hook and edit-state hook agree on parsing.
 */
export function parseLocalDateOrNull(value) {
    return value ? DateUtility.parseLocalDate(value) : null
}
