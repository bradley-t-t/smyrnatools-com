import { useCallback, useEffect, useRef, useState } from 'react'

import { Database } from '../../../services/DatabaseService'
import { OperatorService } from '../../../services/OperatorService'
import { PlantService } from '../../../services/PlantService'

/**
 * Centralizes all data fetching, realtime subscriptions, and region-scoped
 * plant filtering for the unified AssetView component.
 */
export default function useAssetData({
    config,
    onResetSelectedPlant,
    preferences,
    searchText,
    selectedPlant,
    updateFilterRef
}) {
    const { service } = config

    // --- Core state ---
    const [allItems, setAllItems] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRegionLoading, setIsRegionLoading] = useState(false)
    const [items, setItems] = useState([])
    const [itemsLoaded, setItemsLoaded] = useState(false)
    const [operators, setOperators] = useState([])
    const [operatorsLoaded, setOperatorsLoaded] = useState(false)
    const [plants, setPlants] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [tractors, setTractors] = useState([])

    // Stable refs for values needed inside callbacks without re-triggering them
    const operatorsRef = useRef(operators)
    operatorsRef.current = operators
    const regionCodeRef = useRef(preferences.selectedRegion?.code)
    regionCodeRef.current = preferences.selectedRegion?.code

    // --- Attach isVerified to item ---
    const attachIsVerified = useCallback(
        (obj) => {
            if (!obj || !config.attachIsVerified) return obj
            return config.attachIsVerified(obj)
        },
        [config]
    )

    // --- Load comment/issue counts ---
    const loadDetailCounts = useCallback(
        async (itemsList) => {
            if (!itemsList?.length) return
            const ids = itemsList.map((p) => p.id).filter(Boolean)
            if (!ids.length) return
            try {
                const [commentsCounts, issuesCounts] = await Promise.all([
                    service.fetchAllCommentsCounts(ids),
                    service.fetchAllIssuesCounts(ids)
                ])
                const mergeCounts = (prev) =>
                    prev.map((p) => ({
                        ...p,
                        commentsCount: commentsCounts[p.id] || 0,
                        openIssuesCount: issuesCounts[p.id] || 0
                    }))
                setItems(mergeCounts)
                if (config.hasVinSearch) setAllItems(mergeCounts)
            } catch (e) {
                console.error(`Error loading ${config.singularLabel} details:`, e)
            }
        },
        [config.hasVinSearch, config.singularLabel, service]
    )

    // --- Verification check ---
    const runVerificationCheck = useCallback(
        async (itemsToCheck) => {
            if (!config.verification?.cleanupCheck || !itemsToCheck?.length) return
            try {
                const result = await config.verification.cleanupCheck(itemsToCheck, operatorsRef.current)
                if (result.fixed > 0) {
                    const codes = await PlantService.getAllowedPlantCodes(regionCodeRef.current)
                    const refreshed = config.fetchItems ? await config.fetchItems(codes) : await service.fetchAll(codes)
                    setItems(refreshed)
                    if (config.hasVinSearch) setAllItems(refreshed)
                    loadDetailCounts(refreshed)
                }
            } catch {
                // Verification check is best-effort
            }
        },
        [config, loadDetailCounts, service]
    )

    // --- Data fetching ---
    const fetchAllItems = useCallback(
        async (codes) => {
            try {
                const rawItems = config.fetchItems ? await config.fetchItems(codes) : await service.fetchAll(codes)
                const list = Array.isArray(rawItems) ? rawItems : []

                // Post-fetch cleanup (e.g., cleanupNullOperators)
                if (config.postFetchCleanup) {
                    const cleanupResult = await config.postFetchCleanup(list)
                    if (cleanupResult.fixed > 0) {
                        const refreshed = config.fetchItems
                            ? await config.fetchItems(codes)
                            : await service.fetchAll(codes)
                        setItems(refreshed)
                        if (config.hasVinSearch) setAllItems(refreshed)
                        setItemsLoaded(true)
                        loadDetailCounts(refreshed)
                        setTimeout(() => runVerificationCheck(refreshed), 1000)
                        return
                    }
                }

                setItems(list)
                if (config.hasVinSearch) setAllItems(list)
                setItemsLoaded(true)
                loadDetailCounts(list)
                if (config.verification?.cleanupCheck) {
                    setTimeout(() => runVerificationCheck(list), 1000)
                }
            } catch (error) {
                console.error(`[ASSET VIEW] Error fetching ${config.pluralLabel}:`, error)
                setItems([])
                if (config.hasVinSearch) setAllItems([])
            }
        },
        [config, loadDetailCounts, runVerificationCheck, service]
    )

    // --- Fetch operators (with comment counts for inline badges) ---
    const fetchOperators = useCallback(async () => {
        if (!config.hasOperatorAssignment) return
        try {
            const data = await OperatorService.fetchOperators()
            const ops = Array.isArray(data) ? data : []
            const ids = ops.map((op) => op.employeeId).filter(Boolean)
            if (ids.length) {
                const counts = await OperatorService.fetchAllCommentsCounts(ids)
                ops.forEach((op) => {
                    op.commentsCount = counts[op.employeeId] || 0
                })
            }
            setOperators(ops)
            setOperatorsLoaded(true)
        } catch {
            setOperators([])
        }
    }, [config.hasOperatorAssignment])

    // --- Fetch tractors (for Trailer lookup) ---
    const fetchTractors = useCallback(async () => {
        if (!config.hasTractorAssignment) return
        try {
            const data = await config.fetchTractors()
            setTractors(Array.isArray(data) ? data : [])
        } catch {
            setTractors([])
        }
    }, [config])

    // --- Fetch plants (enriched with district data from the region) ---
    const fetchPlants = useCallback(async (codes) => {
        try {
            const regionCode = regionCodeRef.current
            if (regionCode) {
                // fetchRegionPlants includes districts from the regions_plants junction table
                const regionData = await PlantService.fetchRegionPlants(regionCode)
                setPlants(Array.isArray(regionData) ? regionData : [])
            } else {
                const data = await PlantService.fetchPlants(codes)
                setPlants(Array.isArray(data) ? data : [])
            }
        } catch {
            setPlants([])
        }
    }, [])

    // --- Realtime subscription ---
    const handleRealtimeUpdate = useCallback(
        (eventType, data) => {
            const updateItemInList = (setter) => {
                setter((prev) => {
                    if (eventType === 'UPDATE' && data.new) {
                        return prev.map((item) => {
                            if (item.id !== data.new.id) return item
                            const patched = { ...item }
                            for (const [dbCol, modelProp] of Object.entries(config.realtimeFieldMap)) {
                                if (data.new[dbCol] !== undefined) {
                                    patched[modelProp] = data.new[dbCol] ?? item[modelProp]
                                }
                            }
                            return attachIsVerified(patched)
                        })
                    }
                    if (eventType === 'INSERT' && data.new) {
                        if (regionPlantCodes && !regionPlantCodes.has(data.new.assigned_plant)) return prev
                        if (prev.some((p) => p.id === data.new.id)) return prev
                        const newItem = {
                            createdAt: data.new.created_at ?? new Date().toISOString(),
                            id: data.new.id
                        }
                        for (const [dbCol, modelProp] of Object.entries(config.realtimeFieldMap)) {
                            newItem[modelProp] = data.new[dbCol] ?? ''
                        }
                        return [...prev, attachIsVerified(newItem)]
                    }
                    if (eventType === 'DELETE' && data.old) {
                        return prev.filter((item) => item.id !== data.old.id)
                    }
                    return prev
                })
            }
            updateItemInList(setItems)
            if (config.hasVinSearch) updateItemInList(setAllItems)
        },
        [attachIsVerified, config.hasVinSearch, config.realtimeFieldMap, regionPlantCodes]
    )

    useEffect(() => {
        const channel = Database.channel(config.channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: config.tableName }, (payload) => {
                handleRealtimeUpdate(payload.eventType, { new: payload.new, old: payload.old })
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`${config.singularLabel} realtime subscription error`)
                }
            })
        return () => Database.removeChannel(channel)
    }, [config.channelName, config.singularLabel, config.tableName, handleRealtimeUpdate])

    // --- Main data load ---
    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true)
            try {
                const codes = await PlantService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                const promises = [fetchAllItems(codes), fetchPlants(codes)]
                if (config.hasOperatorAssignment) promises.push(fetchOperators())
                if (config.hasTractorAssignment) promises.push(fetchTractors())
                await Promise.all(promises)
            } finally {
                setIsLoading(false)
            }
        }
        fetchAllData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences])

    // --- Region plant codes ---
    useEffect(() => {
        let cancelled = false
        async function loadAllowedPlants() {
            const code = preferences.selectedRegion?.code
            if (code) setIsRegionLoading(true)
            try {
                const codes = await PlantService.getAllowedPlantCodes(code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '')
                    .trim()
                    .toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    onResetSelectedPlant?.()
                    updateFilterRef.current?.('selectedPlant', '')
                }
            } catch {
                if (!cancelled) setRegionPlantCodes(null)
            } finally {
                if (!cancelled) setIsRegionLoading(false)
            }
        }
        loadAllowedPlants()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences.selectedRegion?.code])

    // --- VIN search (Mixer, Tractor) ---
    useEffect(() => {
        if (!config.hasVinSearch || !config.vinSearchFn) return

        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true)
                try {
                    const vinItems = await config.vinSearchFn(normalizedSearch)
                    const filtered = regionPlantCodes
                        ? vinItems.filter((m) =>
                              regionPlantCodes.has(
                                  String(m.assignedPlant || '')
                                      .trim()
                                      .toUpperCase()
                              )
                          )
                        : vinItems
                    setItems(filtered)
                    setItemsLoaded(true)
                } catch {
                    // VIN search failed, keep current items
                }
                setIsLoading(false)
            } else {
                setItems(allItems)
            }
        }

        if (searchText.trim().length >= 1) {
            searchByVin()
        } else {
            setItems(allItems)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText, allItems, regionPlantCodes])

    return {
        allItems,
        fetchAllItems,
        isLoading,
        isRegionLoading,
        items,
        itemsLoaded,
        operators,
        operatorsLoaded,
        plants,
        regionPlantCodes,
        setAllItems,
        setIsLoading,
        setItems,
        tractors
    }
}
