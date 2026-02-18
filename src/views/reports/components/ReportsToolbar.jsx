import React from 'react'

import TopSection from '../../../app/components/sections/TopSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { reportTypes } from '../../../types/ReportTypes'
import { reportsViewStyles as styles } from '../styles/ReportsViewStyles'

const TAB_LABELS = { all: 'My Reports', review: 'Review' }

const LIST_LABELS = {
    all: ['Week', 'Report Type', 'Status', 'Due Date', 'Actions'],
    review: ['Week', 'Report Type', 'Submitted By', 'Submitted', 'Status', 'Actions']
}

const COL_WIDTHS = {
    all: ['auto', 'auto', '120px', '120px', '100px'],
    review: ['auto', 'auto', 'auto', '120px', '120px', '100px']
}

const RefreshButton = ({ accentColor, isRefreshing, onClick }) => (
    <button style={{ ...styles.refreshBtn, background: accentColor }} onClick={onClick} type="button">
        <i className={`fas fa-sync ${isRefreshing ? 'fa-spin' : ''}`} /> Refresh
    </button>
)

const ReportTypeFilter = ({ value, onChange, options }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.selectControl}>
        <option value="">All Report Types</option>
        {options.map((rt) => (
            <option key={rt.name} value={rt.name}>
                {rt.title}
            </option>
        ))}
    </select>
)

const TabButton = ({ isActive, accentColor, label, onClick }) => (
    <button
        style={{ ...styles.tab(false), ...(isActive && { background: accentColor, color: 'white', fontWeight: 600 }) }}
        onClick={onClick}
        type="button"
    >
        {label}
    </button>
)

function ReportsToolbar({
    tab,
    onTabChange,
    filterReportType,
    onFilterReportTypeChange,
    plantDisplayText,
    onPlantModalOpen,
    isRefreshing,
    onRefresh,
    hasAssigned,
    hasReviewPermission,
    hasAnyReviewPermission,
    regionType
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    const filteredReportTypes = reportTypes.filter(
        (rt) =>
            (tab === 'all' ? hasAssigned[rt.name] : hasReviewPermission[rt.name]) &&
            (regionType !== 'office' || rt.name === 'general_manager')
    )

    return (
        <TopSection
            title="Reports"
            hideViewModeToggle
            hidePlantFilter
            sticky
            viewMode="list"
            searchPlaceholder="Search by name or report type"
            listLabels={LIST_LABELS[tab]}
            colWidths={COL_WIDTHS[tab]}
            customFilters={
                <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    <RefreshButton accentColor={accentColor} isRefreshing={isRefreshing} onClick={onRefresh} />
                    <ReportTypeFilter
                        value={filterReportType}
                        onChange={onFilterReportTypeChange}
                        options={filteredReportTypes}
                    />
                    <button style={styles.selectControl} onClick={onPlantModalOpen} type="button">
                        {plantDisplayText}
                    </button>
                    <div style={styles.tabs}>
                        <TabButton
                            isActive={tab === 'all'}
                            accentColor={accentColor}
                            label={TAB_LABELS.all}
                            onClick={() => onTabChange('all')}
                        />
                        {hasAnyReviewPermission && (
                            <TabButton
                                isActive={tab === 'review'}
                                accentColor={accentColor}
                                label={TAB_LABELS.review}
                                onClick={() => onTabChange('review')}
                            />
                        )}
                    </div>
                </div>
            }
        />
    )
}

export default ReportsToolbar
