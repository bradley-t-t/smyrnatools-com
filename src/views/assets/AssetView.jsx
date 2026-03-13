import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import StatusHistoryBar from '../../app/components/common/StatusHistoryBar'
import VerificationRequirementsModal from '../../app/components/common/VerificationRequirementsModal'
import { exportAssetIssuesSheet } from '../../app/components/modules/export/issues/AssetIssuesExport'
import CommentModalSection from '../../app/components/sections/CommentModalSection'
import HistoryViewSection from '../../app/components/sections/HistoryViewSection'
import IssueModalSection from '../../app/components/sections/IssueModalSection'
import ListViewModeSection from '../../app/components/sections/ListViewModeSection'
import RecapModalSection from '../../app/components/sections/RecapModalSection'
import TopSection from '../../app/components/sections/TopSection'
import AssetListSkeleton from '../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../app/context/PreferencesContext'
import { supabase } from '../../services/DatabaseService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import AssetStatsUtility from '../../utils/AssetStatsUtility'
import AssetGridCard from './AssetGridCard'

/** Creates a debounced wrapper that delays invocation until after `delay` ms of inactivity. */
function debounce(fn, delay) {
    let timer = null
    return (...args) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

/**
 * Unified asset list/grid view driven by a config object.
 * Handles data fetching, Supabase realtime subscriptions, region-scoped
 * plant filtering, search, status filtering, sorting, verification,
 * issue export, operator/tractor lookups, filter persistence,
 * and drill-down into the config-provided DetailView.
 *
 * Supports all asset types: Mixer, Tractor, Trailer, Equipment, Pickup Truck.
 */
function AssetView({
    config,
    title,
    onSelectItem,
    setSelectedView,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    const prefsContext = usePreferences()
    const { preferences } = prefsContext
    const pageTitle = title || config.pluralLabel
    const headerRef = useRef(null)

    // Resolve filter persistence functions from PreferencesContext
    const fp = config.filterPersistence
    const updateFilter = fp ? prefsContext[fp.updateFnKey] : null
    const updateFilterRef = useRef(updateFilter)
    updateFilterRef.current = updateFilter
    const resetFilters = fp ? prefsContext[fp.resetFnKey] : null
    const savedFilters = fp ? preferences[fp.filterKey] : null
    const saveLastViewedFilters = prefsContext.saveLastViewedFilters
    const updateOperatorFilter = prefsContext.updateOperatorFilter

    // --- Core state ---
    const [items, setItems] = useState([])
    const [allItems, setAllItems] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRegionLoading, setIsRegionLoading] = useState(false)
    const [searchText, setSearchText] = useState(() => {
        if (initialSearch) return initialSearch
        if (embedded) return ''
        return savedFilters?.searchText || ''
    })
    const [searchInput, setSearchInput] = useState(() => {
        if (initialSearch) return initialSearch
        if (embedded) return ''
        return savedFilters?.searchText || ''
    })
    const [viewMode, setViewMode] = useState(() => {
        if (embedded) return 'list'
        if (savedFilters?.viewMode != null) return savedFilters.viewMode
        if (preferences.defaultViewMode != null) return preferences.defaultViewMode
        return localStorage.getItem(config.viewModeStorageKey) || 'grid'
    })
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedId, setSelectedId] = useState(null)
    const [plants, setPlants] = useState([])
    const [selectedPlant, setSelectedPlant] = useState(() => {
        if (embedded) return ''
        return savedFilters?.selectedPlant || ''
    })
    const [statusFilter, setStatusFilter] = useState(() => {
        if (embedded) return ''
        return savedFilters?.statusFilter || ''
    })
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [modalItemId, setModalItemId] = useState(null)
    const [modalItemNumber, setModalItemNumber] = useState('')
    const [selectedItemForHistory, setSelectedItemForHistory] = useState(null)
    const [isExportingIssues, setIsExportingIssues] = useState(false)

    // --- Operator modal state (comment/history on the operator column) ---
    const [showOperatorCommentModal, setShowOperatorCommentModal] = useState(false)
    const [showOperatorHistoryModal, setShowOperatorHistoryModal] = useState(false)
    const [operatorModalTarget, setOperatorModalTarget] = useState(null)
    const [itemsLoaded, setItemsLoaded] = useState(false)

    // --- Operator state (Mixer, Tractor) ---
    const [operators, setOperators] = useState([])
    const [operatorsLoaded, setOperatorsLoaded] = useState(false)

    // --- Tractor lookup state (Trailer) ---
    const [tractors, setTractors] = useState([])

    // --- Verification state ---
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [verifyItem, setVerifyItem] = useState(null)
    const [verifyVin, setVerifyVin] = useState('')
    const [verifyMake, setVerifyMake] = useState('')
    const [verifyModel, setVerifyModel] = useState('')
    const [verifyYear, setVerifyYear] = useState('')
    const [verifyLastServiceDate, setVerifyLastServiceDate] = useState(null)
    const [verifyLastChipDate, setVerifyLastChipDate] = useState(null)

    // --- Recap state (Mixer) ---
    const [showRecap, setShowRecap] = useState(false)

    // --- Extra filter state ---
    const [freightFilter, setFreightFilter] = useState(() => {
        if (embedded) return ''
        return savedFilters?.freightFilter || ''
    })
    const [extraTypeFilter, setExtraTypeFilter] = useState(() => {
        if (embedded) return ''
        return savedFilters?.equipmentTypeFilter || savedFilters?.typeFilter || ''
    })

    const { service } = config

    // --- Initial search effect ---
    useEffect(() => {
        if (!initialSearch) return
        const timer = setTimeout(() => {
            setSearchText(initialSearch)
            setSearchInput(initialSearch)
        }, 100)
        return () => clearTimeout(timer)
    }, [initialSearch])

    // --- Attach isVerified to item ---
    const attachIsVerified = useCallback(
        (obj) => {
            if (!obj || !config.attachIsVerified) return obj
            return config.attachIsVerified(obj)
        },
        [config]
    )

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
        [regionPlantCodes, config.realtimeFieldMap, config.hasVinSearch, attachIsVerified]
    )

    useEffect(() => {
        const channel = supabase
            .channel(config.channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: config.tableName }, (payload) => {
                handleRealtimeUpdate(payload.eventType, { new: payload.new, old: payload.old })
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`${config.singularLabel} realtime subscription error`)
                }
            })
        return () => supabase.removeChannel(channel)
    }, [handleRealtimeUpdate, config.channelName, config.tableName, config.singularLabel])

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
        [service, config.singularLabel, config.hasVinSearch]
    )

    // --- Verification check ---
    const operatorsRef = useRef(operators)
    operatorsRef.current = operators
    const regionCodeRef = useRef(preferences.selectedRegion?.code)
    regionCodeRef.current = preferences.selectedRegion?.code

    const runVerificationCheck = useCallback(
        async (itemsToCheck) => {
            if (!config.verification?.cleanupCheck || !itemsToCheck?.length) return
            try {
                const result = await config.verification.cleanupCheck(itemsToCheck, operatorsRef.current)
                if (result.fixed > 0) {
                    const codes = await RegionService.getAllowedPlantCodes(regionCodeRef.current)
                    const refreshed = config.fetchItems ? await config.fetchItems(codes) : await service.fetchAll(codes)
                    setItems(refreshed)
                    if (config.hasVinSearch) setAllItems(refreshed)
                    loadDetailCounts(refreshed)
                }
            } catch {
                // Verification check is best-effort
            }
        },
        [config, service, loadDetailCounts]
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
        [config, service, loadDetailCounts, runVerificationCheck]
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

    // --- Fetch plants ---
    const fetchPlants = useCallback(async (codes) => {
        try {
            const data = await PlantService.fetchPlants(codes)
            setPlants(Array.isArray(data) ? data : [])
        } catch {
            setPlants([])
        }
    }, [])

    // --- Main data load ---
    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true)
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
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

        // Restore persisted filters
        if (savedFilters && !embedded) {
            setSearchText(savedFilters.searchText || '')
            setSearchInput(savedFilters.searchText || '')
            setSelectedPlant(savedFilters.selectedPlant || '')
            setStatusFilter(savedFilters.statusFilter || '')
            if (savedFilters.freightFilter !== undefined) setFreightFilter(savedFilters.freightFilter || '')
            if (savedFilters.equipmentTypeFilter !== undefined)
                setExtraTypeFilter(savedFilters.equipmentTypeFilter || '')
            if (savedFilters.typeFilter !== undefined) setExtraTypeFilter(savedFilters.typeFilter || '')
        }

        // Restore view mode from preferences
        if (!embedded) {
            if (savedFilters?.viewMode != null) setViewMode(savedFilters.viewMode)
            else if (preferences.defaultViewMode != null) setViewMode(preferences.defaultViewMode)
            else {
                const lastUsed = localStorage.getItem(config.viewModeStorageKey)
                if (lastUsed) setViewMode(lastUsed)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences])

    // --- Region plant codes ---
    useEffect(() => {
        let cancelled = false
        async function loadAllowedPlants() {
            const code = preferences.selectedRegion?.code
            if (code) setIsRegionLoading(true)
            try {
                const codes = await RegionService.getAllowedPlantCodes(code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '')
                    .trim()
                    .toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('')
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

    // --- View mode ---
    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateFilter?.('viewMode', null)
            localStorage.removeItem(config.viewModeStorageKey)
        } else {
            setViewMode(mode)
            updateFilter?.('viewMode', mode)
            localStorage.setItem(config.viewModeStorageKey, mode)
        }
    }

    // --- Export issues ---
    async function handleExportIssues() {
        setIsExportingIssues(true)
        try {
            await exportAssetIssuesSheet({
                assetType: config.exportConfig.assetType,
                assets: config.hasVinSearch ? allItems : items,
                identifierField: config.exportConfig.identifierField,
                plants,
                service
            })
        } catch (err) {
            console.error('Export issues failed:', err)
        } finally {
            setIsExportingIssues(false)
        }
    }

    // --- Sort ---
    function handleHeaderClick(label) {
        if (sortKey === label) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    // --- Sticky cover height ---
    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector(`.global-dashboard-container.${config.viewClassName}`)
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }
        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchInput, selectedPlant, statusFilter, freightFilter, extraTypeFilter, config.viewClassName])

    // --- Debounced search ---
    const debouncedSetSearchText = useMemo(
        () =>
            debounce((value) => {
                setSearchText(value)
                updateFilterRef.current?.('searchText', value)
            }, 300),
        []
    )

    // --- Select item ---
    const handleSelectItem = useCallback(
        (itemId) => {
            const item = items.find((m) => m.id === itemId)
            if (!item) return
            saveLastViewedFilters?.()
            setSelectedId(config.selectsFullObject ? item : itemId)
            onSelectItem?.(itemId)
        },
        [items, saveLastViewedFilters, onSelectItem, config.selectsFullObject]
    )

    // --- Verification ---
    const handleVerify = useCallback(
        (itemId) => {
            if (!config.verification) return
            const item = items.find((m) => m.id === itemId)
            if (!item || item.status === 'Retired') return

            setVerifyItem(item)
            const fieldValues = config.verification.getFieldValues(item)
            setVerifyVin(fieldValues.vin)
            setVerifyMake(fieldValues.make)
            setVerifyModel(fieldValues.model)
            setVerifyYear(fieldValues.year)
            setVerifyLastServiceDate(fieldValues.lastServiceDate)
            setVerifyLastChipDate(fieldValues.lastChipDate ?? null)
            setShowVerifyModal(true)
        },
        [items, config.verification]
    )

    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyItem || !config.verification) return
        try {
            const updates = {}
            const fieldValues = config.verification.getFieldValues(verifyItem)

            if (verifyVin?.trim() && verifyVin !== fieldValues.vin) updates.vin = verifyVin
            if (verifyMake?.trim() && verifyMake !== fieldValues.make) updates.make = verifyMake
            if (verifyModel?.trim() && verifyModel !== fieldValues.model) updates.model = verifyModel
            if (verifyYear && String(verifyYear).trim() && verifyYear !== fieldValues.year) updates.year = verifyYear
            if (verifyLastServiceDate && verifyLastServiceDate !== fieldValues.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate
            }
            if (
                config.verification.hasLastChipDate &&
                verifyLastChipDate &&
                verifyLastChipDate !== fieldValues.lastChipDate
            ) {
                updates.lastChipDate = verifyLastChipDate
            }

            if (Object.keys(updates).length > 0) {
                await config.verification.updateFn(verifyItem.id, updates)
            }

            const verified = await config.verification.verifyFn(verifyItem.id)
            const updateList = (prev) => prev.map((m) => (m.id === verifyItem.id ? verified : m))
            setItems(updateList)
            if (config.hasVinSearch) setAllItems(updateList)
            setShowVerifyModal(false)
            setVerifyItem(null)
        } catch (error) {
            console.error(`Failed to verify ${config.singularLabel}:`, error)
            alert(`Failed to verify ${config.singularLabel}. Please try again.`)
        }
    }, [verifyItem, verifyVin, verifyMake, verifyModel, verifyYear, verifyLastServiceDate, verifyLastChipDate, config])

    // --- Unassigned operators count ---
    const unassignedActiveOperatorsCount = useMemo(() => {
        if (!config.operatorConfig) return 0
        return AssetStatsUtility.countUnassignedActiveOperators(items, operators, searchText, {
            assignedOperatorField: config.operatorConfig.assignedField,
            assignedPlantField: 'assignedPlant',
            operatorIdField: 'employeeId',
            position: config.operatorConfig.position,
            regionPlantCodes,
            selectedPlant
        })
    }, [operators, items, selectedPlant, searchText, regionPlantCodes, config.operatorConfig])

    const canShowUnassignedOverlay =
        config.hasOperatorAssignment &&
        itemsLoaded &&
        operatorsLoaded &&
        !isLoading &&
        unassignedActiveOperatorsCount > 0

    // --- Duplicate sets ---
    const duplicates = useMemo(() => {
        const result = {}
        for (const check of config.duplicateChecks || []) {
            result[check.key] = check.compute(items)
        }
        return result
    }, [items, config.duplicateChecks])

    // --- Recap operators (Mixer) ---
    const filteredOperatorsForRecap = useMemo(() => {
        if (!config.recapConfig) return []
        return operators.filter((op) => {
            if (op.position !== config.recapConfig.operatorPosition) return false
            const opPlant = op.plantCode || op.assignedPlant || ''
            if (!selectedPlant) {
                return (
                    !regionPlantCodes ||
                    regionPlantCodes.size === 0 ||
                    regionPlantCodes.has(String(opPlant).trim().toUpperCase())
                )
            }
            return String(opPlant) === String(selectedPlant)
        })
    }, [operators, selectedPlant, regionPlantCodes, config.recapConfig])

    // --- Filtering & sorting ---
    const filteredResult = useMemo(() => {
        const q = searchText.trim().toLowerCase()
        const normalizedSearch = q.replace(/\s+/g, '')
        const filtered = []
        const potentialMatches = []
        const hasActiveFilters =
            (selectedPlant && selectedPlant !== 'All') ||
            (statusFilter && statusFilter !== 'All Statuses' && statusFilter !== '') ||
            !!freightFilter ||
            !!extraTypeFilter

        items.forEach((item) => {
            // Search
            let matchesSearch = true
            if (normalizedSearch) {
                if (config.searchFields) {
                    if (exactMatch && config.exactMatchFn) {
                        matchesSearch = config.exactMatchFn(item, normalizedSearch)
                    } else {
                        matchesSearch = config.searchFields(item, q, { exactMatch, operators, tractors })
                    }
                }
            }

            // Plant
            const matchesPlant =
                !selectedPlant ||
                selectedPlant === 'All' ||
                String(item.assignedPlant || '')
                    .trim()
                    .toUpperCase() === selectedPlant.toUpperCase()

            // Region
            const matchesRegion =
                !regionPlantCodes ||
                regionPlantCodes.size === 0 ||
                regionPlantCodes.has(
                    String(item.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )

            // Status
            let matchesStatus = true
            if (statusFilter && statusFilter !== 'All Statuses' && statusFilter !== '') {
                const specialFilter = config.specialStatusFilters?.[statusFilter]
                if (specialFilter) {
                    matchesStatus = specialFilter(item)
                } else {
                    matchesStatus = String(item.status || '').trim() === statusFilter
                }
            }

            // Freight (Tractor)
            const matchesFreight = !freightFilter || freightFilter === 'All Freight' || item.freight === freightFilter

            // Extra type filter (Equipment type, Trailer type)
            let matchesExtraType = true
            if (extraTypeFilter && config.extraTypeFilter) {
                matchesExtraType = config.extraTypeFilter.matchFn(item, extraTypeFilter)
            }

            if (matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesFreight && matchesExtraType) {
                filtered.push(item)
            } else if (config.hasPotentialMatches && matchesSearch && hasActiveFilters && searchText.trim()) {
                potentialMatches.push(item)
            }
        })

        const sortFn = (a, b) => {
            if (!sortKey) {
                return AssetStatsUtility.compareByStatusThenNumber(
                    a,
                    b,
                    config.defaultSortFields.statusField,
                    config.defaultSortFields.numberField
                )
            }
            const customComparator = config.customSortComparators?.[sortKey]
            if (customComparator) {
                const result = customComparator(a, b, { operators, plants, sortDirection, tractors })
                return sortDirection === 'asc' ? result : -result
            }
            const prop = config.sortMappings[sortKey]
            if (!prop) return 0
            const aVal = a[prop]
            const bVal = b[prop]
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
            }
            const aStr = String(aVal || '').toLowerCase()
            const bStr = String(bVal || '').toLowerCase()
            if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
            if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
            return 0
        }

        return {
            filtered: AssetStatsUtility.sortWithRetiredLast(filtered, sortFn, 'status'),
            potentialMatches: AssetStatsUtility.sortWithRetiredLast(potentialMatches, sortFn, 'status')
        }
    }, [
        items,
        searchText,
        selectedPlant,
        statusFilter,
        freightFilter,
        extraTypeFilter,
        regionPlantCodes,
        sortKey,
        sortDirection,
        config,
        operators,
        plants,
        tractors,
        exactMatch
    ])

    // --- Render list row ---
    const renderRow = useCallback(
        (item, handleSelect, onComment, onIssue, onVerify, onHistory, _index, alternatingBg) => {
            const { columns } = config.listConfig
            const cellBase = {
                backgroundColor: alternatingBg,
                borderBottom: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                padding: '20px 16px',
                verticalAlign: 'middle'
            }
            const cellBold = { ...cellBase, color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 700 }
            const actionBtnStyle = {
                alignItems: 'center',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                fontSize: '14px',
                height: '36px',
                justifyContent: 'center',
                marginRight: '8px',
                width: '36px'
            }

            const renderCell = (col) => {
                const style = col.bold ? { ...cellBold, width: col.width } : { ...cellBase, width: col.width }

                // --- Status badge ---
                if (col.type === 'status') {
                    const displayStatus = col.getDisplayStatus ? col.getDisplayStatus(item) : item.status
                    const badgeClasses = config.statusBadgeClasses?.[displayStatus] || 'bg-slate-100 text-slate-500'
                    const dateToUse = item.statusChangedAt || item.createdAt
                    const days = dateToUse
                        ? Math.max(1, Math.floor((Date.now() - new Date(dateToUse).getTime()) / 86400000))
                        : 1
                    const daysSuffix =
                        displayStatus && displayStatus !== 'Retired' ? ` (${days} day${days !== 1 ? 's' : ''})` : ''
                    return (
                        <td key={col.key} style={style}>
                            <div>
                                <span
                                    className={`inline-block rounded-2xl text-xs font-semibold px-3.5 py-1.5 ${badgeClasses}`}
                                >
                                    {displayStatus || '---'}
                                    {daysSuffix}
                                </span>
                                <StatusHistoryBar
                                    itemId={item.id}
                                    itemType={config.historyType}
                                    currentStatus={item.status}
                                    createdAt={item.createdAt}
                                />
                            </div>
                        </td>
                    )
                }

                // --- Truck/equipment number with copy ---
                if (col.type === 'truckNumber') {
                    const val = col.getValue ? col.getValue(item) : item[col.key]
                    return (
                        <td key={col.key} style={{ ...cellBold, width: col.width }}>
                            {val ? (
                                <div className="flex items-center gap-1.5">
                                    {val}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            navigator.clipboard.writeText(val)
                                            const icon = e.currentTarget.querySelector('i')
                                            icon.className = 'fas fa-check'
                                            icon.style.color = '#22c55e'
                                            setTimeout(() => {
                                                icon.className = 'fas fa-copy'
                                                icon.style.color = ''
                                            }, 1500)
                                        }}
                                        title={col.copyTitle || 'Copy'}
                                        className="inline-flex items-center bg-transparent border-none text-[color:var(--text-secondary)] cursor-pointer text-xs p-0.5"
                                    >
                                        <i className="fas fa-copy" />
                                    </button>
                                </div>
                            ) : (
                                '---'
                            )}
                        </td>
                    )
                }

                // --- Operator lookup with action buttons ---
                if (col.type === 'operator') {
                    const operator = operators.find(
                        (op) => op.employeeId === item[col.lookupField || 'assignedOperator']
                    )
                    return (
                        <td key={col.key} style={style}>
                            {operator?.name ? (
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium">{operator.name}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(operator.name)
                                                const icon = e.currentTarget.querySelector('i')
                                                icon.className = 'fas fa-check'
                                                icon.style.color = '#22c55e'
                                                setTimeout(() => {
                                                    icon.className = 'fas fa-copy'
                                                    icon.style.color = ''
                                                }, 1500)
                                            }}
                                            title="Copy operator name"
                                            className="inline-flex items-center bg-transparent border-none text-[color:var(--text-secondary)] cursor-pointer text-xs p-0.5"
                                        >
                                            <i className="fas fa-copy" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setOperatorModalTarget(operator)
                                                setShowOperatorCommentModal(true)
                                            }}
                                            title="Operator comments"
                                            className="relative inline-flex items-center gap-1 rounded-md border border-[color:var(--border-light)] bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] cursor-pointer text-[10px] px-1.5 py-0.5 transition-all hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)]"
                                        >
                                            <i className="fas fa-comment text-[9px]" />
                                            <span>Comments</span>
                                            {operator.commentsCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full bg-blue-500 text-white text-[8px] font-bold leading-none shadow-sm">
                                                    {operator.commentsCount > 9 ? '9+' : operator.commentsCount}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setOperatorModalTarget(operator)
                                                setShowOperatorHistoryModal(true)
                                            }}
                                            title="Operator history"
                                            className="relative inline-flex items-center gap-1 rounded-md border border-[color:var(--border-light)] bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] cursor-pointer text-[10px] px-1.5 py-0.5 transition-all hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)]"
                                        >
                                            <i className="fas fa-history text-[9px]" />
                                            <span>History</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <span className="italic text-[color:var(--text-secondary)]">Not Assigned</span>
                            )}
                        </td>
                    )
                }

                // --- Star rating (cleanliness, condition) ---
                if (col.type === 'stars') {
                    const rating = Math.round(item[col.ratingField || col.key] || 0)
                    const showNAForRetired = col.naForRetired && item.status === 'Retired'
                    return (
                        <td key={col.key} style={style}>
                            {showNAForRetired ? (
                                <span className="text-[color:var(--text-secondary)]">N/A</span>
                            ) : (
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <i
                                            key={i}
                                            className="fas fa-star text-sm"
                                            style={{ color: i < rating ? '#f59e0b' : 'var(--border-light)' }}
                                        />
                                    ))}
                                    {col.dirtyWarning && rating > 0 && rating < 3 && (
                                        <span className="bg-[#fee2e2] text-[#dc2626] rounded text-[10px] font-bold ml-2 px-2 py-0.5">
                                            DIRTY
                                        </span>
                                    )}
                                </div>
                            )}
                        </td>
                    )
                }

                // --- Verified button ---
                if (col.type === 'verified') {
                    const isVerified = col.getIsVerified ? col.getIsVerified(item) : item.isVerified?.()
                    const verifyBtnClass = (v) => {
                        const base =
                            'inline-flex items-center border-none rounded-lg font-semibold whitespace-nowrap text-xs gap-1.5 px-3.5 py-2'
                        return v
                            ? `${base} bg-[#dcfce7] text-[#166534] cursor-default`
                            : `${base} bg-[#fef3c7] text-[#92400e] cursor-pointer`
                    }
                    return (
                        <td key={col.key} style={style}>
                            {item.status === 'Retired' ? (
                                <span className="bg-[color:var(--bg-secondary)] rounded-lg text-xs font-semibold text-[color:var(--text-secondary)] px-3.5 py-2">
                                    N/A
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onVerify?.(item.id, config.getModalIdentifier(item))
                                    }}
                                    title={isVerified ? 'Verified' : 'Click to verify'}
                                    className={verifyBtnClass(isVerified)}
                                >
                                    <i className={`fas ${isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
                                    <span>{isVerified ? 'Verified' : 'Verify'}</span>
                                </button>
                            )}
                        </td>
                    )
                }

                // --- Tractor lookup (Trailer) ---
                if (col.type === 'tractor') {
                    const tractor = item.assignedTractor ? tractors.find((t) => t.id === item.assignedTractor) : null
                    return (
                        <td key={col.key} style={style}>
                            {tractor?.truckNumber || '---'}
                        </td>
                    )
                }

                // --- VIN with copy button ---
                if (col.type === 'vin') {
                    const vinVal = col.getValue ? col.getValue(item) : item[col.key]
                    const normalizedKey = col.normalize?.(item)
                    const isDuplicate = normalizedKey && duplicates[col.duplicateKey]?.has(normalizedKey)
                    return (
                        <td
                            key={col.key}
                            style={{
                                ...style,
                                color: 'var(--text-secondary)',
                                fontFamily: 'ui-monospace, monospace',
                                fontSize: '12px'
                            }}
                        >
                            {vinVal ? (
                                <div className="flex items-center gap-1.5">
                                    {vinVal}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            navigator.clipboard.writeText(vinVal)
                                            const icon = e.currentTarget.querySelector('i')
                                            icon.className = 'fas fa-check'
                                            icon.style.color = '#22c55e'
                                            setTimeout(() => {
                                                icon.className = 'fas fa-copy'
                                                icon.style.color = ''
                                            }, 1500)
                                        }}
                                        title="Copy VIN"
                                        className="inline-flex items-center bg-transparent border-none text-[color:var(--text-secondary)] cursor-pointer text-xs p-0.5"
                                    >
                                        <i className="fas fa-copy" />
                                    </button>
                                    {isDuplicate && (
                                        <span
                                            className="bg-amber-50 text-amber-800 rounded text-[10px] font-bold px-2 py-1"
                                            title="Duplicate VIN"
                                        >
                                            <i className="fas fa-exclamation-triangle" />
                                        </span>
                                    )}
                                </div>
                            ) : (
                                '---'
                            )}
                        </td>
                    )
                }

                // --- Text with warning (duplicate check) ---
                if (col.type === 'textWithWarning') {
                    const val = col.getValue ? col.getValue(item) : item[col.key]
                    const normalizedKey = col.normalize?.(item)
                    const isDuplicate = normalizedKey && duplicates[col.duplicateKey]?.has(normalizedKey)
                    return (
                        <td key={col.key} style={style}>
                            {val || '---'}
                            {isDuplicate && (
                                <span
                                    className="bg-amber-50 text-amber-800 rounded text-[10px] font-bold ml-2 px-2 py-1"
                                    title={col.warningTitle}
                                >
                                    <i className="fas fa-exclamation-triangle" />
                                </span>
                            )}
                        </td>
                    )
                }

                // --- Number with warning ---
                if (col.type === 'number') {
                    const val = col.getValue ? col.getValue(item) : item[col.key]
                    const hasWarning = col.getWarning?.(item)
                    return (
                        <td key={col.key} style={style}>
                            {val != null ? (
                                <>
                                    {val}
                                    {hasWarning && (
                                        <span
                                            className={
                                                col.warningClassName ||
                                                'bg-red-50 text-red-800 rounded text-[10px] font-bold ml-2 px-2 py-1'
                                            }
                                            title={col.warningTitle}
                                        >
                                            <i className="fas fa-exclamation-triangle" />
                                        </span>
                                    )}
                                </>
                            ) : (
                                '---'
                            )}
                        </td>
                    )
                }

                // --- Actions column ---
                if (col.type === 'actions') {
                    const identifier = config.getModalIdentifier(item)
                    return (
                        <td key={col.key} style={style}>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onComment(item.id, identifier)
                                    }}
                                    style={{ ...actionBtnStyle, position: 'relative' }}
                                    title="View comments"
                                >
                                    <i className="fas fa-comments" />
                                    {item.commentsCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-md">
                                            {item.commentsCount > 9 ? '9+' : item.commentsCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onIssue(item.id, identifier)
                                    }}
                                    style={{ ...actionBtnStyle, position: 'relative' }}
                                    title="View issues"
                                >
                                    <i className="fas fa-tools" />
                                    {item.openIssuesCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-md">
                                            {item.openIssuesCount > 9 ? '9+' : item.openIssuesCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onHistory(item)
                                    }}
                                    style={actionBtnStyle}
                                    title="View history"
                                >
                                    <i className="fas fa-history" />
                                </button>
                            </div>
                        </td>
                    )
                }

                // --- Plant name lookup ---
                if (col.type === 'plant') {
                    const plant = plants.find((p) => p.code === item[col.key || 'assignedPlant'])
                    return (
                        <td key={col.key || 'plant'} style={style}>
                            {plant?.name || item[col.key || 'assignedPlant'] || '---'}
                        </td>
                    )
                }

                // --- Default: plain text ---
                const val = col.getValue ? col.getValue(item) : item[col.key]
                return (
                    <td key={col.key} style={style}>
                        {val || '---'}
                    </td>
                )
            }

            return (
                <tr
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) =>
                        e.currentTarget
                            .querySelectorAll('td')
                            .forEach((td) => (td.style.backgroundColor = 'var(--bg-tertiary)'))
                    }
                    onMouseLeave={(e) =>
                        e.currentTarget
                            .querySelectorAll('td')
                            .forEach((td) => (td.style.backgroundColor = alternatingBg))
                    }
                >
                    {columns.map(renderCell)}
                </tr>
            )
        },
        [config, duplicates, operators, plants, tractors]
    )

    // --- Content ---
    const content = useMemo(() => {
        if (isLoading || isRegionLoading) return <AssetListSkeleton viewMode={viewMode} />

        const hasPotential = filteredResult.potentialMatches.length > 0
        const hasFiltered = filteredResult.filtered.length > 0

        // Empty state
        if (!hasFiltered && !hasPotential) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                        style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                        <i
                            className={`fas ${config.emptyState.icon} text-3xl`}
                            style={{ color: 'var(--text-secondary)' }}
                        />
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        {config.emptyState.title}
                    </h3>
                    <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
                        {searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses')
                            ? 'No items match your search criteria.'
                            : `There are no ${config.pluralLabel.toLowerCase()} in the system yet.`}
                    </p>
                    {!searchText && (
                        <button
                            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
                            onClick={() => setShowAddSheet(true)}
                        >
                            {config.emptyState.addLabel}
                        </button>
                    )}
                </div>
            )
        }

        const onShowCommentModal = (id, number) => {
            setModalItemId(id)
            setModalItemNumber(number)
            setShowCommentModal(true)
        }
        const onShowIssueModal = (id, number) => {
            setModalItemId(id)
            setModalItemNumber(number)
            setShowIssueModal(true)
        }
        const onShowHistoryModal = (item) => {
            setSelectedItemForHistory(item)
            setShowHistoryModal(true)
        }

        // Resolve display status (handles shop sub-statuses)
        const statusCol = config.listConfig.columns.find((c) => c.type === 'status')
        const getDisplayStatus = (item) =>
            statusCol?.getDisplayStatus ? statusCol.getDisplayStatus(item) : item.status
        const getStatusDays = (item) => {
            const dateToUse = item.statusChangedAt || item.createdAt
            if (!dateToUse || item.status === 'Retired') return null
            return Math.max(1, Math.floor((Date.now() - new Date(dateToUse).getTime()) / 86400000))
        }

        const renderGridCards = (itemsToRender) => (
            <div className="overflow-auto" style={{ marginBottom: 24, maxHeight: 'calc(100vh - 250px)' }}>
                <div
                    className="grid gap-4 p-4"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
                >
                    {itemsToRender.map((item, index) => {
                        const operator = operators?.find((op) => op.employeeId === item.assignedOperator)
                        const plant = plants?.find((p) => p.code === item.assignedPlant)
                        const tractor = tractors?.find((t) => t.id === item.assignedTractor)
                        const isVer =
                            typeof item.isVerified === 'function' ? item.isVerified(item.latestHistoryDate) : undefined
                        const number = config.getModalIdentifier(item)
                        return (
                            <div
                                key={item.id}
                                className="grid-card-animated"
                                style={{ animationDelay: `${Math.max(40, 80 - index * 2)}ms` }}
                            >
                                <AssetGridCard
                                    item={item}
                                    config={config}
                                    operator={operator}
                                    tractor={tractor}
                                    plantName={plant?.name || item.assignedPlant || '---'}
                                    isVerified={isVer}
                                    displayStatus={getDisplayStatus(item)}
                                    statusDays={getStatusDays(item)}
                                    onSelect={handleSelectItem}
                                    onShowCommentModal={() => onShowCommentModal(item.id, number)}
                                    onShowIssueModal={() => onShowIssueModal(item.id, number)}
                                    onShowHistoryModal={() => onShowHistoryModal(item)}
                                    onShowOperatorCommentModal={(op) => {
                                        setOperatorModalTarget(op)
                                        setShowOperatorCommentModal(true)
                                    }}
                                    onShowOperatorHistoryModal={(op) => {
                                        setOperatorModalTarget(op)
                                        setShowOperatorHistoryModal(true)
                                    }}
                                />
                            </div>
                        )
                    })}
                </div>
                <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(16px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .grid-card-animated { animation: fadeInUp 0.45s ease-out both; }
                `}</style>
            </div>
        )

        const listProps = {
            colWidths: config.listConfig.colWidths,
            containerClassName: 'list-table-container',
            handleSelectItem: handleSelectItem,
            headerLabels: config.listConfig.headerLabels,
            onShowCommentModal,
            onShowHistoryModal,
            onShowIssueModal,
            onVerify: config.hasVerification ? handleVerify : undefined,
            renderRow,
            tableClassName: 'list-table',
            ...(config.hasOperatorAssignment ? { operators, plants } : {})
        }

        const renderViewSection = (itemsToRender) =>
            viewMode === 'grid' ? (
                renderGridCards(itemsToRender)
            ) : (
                <ListViewModeSection filteredItems={itemsToRender} {...listProps} />
            )

        const mainContent = hasFiltered ? renderViewSection(filteredResult.filtered) : null

        const potentialContent = hasPotential ? (
            <>
                <div
                    className="flex items-center gap-3 px-4 py-3 mt-4 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-hover)' }}
                >
                    <i className="fas fa-filter text-xs" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {hasFiltered ? 'Potential Matches' : 'Results Outside Current Filters'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {hasFiltered
                            ? '(hidden by active filters)'
                            : 'No exact filter matches — showing results that match your search'}
                    </span>
                    <span
                        className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                    >
                        {filteredResult.potentialMatches.length}
                    </span>
                </div>
                <div className={hasFiltered ? 'opacity-60' : ''}>
                    {renderViewSection(filteredResult.potentialMatches)}
                </div>
            </>
        ) : null

        return (
            <>
                {mainContent}
                {potentialContent}
            </>
        )
    }, [
        isLoading,
        isRegionLoading,
        filteredResult,
        viewMode,
        searchText,
        selectedPlant,
        statusFilter,
        config,
        operators,
        plants,
        tractors,
        handleSelectItem,
        handleVerify,
        renderRow
    ])

    const showReset =
        searchText ||
        selectedPlant ||
        (statusFilter && statusFilter !== 'All Statuses' && statusFilter !== '') ||
        freightFilter ||
        extraTypeFilter

    // --- Detail saved handler ---
    function handleDetailSaved(updated) {
        if (updated?.id) {
            setItems((prev) => {
                const arr = prev.slice()
                const idx = arr.findIndex((p) => p.id === updated.id)
                if (idx >= 0) arr[idx] = { ...arr[idx], ...updated }
                else arr.unshift(updated)
                return arr
            })
        }
        setSelectedId(null)
        // Refetch all items
        RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code).then((codes) => {
            setIsLoading(true)
            fetchAllItems(codes).finally(() => setIsLoading(false))
        })
    }

    // --- Detail close handler ---
    function handleDetailClose() {
        setSelectedId(null)
        if (config.refetchOnDetailClose) {
            setIsLoading(true)
            RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code).then((codes) =>
                fetchAllItems(codes).finally(() => setIsLoading(false))
            )
        }
    }

    const DetailView = config.DetailView
    const AddView = config.AddView
    const selectedIdValue = config.selectsFullObject ? selectedId?.id : selectedId

    // --- Build custom actions for TopSection ---
    const customActions = useMemo(() => {
        const recapButton = config.hasRecap ? (
            <button
                className="hidden md:flex items-center gap-2 rounded-xl border-none px-4 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-150"
                style={{ backgroundColor: preferences.accentColor || '#1e3a5f' }}
                onClick={() => setShowRecap(true)}
                type="button"
                aria-label="Recap"
            >
                <i className="fa-solid fa-clock-rotate-left" />
                <span>Recap</span>
            </button>
        ) : null

        const exportButton = (
            <button
                className="hidden md:flex items-center gap-2 rounded-xl border-none px-4 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-150 disabled:opacity-50"
                style={{ backgroundColor: '#6b7280' }}
                onClick={handleExportIssues}
                disabled={isExportingIssues || items.length === 0}
                type="button"
                aria-label="Export Issues"
            >
                <i className={`fas ${isExportingIssues ? 'fa-spinner fa-spin' : 'fa-file-export'}`} />
                <span>{isExportingIssues ? 'Exporting...' : 'Export Issues'}</span>
            </button>
        )

        return config.hasRecap ? (
            <>
                {recapButton}
                {exportButton}
            </>
        ) : (
            exportButton
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.hasRecap, isExportingIssues, items.length, preferences.accentColor])

    // --- Build custom filters JSX for TopSection ---
    const customFiltersJSX = useMemo(() => {
        if (!config.extraTypeFilter) return undefined
        const dropdownStyle = {
            appearance: 'none',
            backgroundColor: 'var(--bg-secondary)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundPosition: 'right 12px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '18px',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '14px',
            minWidth: '140px',
            padding: '12px 40px 12px 16px'
        }
        return (
            <select
                style={dropdownStyle}
                value={extraTypeFilter}
                onChange={(e) => {
                    setExtraTypeFilter(e.target.value)
                    if (config.extraTypeFilter.persistKey) {
                        updateFilterRef.current?.(config.extraTypeFilter.persistKey, e.target.value)
                    }
                }}
                aria-label={config.extraTypeFilter.label}
            >
                <option value="">{config.extraTypeFilter.allLabel}</option>
                {config.extraTypeFilter.options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        )
    }, [config.extraTypeFilter, extraTypeFilter])

    return (
        <div
            className={`global-dashboard-container dashboard-container global-flush-top flush-top ${config.viewClassName}${selectedId ? ' detail-open' : ''}`}
        >
            {selectedId ? (
                <DetailView
                    {...{ [config.detailIdProp]: selectedIdValue }}
                    onClose={handleDetailClose}
                    onSaved={handleDetailSaved}
                />
            ) : (
                <>
                    <TopSection
                        isLoading={isLoading || isRegionLoading}
                        title={pageTitle}
                        badge={
                            canShowUnassignedOverlay
                                ? `${unassignedActiveOperatorsCount} Unassigned Active Operator${unassignedActiveOperatorsCount !== 1 ? 's' : ''}`
                                : null
                        }
                        onBadgeClick={
                            canShowUnassignedOverlay && setSelectedView
                                ? () => {
                                      const pos = config.operatorConfig.positionLabel
                                      setSelectedView('Operators', 'Unassigned Active', selectedPlant, pos)
                                      updateOperatorFilter?.('selectedPlant', selectedPlant)
                                      updateOperatorFilter?.('positionFilter', pos)
                                      updateOperatorFilter?.('statusFilter', 'Unassigned Active')
                                  }
                                : null
                        }
                        addButtonLabel={config.addButtonLabel}
                        onAddClick={() => setShowAddSheet(true)}
                        customActions={customActions}
                        searchInput={searchInput}
                        onSearchInputChange={(v) => {
                            setSearchInput(v)
                            debouncedSetSearchText(v)
                        }}
                        onClearSearch={() => {
                            setSearchInput('')
                            debouncedSetSearchText('')
                        }}
                        searchPlaceholder={config.searchPlaceholder}
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        plants={plants}
                        regionPlantCodes={regionPlantCodes}
                        selectedPlant={selectedPlant}
                        onSelectedPlantChange={(v) => {
                            setSelectedPlant(v)
                            updateFilter?.('selectedPlant', v)
                        }}
                        statusFilter={statusFilter}
                        statusOptions={config.statusOptions}
                        onStatusFilterChange={(v) => {
                            setStatusFilter(v)
                            updateFilter?.('statusFilter', v)
                        }}
                        // Tractor freight filter
                        freightFilter={config.freightOptions ? freightFilter : undefined}
                        freightOptions={config.freightOptions}
                        onFreightFilterChange={
                            config.freightOptions
                                ? (v) => {
                                      setFreightFilter(v)
                                      updateFilter?.('freightFilter', v)
                                  }
                                : undefined
                        }
                        customFilters={customFiltersJSX}
                        showReset={showReset}
                        onReset={() => {
                            setSearchText('')
                            setSearchInput('')
                            setSelectedPlant('')
                            setStatusFilter('')
                            setFreightFilter('')
                            setExtraTypeFilter('')
                            if (resetFilters) {
                                resetFilters({ currentViewMode: viewMode, keepViewMode: true })
                            }
                        }}
                        listLabels={config.listConfig.headerLabels}
                        colWidths={config.listConfig.colWidths}
                        forwardedRef={headerRef}
                        onHeaderClick={handleHeaderClick}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                    />
                    <div className="global-content-container content-container">{content}</div>

                    {/* Add View */}
                    {showAddSheet && (
                        <AddView
                            onClose={() => setShowAddSheet(false)}
                            {...{
                                [config.addViewCallbackProp || 'onAdded']: (newItem) => {
                                    setItems((prev) => [...prev, newItem])
                                    if (config.hasVinSearch) setAllItems((prev) => [...prev, newItem])
                                }
                            }}
                            {...(config.addViewPassesPlants ? { plants } : {})}
                            {...(config.addViewPassesOperators ? { operators } : {})}
                        />
                    )}

                    {/* Comment Modal */}
                    {showCommentModal && (
                        <CommentModalSection
                            itemId={modalItemId}
                            itemNumber={modalItemNumber}
                            itemType={config.itemTypeLabel}
                            onClose={() => setShowCommentModal(false)}
                            service={service}
                        />
                    )}

                    {/* Issue Modal */}
                    {showIssueModal && (
                        <IssueModalSection
                            itemId={modalItemId}
                            itemNumber={modalItemNumber}
                            itemType={config.itemTypeLabel}
                            onClose={() => setShowIssueModal(false)}
                            service={service}
                        />
                    )}

                    {/* History Modal */}
                    {showHistoryModal && selectedItemForHistory && (
                        <HistoryViewSection
                            item={selectedItemForHistory}
                            type={config.historyType}
                            onClose={() => setShowHistoryModal(false)}
                        />
                    )}

                    {/* Operator Comment Modal */}
                    {showOperatorCommentModal && operatorModalTarget && (
                        <CommentModalSection
                            itemId={operatorModalTarget.employeeId}
                            itemNumber={operatorModalTarget.name}
                            itemType="Operator"
                            onClose={() => {
                                setShowOperatorCommentModal(false)
                                setOperatorModalTarget(null)
                            }}
                            service={OperatorService}
                        />
                    )}

                    {/* Operator History Modal */}
                    {showOperatorHistoryModal && operatorModalTarget && (
                        <HistoryViewSection
                            item={operatorModalTarget}
                            type="operator"
                            onClose={() => {
                                setShowOperatorHistoryModal(false)
                                setOperatorModalTarget(null)
                            }}
                        />
                    )}

                    {/* Verification Modal */}
                    {showVerifyModal && verifyItem && config.verification && (
                        <VerificationRequirementsModal
                            open={showVerifyModal}
                            onClose={() => {
                                setShowVerifyModal(false)
                                setVerifyItem(null)
                            }}
                            onSaveAndVerify={handleSaveAndVerify}
                            missingFields={config.verification.getMissingFields(verifyItem)}
                            vin={verifyVin}
                            make={verifyMake}
                            model={verifyModel}
                            year={verifyYear}
                            lastServiceDate={verifyLastServiceDate}
                            lastChipDate={config.verification.hasLastChipDate ? verifyLastChipDate : undefined}
                            setVin={setVerifyVin}
                            setMake={setVerifyMake}
                            setModel={setVerifyModel}
                            setYear={setVerifyYear}
                            setLastServiceDate={setVerifyLastServiceDate}
                            setLastChipDate={config.verification.hasLastChipDate ? setVerifyLastChipDate : undefined}
                            isServiceOverdue={config.verification.isServiceOverdueFn}
                            assignedOperator={verifyItem.assignedOperator}
                            itemType={config.verification.itemType}
                            itemId={verifyItem.id}
                            service={service}
                            status={verifyItem.status}
                        />
                    )}

                    {/* Recap Modal (Mixer) */}
                    {config.hasRecap && (
                        <RecapModalSection
                            plantCode={selectedPlant || ''}
                            plantName={
                                selectedPlant
                                    ? plants.find((p) => String(p.plantCode) === String(selectedPlant))?.plantName
                                    : ''
                            }
                            mixers={filteredResult.filtered}
                            operators={filteredOperatorsForRecap}
                            isAllPlants={!selectedPlant}
                            mixersLoaded={itemsLoaded}
                            isLoading={isLoading}
                            isOpen={showRecap}
                            onClose={() => setShowRecap(false)}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default AssetView
