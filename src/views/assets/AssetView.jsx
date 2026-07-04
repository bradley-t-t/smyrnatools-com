import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import EmbeddedViewModal from '../../app/components/dashboard/EmbeddedViewModal'
import { exportAssetDataSheet } from '../../app/components/modules/export/data/AssetDataExport'
import { exportAssetIssuesSheet } from '../../app/components/modules/export/issues/AssetIssuesExport'
import AssetListSkeleton from '../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../app/context/PreferencesContext'
import useAssetCounts from '../../app/hooks/useAssetCounts'
import useAssetData from '../../app/hooks/useAssetData'
import useAssetFilteredResult from '../../app/hooks/useAssetFilteredResult'
import useAssetFilters from '../../app/hooks/useAssetFilters'
import useAssetVerification from '../../app/hooks/useAssetVerification'
import useIsWideViewport from '../../app/hooks/useIsWideViewport'
import { PlantService } from '../../services/PlantService'
import { UserService } from '../../services/UserService'
import AssetListRow from './AssetListRow'
import AssetModals from './AssetModals'
import { getAssetExportColumns } from './configs/assetExportColumns'
import AssetMainContent from './parts/AssetMainContent'
import AssetSidePanel from './parts/AssetSidePanel'
import AssetTopSection from './parts/AssetTopSection'

/**
 * Unified asset list/grid view driven by a config object.
 * Orchestrates data hooks, filter hooks, and rendering for all asset types.
 */
function AssetView({
    config,
    title,
    onSelectItem,
    setSelectedView: _setSelectedView,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    const prefsContext = usePreferences()
    const { preferences } = prefsContext
    const pageTitle = title || config.pluralLabel
    const headerRef = useRef(null)
    const modalsRef = useRef(null)

    const fp = config.filterPersistence
    const updateFilter = fp ? prefsContext[fp.updateFnKey] : null
    const updateFilterRef = useRef(updateFilter)
    updateFilterRef.current = updateFilter
    const resetFilters = fp ? prefsContext[fp.resetFnKey] : null
    const savedFilters = fp ? preferences[fp.filterKey] : null
    const saveLastViewedFilters = prefsContext.saveLastViewedFilters

    const [userPlantCode, setUserPlantCode] = useState('')
    useEffect(() => {
        let cancelled = false
        UserService.getMyPlant()
            .then((plantCode) => {
                if (!cancelled) setUserPlantCode(plantCode || '')
            })
            .catch(() => {
                if (!cancelled) setUserPlantCode('')
            })
        return () => {
            cancelled = true
        }
    }, [])

    const filters = useAssetFilters({
        config,
        embedded,
        initialSearch,
        preferences,
        savedFilters,
        updateFilterRef
    })

    const data = useAssetData({
        config,
        onResetSelectedPlant: () => filters.setSelectedPlant(''),
        preferences,
        searchText: filters.searchText,
        selectedPlant: filters.selectedPlant,
        updateFilterRef
    })

    const { districtPlantCodes, filteredResult } = useAssetFilteredResult({ config, data, exactMatch, filters })

    const [selectedId, setSelectedId] = useState(null)
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [isExportingIssues, setIsExportingIssues] = useState(false)
    const [isExportingData, setIsExportingData] = useState(false)
    const [embeddedModal, setEmbeddedModal] = useState(null)

    const isWideViewport = useIsWideViewport()
    const [sidePanel, setSidePanel] = useState(null)
    const useSidePanel = !embedded && filters.viewMode === 'list' && isWideViewport
    const sidePanelDelegate = useSidePanel ? setSidePanel : null

    useEffect(() => {
        if (!useSidePanel && sidePanel) setSidePanel(null)
    }, [useSidePanel, sidePanel])

    const verification = useAssetVerification({
        allItems: data.allItems,
        config,
        items: data.items,
        setAllItems: data.setAllItems,
        setItems: data.setItems
    })

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

    const { activeCount, activeOperatorsCount, shopCount, spareCount, totalCount, unassignedActiveOperatorsCount } =
        useAssetCounts({ config, data, districtPlantCodes, filters })

    const canShowOperatorBadge =
        config.hasOperatorAssignment && data.itemsLoaded && data.operatorsLoaded && !data.isLoading
    const canShowAssetBadge = data.itemsLoaded && !data.isLoading && data.items?.length > 0

    const duplicates = useMemo(() => {
        const result = {}
        for (const check of config.duplicateChecks || []) {
            result[check.key] = check.compute(data.items)
        }
        return result
    }, [data.items, config.duplicateChecks])

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

    const exportColumns = useMemo(() => getAssetExportColumns(config.key), [config.key])

    async function handleExportData() {
        if (!exportColumns) return
        setIsExportingData(true)
        try {
            await exportAssetDataSheet({
                assetType: config.exportConfig.assetType,
                columns: exportColumns,
                context: { operators: data.operators, plants: data.plants, tractors: data.tractors },
                pluralLabel: config.pluralLabel,
                rows: filteredResult.filtered
            })
        } catch (err) {
            console.error('Export data failed:', err)
        } finally {
            setIsExportingData(false)
        }
    }

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
                onSendMessage={(item, identifier) => modalsRef.current?.openSendMessageModal(item, identifier)}
                onVerify={onVerify}
                operators={data.operators}
                plants={data.plants}
                tractors={data.tractors}
            />
        ),
        [config, duplicates, data.operators, data.plants, data.tractors]
    )

    function refetchAllItems() {
        data.setIsLoading(true)
        PlantService.getAllowedPlantCodes(preferences.selectedRegion?.code).then((codes) =>
            data.fetchAllItems(codes).finally(() => data.setIsLoading(false))
        )
    }

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
        refetchAllItems()
    }

    function handleDetailClose() {
        setSelectedId(null)
        if (config.refetchOnDetailClose) refetchAllItems()
    }

    const DetailView = config.DetailView
    const selectedIdValue = config.selectsFullObject ? selectedId?.id : selectedId

    const badge = canShowOperatorBadge
        ? `${totalCount} Total · ${activeOperatorsCount + unassignedActiveOperatorsCount} Active · ${spareCount} Spare · ${unassignedActiveOperatorsCount} Unassigned · ${shopCount} Shop`
        : canShowAssetBadge
          ? `${totalCount} Total · ${activeCount} Active · ${spareCount} Spare · ${shopCount} Shop`
          : null

    const handleOpenEmbeddedOperators = () =>
        setEmbeddedModal({
            props: {
                initialPositionFilter: config.operatorConfig.positionLabel,
                initialStatusFilter: 'Unassigned Active'
            },
            view: 'operators'
        })

    const showLoadingSkeleton = data.isLoading || data.isRegionLoading

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
                    <div className="flex w-full max-w-full">
                        <div className="flex-1 min-w-0">
                            <AssetTopSection
                                badge={badge}
                                canShowOperatorBadge={canShowOperatorBadge}
                                config={config}
                                data={data}
                                filters={filters}
                                canExportData={!!exportColumns}
                                forwardedRef={headerRef}
                                isExportDataDisabled={isExportingData || filteredResult.filtered.length === 0}
                                isExportingData={isExportingData}
                                isExportingIssues={isExportingIssues}
                                onAddClick={() => setShowAddSheet(true)}
                                onExportData={handleExportData}
                                onExportIssues={handleExportIssues}
                                onOpenEmbeddedOperators={handleOpenEmbeddedOperators}
                                onOpenRecap={() => modalsRef.current?.openRecap()}
                                pageTitle={pageTitle}
                                resetFilters={resetFilters}
                                updateFilter={updateFilter}
                                updateFilterRef={updateFilterRef}
                                userPlantCode={userPlantCode}
                            />
                            <div className="w-full max-w-full overflow-x-hidden">
                                {showLoadingSkeleton ? (
                                    <AssetListSkeleton viewMode={filters.viewMode} />
                                ) : (
                                    <AssetMainContent
                                        config={config}
                                        data={data}
                                        filteredResult={filteredResult}
                                        filters={filters}
                                        handleSelectItem={handleSelectItem}
                                        modalsRef={modalsRef}
                                        onAdd={() => setShowAddSheet(true)}
                                        renderRow={renderRow}
                                        verification={verification}
                                    />
                                )}
                            </div>
                        </div>
                        <AssetSidePanel config={config} onClose={() => setSidePanel(null)} sidePanel={sidePanel} />
                    </div>

                    <AssetModals
                        ref={modalsRef}
                        allItems={data.allItems}
                        config={config}
                        filteredOperatorsForRecap={filteredOperatorsForRecap}
                        filteredResult={filteredResult}
                        isLoading={data.isLoading}
                        items={data.items}
                        itemsLoaded={data.itemsLoaded}
                        onSidePanelOpen={sidePanelDelegate}
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
                    {embeddedModal && (
                        <EmbeddedViewModal
                            accentColor={preferences.accentColor || '#1e3a5f'}
                            embeddedView={embeddedModal.view}
                            embeddedViewProps={embeddedModal.props}
                            onClose={() => setEmbeddedModal(null)}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default AssetView
