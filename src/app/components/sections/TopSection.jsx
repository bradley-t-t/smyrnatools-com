import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { usePreferences } from '../../context/PreferencesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import PlantDropdownModal from '../common/PlantDropdownModal'
/** Default column header labels for asset list views. */
const DEFAULT_LIST_LABELS = ['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']
/** Default column widths matching DEFAULT_LIST_LABELS. */
const DEFAULT_COL_WIDTHS = ['10%', '12%', '12%', '18%', '12%', '18%', '10%', '8%']
/** Search input with icon and optional clear button. */
const SearchInput = ({ value, onChange, onClear, placeholder, className = '' }) => (
    <div className={`relative ${className}`} role="search">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]" />
        <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm outline-none py-3 pl-11 pr-4 placeholder:text-slate-400"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            aria-label="Search"
        />
        {value && onClear && (
            <button
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-gray-200 rounded-lg text-slate-500 text-xs cursor-pointer"
                onClick={onClear}
                type="button"
                aria-label="Clear search"
            >
                <i className="fas fa-times" />
            </button>
        )}
    </div>
)
const Badge = ({ children, onClick, accentColor }) => {
    const baseClasses = 'inline-flex items-center gap-2 rounded-lg text-sm font-semibold px-4 py-2'
    const style = { backgroundColor: `${accentColor}15`, color: accentColor }
    return onClick ? (
        <button className={`${baseClasses} border-none cursor-pointer`} style={style} onClick={onClick}>
            <i className="fas fa-user-clock" />
            <span>{children}</span>
        </button>
    ) : (
        <span className={baseClasses} style={style}>
            <i className="fas fa-user-clock" />
            <span>{children}</span>
        </span>
    )
}
const ActionButton = ({ icon, label, onClick, variant = 'subtle', accentColor, className = '' }) => {
    const baseClasses =
        'flex items-center gap-2 border-none rounded-xl text-sm font-semibold px-5 py-3 cursor-pointer transition-all duration-150'
    const isPrimary = variant === 'primary'
    return (
        <button
            className={`${baseClasses} ${className}`}
            style={{
                backgroundColor: isPrimary ? accentColor : '#f1f5f9',
                color: isPrimary ? 'white' : '#475569'
            }}
            onClick={onClick}
            type="button"
            aria-label={label}
        >
            <i className={`fas ${icon}`} />
            {label && <span>{label}</span>}
        </button>
    )
}
const ViewToggle = ({ viewMode, onChange, accentColor }) => (
    <div
        className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1"
        role="group"
        aria-label="View mode"
    >
        {['list', 'grid'].map((mode) => {
            const isActive = viewMode === mode
            return (
                <button
                    key={mode}
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-[15px] border-none cursor-pointer transition-all duration-150"
                    style={{
                        backgroundColor: isActive ? accentColor : 'transparent',
                        color: isActive ? 'white' : '#64748b'
                    }}
                    onClick={() => onChange?.(mode)}
                    aria-label={`${mode} view`}
                    aria-pressed={isActive}
                    type="button"
                >
                    <i className={`fas ${mode === 'list' ? 'fa-list' : 'fa-th-large'}`} />
                </button>
            )
        })}
    </div>
)
const FilterSelect = ({ value, options, onChange, ariaLabel, className = '' }) => (
    <select
        className={`appearance-none bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm cursor-pointer min-w-[140px] py-3 pl-4 pr-10 bg-no-repeat ${className}`}
        style={{
            backgroundImage: CHEVRON_SVG,
            backgroundPosition: 'right 12px center',
            backgroundSize: '18px'
        }}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label={ariaLabel}
    >
        {options.map((opt) => (
            <option key={opt} value={opt === 'All Positions' || opt === 'All Freight' ? '' : opt}>
                {opt}
            </option>
        ))}
    </select>
)
const CHEVRON_SVG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")"
const PlantFilterButton = ({ displayText, onClick }) => (
    <button
        className="bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium cursor-pointer py-3 pl-4 pr-10 bg-no-repeat"
        style={{
            backgroundImage: CHEVRON_SVG,
            backgroundPosition: 'right 12px center',
            backgroundSize: '18px'
        }}
        onClick={onClick}
        aria-label="Filter by plant"
    >
        {displayText}
    </button>
)
const ResetButton = ({ onClick }) => (
    <button
        className="flex items-center justify-center w-[46px] h-[46px] bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[15px] cursor-pointer"
        onClick={onClick}
        type="button"
        aria-label="Reset filters"
    >
        <i className="fas fa-undo" />
    </button>
)
const ListHeader = ({ labels, colWidths, sortKey, sortDirection, onHeaderClick, accentColor }) => (
    <div className="flex items-center bg-slate-50 border-t border-slate-200 -mx-7 mt-4 -mb-6 px-7">
        {labels.map((label, index) => {
            const colWidth = colWidths[index] || 'auto'
            const isFlex = colWidth === 'flex' || colWidth === 'auto'
            const isActive = sortKey === label
            return (
                <div
                    key={label}
                    className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wide py-3 px-2 cursor-pointer select-none hover:text-[--accent]"
                    style={{
                        ...(isFlex ? { flex: 1, minWidth: 0 } : { flexShrink: 0, width: colWidth }),
                        '--accent': accentColor
                    }}
                    onClick={() => onHeaderClick?.(label)}
                >
                    <span>{label}</span>
                    {isActive && (
                        <i
                            className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-[10px]`}
                            style={{ color: accentColor }}
                        />
                    )}
                </div>
            )
        })}
    </div>
)
const MobileViewToggle = ({ viewMode, onChange, accentColor }) => (
    <div className="flex gap-2.5">
        {[
            { icon: 'fa-list', label: 'List', mode: 'list' },
            { icon: 'fa-th-large', label: 'Grid', mode: 'grid' }
        ].map(({ mode, icon, label }) => {
            const isActive = viewMode === mode
            return (
                <button
                    key={mode}
                    className="flex items-center justify-center gap-2 flex-1 rounded-lg text-sm font-semibold py-3 border-2 cursor-pointer"
                    style={{
                        backgroundColor: isActive ? `${accentColor}15` : 'white',
                        borderColor: isActive ? accentColor : '#e5e7eb',
                        color: isActive ? accentColor : '#64748b'
                    }}
                    onClick={() => onChange?.(mode)}
                    aria-label={`${label} view`}
                    type="button"
                >
                    <i className={`fas ${icon}`} />
                    <span>{label}</span>
                </button>
            )
        })}
    </div>
)
const MobileFilterItem = ({ label, children, fullWidth = false }) => (
    <div className={`flex flex-col gap-2 ${fullWidth ? 'col-span-2' : ''}`}>
        <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">{label}</label>
        {children}
    </div>
)
function TopSection({
    title,
    badge,
    onBadgeClick,
    onToggleSidebar,
    addButtonLabel,
    onAddClick,
    searchInput,
    onSearchInputChange,
    onClearSearch,
    searchPlaceholder,
    viewMode,
    onViewModeChange,
    plants,
    regionPlantCodes,
    selectedPlant,
    onSelectedPlantChange,
    statusFilter,
    statusOptions,
    onStatusFilterChange,
    freightFilter,
    freightOptions,
    onFreightFilterChange,
    showReset,
    onReset,
    forwardedRef,
    sticky = true,
    tightTop = false,
    positionFilter,
    positionOptions,
    onPositionFilterChange,
    hideViewModeToggle = false,
    listLabels,
    colWidths,
    customFilters,
    hidePlantFilter = false,
    onHeaderClick,
    sortKey,
    sortDirection,
    isOfficeRegion = false,
    customActions = null,
    customBottomContent = null,
    customBottomSkeleton = null,
    isLoading = false
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const isMobile = useIsMobile()
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [showMobileFilters, setShowMobileFilters] = useState(false)
    const safePlants = Array.isArray(plants) ? plants : []
    const safeStatusOptions = Array.isArray(statusOptions) ? statusOptions : []
    const safePositionOptions = Array.isArray(positionOptions) ? positionOptions : []
    const safeFreightOptions = Array.isArray(freightOptions) ? freightOptions : []
    const safeListLabels = Array.isArray(listLabels) && listLabels.length > 0 ? listLabels : DEFAULT_LIST_LABELS
    const safeColWidths = Array.isArray(colWidths) && colWidths.length > 0 ? colWidths : DEFAULT_COL_WIDTHS
    const filteredPlants =
        isOfficeRegion || !regionPlantCodes || regionPlantCodes.size === 0
            ? safePlants
            : safePlants.filter((p) =>
                  regionPlantCodes.has(
                      String(p.plantCode || p.plant_code || '')
                          .trim()
                          .toUpperCase()
                  )
              )
    const selectedPlantObj = safePlants.find((p) => (p.plantCode || p.plant_code) === selectedPlant)
    const plantDisplayText =
        selectedPlant && selectedPlantObj
            ? `(${selectedPlantObj.plantCode || selectedPlantObj.plant_code}) ${selectedPlantObj.plantName || selectedPlantObj.plant_name}`
            : 'All Plants'
    useLayoutEffect(() => {
        if (!forwardedRef?.current) return
        const element = forwardedRef.current
        const updateHeight = () => {
            document.documentElement.style.setProperty('--top-section-height', `${element.offsetHeight}px`)
        }
        updateHeight()
        const resizeObserver = new ResizeObserver(updateHeight)
        resizeObserver.observe(element)
        return () => resizeObserver.disconnect()
    }, [forwardedRef])
    const sectionClasses = `bg-white border-b border-slate-200 shadow-sm ${tightTop ? 'px-6 py-4 pb-5' : 'px-7 py-5 pb-6'} ${sticky ? 'sticky top-0 z-50' : ''}`
    const sectionStyle = {
        backgroundImage: `
            linear-gradient(${accentColor}10 1px, transparent 1px),
            linear-gradient(90deg, ${accentColor}10 1px, transparent 1px),
            radial-gradient(circle at center, ${accentColor}08 0%, transparent 50%)
        `,
        backgroundPosition: '0 0, 0 0, 0 0',
        backgroundSize: '20px 20px, 20px 20px, 40px 40px'
    }
    const wasLoadingRef = useRef(isLoading)
    const hasRevealedRef = useRef(false)
    const [revealControls, setRevealControls] = useState(false)
    const needsRevealRef = useRef(false)
    useEffect(() => {
        if (wasLoadingRef.current && !isLoading && !hasRevealedRef.current) {
            hasRevealedRef.current = true
            needsRevealRef.current = false
            setRevealControls(true)
            const timer = setTimeout(() => setRevealControls(false), 1200)
            return () => clearTimeout(timer)
        }
        if (isLoading && !hasRevealedRef.current) {
            needsRevealRef.current = true
        }
        wasLoadingRef.current = isLoading
    }, [isLoading])
    // While loading or awaiting reveal animation start, hide real content completely
    const hideRealContent = isLoading || (needsRevealRef.current && !revealControls)
    const skeletonContent = (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div className={`${isMobile ? 'h-6 w-36' : 'h-8 w-48'} rounded-lg bg-slate-200 animate-pulse`} />
                <div className="flex items-center gap-2.5">
                    <div
                        className={`${isMobile ? 'w-11 h-11' : 'w-[88px] h-[46px]'} rounded-xl bg-slate-200 animate-pulse`}
                    />
                </div>
            </div>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-3.5 justify-between'}`}>
                <div
                    className={`${isMobile ? 'flex-1 h-[46px]' : 'h-[46px] min-w-[220px] max-w-[420px] flex-[0_1_auto]'} rounded-xl bg-slate-100 animate-pulse`}
                />
                {isMobile ? (
                    <div className="w-[50px] h-[50px] rounded-xl bg-slate-100 animate-pulse" />
                ) : (
                    <div className="flex items-center gap-3 ml-auto">
                        <div className="w-[88px] h-[44px] rounded-lg bg-slate-100 animate-pulse" />
                        <div className="w-[120px] h-[46px] rounded-xl bg-slate-100 animate-pulse" />
                        <div className="w-[140px] h-[46px] rounded-xl bg-slate-100 animate-pulse" />
                    </div>
                )}
            </div>
            {customBottomSkeleton}
            {!isMobile && viewMode === 'list' && (
                <div className="flex items-center bg-slate-50 border-t border-slate-200 -mx-7 mt-4 -mb-6 px-7 py-3">
                    {safeColWidths.map((w, i) => {
                        const isFlex = w === 'flex' || w === 'auto'
                        return (
                            <div
                                key={i}
                                className="px-2"
                                style={isFlex ? { flex: 1, minWidth: 0 } : { flexShrink: 0, width: w }}
                            >
                                <div
                                    className="h-3 rounded bg-slate-200 animate-pulse"
                                    style={{ width: `${50 + ((i * 13) % 40)}%` }}
                                />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
    if (isMobile) {
        return (
            <>
                <style>{`
                    @keyframes revealFromLeft {
                        from { opacity: 0; transform: translateX(-18px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    @keyframes revealFromRight {
                        from { opacity: 0; transform: translateX(18px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    .top-reveal-left {
                        animation: revealFromLeft 0.5s ease-out both;
                    }
                    .top-reveal-right {
                        animation: revealFromRight 0.5s ease-out both;
                    }
                `}</style>
                <div
                    ref={forwardedRef}
                    className={sectionClasses}
                    style={sectionStyle}
                    data-section="top"
                    aria-label="Page controls"
                >
                    {hideRealContent && skeletonContent}
                    <div className="flex flex-col gap-4" style={hideRealContent ? { display: 'none' } : undefined}>
                        <div className="flex items-center justify-between gap-3">
                            <div
                                className={`flex items-center gap-3${revealControls ? ' top-reveal-left' : ''}`}
                                style={revealControls ? { animationDelay: '0ms' } : undefined}
                            >
                                <h1 className="text-[22px] font-bold text-slate-900 m-0">{title}</h1>
                                {badge && (
                                    <Badge onClick={onBadgeClick} accentColor={accentColor}>
                                        {badge}
                                    </Badge>
                                )}
                            </div>
                            <div
                                className={`flex items-center gap-2.5${revealControls ? ' top-reveal-right' : ''}`}
                                style={revealControls ? { animationDelay: '60ms' } : undefined}
                            >
                                {customActions}
                                {onAddClick && (
                                    <button
                                        className="flex items-center justify-center w-11 h-11 rounded-xl border-none text-white text-lg cursor-pointer"
                                        style={{ backgroundColor: accentColor }}
                                        onClick={onAddClick}
                                        type="button"
                                        aria-label={addButtonLabel}
                                    >
                                        <i className="fas fa-plus" />
                                    </button>
                                )}
                                {onToggleSidebar && (
                                    <button
                                        className="flex items-center justify-center w-11 h-11 rounded-xl border-none bg-slate-100 text-slate-600 text-lg cursor-pointer"
                                        onClick={onToggleSidebar}
                                        type="button"
                                        aria-label="Toggle menu"
                                    >
                                        <i className="fas fa-bars" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                            <div
                                className={`flex-1${revealControls ? ' top-reveal-left' : ''}`}
                                style={revealControls ? { animationDelay: '120ms' } : undefined}
                            >
                                <SearchInput
                                    value={searchInput}
                                    onChange={onSearchInputChange}
                                    onClear={onClearSearch}
                                    placeholder={searchPlaceholder}
                                    className="w-full"
                                />
                            </div>
                            <div
                                className={revealControls ? 'top-reveal-right' : ''}
                                style={revealControls ? { animationDelay: '140ms' } : undefined}
                            >
                                <button
                                    className="flex items-center justify-center w-[50px] h-[50px] rounded-xl text-lg border-2 cursor-pointer"
                                    style={{
                                        backgroundColor: showMobileFilters ? `${accentColor}15` : '#f8fafc',
                                        borderColor: showMobileFilters ? accentColor : '#e5e7eb',
                                        color: showMobileFilters ? accentColor : '#64748b'
                                    }}
                                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                                    type="button"
                                    aria-label="Toggle filters"
                                >
                                    <i className="fas fa-filter" />
                                </button>
                            </div>
                        </div>
                        {showMobileFilters && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl mt-4 p-5">
                                <div className="grid grid-cols-2 gap-3.5">
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
                                            <button
                                                className="flex items-center justify-between w-full bg-white border border-slate-200 rounded-lg text-slate-900 text-sm py-3 px-4 cursor-pointer"
                                                onClick={() => setIsPlantModalOpen(true)}
                                                aria-label="Filter by plant"
                                            >
                                                <span className="truncate">{plantDisplayText}</span>
                                                <i className="fas fa-chevron-down text-slate-500" />
                                            </button>
                                        </MobileFilterItem>
                                    )}
                                    {safeStatusOptions.length > 0 && (
                                        <MobileFilterItem label="Status">
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg text-slate-900 text-sm py-3 px-4"
                                                value={statusFilter || ''}
                                                onChange={(e) => onStatusFilterChange?.(e.target.value)}
                                                aria-label="Status filter"
                                            >
                                                {safeStatusOptions.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </MobileFilterItem>
                                    )}
                                    {safePositionOptions.length > 0 && (
                                        <MobileFilterItem label="Position">
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg text-slate-900 text-sm py-3 px-4"
                                                value={positionFilter || ''}
                                                onChange={(e) => onPositionFilterChange?.(e.target.value)}
                                                aria-label="Position filter"
                                            >
                                                {safePositionOptions.map((opt) => (
                                                    <option key={opt} value={opt === 'All Positions' ? '' : opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </MobileFilterItem>
                                    )}
                                    {safeFreightOptions.length > 0 && (
                                        <MobileFilterItem label="Freight">
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg text-slate-900 text-sm py-3 px-4"
                                                value={freightFilter || ''}
                                                onChange={(e) => onFreightFilterChange?.(e.target.value)}
                                                aria-label="Freight filter"
                                            >
                                                {safeFreightOptions.map((opt) => (
                                                    <option key={opt} value={opt === 'All Freight' ? '' : opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </MobileFilterItem>
                                    )}
                                    {customFilters}
                                    {showReset && onReset && (
                                        <MobileFilterItem fullWidth>
                                            <button
                                                className="flex items-center justify-center gap-2.5 w-full bg-white border border-slate-200 rounded-lg text-slate-500 text-sm font-semibold py-3.5 cursor-pointer"
                                                onClick={onReset}
                                                type="button"
                                            >
                                                <i className="fas fa-undo" />
                                                Reset Filters
                                            </button>
                                        </MobileFilterItem>
                                    )}
                                </div>
                            </div>
                        )}
                        {customBottomContent && (
                            <div
                                className={revealControls ? 'top-reveal-left' : ''}
                                style={revealControls ? { animationDelay: '200ms' } : undefined}
                            >
                                {customBottomContent}
                            </div>
                        )}
                    </div>
                </div>
                {isPlantModalOpen && (
                    <PlantDropdownModal
                        isOpen={isPlantModalOpen}
                        onClose={() => setIsPlantModalOpen(false)}
                        plants={filteredPlants}
                        onSelect={onSelectedPlantChange}
                        showAllPlants={true}
                    />
                )}
            </>
        )
    }
    return (
        <>
            <style>{`
                @keyframes revealFromLeft {
                    from { opacity: 0; transform: translateX(-18px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes revealFromRight {
                    from { opacity: 0; transform: translateX(18px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .top-reveal-left {
                    animation: revealFromLeft 0.5s ease-out both;
                }
                .top-reveal-right {
                    animation: revealFromRight 0.5s ease-out both;
                }
            `}</style>
            <div
                ref={forwardedRef}
                className={sectionClasses}
                style={sectionStyle}
                data-section="top"
                aria-label="Page controls"
            >
                {hideRealContent && skeletonContent}
                <div className="flex flex-col gap-4" style={hideRealContent ? { display: 'none' } : undefined}>
                    <div className="flex items-center gap-4 justify-between">
                        <div
                            className={`flex items-center gap-4${revealControls ? ' top-reveal-left' : ''}`}
                            style={revealControls ? { animationDelay: '0ms' } : undefined}
                        >
                            <h1 className="text-[28px] font-bold text-slate-900 tracking-tight m-0">{title}</h1>
                            {badge && (
                                <div className="ml-4">
                                    <Badge onClick={onBadgeClick} accentColor={accentColor}>
                                        {badge}
                                    </Badge>
                                </div>
                            )}
                        </div>
                        <div
                            className={`flex items-center gap-3 ml-auto${revealControls ? ' top-reveal-right' : ''}`}
                            role="group"
                            aria-label="Primary actions"
                            style={revealControls ? { animationDelay: '60ms' } : undefined}
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
                        className="flex items-center flex-wrap gap-3.5 justify-between"
                        role="region"
                        aria-label="Search and filters"
                    >
                        <div
                            className={revealControls ? 'top-reveal-left' : ''}
                            style={revealControls ? { animationDelay: '120ms' } : undefined}
                        >
                            <SearchInput
                                value={searchInput}
                                onChange={onSearchInputChange}
                                onClear={onClearSearch}
                                placeholder={searchPlaceholder}
                                className="min-w-[220px] max-w-[420px]"
                            />
                        </div>
                        <div
                            className={`flex items-center flex-wrap gap-3 ml-auto${revealControls ? ' top-reveal-right' : ''}`}
                            role="group"
                            aria-label="Filters and view options"
                            style={revealControls ? { animationDelay: '140ms' } : undefined}
                        >
                            {viewMode && !hideViewModeToggle && (
                                <ViewToggle viewMode={viewMode} onChange={onViewModeChange} accentColor={accentColor} />
                            )}
                            {!hidePlantFilter && (
                                <PlantFilterButton
                                    displayText={plantDisplayText}
                                    onClick={() => setIsPlantModalOpen(true)}
                                />
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
                    {customBottomContent && (
                        <div
                            className={revealControls ? 'top-reveal-left' : ''}
                            style={revealControls ? { animationDelay: '200ms' } : undefined}
                        >
                            {customBottomContent}
                        </div>
                    )}
                    {viewMode === 'list' && safeListLabels.length > 0 && (
                        <div
                            className={revealControls ? 'top-reveal-left' : ''}
                            style={revealControls ? { animationDelay: '260ms' } : undefined}
                        >
                            <ListHeader
                                labels={safeListLabels}
                                colWidths={safeColWidths}
                                sortKey={sortKey}
                                sortDirection={sortDirection}
                                onHeaderClick={onHeaderClick}
                                accentColor={accentColor}
                            />
                        </div>
                    )}
                </div>
            </div>
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    plants={filteredPlants}
                    onSelect={onSelectedPlantChange}
                    showAllPlants={true}
                />
            )}
        </>
    )
}
export default TopSection
