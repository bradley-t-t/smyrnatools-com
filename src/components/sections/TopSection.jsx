import React, {useLayoutEffect, useState} from 'react';
import './styles/Top.css'
import PlantDropdownModal from '../common/PlantDropdownModal';

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
                        flush = true,
                        tightTop = false,
                        flushTop,
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
                        customBottomContent = null
                    }) {
    const safePlants = Array.isArray(plants) ? plants : []
    const safeStatusOptions = Array.isArray(statusOptions) ? statusOptions : []
    const safePositionOptions = Array.isArray(positionOptions) ? positionOptions : []
    const safeListLabels = Array.isArray(listLabels) && listLabels.length > 0 ? listLabels : ['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']
    const safeColWidths = Array.isArray(colWidths) && colWidths.length > 0 ? colWidths : ['10%', '12%', '12%', '18%', '12%', '18%', '10%', '8%']

    const filteredPlants = isOfficeRegion || !regionPlantCodes || regionPlantCodes.size === 0
        ? safePlants
        : safePlants.filter(p => regionPlantCodes.has(String(p.plantCode || p.plant_code || '').trim().toUpperCase()));

    const effectiveFlush = typeof flushTop === 'boolean' ? flushTop : flush
    const classes = ['top-section']
    if (sticky) classes.push('top-section-sticky-header')
    if (effectiveFlush) classes.push('top-section-flush')
    if (tightTop) classes.push('top-section-tight')
    const className = classes.join(' ')
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const selectedPlantObj = safePlants.find(p => (p.plantCode || p.plant_code) === selectedPlant);
    const plantDisplayText = selectedPlant && selectedPlantObj ? `(${selectedPlantObj.plantCode || selectedPlantObj.plant_code}) ${selectedPlantObj.plantName || selectedPlantObj.plant_name}` : 'All Plants';

    useLayoutEffect(() => {
        if (forwardedRef?.current) {
            const element = forwardedRef.current;
            const updateHeight = () => {
                const height = element.offsetHeight;
                document.documentElement.style.setProperty('--top-section-height', `${height}px`);
            };
            updateHeight();
            const resizeObserver = new ResizeObserver(updateHeight);
            resizeObserver.observe(element);
            return () => resizeObserver.disconnect();
        }
    }, [forwardedRef]);

    useLayoutEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isMobile) {
        return (
            <>
                <div className={className} ref={forwardedRef} data-section="top" aria-label="Page controls">
                    <div className="top-section-inner mobile-layout">
                        <div className="mobile-header-row">
                            <div className="mobile-title-section">
                                <h1 className="top-title">{title}</h1>
                                {badge && (
                                    <div className="badge-container-mobile">
                                        {onBadgeClick ? (
                                            <button className="top-badge-mobile" onClick={onBadgeClick}>
                                                <i className="fas fa-user-clock" aria-hidden="true"></i>
                                                <span className="badge-text">{badge}</span>
                                            </button>
                                        ) : (
                                            <span className="top-badge-mobile">
                                                <i className="fas fa-user-clock" aria-hidden="true"></i>
                                                <span className="badge-text">{badge}</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="mobile-action-buttons">
                                {onAddClick && (
                                    <button className="mobile-add-btn" onClick={onAddClick} type="button"
                                            aria-label={addButtonLabel}>
                                        <i className="fas fa-plus" aria-hidden="true"></i>
                                    </button>
                                )}
                                {onToggleSidebar && (
                                    <button className="mobile-menu-btn" onClick={onToggleSidebar} type="button"
                                            aria-label="Toggle menu">
                                        <i className="fas fa-bars" aria-hidden="true"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mobile-search-row">
                            <div className="mobile-search-bar" role="search">
                                <i className="fas fa-search mobile-search-icon"></i>
                                <input
                                    type="text"
                                    className="mobile-search-input"
                                    placeholder={searchPlaceholder}
                                    value={searchInput || ''}
                                    onChange={e => onSearchInputChange && onSearchInputChange(e.target.value)}
                                    aria-label="Search"
                                />
                                {searchInput && onClearSearch && (
                                    <button className="mobile-search-clear" onClick={onClearSearch} type="button"
                                            aria-label="Clear search">
                                        <i className="fas fa-times" aria-hidden="true"></i>
                                    </button>
                                )}
                            </div>
                            <button
                                className={`mobile-filter-toggle ${showMobileFilters ? 'active' : ''}`}
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                type="button"
                                aria-label="Toggle filters"
                            >
                                <i className="fas fa-filter" aria-hidden="true"></i>
                                {showMobileFilters && <i className="fas fa-times mobile-filter-close"></i>}
                            </button>
                        </div>

                        {showMobileFilters && (
                            <div className="mobile-filters-panel">
                                <div className="mobile-filters-grid">
                                    {viewMode && !hideViewModeToggle && (
                                        <div className="mobile-filter-item full-width">
                                            <label className="mobile-filter-label">View Mode</label>
                                            <div className="mobile-view-toggle">
                                                <button
                                                    className={`mobile-view-btn${viewMode === 'list' ? ' active' : ''}`}
                                                    onClick={() => onViewModeChange && viewMode !== 'list' && onViewModeChange('list')}
                                                    aria-label="List view"
                                                    type="button"
                                                >
                                                    <i className="fas fa-list" aria-hidden="true"></i>
                                                    <span>List</span>
                                                </button>
                                                <button
                                                    className={`mobile-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                                                    onClick={() => onViewModeChange && viewMode !== 'grid' && onViewModeChange('grid')}
                                                    aria-label="Grid view"
                                                    type="button"
                                                >
                                                    <i className="fas fa-th-large" aria-hidden="true"></i>
                                                    <span>Grid</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!hidePlantFilter && (
                                        <div className="mobile-filter-item">
                                            <label className="mobile-filter-label">Plant</label>
                                            <button
                                                className="mobile-select-btn"
                                                onClick={() => setIsPlantModalOpen(true)}
                                                aria-label="Filter by plant"
                                            >
                                                <span className="mobile-select-text">{plantDisplayText}</span>
                                                <i className="fas fa-chevron-down"></i>
                                            </button>
                                        </div>
                                    )}

                                    {safeStatusOptions.length > 0 && (
                                        <div className="mobile-filter-item">
                                            <label className="mobile-filter-label">Status</label>
                                            <select
                                                className="mobile-select"
                                                value={statusFilter || ''}
                                                onChange={e => onStatusFilterChange && onStatusFilterChange(e.target.value)}
                                                aria-label="Status filter"
                                            >
                                                {safeStatusOptions.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {safePositionOptions.length > 0 && (
                                        <div className="mobile-filter-item">
                                            <label className="mobile-filter-label">Position</label>
                                            <select
                                                className="mobile-select"
                                                value={positionFilter || ''}
                                                onChange={e => onPositionFilterChange && onPositionFilterChange(e.target.value)}
                                                aria-label="Position filter"
                                            >
                                                {safePositionOptions.map(opt => (
                                                    <option key={opt}
                                                            value={opt === 'All Positions' ? '' : opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {Array.isArray(freightOptions) && freightOptions.length > 0 && (
                                        <div className="mobile-filter-item">
                                            <label className="mobile-filter-label">Freight</label>
                                            <select
                                                className="mobile-select"
                                                value={freightFilter || ''}
                                                onChange={e => onFreightFilterChange && onFreightFilterChange(e.target.value)}
                                                aria-label="Freight filter"
                                            >
                                                {freightOptions.map(opt => (
                                                    <option key={opt}
                                                            value={opt === 'All Freight' ? '' : opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {customFilters}

                                    {showReset && onReset && (
                                        <div className="mobile-filter-item full-width">
                                            <button className="mobile-reset-btn" onClick={onReset} type="button">
                                                <i className="fas fa-undo" aria-hidden="true"></i>
                                                Reset Filters
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {viewMode === 'list' && safeListLabels.length > 0 && (
                            <div className={`list-headers header-row`} role="row" aria-label="List headers">
                                {safeListLabels.map((l, i) => <div key={l} style={{
                                    width: safeColWidths[i] || 'auto',
                                    cursor: l && l !== 'More' && l !== 'VIN' ? 'pointer' : 'default'
                                }} role="columnheader"
                                                                   onClick={() => l && l !== 'More' && l !== 'VIN' && onHeaderClick && onHeaderClick(l)}>{l}{sortKey === l && l !== '' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</div>)}
                            </div>
                        )}
                        {customBottomContent}
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
        );
    }

    return (
        <>
            <div className={className} ref={forwardedRef} data-section="top" aria-label="Page controls">
                <div className="top-section-inner">
                    <div className="top-row primary-row">
                        <h1 className="top-title">{title}</h1>
                        {badge && (
                            <div className="badge-container">
                                {onBadgeClick ? (
                                    <button className="top-badge" onClick={onBadgeClick}>
                                        <i className="fas fa-user-clock" aria-hidden="true"></i>
                                        <span className="badge-text">{badge}</span>
                                    </button>
                                ) : (
                                    <span className="top-badge">
                                        <i className="fas fa-user-clock" aria-hidden="true"></i>
                                        <span className="badge-text">{badge}</span>
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="action-cluster" role="group" aria-label="Primary actions">
                            {onToggleSidebar && (
                                <button className="action-button subtle" onClick={onToggleSidebar} type="button"
                                        aria-label="Toggle menu">
                                    <i className="fas fa-bars" aria-hidden="true"></i>
                                    <span className="action-label">Menu</span>
                                </button>
                            )}
                            {onAddClick && (
                                <button className="action-button primary add-main" onClick={onAddClick} type="button">
                                    <i className="fas fa-plus" aria-hidden="true"></i>
                                    <span className="action-label">{addButtonLabel}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="top-row controls-row" role="region" aria-label="Search and filters">
                        <div className="search-bar" role="search">
                            <input
                                type="text"
                                className="ios-search-input"
                                placeholder={searchPlaceholder}
                                value={searchInput || ''}
                                onChange={e => onSearchInputChange && onSearchInputChange(e.target.value)}
                                aria-label="Search"
                            />
                            {searchInput && onClearSearch && (
                                <button className="clear" onClick={onClearSearch} type="button"
                                        aria-label="Clear search">
                                    <i className="fas fa-times" aria-hidden="true"></i>
                                </button>
                            )}
                        </div>
                        <div className="filters" role="group" aria-label="Filters and view options">
                            {viewMode && !hideViewModeToggle && (
                                <div className="view-toggle-icons" role="group" aria-label="View mode">
                                    <button
                                        className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
                                        onClick={() => onViewModeChange && viewMode !== 'list' && onViewModeChange('list')}
                                        aria-label="List view"
                                        aria-pressed={viewMode === 'list'}
                                        type="button"
                                    >
                                        <i className="fas fa-list" aria-hidden="true"></i>
                                    </button>
                                    <button
                                        className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
                                        onClick={() => onViewModeChange && viewMode !== 'grid' && onViewModeChange('grid')}
                                        aria-label="Grid view"
                                        aria-pressed={viewMode === 'grid'}
                                        type="button"
                                    >
                                        <i className="fas fa-th-large" aria-hidden="true"></i>
                                    </button>
                                </div>
                            )}
                            <div className="filter-wrapper">
                                {!hidePlantFilter && (
                                    <button
                                        className="ios-select"
                                        onClick={() => setIsPlantModalOpen(true)}
                                        aria-label="Filter by plant"
                                    >
                                        {plantDisplayText}
                                    </button>
                                )}
                            </div>
                            {safeStatusOptions.length > 0 && (
                                <div className="filter-wrapper">
                                    <select
                                        className="ios-select"
                                        value={statusFilter || ''}
                                        onChange={e => onStatusFilterChange && onStatusFilterChange(e.target.value)}
                                        aria-label="Status filter"
                                    >
                                        {safeStatusOptions.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {safePositionOptions.length > 0 && (
                                <div className="filter-wrapper">
                                    <select
                                        className="ios-select"
                                        value={positionFilter || ''}
                                        onChange={e => onPositionFilterChange && onPositionFilterChange(e.target.value)}
                                        aria-label="Position filter"
                                    >
                                        {safePositionOptions.map(opt => (
                                            <option key={opt} value={opt === 'All Positions' ? '' : opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {Array.isArray(freightOptions) && freightOptions.length > 0 && (
                                <div className="filter-wrapper freight-filter">
                                    <select
                                        className="ios-select freight-select"
                                        value={freightFilter || ''}
                                        onChange={e => onFreightFilterChange && onFreightFilterChange(e.target.value)}
                                        aria-label="Freight filter"
                                    >
                                        {freightOptions.map(opt => (
                                            <option key={opt} value={opt === 'All Freight' ? '' : opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {customFilters}
                            {showReset && onReset && (
                                <button className="filter-reset-button" onClick={onReset} type="button"
                                        aria-label="Reset filters">
                                    <i className="fas fa-undo" aria-hidden="true"></i>
                                </button>
                            )}
                        </div>
                    </div>
                    {viewMode === 'list' && safeListLabels.length > 0 && (
                        <div className={`list-headers header-row`} role="row"
                             aria-label="List headers">
                            {safeListLabels.map((l, i) => <div key={l} style={{
                                width: safeColWidths[i] || 'auto',
                                cursor: l && l !== 'More' && l !== 'VIN' ? 'pointer' : 'default'
                            }} role="columnheader"
                                                               onClick={() => l && l !== 'More' && l !== 'VIN' && onHeaderClick && onHeaderClick(l)}>{l}{sortKey === l && l !== '' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</div>)}
                        </div>
                    )}
                    {customBottomContent}
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
