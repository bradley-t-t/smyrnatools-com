import React from 'react'

import TopSection from '../../../app/components/sections/TopSection'
import AssetExtraTypeFilter from './AssetExtraTypeFilter'
import AssetTopActions from './AssetTopActions'

const STATUS_PILL_MAP = { Active: 'Active', Shop: 'In Shop', Spare: 'Spare' }

/**
 * Wraps `TopSection` with the asset-specific glue: badge, custom actions
 * (recap/export), the optional extra-type filter, and the pill / reset /
 * filter handlers wired to the filter hook and preference persistence.
 */
export default function AssetTopSection({
    badge,
    canExportData,
    canShowOperatorBadge,
    config,
    data,
    filters,
    forwardedRef,
    isExportDataDisabled,
    isExportingData,
    isExportingIssues,
    onAddClick,
    onExportData,
    onExportIssues,
    onOpenEmbeddedOperators,
    onOpenRecap,
    pageTitle,
    resetFilters,
    updateFilter,
    updateFilterRef,
    userPlantCode
}) {
    const customActions = (
        <AssetTopActions
            canExportData={canExportData}
            config={config}
            isExportDataDisabled={isExportDataDisabled}
            isExportDisabled={isExportingIssues || data.items.length === 0}
            isExportingData={isExportingData}
            isExportingIssues={isExportingIssues}
            onExportData={onExportData}
            onExportIssues={onExportIssues}
            onOpenRecap={onOpenRecap}
        />
    )

    const customFilters = config.extraTypeFilter ? (
        <AssetExtraTypeFilter config={config} filters={filters} updateFilterRef={updateFilterRef} />
    ) : undefined

    const handlePillClick = (label) => {
        if (label === 'Unassigned' && canShowOperatorBadge) {
            onOpenEmbeddedOperators()
        } else if (label === 'Total') {
            filters.setStatusFilter('')
            updateFilter?.('statusFilter', '')
        } else if (STATUS_PILL_MAP[label]) {
            filters.setStatusFilter(STATUS_PILL_MAP[label])
            updateFilter?.('statusFilter', STATUS_PILL_MAP[label])
        }
    }

    const handleReset = () => {
        filters.setSearchText('')
        filters.setSearchInput('')
        filters.setSelectedPlant('')
        filters.setStatusFilter('')
        filters.setFreightFilter('')
        filters.setExtraTypeFilter('')
        if (resetFilters) resetFilters({ currentViewMode: filters.viewMode, keepViewMode: true })
    }

    return (
        <TopSection
            addButtonLabel={config.addButtonLabel}
            badge={badge}
            colWidths={config.listConfig.colWidths}
            customActions={customActions}
            customFilters={customFilters}
            forwardedRef={forwardedRef}
            freightFilter={config.freightOptions ? filters.freightFilter : undefined}
            freightOptions={config.freightOptions}
            isLoading={data.isLoading || data.isRegionLoading}
            listLabels={config.listConfig.headerLabels}
            onAddClick={onAddClick}
            onClearSearch={() => {
                filters.setSearchInput('')
                filters.debouncedSetSearchText('')
            }}
            onFreightFilterChange={
                config.freightOptions
                    ? (v) => {
                          filters.setFreightFilter(v)
                          updateFilter?.('freightFilter', v)
                      }
                    : undefined
            }
            onHeaderClick={filters.handleHeaderClick}
            onPillClick={handlePillClick}
            onReset={handleReset}
            onSearchInputChange={(v) => {
                filters.setSearchInput(v)
                filters.debouncedSetSearchText(v)
            }}
            onSelectedPlantChange={(v) => {
                filters.setSelectedPlant(v)
                updateFilter?.('selectedPlant', v)
            }}
            onStatusFilterChange={(v) => {
                filters.setStatusFilter(v)
                updateFilter?.('statusFilter', v)
            }}
            onViewModeChange={filters.handleViewModeChange}
            plants={data.plants}
            regionPlantCodes={data.regionPlantCodes}
            searchInput={filters.searchInput}
            searchPlaceholder={config.searchPlaceholder}
            selectedPlant={filters.selectedPlant}
            showReset={filters.showReset}
            sortDirection={filters.sortDirection}
            sortKey={filters.sortKey}
            statusFilter={filters.statusFilter}
            statusOptions={config.statusOptions}
            title={pageTitle}
            userPlantCode={userPlantCode}
            viewMode={filters.viewMode}
        />
    )
}
