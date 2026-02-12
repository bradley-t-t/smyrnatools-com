import React from 'react'

import LoadingScreen from '../../../components/common/LoadingScreen'
import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { reportsViewStyles } from '../styles/ReportsViewStyles'

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
    const styles = reportsViewStyles

    if (weeksToShow.length === 0 && !isLoading) {
        return null
    }

    const getDueDateStatus = (saturday) => {
        const today = new Date()
        const dueDate = new Date(saturday)
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return { color: '#dc2626', label: 'Overdue', urgent: true }
        if (diffDays === 0) return { color: '#dc2626', label: 'Due Today', urgent: true }
        if (diffDays === 1) return { color: '#f59e0b', label: 'Due Tomorrow', urgent: true }
        if (diffDays <= 3) return { color: '#f59e0b', label: `${diffDays} days left`, urgent: false }
        return { color: '#64748b', label: saturday.toLocaleDateString(), urgent: false }
    }

    return (
        <div style={styles.list}>
            <div>
                <div>
                    {isLoading ? (
                        <div style={styles.loading}>
                            <LoadingScreen message="Loading your reports..." inline />
                        </div>
                    ) : (
                        items.map((item) => {
                            const { weekIso } = item
                            const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
                            const weekRange = ReportService.getWeekRangeString(monday, saturday)
                            const hasSavedData = !!(item.report && item.report.data)
                            const { statusText, statusClass, buttonLabel } = ReportUtility.computeMyReportStatus({
                                completed: item.completed,
                                hasSavedData,
                                today: new Date(),
                                weekIso
                            })
                            const badge = ReportUtility.getWeekBadge(weekIso)
                            const dueDateInfo = !item.completed ? getDueDateStatus(saturday) : null

                            return (
                                <div
                                    key={item.name + item.weekIso}
                                    style={{
                                        ...styles.tableRow,
                                        borderLeft: dueDateInfo?.urgent ? `3px solid ${dueDateInfo.color}` : 'none'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <div style={styles.tableCellFlex}>
                                        <span style={styles.badge(badge)}>{badge}</span>
                                        {weekRange}
                                    </div>
                                    <div style={styles.tableCellFlex}>
                                        <span style={{ fontWeight: 500 }}>{item.title}</span>
                                    </div>
                                    <div style={styles.tableCellFixed120}>
                                        <span style={styles.status(statusClass)}>
                                            {statusClass === 'success' && (
                                                <i
                                                    className="fas fa-check"
                                                    style={{ fontSize: '10px', marginRight: '4px' }}
                                                ></i>
                                            )}
                                            {statusText}
                                        </span>
                                    </div>
                                    <div style={styles.tableCellFixed120}>
                                        {item.completed ? (
                                            <span style={{ color: '#64748b' }}>{saturday.toLocaleDateString()}</span>
                                        ) : (
                                            <span
                                                style={{
                                                    color: dueDateInfo?.color,
                                                    fontWeight: dueDateInfo?.urgent ? 600 : 400
                                                }}
                                            >
                                                {dueDateInfo?.urgent && (
                                                    <i
                                                        className="fas fa-clock"
                                                        style={{ fontSize: '11px', marginRight: '4px' }}
                                                    ></i>
                                                )}
                                                {dueDateInfo?.label}
                                            </span>
                                        )}
                                    </div>
                                    <div style={styles.tableCellFixed100}>
                                        <button
                                            style={{
                                                ...styles.actionBtn,
                                                background: item.completed ? '#6366f1' : '#1e3a5f'
                                            }}
                                            onClick={() => onShowForm(item)}
                                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                                        >
                                            {buttonLabel}
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
                {items.length > 0 && (
                    <div style={styles.pagination}>
                        <div style={styles.pageSize}>
                            <label>Show:</label>
                            <select
                                value={pageSize}
                                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                style={styles.pageSizeSelect}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={9999}>All</option>
                            </select>
                        </div>
                        <div style={styles.pageControls}>
                            <button
                                style={styles.pageBtn(currentPage === 1)}
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                <i className="fas fa-chevron-left" style={{ fontSize: '10px', marginRight: '4px' }}></i>
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
                                <i className="fas fa-chevron-right" style={{ fontSize: '10px', marginLeft: '4px' }}></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default MyReportsList
