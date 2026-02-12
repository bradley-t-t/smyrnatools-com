import React from 'react'

import LoadingScreen from '../../../components/common/LoadingScreen'
import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { reportsViewStyles } from '../styles/ReportsViewStyles'

function ReviewReportsList({
    isLoading,
    items,
    reviewedByCurrentUser,
    pageSize,
    currentPage,
    totalPages,
    onPageSizeChange,
    onPageChange,
    onReview,
    getUserName
}) {
    const styles = reportsViewStyles

    if (items.length === 0 && !isLoading) {
        return (
            <div style={styles.list}>
                <div style={styles.empty}>
                    <i className="fas fa-user-check" style={styles.emptyIcon}></i>
                    <div>No reports to review</div>
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
                            <LoadingScreen message="Loading reports to review..." inline />
                        </div>
                    ) : (
                        items.map((report) => {
                            const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : ''
                            const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
                            const weekRange = ReportService.getWeekRangeString(monday, saturday)
                            const badge = ReportUtility.getWeekBadge(weekIso)
                            return (
                                <div
                                    key={report.id}
                                    style={styles.tableRow}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <div style={styles.tableCellFlex}>
                                        <span style={styles.badge(badge)}>{badge}</span>
                                        {weekRange}
                                    </div>
                                    <div style={styles.tableCellFlex}>{report.title}</div>
                                    <div style={styles.tableCellFlex}>{getUserName(report.userId)}</div>
                                    <div style={styles.tableCellFixed120}>
                                        {new Date(report.completedDate).toLocaleDateString()}
                                    </div>
                                    <div style={styles.tableCellFixed120}>
                                        {reviewedByCurrentUser.has(report.id) ? (
                                            <span style={{ color: '#10b981', fontWeight: 500 }}>
                                                <i className="fas fa-check-circle" style={styles.reviewedCheck}></i>
                                                Reviewed
                                            </span>
                                        ) : (
                                            <span style={{ color: '#f59e0b', fontWeight: 500 }}>
                                                <i className="fas fa-flag" style={styles.reviewedFlag}></i>
                                                Not Reviewed
                                            </span>
                                        )}
                                    </div>
                                    <div style={styles.tableCellFixed100}>
                                        <button
                                            style={styles.actionBtn}
                                            onClick={() => onReview(report)}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#162d4a')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = '#1e3a5f')}
                                        >
                                            Review
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

export default ReviewReportsList
