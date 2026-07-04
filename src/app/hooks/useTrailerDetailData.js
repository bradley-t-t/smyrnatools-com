import { useEffect, useMemo, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { PlantService } from '../../services/PlantService'
import { TractorService } from '../../services/TractorService'
import { TrailerService } from '../../services/TrailerService'
import { UserService } from '../../services/UserService'

/**
 * Resolves the active region code: prefers the user's selected region, then
 * falls back to the region(s) associated with the user's assigned plant.
 */
async function resolveActiveRegionCode(preferenceRegionCode) {
    let regionCode = preferenceRegionCode || ''
    if (regionCode) return regionCode
    const user = await UserService.getCurrentUser()
    const uid = user?.id || ''
    if (!uid) return ''
    const profilePlant = await UserService.getUserPlant(uid)
    const plantCode =
        typeof profilePlant === 'string' ? profilePlant : profilePlant?.plant_code || profilePlant?.plantCode || ''
    if (!plantCode) return ''
    const regions = await PlantService.fetchRegionsByPlantCode(plantCode)
    const r = Array.isArray(regions) && regions.length ? regions[0] : null
    return r ? r.regionCode || r.region_code || '' : ''
}

/**
 * Loads and tracks the set of plant codes scoped to the user's active region.
 * Returns a Set of normalized (uppercase, trimmed) codes.
 */
export function useRegionPlantCodes(selectedRegionCode) {
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())

    useEffect(() => {
        let cancelled = false
        async function loadAllowedPlants() {
            try {
                const regionCode = await resolveActiveRegionCode(selectedRegionCode)
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
    }, [selectedRegionCode])

    return regionPlantCodes
}

/**
 * Loads the comments and maintenance issues belonging to the trailer. Used by
 * the (unused) email-export helper; preserved to keep parity with the
 * original view.
 */
export function useTrailerCommentsAndIssues(trailer, trailerId) {
    const [comments, setComments] = useState([])
    const [issues, setIssues] = useState([])

    useEffect(() => {
        async function fetchCommentsAndIssues() {
            const id = trailer?.id || trailerId
            if (!id) return
            const { data: commentData } = await Database.from('trailers_comments')
                .select('*')
                .eq('trailer_id', id)
                .order('created_at', { ascending: false })
            setComments(Array.isArray(commentData) ? commentData.filter((c) => c && (c.comment || c.text)) : [])
            const { data: issueData } = await Database.from('trailers_maintenance')
                .select('*')
                .eq('trailer_id', id)
                .order('time_created', { ascending: false })
            setIssues(
                Array.isArray(issueData) ? issueData.filter((i) => i && (i.issue || i.title || i.description)) : []
            )
        }
        fetchCommentsAndIssues()
    }, [trailer, trailerId])

    return { comments, issues }
}

/**
 * Resolves whether the current user has the `detailview.delete` permission.
 */
export function useCanDeleteTrailer() {
    const [canDeleteTrailer, setCanDeleteTrailer] = useState(false)

    useEffect(() => {
        async function checkDeletePermission() {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (!userId) {
                    setCanDeleteTrailer(false)
                    return
                }
                const hasPermission = await UserService.hasPermission(userId, 'detailview.delete')
                setCanDeleteTrailer(hasPermission)
            } catch {
                setCanDeleteTrailer(false)
            }
        }
        checkDeletePermission()
    }, [])

    return canDeleteTrailer
}

/**
 * Tracks the region code derived from the trailer's currently assigned plant.
 * Returns null when the lookup fails or no plant is assigned.
 */
export function useCurrentRegionForTrailer(assignedPlant) {
    const [currentRegion, setCurrentRegion] = useState(null)

    useEffect(() => {
        if (!assignedPlant) return
        PlantService.fetchRegionsByPlantCode(assignedPlant)
            .then((regions) => {
                if (regions && regions.length > 0) {
                    setCurrentRegion(regions[0].regionCode)
                } else {
                    setCurrentRegion(null)
                }
            })
            .catch(() => setCurrentRegion(null))
    }, [assignedPlant])

    return currentRegion
}

/**
 * Filters the global plant list down to the user's active region.
 */
export function useFilteredPlants(plants, regionPlantCodes) {
    return useMemo(() => {
        if (!regionPlantCodes || regionPlantCodes.size === 0) return []
        return plants.filter((p) =>
            regionPlantCodes.has(
                String(p.plantCode || p.plant_code || '')
                    .trim()
                    .toUpperCase()
            )
        )
    }, [plants, regionPlantCodes])
}

/**
 * Initial bulk loader for the trailer detail view: fetches the target
 * trailer (when not provided) plus the global tractors / plants / trailers
 * lists.
 */
export async function loadInitialTrailerDetailData(initialTrailer, trailerId) {
    let trailerData = initialTrailer
    if (!trailerData && trailerId) {
        trailerData = await TrailerService.fetchTrailerById(trailerId)
    }
    const [tractorsData, plantsData, allTrailers] = await Promise.all([
        TractorService.fetchTractors(),
        PlantService.fetchPlants(),
        TrailerService.fetchTrailers()
    ])
    return { allTrailers, plantsData, tractorsData, trailerData }
}

/**
 * Warns the browser before unloading when there are pending unsaved changes.
 */
export function useBeforeUnloadGuard(hasUnsavedChanges) {
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])
}
