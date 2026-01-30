import React, { useLayoutEffect, useState } from 'react'

import PlantDropdownModal from '../common/PlantDropdownModal'

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
    const safeListLabels =
        Array.isArray(listLabels) && listLabels.length > 0
            ? listLabels
            : ['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']
    const safeColWidths =
        Array.isArray(colWidths) && colWidths.length > 0
            ? colWidths
            : ['10%', '12%', '12%', '18%', '12%', '18%', '10%', '8%']

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

    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [showMobileFilters, setShowMobileFilters] = useState(false)
    const selectedPlantObj = safePlants.find((p) => (p.plantCode || p.plant_code) === selectedPlant)
    const plantDisplayText =
        selectedPlant && selectedPlantObj
            ? `(${selectedPlantObj.plantCode || selectedPlantObj.plant_code}) ${selectedPlantObj.plantName || selectedPlantObj.plant_name}`
            : 'All Plants'

    useLayoutEffect(() => {
        if (forwardedRef?.current) {
            const element = forwardedRef.current
            const updateHeight = () => {
                const height = element.offsetHeight
                document.documentElement.style.setProperty('--top-section-height', `${height}px`)
            }
            updateHeight()
            const resizeObserver = new ResizeObserver(updateHeight)
            resizeObserver.observe(element)
            return () => resizeObserver.disconnect()
        }
    }, [forwardedRef])

    useLayoutEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const styles = {
        actionButton: {
            alignItems: 'center',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '14px',
            fontWeight: 600,
            gap: '8px',
            padding: '12px 20px',
            transition: 'all 0.15s ease'
        },
        actionButtonPrimary: {
            backgroundColor: '#1e3a5f',
            color: 'white'
        },
        actionButtonSubtle: {
            backgroundColor: '#f1f5f9',
            color: '#475569'
        },
        actionCluster: {
            alignItems: 'center',
            display: 'flex',
            gap: '12px',
            marginLeft: 'auto'
        },
        badge: {
            alignItems: 'center',
            backgroundColor: '#f0f7ff',
            border: 'none',
            borderRadius: '10px',
            color: '#1e3a5f',
            cursor: onBadgeClick ? 'pointer' : 'default',
            display: 'inline-flex',
            fontSize: '14px',
            fontWeight: 600,
            gap: '8px',
            padding: '8px 16px'
        },
        badgeContainer: {
            marginLeft: '16px'
        },
        clearButton: {
            alignItems: 'center',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: '8px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '12px',
            height: '26px',
            justifyContent: 'center',
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '26px'
        },
        controlsRow: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            justifyContent: 'space-between'
        },
        filters: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginLeft: 'auto'
        },
        headerCell: {
            alignItems: 'center',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '11px',
            fontWeight: 700,
            gap: '6px',
            letterSpacing: '0.5px',
            padding: '12px 8px',
            textTransform: 'uppercase',
            userSelect: 'none'
        },
        headerCellHover: {
            color: '#1e3a5f'
        },
        headerRow: {
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            marginBottom: '-24px',
            marginLeft: '-28px',
            marginRight: '-28px',
            marginTop: '16px',
            paddingLeft: '28px',
            paddingRight: '28px'
        },
        inner: {
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
        },
        mobileActionBtn: {
            alignItems: 'center',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '18px',
            height: '44px',
            justifyContent: 'center',
            width: '44px'
        },
        mobileActionButtons: {
            alignItems: 'center',
            display: 'flex',
            gap: '10px'
        },
        mobileAddBtn: {
            backgroundColor: '#1e3a5f',
            color: 'white'
        },
        mobileFilterItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        mobileFilterItemFull: {
            gridColumn: 'span 2'
        },
        mobileFilterLabel: {
            color: '#64748b',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        mobileFilterToggle: (isActive) => ({
            alignItems: 'center',
            backgroundColor: isActive ? '#f0f7ff' : '#f8fafc',
            border: isActive ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '12px',
            color: isActive ? '#1e3a5f' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '18px',
            height: '50px',
            justifyContent: 'center',
            width: '50px'
        }),
        mobileFiltersGrid: {
            display: 'grid',
            gap: '14px',
            gridTemplateColumns: 'repeat(2, 1fr)'
        },
        mobileFiltersPanel: {
            backgroundColor: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            marginTop: '16px',
            padding: '20px'
        },
        mobileHeader: {
            alignItems: 'center',
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between'
        },
        mobileMenuBtn: {
            backgroundColor: '#f1f5f9',
            color: '#475569'
        },
        mobileResetBtn: {
            alignItems: 'center',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '14px',
            fontWeight: 600,
            gap: '10px',
            justifyContent: 'center',
            padding: '14px',
            width: '100%'
        },
        mobileSearchBar: {
            flex: 1,
            position: 'relative'
        },
        mobileSearchInput: {
            backgroundColor: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxSizing: 'border-box',
            color: '#1e293b',
            fontSize: '15px',
            outline: 'none',
            padding: '14px 18px 14px 44px',
            width: '100%'
        },
        mobileSearchRow: {
            alignItems: 'center',
            display: 'flex',
            gap: '12px',
            marginTop: '14px'
        },
        mobileSelect: {
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            color: '#1e293b',
            fontSize: '14px',
            padding: '12px 16px',
            width: '100%'
        },
        mobileSelectBtn: {
            alignItems: 'center',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            color: '#1e293b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '14px',
            justifyContent: 'space-between',
            padding: '12px 16px',
            width: '100%'
        },
        mobileTitle: {
            color: '#1e293b',
            fontSize: '22px',
            fontWeight: 700,
            margin: 0
        },
        mobileTitleSection: {
            alignItems: 'center',
            display: 'flex',
            gap: '12px'
        },
        mobileViewBtn: (isActive) => ({
            alignItems: 'center',
            backgroundColor: isActive ? '#f0f7ff' : 'white',
            border: isActive ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '10px',
            color: isActive ? '#1e3a5f' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            flex: 1,
            fontSize: '14px',
            fontWeight: 600,
            gap: '8px',
            justifyContent: 'center',
            padding: '12px'
        }),
        mobileViewToggle: {
            display: 'flex',
            gap: '10px'
        },
        primaryRow: {
            alignItems: 'center',
            display: 'flex',
            gap: '16px',
            justifyContent: 'space-between'
        },
        resetButton: {
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '15px',
            height: '46px',
            justifyContent: 'center',
            width: '46px'
        },
        searchBar: {
            flex: '0 1 auto',
            maxWidth: '420px',
            minWidth: '220px',
            position: 'relative'
        },
        searchIcon: {
            color: '#94a3b8',
            fontSize: '15px',
            left: '16px',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)'
        },
        searchInput: {
            backgroundColor: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxSizing: 'border-box',
            color: '#1e293b',
            fontSize: '14px',
            outline: 'none',
            padding: '12px 18px 12px 44px',
            width: '100%'
        },
        section: {
            backgroundColor: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundPosition: '0 0, 0 0, 0 0',
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            padding: tightTop ? '16px 24px 20px' : '20px 28px 24px',
            ...(sticky ? { position: 'sticky', top: 0, zIndex: 50 } : {})
        },
        select: {
            appearance: 'none',
            backgroundColor: '#f8fafc',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundPosition: 'right 12px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '18px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            color: '#1e293b',
            cursor: 'pointer',
            fontSize: '14px',
            minWidth: '140px',
            padding: '12px 40px 12px 16px'
        },
        selectButton: {
            backgroundColor: '#f8fafc',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundPosition: 'right 12px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '18px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            color: '#1e293b',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            padding: '12px 40px 12px 16px'
        },
        sortIcon: {
            color: '#94a3b8',
            fontSize: '10px'
        },
        sortIconActive: {
            color: '#1e3a5f'
        },
        title: {
            color: '#1e293b',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            margin: 0
        },
        viewToggle: {
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            display: 'flex',
            padding: '4px'
        },
        viewToggleBtn: (isActive) => ({
            alignItems: 'center',
            backgroundColor: isActive ? '#1e3a5f' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: isActive ? 'white' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '15px',
            height: '40px',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            width: '40px'
        })
    }

    if (isMobile) {
        return (
            <>
                <style>{`
                    .top-section-search::placeholder {
                        color: #94a3b8;
                    }
                    .top-section-select option {
                        background-color: white;
                        color: #1e293b;
                    }
                `}</style>
                <div style={styles.section} ref={forwardedRef} data-section="top" aria-label="Page controls">
                    <div style={styles.inner}>
                        <div style={styles.mobileHeader}>
                            <div style={styles.mobileTitleSection}>
                                <h1 style={styles.mobileTitle}>{title}</h1>
                                {badge &&
                                    (onBadgeClick ? (
                                        <button style={styles.badge} onClick={onBadgeClick}>
                                            <i
                                                className="fas fa-user-clock"
                                                style={{ color: '#1e3a5f' }}
                                                aria-hidden="true"
                                            ></i>
                                            <span style={{ color: '#1e3a5f' }}>{badge}</span>
                                        </button>
                                    ) : (
                                        <span style={styles.badge}>
                                            <i
                                                className="fas fa-user-clock"
                                                style={{ color: '#1e3a5f' }}
                                                aria-hidden="true"
                                            ></i>
                                            <span style={{ color: '#1e3a5f' }}>{badge}</span>
                                        </span>
                                    ))}
                            </div>
                            <div style={styles.mobileActionButtons}>
                                {onAddClick && (
                                    <button
                                        style={{ ...styles.mobileActionBtn, ...styles.mobileAddBtn }}
                                        onClick={onAddClick}
                                        type="button"
                                        aria-label={addButtonLabel}
                                    >
                                        <i className="fas fa-plus" style={{ color: 'white' }} aria-hidden="true"></i>
                                    </button>
                                )}
                                {onToggleSidebar && (
                                    <button
                                        style={{ ...styles.mobileActionBtn, ...styles.mobileMenuBtn }}
                                        onClick={onToggleSidebar}
                                        type="button"
                                        aria-label="Toggle menu"
                                    >
                                        <i className="fas fa-bars" aria-hidden="true"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={styles.mobileSearchRow}>
                            <div style={styles.mobileSearchBar} role="search">
                                <i className="fas fa-search" style={styles.searchIcon}></i>
                                <input
                                    type="text"
                                    className="top-section-search"
                                    style={styles.mobileSearchInput}
                                    placeholder={searchPlaceholder}
                                    value={searchInput || ''}
                                    onChange={(e) => onSearchInputChange && onSearchInputChange(e.target.value)}
                                    aria-label="Search"
                                />
                                {searchInput && onClearSearch && (
                                    <button
                                        style={styles.clearButton}
                                        onClick={onClearSearch}
                                        type="button"
                                        aria-label="Clear search"
                                    >
                                        <i className="fas fa-times" aria-hidden="true"></i>
                                    </button>
                                )}
                            </div>
                            <button
                                style={styles.mobileFilterToggle(showMobileFilters)}
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                type="button"
                                aria-label="Toggle filters"
                            >
                                <i className="fas fa-filter" aria-hidden="true"></i>
                            </button>
                        </div>

                        {showMobileFilters && (
                            <div style={styles.mobileFiltersPanel}>
                                <div style={styles.mobileFiltersGrid}>
                                    {viewMode && !hideViewModeToggle && (
                                        <div style={{ ...styles.mobileFilterItem, ...styles.mobileFilterItemFull }}>
                                            <label style={styles.mobileFilterLabel}>View Mode</label>
                                            <div style={styles.mobileViewToggle}>
                                                <button
                                                    style={styles.mobileViewBtn(viewMode === 'list')}
                                                    onClick={() =>
                                                        onViewModeChange &&
                                                        viewMode !== 'list' &&
                                                        onViewModeChange('list')
                                                    }
                                                    aria-label="List view"
                                                    type="button"
                                                >
                                                    <i className="fas fa-list" aria-hidden="true"></i>
                                                    <span>List</span>
                                                </button>
                                                <button
                                                    style={styles.mobileViewBtn(viewMode === 'grid')}
                                                    onClick={() =>
                                                        onViewModeChange &&
                                                        viewMode !== 'grid' &&
                                                        onViewModeChange('grid')
                                                    }
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
                                        <div style={styles.mobileFilterItem}>
                                            <label style={styles.mobileFilterLabel}>Plant</label>
                                            <button
                                                style={styles.mobileSelectBtn}
                                                onClick={() => setIsPlantModalOpen(true)}
                                                aria-label="Filter by plant"
                                            >
                                                <span
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {plantDisplayText}
                                                </span>
                                                <i className="fas fa-chevron-down" style={{ color: '#64748b' }}></i>
                                            </button>
                                        </div>
                                    )}

                                    {safeStatusOptions.length > 0 && (
                                        <div style={styles.mobileFilterItem}>
                                            <label style={styles.mobileFilterLabel}>Status</label>
                                            <select
                                                className="top-section-select"
                                                style={styles.mobileSelect}
                                                value={statusFilter || ''}
                                                onChange={(e) =>
                                                    onStatusFilterChange && onStatusFilterChange(e.target.value)
                                                }
                                                aria-label="Status filter"
                                            >
                                                {safeStatusOptions.map((option) => (
                                                    <option key={option} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {safePositionOptions.length > 0 && (
                                        <div style={styles.mobileFilterItem}>
                                            <label style={styles.mobileFilterLabel}>Position</label>
                                            <select
                                                className="top-section-select"
                                                style={styles.mobileSelect}
                                                value={positionFilter || ''}
                                                onChange={(e) =>
                                                    onPositionFilterChange && onPositionFilterChange(e.target.value)
                                                }
                                                aria-label="Position filter"
                                            >
                                                {safePositionOptions.map((opt) => (
                                                    <option key={opt} value={opt === 'All Positions' ? '' : opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {Array.isArray(freightOptions) && freightOptions.length > 0 && (
                                        <div style={styles.mobileFilterItem}>
                                            <label style={styles.mobileFilterLabel}>Freight</label>
                                            <select
                                                className="top-section-select"
                                                style={styles.mobileSelect}
                                                value={freightFilter || ''}
                                                onChange={(e) =>
                                                    onFreightFilterChange && onFreightFilterChange(e.target.value)
                                                }
                                                aria-label="Freight filter"
                                            >
                                                {freightOptions.map((opt) => (
                                                    <option key={opt} value={opt === 'All Freight' ? '' : opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {customFilters}

                                    {showReset && onReset && (
                                        <div style={{ ...styles.mobileFilterItem, ...styles.mobileFilterItemFull }}>
                                            <button style={styles.mobileResetBtn} onClick={onReset} type="button">
                                                <i className="fas fa-undo" aria-hidden="true"></i>
                                                Reset Filters
                                            </button>
                                        </div>
                                    )}
                                </div>
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

    return (
        <>
            <style>{`
                .top-section-search::placeholder {
                    color: #94a3b8;
                }
                .top-section-select option {
                    background-color: white;
                    color: #1e293b;
                }
            `}</style>
            <div style={styles.section} ref={forwardedRef} data-section="top" aria-label="Page controls">
                <div style={styles.inner}>
                    <div style={styles.primaryRow}>
                        <h1 style={styles.title}>{title}</h1>
                        {badge && (
                            <div style={styles.badgeContainer}>
                                {onBadgeClick ? (
                                    <button style={styles.badge} onClick={onBadgeClick}>
                                        <i
                                            className="fas fa-user-clock"
                                            style={{ color: '#1e3a5f' }}
                                            aria-hidden="true"
                                        ></i>
                                        <span style={{ color: '#1e3a5f' }}>{badge}</span>
                                    </button>
                                ) : (
                                    <span style={styles.badge}>
                                        <i
                                            className="fas fa-user-clock"
                                            style={{ color: '#1e3a5f' }}
                                            aria-hidden="true"
                                        ></i>
                                        <span style={{ color: '#1e3a5f' }}>{badge}</span>
                                    </span>
                                )}
                            </div>
                        )}
                        <div style={styles.actionCluster} role="group" aria-label="Primary actions">
                            {onToggleSidebar && (
                                <button
                                    style={{ ...styles.actionButton, ...styles.actionButtonSubtle }}
                                    onClick={onToggleSidebar}
                                    type="button"
                                    aria-label="Toggle menu"
                                >
                                    <i className="fas fa-bars" aria-hidden="true"></i>
                                    <span>Menu</span>
                                </button>
                            )}
                            {onAddClick && (
                                <button
                                    style={{ ...styles.actionButton, ...styles.actionButtonPrimary }}
                                    onClick={onAddClick}
                                    type="button"
                                >
                                    <i className="fas fa-plus" style={{ color: 'white' }} aria-hidden="true"></i>
                                    <span style={{ color: 'white' }}>{addButtonLabel}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div style={styles.controlsRow} role="region" aria-label="Search and filters">
                        <div style={styles.searchBar} role="search">
                            <i className="fas fa-search" style={styles.searchIcon}></i>
                            <input
                                type="text"
                                className="top-section-search"
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                value={searchInput || ''}
                                onChange={(e) => onSearchInputChange && onSearchInputChange(e.target.value)}
                                aria-label="Search"
                            />
                            {searchInput && onClearSearch && (
                                <button
                                    style={styles.clearButton}
                                    onClick={onClearSearch}
                                    type="button"
                                    aria-label="Clear search"
                                >
                                    <i className="fas fa-times" aria-hidden="true"></i>
                                </button>
                            )}
                        </div>
                        <div style={styles.filters} role="group" aria-label="Filters and view options">
                            {viewMode && !hideViewModeToggle && (
                                <div style={styles.viewToggle} role="group" aria-label="View mode">
                                    <button
                                        style={styles.viewToggleBtn(viewMode === 'list')}
                                        onClick={() =>
                                            onViewModeChange && viewMode !== 'list' && onViewModeChange('list')
                                        }
                                        aria-label="List view"
                                        aria-pressed={viewMode === 'list'}
                                        type="button"
                                    >
                                        <i className="fas fa-list" aria-hidden="true"></i>
                                    </button>
                                    <button
                                        style={styles.viewToggleBtn(viewMode === 'grid')}
                                        onClick={() =>
                                            onViewModeChange && viewMode !== 'grid' && onViewModeChange('grid')
                                        }
                                        aria-label="Grid view"
                                        aria-pressed={viewMode === 'grid'}
                                        type="button"
                                    >
                                        <i className="fas fa-th-large" aria-hidden="true"></i>
                                    </button>
                                </div>
                            )}
                            {!hidePlantFilter && (
                                <button
                                    style={styles.selectButton}
                                    onClick={() => setIsPlantModalOpen(true)}
                                    aria-label="Filter by plant"
                                >
                                    {plantDisplayText}
                                </button>
                            )}
                            {safeStatusOptions.length > 0 && (
                                <select
                                    className="top-section-select"
                                    style={styles.select}
                                    value={statusFilter || ''}
                                    onChange={(e) => onStatusFilterChange && onStatusFilterChange(e.target.value)}
                                    aria-label="Status filter"
                                >
                                    {safeStatusOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {safePositionOptions.length > 0 && (
                                <select
                                    className="top-section-select"
                                    style={styles.select}
                                    value={positionFilter || ''}
                                    onChange={(e) => onPositionFilterChange && onPositionFilterChange(e.target.value)}
                                    aria-label="Position filter"
                                >
                                    {safePositionOptions.map((opt) => (
                                        <option key={opt} value={opt === 'All Positions' ? '' : opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {Array.isArray(freightOptions) && freightOptions.length > 0 && (
                                <select
                                    className="top-section-select"
                                    style={styles.select}
                                    value={freightFilter || ''}
                                    onChange={(e) => onFreightFilterChange && onFreightFilterChange(e.target.value)}
                                    aria-label="Freight filter"
                                >
                                    {freightOptions.map((opt) => (
                                        <option key={opt} value={opt === 'All Freight' ? '' : opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {customFilters}
                            {showReset && onReset && (
                                <button
                                    style={styles.resetButton}
                                    onClick={onReset}
                                    type="button"
                                    aria-label="Reset filters"
                                >
                                    <i className="fas fa-undo" aria-hidden="true"></i>
                                </button>
                            )}
                        </div>
                    </div>
                    {customBottomContent}
                    {viewMode === 'list' && safeListLabels.length > 0 && (
                        <div style={styles.headerRow}>
                            {safeListLabels.map((label, index) => {
                                const colWidth = safeColWidths[index] || 'auto'
                                const isFlex = colWidth === 'flex' || colWidth === 'auto'
                                return (
                                    <div
                                        key={label}
                                        style={{
                                            ...styles.headerCell,
                                            ...(isFlex ? { flex: 1, minWidth: 0 } : { flexShrink: 0, width: colWidth })
                                        }}
                                        onClick={() => onHeaderClick && onHeaderClick(label)}
                                    >
                                        <span>{label}</span>
                                        {sortKey === label && (
                                            <i
                                                className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}
                                                style={{ ...styles.sortIcon, ...styles.sortIconActive }}
                                            ></i>
                                        )}
                                    </div>
                                )
                            })}
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
