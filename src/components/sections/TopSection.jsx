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
        section: {
            backgroundColor: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            backgroundPosition: '0 0, 0 0, 0 0',
            borderBottom: '1px solid #e5e7eb',
            padding: tightTop ? '16px 24px 20px' : '20px 28px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            ...(sticky ? { position: 'sticky', top: 0, zIndex: 50 } : {})
        },
        inner: {
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
        },
        primaryRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
        },
        title: {
            fontSize: '28px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0,
            letterSpacing: '-0.5px'
        },
        badgeContainer: {
            marginLeft: '16px'
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f0f7ff',
            color: '#1e3a5f',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: onBadgeClick ? 'pointer' : 'default'
        },
        actionCluster: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginLeft: 'auto'
        },
        actionButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.15s ease'
        },
        actionButtonSubtle: {
            backgroundColor: '#f1f5f9',
            color: '#475569'
        },
        actionButtonPrimary: {
            backgroundColor: '#1e3a5f',
            color: 'white'
        },
        controlsRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap'
        },
        searchBar: {
            position: 'relative',
            flex: '0 1 auto',
            minWidth: '220px',
            maxWidth: '420px'
        },
        searchInput: {
            width: '100%',
            padding: '12px 18px 12px 44px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: '#f8fafc',
            boxSizing: 'border-box',
            outline: 'none'
        },
        searchIcon: {
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '15px'
        },
        clearButton: {
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '26px',
            height: '26px',
            border: 'none',
            background: '#e5e7eb',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            fontSize: '12px'
        },
        filters: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginLeft: 'auto'
        },
        viewToggle: {
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            padding: '4px',
            border: '1px solid #e5e7eb'
        },
        viewToggleBtn: (isActive) => ({
            width: '40px',
            height: '40px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            backgroundColor: isActive ? '#1e3a5f' : 'transparent',
            color: isActive ? 'white' : '#64748b',
            transition: 'all 0.15s ease'
        }),
        select: {
            padding: '12px 40px 12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '18px',
            minWidth: '140px'
        },
        selectButton: {
            padding: '12px 40px 12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '18px',
            fontWeight: 500
        },
        resetButton: {
            width: '46px',
            height: '46px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px'
        },
        mobileHeader: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
        },
        mobileTitleSection: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        mobileTitle: {
            fontSize: '22px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0
        },
        mobileActionButtons: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        mobileActionBtn: {
            width: '44px',
            height: '44px',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
        },
        mobileAddBtn: {
            backgroundColor: '#1e3a5f',
            color: 'white'
        },
        mobileMenuBtn: {
            backgroundColor: '#f1f5f9',
            color: '#475569'
        },
        mobileSearchRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '14px'
        },
        mobileSearchBar: {
            flex: 1,
            position: 'relative'
        },
        mobileSearchInput: {
            width: '100%',
            padding: '14px 18px 14px 44px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '15px',
            color: '#1e293b',
            backgroundColor: '#f8fafc',
            boxSizing: 'border-box',
            outline: 'none'
        },
        mobileFilterToggle: (isActive) => ({
            width: '50px',
            height: '50px',
            border: isActive ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '12px',
            backgroundColor: isActive ? '#f0f7ff' : '#f8fafc',
            color: isActive ? '#1e3a5f' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
        }),
        mobileFiltersPanel: {
            marginTop: '16px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e5e7eb'
        },
        mobileFiltersGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px'
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
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        mobileViewToggle: {
            display: 'flex',
            gap: '10px'
        },
        mobileViewBtn: (isActive) => ({
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            border: isActive ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '10px',
            backgroundColor: isActive ? '#f0f7ff' : 'white',
            color: isActive ? '#1e3a5f' : '#64748b',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
        }),
        mobileSelect: {
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: 'white'
        },
        mobileSelectBtn: {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: 'white',
            cursor: 'pointer'
        },
        mobileResetBtn: {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            backgroundColor: 'white',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
        },
        headerRow: {
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e5e7eb',
            marginTop: '16px',
            marginLeft: '-28px',
            marginRight: '-28px',
            marginBottom: '-24px',
            paddingLeft: '28px',
            paddingRight: '28px'
        },
        headerCell: {
            padding: '12px 8px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none'
        },
        headerCellHover: {
            color: '#1e3a5f'
        },
        sortIcon: {
            fontSize: '10px',
            color: '#94a3b8'
        },
        sortIconActive: {
            color: '#1e3a5f'
        }
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
                                            ...(isFlex ? { flex: 1, minWidth: 0 } : { width: colWidth, flexShrink: 0 })
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
