import React from 'react'

import LoadingScreen from '../../../app/components/common/LoadingScreen'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { reportsViewStyles as styles } from '../styles/ReportsViewStyles'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 9999]

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
)

const ReviewStatus = ({ isReviewed }) =>
    isReviewed ? (
        <span style={{ color: '#10b981', fontWeight: 500 }}>
            <i className="fas fa-check-circle" style={styles.reviewedCheck} />
            Reviewed
        </span>
    ) : (
        <span style={{ color: '#f59e0b', fontWeight: 500 }}>
            <i className="fas fa-flag" style={styles.reviewedFlag} />
            Not Reviewed
        </span>
    )

const ReviewReportRow = ({ report, isReviewed, getUserName, accentColor, onReview }) => {
    const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : ''
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
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
                {ReportService.getWeekRangeString(monday, saturday)}
            </div>
            <div style={styles.tableCellFlex}>{report.title}</div>
            <div style={styles.tableCellFlex}>{getUserName(report.userId)}</div>
            <div style={styles.tableCellFixed120}>{new Date(report.completedDate).toLocaleDateString()}</div>
            <div style={styles.tableCellFixed120}>
                <ReviewStatus isReviewed={isReviewed} />
            </div>
            <div style={styles.tableCellFixed100}>
                <button style={{ ...styles.actionBtn, background: accentColor }} onClick={() => onReview(report)}>
                    Review
                </button>
            </div>
        </div>
    )
}

const EmptyState = () => (
    <div style={styles.empty}>
        <i className="fas fa-user-check" style={styles.emptyIcon} />
        <div>No reports to review</div>
    </div>
)

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
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    if (items.length === 0 && !isLoading) {
        return (
            <div style={styles.list}>
                <EmptyState />
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
                        items.map((report) => (
                            <ReviewReportRow
                                key={report.id}
                                report={report}
                                isReviewed={reviewedByCurrentUser.has(report.id)}
                                getUserName={getUserName}
                                accentColor={accentColor}
                                onReview={onReview}
                            />
                        ))
                    )}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageSizeChange={onPageSizeChange}
                    onPageChange={onPageChange}
                />
            </div>
        </div>
    )
}

export default ReviewReportsList
