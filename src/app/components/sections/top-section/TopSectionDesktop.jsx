/* eslint-disable react/forbid-dom-props */
import React from 'react'

import PlantFilterButton from '../../ui/PlantFilterButton'
import TopSectionBadgeRow from './Badge'
import { ActionButton, FilterSelect, ListHeader, ResetButton, SearchInput, ViewToggle } from './TopSectionAtoms'

const TopSectionDesktop = ({
    forwardedRef,
    sectionClasses,
    sectionStyle,
    hideRealContent,
    skeletonContent,
    revealControls,
    title,
    badge,
    onBadgeClick,
    onPillClick,
    accentColor,
    isDarkBadgeTheme,
    customActions,
    onToggleSidebar,
    onAddClick,
    addButtonLabel,
    hideSearchBar,
    searchInput,
    onSearchInputChange,
    onClearSearch,
    searchPlaceholder,
    viewMode,
    onViewModeChange,
    hideViewModeToggle,
    hidePlantFilter,
    plantDisplayText,
    setIsPlantModalOpen,
    safeStatusOptions,
    statusFilter,
    onStatusFilterChange,
    safePositionOptions,
    positionFilter,
    onPositionFilterChange,
    safeFreightOptions,
    freightFilter,
    onFreightFilterChange,
    customFilters,
    showReset,
    onReset,
    customBottomContent,
    safeListLabels,
    safeColWidths,
    sortKey,
    sortDirection,
    onHeaderClick
}) => (
    <div
        ref={forwardedRef}
        className={sectionClasses}
        style={sectionStyle}
        data-section="top"
        aria-label="Page controls"
    >
        {hideRealContent && skeletonContent}
        <div className="flex flex-col gap-3" style={hideRealContent ? { display: 'none' } : undefined}>
            <div className="flex items-center gap-3 justify-between flex-wrap">
                <div className={`flex items-center gap-3 min-w-0${revealControls ? ' animate-reveal-left' : ''}`}>
                    <h1 className="text-[18px] font-bold tracking-tight m-0 truncate text-text-primary">{title}</h1>
                    {badge && (
                        <TopSectionBadgeRow
                            onClick={onBadgeClick}
                            onPillClick={onPillClick}
                            accentColor={accentColor}
                            isDark={isDarkBadgeTheme}
                        >
                            {badge}
                        </TopSectionBadgeRow>
                    )}
                </div>
                <div
                    className={`flex items-center gap-2 ml-auto${revealControls ? ' animate-reveal-right' : ''}`}
                    role="group"
                    aria-label="Primary actions"
                >
                    {customActions}
                    {onToggleSidebar && (
                        <ActionButton
                            icon="fa-bars"
                            label="Menu"
                            onClick={onToggleSidebar}
                            variant="subtle"
                            accentColor={accentColor}
                        />
                    )}
                    {onAddClick && (
                        <ActionButton
                            icon="fa-plus"
                            label={addButtonLabel}
                            onClick={onAddClick}
                            variant="primary"
                            accentColor={accentColor}
                        />
                    )}
                </div>
            </div>
            <div
                className="flex items-center flex-wrap gap-2 justify-between"
                role="region"
                aria-label="Search and filters"
            >
                {!hideSearchBar && (
                    <div className={revealControls ? 'animate-reveal-left' : ''}>
                        <SearchInput
                            value={searchInput}
                            onChange={onSearchInputChange}
                            onClear={onClearSearch}
                            placeholder={searchPlaceholder}
                            className="min-w-[220px] max-w-[420px]"
                        />
                    </div>
                )}
                <div
                    className={`flex items-center flex-wrap gap-2 ml-auto${revealControls ? ' animate-reveal-right' : ''}`}
                    role="group"
                    aria-label="Filters and view options"
                >
                    {viewMode && !hideViewModeToggle && (
                        <ViewToggle viewMode={viewMode} onChange={onViewModeChange} accentColor={accentColor} />
                    )}
                    {!hidePlantFilter && (
                        <PlantFilterButton displayText={plantDisplayText} onClick={() => setIsPlantModalOpen(true)} />
                    )}
                    {safeStatusOptions.length > 0 && (
                        <FilterSelect
                            value={statusFilter}
                            options={safeStatusOptions}
                            onChange={onStatusFilterChange}
                            ariaLabel="Status filter"
                        />
                    )}
                    {safePositionOptions.length > 0 && (
                        <FilterSelect
                            value={positionFilter}
                            options={safePositionOptions}
                            onChange={onPositionFilterChange}
                            ariaLabel="Position filter"
                        />
                    )}
                    {safeFreightOptions.length > 0 && (
                        <FilterSelect
                            value={freightFilter}
                            options={safeFreightOptions}
                            onChange={onFreightFilterChange}
                            ariaLabel="Freight filter"
                        />
                    )}
                    {customFilters}
                    {showReset && onReset && <ResetButton onClick={onReset} />}
                </div>
            </div>
            {customBottomContent && <div>{customBottomContent}</div>}
            {viewMode === 'list' && safeListLabels.length > 0 && (
                <ListHeader
                    labels={safeListLabels}
                    colWidths={safeColWidths}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onHeaderClick={onHeaderClick}
                />
            )}
        </div>
    </div>
)

export default TopSectionDesktop
