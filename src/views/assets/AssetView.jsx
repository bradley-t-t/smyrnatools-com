import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { exportAssetIssuesSheet } from '../../app/components/modules/export/issues/AssetIssuesExport'
import ListViewModeSection from '../../app/components/sections/ListViewModeSection'
import TopSection from '../../app/components/sections/TopSection'
import AssetListSkeleton from '../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../app/context/PreferencesContext'
import { PlantService } from '../../services/PlantService'
import AssetStatsUtility from '../../utils/AssetStatsUtility'
import AssetGridCard from './AssetGridCard'
import AssetListRow from './AssetListRow'
import AssetModals from './AssetModals'
import useAssetData from './hooks/useAssetData'
import useAssetFilters from './hooks/useAssetFilters'
import useAssetVerification from './hooks/useAssetVerification'

/**
 * Unified asset list/grid view driven by a config object.
 * Orchestrates data hooks, filter hooks, and rendering for all asset types.
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
    const modalsRef = useRef(null)

    // Resolve filter persistence functions from PreferencesContext
    const fp = config.filterPersistence
    const updateFilter = fp ? prefsContext[fp.updateFnKey] : null
    const updateFilterRef = useRef(updateFilter)
    updateFilterRef.current = updateFilter
    const resetFilters = fp ? prefsContext[fp.resetFnKey] : null
    const savedFilters = fp ? preferences[fp.filterKey] : null
    const saveLastViewedFilters = prefsContext.saveLastViewedFilters
    const updateOperatorFilter = prefsContext.updateOperatorFilter

    // --- Filter & sort state (initialized before data hook so searchText is available) ---
    const filters = useAssetFilters({
        config,
        embedded,
        initialSearch,
        preferences,
        savedFilters,
        updateFilterRef
    })

    // --- Data fetching & realtime ---
    const data = useAssetData({
        config,
        onResetSelectedPlant: () => filters.setSelectedPlant(''),
        preferences,
        searchText: filters.searchText,
        selectedPlant: filters.selectedPlant,
        updateFilterRef
    })

    // --- Re-derive filtered results with live data ---
    // useAssetFilters was initialized with empty arrays; recompute with actual data
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

            const matchesPlant =
                !filters.selectedPlant ||
                filters.selectedPlant === 'All' ||
                String(item.assignedPlant || '')
                    .trim()
                    .toUpperCase() === filters.selectedPlant.toUpperCase()

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
        exactMatch,
        filters.extraTypeFilter,
        filters.freightFilter,
        filters.searchText,
        filters.selectedPlant,
        filters.sortDirection,
        filters.sortKey,
        filters.statusFilter
    ])

    // --- Detail view state ---
    const [selectedId, setSelectedId] = useState(null)
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [isExportingIssues, setIsExportingIssues] = useState(false)

    // --- Verification ---
    const verification = useAssetVerification({
        allItems: data.allItems,
        config,
        items: data.items,
        setAllItems: data.setAllItems,
        setItems: data.setItems
    })

    // --- Restore persisted filters on preferences change ---
    useEffect(() => {
        if (embedded || !savedFilters) return
        filters.setSearchText(savedFilters.searchText || '')
        filters.setSearchInput(savedFilters.searchText || '')
        filters.setSelectedPlant(savedFilters.selectedPlant || '')
        filters.setStatusFilter(savedFilters.statusFilter || '')
        if (savedFilters.freightFilter !== undefined) filters.setFreightFilter(savedFilters.freightFilter || '')
        if (savedFilters.equipmentTypeFilter !== undefined)
            filters.setExtraTypeFilter(savedFilters.equipmentTypeFilter || '')
        if (savedFilters.typeFilter !== undefined) filters.setExtraTypeFilter(savedFilters.typeFilter || '')

        if (savedFilters.viewMode != null) filters.setViewMode(savedFilters.viewMode)
        else if (preferences.defaultViewMode != null) filters.setViewMode(preferences.defaultViewMode)
        else {
            const lastUsed = localStorage.getItem(config.viewModeStorageKey)
            if (lastUsed) filters.setViewMode(lastUsed)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences])

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
    }, [
        filters.viewMode,
        filters.searchInput,
        filters.selectedPlant,
        filters.statusFilter,
        filters.freightFilter,
        filters.extraTypeFilter,
        config.viewClassName
    ])

    // --- Select item ---
    const handleSelectItem = useCallback(
        (itemId) => {
            const item = data.items.find((m) => m.id === itemId)
            if (!item) return
            saveLastViewedFilters?.()
            setSelectedId(config.selectsFullObject ? item : itemId)
            onSelectItem?.(itemId)
        },
        [data.items, saveLastViewedFilters, onSelectItem, config.selectsFullObject]
    )

    // --- Unassigned operators count ---
    const unassignedActiveOperatorsCount = useMemo(() => {
        if (!config.operatorConfig) return 0
        return AssetStatsUtility.countUnassignedActiveOperators(data.items, data.operators, filters.searchText, {
            assignedOperatorField: config.operatorConfig.assignedField,
            assignedPlantField: 'assignedPlant',
            operatorIdField: 'employeeId',
            position: config.operatorConfig.position,
            regionPlantCodes: data.regionPlantCodes,
            selectedPlant: filters.selectedPlant
        })
    }, [
        data.operators,
        data.items,
        filters.selectedPlant,
        filters.searchText,
        data.regionPlantCodes,
        config.operatorConfig
    ])

    const canShowUnassignedOverlay =
        config.hasOperatorAssignment &&
        data.itemsLoaded &&
        data.operatorsLoaded &&
        !data.isLoading &&
        unassignedActiveOperatorsCount > 0

    // --- Duplicate sets ---
    const duplicates = useMemo(() => {
        const result = {}
        for (const check of config.duplicateChecks || []) {
            result[check.key] = check.compute(data.items)
        }
        return result
    }, [data.items, config.duplicateChecks])

    // --- Recap operators (Mixer) ---
    const filteredOperatorsForRecap = useMemo(() => {
        if (!config.recapConfig) return []
        return data.operators.filter((op) => {
            if (op.position !== config.recapConfig.operatorPosition) return false
            const opPlant = op.plantCode || op.assignedPlant || ''
            if (!filters.selectedPlant) {
                return (
                    !data.regionPlantCodes ||
                    data.regionPlantCodes.size === 0 ||
                    data.regionPlantCodes.has(String(opPlant).trim().toUpperCase())
                )
            }
            return String(opPlant) === String(filters.selectedPlant)
        })
    }, [data.operators, filters.selectedPlant, data.regionPlantCodes, config.recapConfig])

    // --- Export issues ---
    async function handleExportIssues() {
        setIsExportingIssues(true)
        try {
            await exportAssetIssuesSheet({
                assetType: config.exportConfig.assetType,
                assets: config.hasVinSearch ? data.allItems : data.items,
                identifierField: config.exportConfig.identifierField,
                plants: data.plants,
                service: config.service
            })
        } catch (err) {
            console.error('Export issues failed:', err)
        } finally {
            setIsExportingIssues(false)
        }
    }

    // --- Render list row ---
    const renderRow = useCallback(
        (item, handleSelect, onComment, onIssue, onVerify, onHistory, _index, alternatingBg) => (
            <AssetListRow
                key={item.id}
                alternatingBg={alternatingBg}
                config={config}
                duplicates={duplicates}
                item={item}
                onComment={onComment}
                onHistory={onHistory}
                onIssue={onIssue}
                onOperatorComment={(op) => modalsRef.current?.openOperatorCommentModal(op)}
                onOperatorHistory={(op) => modalsRef.current?.openOperatorHistoryModal(op)}
                onSelect={handleSelect}
                onVerify={onVerify}
                operators={data.operators}
                plants={data.plants}
                tractors={data.tractors}
            />
        ),
        [config, duplicates, data.operators, data.plants, data.tractors]
    )

    // --- Content ---
    const content = useMemo(() => {
        if (data.isLoading || data.isRegionLoading) return <AssetListSkeleton viewMode={filters.viewMode} />

        const hasPotential = filteredResult.potentialMatches.length > 0
        const hasFiltered = filteredResult.filtered.length > 0

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
                        {filters.searchText ||
                        filters.selectedPlant ||
                        (filters.statusFilter && filters.statusFilter !== 'All Statuses')
                            ? 'No items match your search criteria.'
                            : `There are no ${config.pluralLabel.toLowerCase()} in the system yet.`}
                    </p>
                    {!filters.searchText && (
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

        const onShowCommentModal = (id, number) => modalsRef.current?.openCommentModal(id, number)
        const onShowIssueModal = (id, number) => modalsRef.current?.openIssueModal(id, number)
        const onShowHistoryModal = (item) => modalsRef.current?.openHistoryModal(item)

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
                        const operator = data.operators?.find((op) => op.employeeId === item.assignedOperator)
                        const plant = data.plants?.find((p) => p.code === item.assignedPlant)
                        const tractor = data.tractors?.find((t) => t.id === item.assignedTractor)
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
                                    onShowOperatorCommentModal={(op) => modalsRef.current?.openOperatorCommentModal(op)}
                                    onShowOperatorHistoryModal={(op) => modalsRef.current?.openOperatorHistoryModal(op)}
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
            handleSelectItem,
            headerLabels: config.listConfig.headerLabels,
            onShowCommentModal,
            onShowHistoryModal,
            onShowIssueModal,
            onVerify: config.hasVerification ? verification.handleVerify : undefined,
            renderRow,
            tableClassName: 'list-table',
            ...(config.hasOperatorAssignment ? { operators: data.operators, plants: data.plants } : {})
        }

        const renderViewSection = (itemsToRender) =>
            filters.viewMode === 'grid' ? (
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
        config,
        data.isLoading,
        data.isRegionLoading,
        data.operators,
        data.plants,
        data.tractors,
        filteredResult,
        filters.searchText,
        filters.selectedPlant,
        filters.statusFilter,
        filters.viewMode,
        handleSelectItem,
        renderRow,
        verification.handleVerify
    ])

    // --- Detail saved handler ---
    function handleDetailSaved(updated) {
        if (updated?.id) {
            data.setItems((prev) => {
                const arr = prev.slice()
                const idx = arr.findIndex((p) => p.id === updated.id)
                if (idx >= 0) arr[idx] = { ...arr[idx], ...updated }
                else arr.unshift(updated)
                return arr
            })
        }
        setSelectedId(null)
        PlantService.getAllowedPlantCodes(preferences.selectedRegion?.code).then((codes) => {
            data.setIsLoading(true)
            data.fetchAllItems(codes).finally(() => data.setIsLoading(false))
        })
    }

    // --- Detail close handler ---
    function handleDetailClose() {
        setSelectedId(null)
        if (config.refetchOnDetailClose) {
            data.setIsLoading(true)
            PlantService.getAllowedPlantCodes(preferences.selectedRegion?.code).then((codes) =>
                data.fetchAllItems(codes).finally(() => data.setIsLoading(false))
            )
        }
    }

    const DetailView = config.DetailView
    const selectedIdValue = config.selectsFullObject ? selectedId?.id : selectedId

    // --- Custom actions for TopSection ---
    const customActions = useMemo(() => {
        const recapButton = config.hasRecap ? (
            <button
                className="hidden md:flex items-center gap-2 rounded-xl border-none px-4 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-150"
                style={{ backgroundColor: preferences.accentColor || '#1e3a5f' }}
                onClick={() => modalsRef.current?.openRecap()}
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
                disabled={isExportingIssues || data.items.length === 0}
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
    }, [config.hasRecap, isExportingIssues, data.items.length, preferences.accentColor])

    // --- Custom filters JSX for TopSection ---
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
                value={filters.extraTypeFilter}
                onChange={(e) => {
                    filters.setExtraTypeFilter(e.target.value)
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
    }, [config.extraTypeFilter, filters.extraTypeFilter])

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
                        isLoading={data.isLoading || data.isRegionLoading}
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
                                      setSelectedView('Operators', 'Unassigned Active', filters.selectedPlant, pos)
                                      updateOperatorFilter?.('selectedPlant', filters.selectedPlant)
                                      updateOperatorFilter?.('positionFilter', pos)
                                      updateOperatorFilter?.('statusFilter', 'Unassigned Active')
                                  }
                                : null
                        }
                        addButtonLabel={config.addButtonLabel}
                        onAddClick={() => setShowAddSheet(true)}
                        customActions={customActions}
                        searchInput={filters.searchInput}
                        onSearchInputChange={(v) => {
                            filters.setSearchInput(v)
                            filters.debouncedSetSearchText(v)
                        }}
                        onClearSearch={() => {
                            filters.setSearchInput('')
                            filters.debouncedSetSearchText('')
                        }}
                        searchPlaceholder={config.searchPlaceholder}
                        viewMode={filters.viewMode}
                        onViewModeChange={filters.handleViewModeChange}
                        plants={data.plants}
                        regionPlantCodes={data.regionPlantCodes}
                        selectedPlant={filters.selectedPlant}
                        onSelectedPlantChange={(v) => {
                            filters.setSelectedPlant(v)
                            updateFilter?.('selectedPlant', v)
                        }}
                        statusFilter={filters.statusFilter}
                        statusOptions={config.statusOptions}
                        onStatusFilterChange={(v) => {
                            filters.setStatusFilter(v)
                            updateFilter?.('statusFilter', v)
                        }}
                        freightFilter={config.freightOptions ? filters.freightFilter : undefined}
                        freightOptions={config.freightOptions}
                        onFreightFilterChange={
                            config.freightOptions
                                ? (v) => {
                                      filters.setFreightFilter(v)
                                      updateFilter?.('freightFilter', v)
                                  }
                                : undefined
                        }
                        customFilters={customFiltersJSX}
                        showReset={filters.showReset}
                        onReset={() => {
                            filters.setSearchText('')
                            filters.setSearchInput('')
                            filters.setSelectedPlant('')
                            filters.setStatusFilter('')
                            filters.setFreightFilter('')
                            filters.setExtraTypeFilter('')
                            if (resetFilters) {
                                resetFilters({ currentViewMode: filters.viewMode, keepViewMode: true })
                            }
                        }}
                        listLabels={config.listConfig.headerLabels}
                        colWidths={config.listConfig.colWidths}
                        forwardedRef={headerRef}
                        onHeaderClick={filters.handleHeaderClick}
                        sortKey={filters.sortKey}
                        sortDirection={filters.sortDirection}
                    />
                    <div className="global-content-container content-container">{content}</div>

                    <AssetModals
                        ref={modalsRef}
                        allItems={data.allItems}
                        config={config}
                        filteredOperatorsForRecap={filteredOperatorsForRecap}
                        filteredResult={filteredResult}
                        isLoading={data.isLoading}
                        items={data.items}
                        itemsLoaded={data.itemsLoaded}
                        operators={data.operators}
                        plants={data.plants}
                        selectedPlant={filters.selectedPlant}
                        service={config.service}
                        setAllItems={data.setAllItems}
                        setItems={data.setItems}
                        setShowAddSheet={setShowAddSheet}
                        showAddSheet={showAddSheet}
                        verification={verification}
                    />
                </>
            )}
        </div>
    )
}

export default AssetView
