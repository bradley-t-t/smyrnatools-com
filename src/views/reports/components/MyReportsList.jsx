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
        return (
            <div style={styles.list}>
                <div style={styles.empty}>
                    <i className="fas fa-check-circle" style={styles.emptyIcon}></i>
                    <div>No reports</div>
                </div>
            </div>
        )
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
                            return (
                                <div
                                    key={item.name + item.weekIso}
                                    style={styles.tableRow}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <div style={styles.tableCellFlex}>
                                        <span style={styles.badge(badge)}>{badge}</span>
                                        {weekRange}
                                    </div>
                                    <div style={styles.tableCellFlex}>{item.title}</div>
                                    <div style={styles.tableCellFixed120}>
                                        <span style={styles.status(statusClass)}>{statusText}</span>
                                    </div>
                                    <div style={styles.tableCellFixed120}>{saturday.toLocaleDateString()}</div>
                                    <div style={styles.tableCellFixed100}>
                                        <button
                                            style={styles.actionBtn}
                                            onClick={() => onShowForm(item)}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#162d4a')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = '#1e3a5f')}
                                        >
                                            {buttonLabel}
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
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
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MyReportsList
