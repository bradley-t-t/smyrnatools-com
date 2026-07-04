/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import { usePreferences } from '../../context/PreferencesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useRecapDerivedData } from '../../hooks/useRecapDerivedData'
import { useRecapHistory } from '../../hooks/useRecapHistory'
import RecapAssetGroup from './recap/RecapAssetGroup'
import RecapFiltersToolbar from './recap/RecapFiltersToolbar'

const TAB_VISIBILITY_DELAY_MS = 2000

/**
 * Floating recap button and modal showing recent mixer and operator history changes.
 * Displays net change metrics (runnable, down, operators, transfers) and an expandable
 * timeline of individual asset/operator modifications filtered by date range.
 */
function RecapModalSection({
    plantCode,
    plantName,
    mixers,
    operators = [],
    isAllPlants = false,
    mixersLoaded = true,
    isLoading: externalLoading = false,
    isOpen: externalIsOpen,
    onClose
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const controlled = externalIsOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const isOpen = controlled ? externalIsOpen : internalOpen
    const setIsOpen = controlled
        ? (v) => {
              if (!v && onClose) onClose()
          }
        : setInternalOpen
    const [dateFilter, setDateFilter] = useState('week')
    const [expandedAssets, setExpandedAssets] = useState({})
    const [isTabVisible, setIsTabVisible] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [fieldFilter, setFieldFilter] = useState('all')
    const isMobile = useIsMobile()

    const mixerIds = useMemo(() => {
        if (!mixers || !Array.isArray(mixers)) return []
        return mixers.map((m) => m.id).filter(Boolean)
    }, [mixers])
    const operatorIds = useMemo(() => {
        if (!operators || !Array.isArray(operators)) return []
        return operators.map((o) => o.employeeId || o.employee_id).filter(Boolean)
    }, [operators])

    const { fetchHistory, isLoading, mixerHistory, operatorHistory, operatorNames, userNames } = useRecapHistory({
        dateFilter,
        mixerIds,
        operatorIds
    })

    const { availableFields, changeMetrics, filteredHistory } = useRecapDerivedData({
        fieldFilter,
        isAllPlants,
        mixerHistory,
        mixers,
        operatorHistory,
        operators,
        plantCode,
        searchQuery,
        typeFilter
    })

    useEffect(() => {
        if (isOpen && (mixerIds.length > 0 || operatorIds.length > 0)) {
            fetchHistory()
        }
    }, [isOpen, mixerIds, operatorIds, dateFilter, fetchHistory])

    useEffect(() => {
        if (!mixersLoaded || externalLoading) {
            setIsTabVisible(false)
            return
        }
        const timer = setTimeout(() => setIsTabVisible(true), TAB_VISIBILITY_DELAY_MS)
        return () => clearTimeout(timer)
    }, [mixersLoaded, externalLoading])

    const handleToggle = () => setIsOpen(!isOpen)
    const toggleAssetExpanded = (assetKey) => {
        setExpandedAssets((prev) => ({ ...prev, [assetKey]: !prev[assetKey] }))
    }

    const filteredChangesForGroup = (group) => {
        if (fieldFilter === 'all') return group.changes
        return group.changes.filter((c) => c.field_name === fieldFilter)
    }

    if (!plantCode && !isAllPlants) return null
    const displayTitle = isAllPlants ? 'All Plants Recap' : `Plant ${plantCode} Recap`
    const displaySubtitle = isAllPlants ? 'All Fleet Changes' : plantName || 'Changes History'

    const tab = !controlled ? (
        <div
            className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-all duration-300 hover:pl-3 ${isTabVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'} text-white`}
            style={{ background: accentColor, borderBottomRightRadius: 4, borderTopRightRadius: 4 }}
            onClick={handleToggle}
        >
            <i className="fa-solid fa-clock-rotate-left text-[11px]" />
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Recap</span>
        </div>
    ) : null

    const filteredTotal = filteredHistory.reduce((sum, g) => sum + filteredChangesForGroup(g).length, 0)
    const hasActiveFilters = searchQuery || typeFilter !== 'all' || fieldFilter !== 'all'
    const clearAllFilters = () => {
        setSearchQuery('')
        setTypeFilter('all')
        setFieldFilter('all')
    }

    const modal = isOpen ? (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,_23,_42,_0.65)]"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="rounded w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden bg-bg-primary border border-border-light"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-2.5 px-3 py-2 shrink-0 bg-bg-primary border-b border-border-light">
                    <div className="flex items-center gap-2 min-w-0">
                        <div
                            className="flex h-6 w-6 items-center justify-center rounded shrink-0 bg-bg-tertiary"
                            style={{ color: accentColor }}
                        >
                            <i className="fa-solid fa-clock-rotate-left text-[11px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9.5px] font-semibold uppercase tracking-wider text-text-secondary">
                                {displayTitle}
                            </div>
                            <div className="text-[10.5px] truncate text-text-tertiary">{displaySubtitle}</div>
                        </div>
                    </div>
                    <button type="button"
                        onClick={() => setIsOpen(false)}
                        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-bg-tertiary border-none cursor-pointer text-text-secondary"
                        aria-label="Close"
                    >
                        <i className="fa-solid fa-xmark text-[11px]" />
                    </button>
                </div>

                <RecapFiltersToolbar
                    accentColor={accentColor}
                    availableFields={availableFields}
                    changeMetrics={changeMetrics}
                    dateFilter={dateFilter}
                    fieldFilter={fieldFilter}
                    onDateFilterChange={setDateFilter}
                    onFieldFilterChange={setFieldFilter}
                    onSearchQueryChange={setSearchQuery}
                    onTypeFilterChange={setTypeFilter}
                    searchQuery={searchQuery}
                    typeFilter={typeFilter}
                />

                <div className="px-3 py-1.5 flex items-center justify-between shrink-0 border-b border-border-light">
                    <span className="text-[10.5px] font-mono tabular-nums text-text-tertiary">
                        {filteredHistory.length} asset{filteredHistory.length !== 1 ? 's' : ''} · {filteredTotal} change
                        {filteredTotal !== 1 ? 's' : ''}
                    </span>
                    {hasActiveFilters && (
                        <button type="button"
                            onClick={clearAllFilters}
                            className="text-[10.5px] font-semibold uppercase tracking-wider border-none bg-transparent cursor-pointer"
                            style={{ color: accentColor }}
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="px-3 py-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                                <i className="fa-solid fa-spinner fa-spin text-lg mb-2" />
                                <span className="text-[12px]">Loading history…</span>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                                <i className="fa-solid fa-filter-circle-xmark text-2xl mb-2" />
                                <p className="text-[12.5px] font-semibold m-0 text-text-primary">No changes found</p>
                                <p className="text-[11px] mt-0.5 m-0">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {filteredHistory.map((group, groupIndex) => {
                                    const assetKey = `${group.type}_${group.id}`
                                    return (
                                        <RecapAssetGroup
                                            key={assetKey || groupIndex}
                                            group={group}
                                            changes={filteredChangesForGroup(group)}
                                            isExpanded={expandedAssets[assetKey] || false}
                                            onToggle={() => toggleAssetExpanded(assetKey)}
                                            operatorNames={operatorNames}
                                            userNames={userNames}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : null
    return (
        <>
            {!isMobile && tab}
            {modal && ReactDOM.createPortal(modal, document.body)}
        </>
    )
}
export default RecapModalSection
