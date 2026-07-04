/* eslint-disable react/forbid-dom-props */
import React from 'react'

import TopSectionBadgeRow from './Badge'
import { ActionButton, FilterSelect, MobileFilterItem, MobileViewToggle, SearchInput } from './TopSectionAtoms'

const TopSectionMobile = ({
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
    onAddClick,
    addButtonLabel,
    onToggleSidebar,
    hideSearchBar,
    searchInput,
    onSearchInputChange,
    onClearSearch,
    searchPlaceholder,
    showMobileFilters,
    setShowMobileFilters,
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
    customBottomContent
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
            <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-2 min-w-0${revealControls ? ' animate-reveal-left' : ''}`}>
                    <h1 className="text-[16px] font-bold m-0 truncate text-text-primary">{title}</h1>
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
                <div className={`flex items-center gap-2${revealControls ? ' animate-reveal-right' : ''}`}>
                    {customActions}
                    {onAddClick && (
                        <ActionButton
                            icon="fa-plus"
                            label={addButtonLabel}
                            onClick={onAddClick}
                            variant="primary"
                            accentColor={accentColor}
                        />
                    )}
                    {onToggleSidebar && (
                        <ActionButton
                            icon="fa-bars"
                            onClick={onToggleSidebar}
                            variant="subtle"
                            accentColor={accentColor}
                        />
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!hideSearchBar && (
                    <div className="flex-1">
                        <SearchInput
                            value={searchInput}
                            onChange={onSearchInputChange}
                            onClear={onClearSearch}
                            placeholder={searchPlaceholder}
                            className="w-full"
                        />
                    </div>
                )}
                <button type="button"
                    className="flex items-center justify-center w-8 h-8 rounded text-[12px] cursor-pointer"
                    style={{
                        background: showMobileFilters ? `${accentColor}14` : 'var(--bg-secondary)',
                        border: `1px solid ${showMobileFilters ? accentColor : 'var(--border-light)'}`,
                        color: showMobileFilters ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    aria-label="Toggle filters"
                >
                    <i className="fas fa-filter" />
                </button>
            </div>
            {showMobileFilters && (
                <div className="rounded p-3 bg-bg-secondary border border-border-light">
                    <div className="grid grid-cols-2 gap-2.5">
                        {viewMode && !hideViewModeToggle && (
                            <MobileFilterItem label="View Mode" fullWidth>
                                <MobileViewToggle
                                    viewMode={viewMode}
                                    onChange={onViewModeChange}
                                    accentColor={accentColor}
                                />
                            </MobileFilterItem>
                        )}
                        {!hidePlantFilter && (
                            <MobileFilterItem label="Plant">
                                <button type="button"
                                    className="flex items-center justify-between w-full rounded text-[12px] py-2 px-2 cursor-pointer bg-bg-primary border border-border-light text-text-primary"
                                    onClick={() => setIsPlantModalOpen(true)}
                                    aria-label="Filter by plant"
                                >
                                    <span className="truncate">{plantDisplayText}</span>
                                    <i className="fas fa-chevron-down text-[10px] text-text-tertiary" />
                                </button>
                            </MobileFilterItem>
                        )}
                        {safeStatusOptions.length > 0 && (
                            <MobileFilterItem label="Status">
                                <FilterSelect
                                    value={statusFilter}
                                    options={safeStatusOptions}
                                    onChange={onStatusFilterChange}
                                    ariaLabel="Status filter"
                                    className="w-full"
                                />
                            </MobileFilterItem>
                        )}
                        {safePositionOptions.length > 0 && (
                            <MobileFilterItem label="Position">
                                <FilterSelect
                                    value={positionFilter}
                                    options={safePositionOptions}
                                    onChange={onPositionFilterChange}
                                    ariaLabel="Position filter"
                                    className="w-full"
                                />
                            </MobileFilterItem>
                        )}
                        {safeFreightOptions.length > 0 && (
                            <MobileFilterItem label="Freight">
                                <FilterSelect
                                    value={freightFilter}
                                    options={safeFreightOptions}
                                    onChange={onFreightFilterChange}
                                    ariaLabel="Freight filter"
                                    className="w-full"
                                />
                            </MobileFilterItem>
                        )}
                        {customFilters}
                        {showReset && onReset && (
                            <MobileFilterItem fullWidth>
                                <button type="button"
                                    className="flex items-center justify-center gap-2 w-full rounded text-[12px] font-semibold py-2 cursor-pointer bg-bg-primary border border-border-light text-text-secondary"
                                    onClick={onReset}
                                >
                                    <i className="fas fa-undo" />
                                    Reset Filters
                                </button>
                            </MobileFilterItem>
                        )}
                    </div>
                </div>
            )}
            {customBottomContent && <div>{customBottomContent}</div>}
        </div>
    </div>
)

export default TopSectionMobile
