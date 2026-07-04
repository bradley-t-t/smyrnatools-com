import React, { useState } from 'react'

import { isDarkLikeTheme } from '../../constants/themeConstants'
import { DEFAULT_COL_WIDTHS, DEFAULT_LIST_LABELS } from '../../constants/topSectionConstants'
import { usePreferences } from '../../context/PreferencesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useRevealOnLoad } from '../../hooks/useRevealOnLoad'
import { useTopSectionHeight } from '../../hooks/useTopSectionHeight'
import PlantDropdownModal from '../common/PlantDropdownModal'
import TopSectionDesktop from './top-section/TopSectionDesktop'
import TopSectionMobile from './top-section/TopSectionMobile'
import TopSectionSkeleton from './top-section/TopSectionSkeleton'

function TopSection({
    title,
    badge,
    onBadgeClick,
    onPillClick,
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
    hideSearchBar = false,
    onHeaderClick,
    sortKey,
    sortDirection,
    isOfficeRegion = false,
    customActions = null,
    customBottomContent = null,
    customBottomSkeleton = null,
    isLoading = false,
    userPlantCode = ''
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    /** Pre-compute the dark-like flag once so every Badge mount picks up
     *  the right text colour (white on dark / grayed surfaces, black on
     *  light). Avoids each pill re-reading preferences. */
    const isDarkBadgeTheme = isDarkLikeTheme(preferences.themeMode)
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
    const plantDisplayText = selectedPlant?.startsWith('DISTRICT:')
        ? selectedPlant.slice(9)
        : selectedPlant && selectedPlantObj
          ? `(${selectedPlantObj.plantCode || selectedPlantObj.plant_code}) ${selectedPlantObj.plantName || selectedPlantObj.plant_name}`
          : 'All Plants'

    useTopSectionHeight(forwardedRef)

    const sectionClasses = `${tightTop ? 'px-4 py-3' : 'px-4 lg:px-6 py-3'} ${sticky ? 'sticky top-0 z-50' : ''}`
    const sectionStyle = {
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-light)'
    }
    const { revealControls, hideRealContent } = useRevealOnLoad(isLoading)

    const skeletonContent = <TopSectionSkeleton isMobile={isMobile} customBottomSkeleton={customBottomSkeleton} />

    const sharedLayoutProps = {
        accentColor,
        addButtonLabel,
        badge,
        customActions,
        customBottomContent,
        customFilters,
        forwardedRef,
        freightFilter,
        hidePlantFilter,
        hideRealContent,
        hideSearchBar,
        hideViewModeToggle,
        isDarkBadgeTheme,
        onAddClick,
        onBadgeClick,
        onClearSearch,
        onFreightFilterChange,
        onPillClick,
        onPositionFilterChange,
        onReset,
        onSearchInputChange,
        onStatusFilterChange,
        onToggleSidebar,
        onViewModeChange,
        plantDisplayText,
        positionFilter,
        revealControls,
        safeFreightOptions,
        safePositionOptions,
        safeStatusOptions,
        searchInput,
        searchPlaceholder,
        sectionClasses,
        sectionStyle,
        setIsPlantModalOpen,
        showReset,
        skeletonContent,
        statusFilter,
        title,
        viewMode
    }

    if (isMobile) {
        return (
            <>
                <TopSectionMobile
                    {...sharedLayoutProps}
                    showMobileFilters={showMobileFilters}
                    setShowMobileFilters={setShowMobileFilters}
                />
                {isPlantModalOpen && (
                    <PlantDropdownModal
                        isOpen={isPlantModalOpen}
                        onClose={() => setIsPlantModalOpen(false)}
                        plants={filteredPlants}
                        onSelect={onSelectedPlantChange}
                        showAllPlants={true}
                        userPlantCode={userPlantCode}
                    />
                )}
            </>
        )
    }

    return (
        <>
            <TopSectionDesktop
                {...sharedLayoutProps}
                safeListLabels={safeListLabels}
                safeColWidths={safeColWidths}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onHeaderClick={onHeaderClick}
            />
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    plants={filteredPlants}
                    onSelect={onSelectedPlantChange}
                    showAllPlants={true}
                    userPlantCode={userPlantCode}
                />
            )}
        </>
    )
}

export default TopSection
