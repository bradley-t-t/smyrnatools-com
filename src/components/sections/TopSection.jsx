import React, {useLayoutEffect} from 'react';
import './styles/Top.css'

function TopSection({
                        title,
                        badge,
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
                        showCoverOverlay: _showCoverOverlay,
                        positionFilter,
                        positionOptions,
                        onPositionFilterChange,
                        hideViewModeToggle = false,
                        listLabels,
                        colWidths,
                        customFilters,
                        hidePlantFilter = false
                    }) {
    const safePlants = Array.isArray(plants) ? plants : []
    const safeStatusOptions = Array.isArray(statusOptions) ? statusOptions : []
    const safePositionOptions = Array.isArray(positionOptions) ? positionOptions : []
    const safeListLabels = Array.isArray(listLabels) && listLabels.length > 0 ? listLabels : ['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']
    const safeColWidths = Array.isArray(colWidths) && colWidths.length > 0 ? colWidths : ['10%', '12%', '12%', '18%', '12%', '18%', '10%', '8%']
    const effectiveFlush = typeof flushTop === 'boolean' ? flushTop : flush
    const classes = ['top-section']
    if (sticky) classes.push('top-section-sticky-header')
    if (effectiveFlush) classes.push('top-section-flush')
    if (tightTop) classes.push('top-section-tight')
    const className = classes.join(' ')
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
    return (
        <div className={className} ref={forwardedRef} data-section="top" aria-label="Page controls">
            <div className="top-section-inner">
                <div className="top-row primary-row">
                    <h1 className="top-title">{title} {badge && <span className="top-badge">{badge}</span>}</h1>
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
                            <button className="clear" onClick={onClearSearch} type="button" aria-label="Clear search">
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
                                <select
                                    className="ios-select"
                                    value={selectedPlant || ''}
                                    onChange={e => onSelectedPlantChange && onSelectedPlantChange(e.target.value)}
                                    aria-label="Filter by plant"
                                >
                                    <option value="">All Plants</option>
                                    {safePlants
                                        .sort((a, b) => parseInt((a.plantCode || a.plant_code || '').replace(/\D/g, '') || '0') - parseInt((b.plantCode || b.plant_code || '').replace(/\D/g, '') || '0'))
                                        .map(plant => (
                                            <option key={plant.plantCode || plant.plant_code}
                                                    value={plant.plantCode || plant.plant_code}>
                                                ({plant.plantCode || plant.plant_code}) {plant.plantName || plant.plant_name}
                                            </option>
                                        ))}
                                </select>
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
                        {safeListLabels.map((l, i) => <div key={l} style={{width: safeColWidths[i] || 'auto'}} role="columnheader">{l}</div>)}
                    </div>
                )}
            </div>
        </div>
    )
}

export default TopSection
