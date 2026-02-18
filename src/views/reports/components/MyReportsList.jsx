import React from 'react'

import LoadingScreen from '../../../app/components/common/LoadingScreen'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { reportsViewStyles as styles } from '../styles/ReportsViewStyles'

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

const PAGE_SIZE_OPTIONS = [10, 25, 50, 9999]

const getDueDateStatus = (saturday) => {
    const diffDays = Math.ceil((saturday - new Date()) / MILLISECONDS_PER_DAY)
    if (diffDays < 0) return { color: '#dc2626', label: 'Overdue', urgent: true }
    if (diffDays === 0) return { color: '#dc2626', label: 'Due Today', urgent: true }
    if (diffDays === 1) return { color: '#f59e0b', label: 'Due Tomorrow', urgent: true }
    if (diffDays <= 3) return { color: '#f59e0b', label: `${diffDays} days left`, urgent: false }
    return { color: '#64748b', label: saturday.toLocaleDateString(), urgent: false }
}

const PageSizeSelect = ({ value, onChange }) => (
    <div style={styles.pageSize}>
        <label>Show:</label>
        <select value={value} onChange={(e) => onChange(Number(e.target.value))} style={styles.pageSizeSelect}>
            {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                    {opt === 9999 ? 'All' : opt}
                </option>
            ))}
        </select>
    </div>
)

const Pagination = ({ currentPage, totalPages, pageSize, onPageSizeChange, onPageChange }) => (
    <div style={styles.pagination}>
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
        <div style={styles.pageControls}>
            <button
                style={styles.pageBtn(currentPage === 1)}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
            >
                <i className="fas fa-chevron-left" style={{ fontSize: '10px', marginRight: '4px' }} />
                Previous
            </button>
            <span style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
            </span>
            <button
                style={styles.pageBtn(currentPage === totalPages)}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
            >
                Next
                <i className="fas fa-chevron-right" style={{ fontSize: '10px', marginLeft: '4px' }} />
            </button>
        </div>
    </div>
)

const ReportRow = ({ item, accentColor, onShowForm }) => {
    const { weekIso, completed, report, title, name } = item
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const weekRange = ReportService.getWeekRangeString(monday, saturday)
    const hasSavedData = !!report?.data
    const { statusText, statusClass, buttonLabel } = ReportUtility.computeMyReportStatus({
        completed,
        hasSavedData,
        today: new Date(),
        weekIso
    })
    const badge = ReportUtility.getWeekBadge(weekIso)
    const dueDateInfo = completed ? null : getDueDateStatus(saturday)

    return (
        <div
            key={name + weekIso}
            style={{ ...styles.tableRow, borderLeft: dueDateInfo?.urgent ? `3px solid ${dueDateInfo.color}` : 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
            <div style={styles.tableCellFlex}>
                <span style={styles.badge(badge)}>{badge}</span>
                {weekRange}
            </div>
            <div style={styles.tableCellFlex}>
                <span style={{ fontWeight: 500 }}>{title}</span>
            </div>
            <div style={styles.tableCellFixed120}>
                <span style={styles.status(statusClass)}>
                    {statusClass === 'success' && (
                        <i className="fas fa-check" style={{ fontSize: '10px', marginRight: '4px' }} />
                    )}
                    {statusText}
                </span>
            </div>
            <div style={styles.tableCellFixed120}>
                {completed ? (
                    <span style={{ color: '#64748b' }}>{saturday.toLocaleDateString()}</span>
                ) : (
                    <span style={{ color: dueDateInfo?.color, fontWeight: dueDateInfo?.urgent ? 600 : 400 }}>
                        {dueDateInfo?.urgent && (
                            <i className="fas fa-clock" style={{ fontSize: '11px', marginRight: '4px' }} />
                        )}
                        {dueDateInfo?.label}
                    </span>
                )}
            </div>
            <div style={styles.tableCellFixed100}>
                <button style={{ ...styles.actionBtn, background: accentColor }} onClick={() => onShowForm(item)}>
                    {buttonLabel}
                </button>
            </div>
        </div>
    )
}

function MyReportsList({
    isLoading,
    items,
    weeksToShow,
    pageSize,
    currentPage,
    totalPages,
    onPageSizeChange,
    onPageChange,
    onShowForm
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    if (weeksToShow.length === 0 && !isLoading) return null

    return (
        <div style={styles.list}>
            <div>
                <div>
                    {isLoading ? (
                        <div style={styles.loading}>
                            <LoadingScreen message="Loading your reports..." inline />
                        </div>
                    ) : (
                        items.map((item) => (
                            <ReportRow
                                key={item.name + item.weekIso}
                                item={item}
                                accentColor={accentColor}
                                onShowForm={onShowForm}
                            />
                        ))
                    )}
                </div>
                {items.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        onPageSizeChange={onPageSizeChange}
                        onPageChange={onPageChange}
                    />
                )}
            </div>
        </div>
    )
}

export default MyReportsList
