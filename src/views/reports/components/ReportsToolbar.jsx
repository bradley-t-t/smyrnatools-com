import React from 'react'

import TopSection from '../../../components/sections/TopSection'
import { reportTypes } from '../../../types/ReportTypes'
import { reportsViewStyles } from '../styles/ReportsViewStyles'

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
    const styles = reportsViewStyles

    return (
        <TopSection
            title="Reports"
            hideViewModeToggle={true}
            hidePlantFilter={true}
            sticky={true}
            viewMode="list"
            listLabels={
                tab === 'review'
                    ? ['Week', 'Report Type', 'Submitted By', 'Submitted', 'Status', 'Actions']
                    : ['Week', 'Report Type', 'Status', 'Due Date', 'Actions']
            }
            colWidths={
                tab === 'review'
                    ? ['auto', 'auto', 'auto', '120px', '120px', '100px']
                    : ['auto', 'auto', '120px', '120px', '100px']
            }
            customFilters={
                <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    <button
                        style={styles.refreshBtn}
                        onClick={onRefresh}
                        type="button"
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#162d4a')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#1e3a5f')}
                    >
                        <i className={`fas fa-sync ${isRefreshing ? 'fa-spin' : ''}`}></i> Refresh
                    </button>
                    <select
                        value={filterReportType}
                        onChange={(e) => onFilterReportTypeChange(e.target.value)}
                        style={styles.selectControl}
                    >
                        <option value="">All Report Types</option>
                        {reportTypes
                            .filter(
                                (rt) =>
                                    (tab === 'all' ? hasAssigned[rt.name] : hasReviewPermission[rt.name]) &&
                                    (regionType !== 'office' || rt.name === 'general_manager')
                            )
                            .map((rt) => (
                                <option key={rt.name} value={rt.name}>
                                    {rt.title}
                                </option>
                            ))}
                    </select>
                    <button style={styles.selectControl} onClick={onPlantModalOpen} type="button">
                        {plantDisplayText}
                    </button>
                    <div style={styles.tabs}>
                        <button style={styles.tab(tab === 'all')} onClick={() => onTabChange('all')} type="button">
                            My Reports
                        </button>
                        {hasAnyReviewPermission && (
                            <button
                                style={styles.tab(tab === 'review')}
                                onClick={() => onTabChange('review')}
                                type="button"
                            >
                                Review
                            </button>
                        )}
                    </div>
                </div>
            }
        />
    )
}

export default ReportsToolbar
