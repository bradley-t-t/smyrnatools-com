import React from 'react'

function ReportsEmptyState({ tab, hasAssigned }) {
    if (tab === 'all') {
        const hasAnyAssignment = Object.values(hasAssigned || {}).some(Boolean)

        if (!hasAnyAssignment) {
            return (
                <div style={styles.container}>
                    <div style={styles.iconWrapper}>
                        <i className="fas fa-clipboard-list" style={styles.icon}></i>
                    </div>
                    <h3 style={styles.title}>No Reports Assigned</h3>
                    <p style={styles.description}>
                        You do not have any reports assigned to you yet. Contact your manager if you believe this is an
                        error.
                    </p>
                    <div style={styles.helpSection}>
                        <div style={styles.helpTitle}>
                            <i className="fas fa-lightbulb" style={styles.helpIcon}></i>
                            What are reports?
                        </div>
                        <p style={styles.helpText}>
                            Reports are weekly submissions that track production metrics, safety incidents, and
                            operational data for your assigned role.
                        </p>
                    </div>
                </div>
            )
        }

        return (
            <div style={styles.container}>
                <div style={styles.iconWrapper}>
                    <i className="fas fa-check-circle" style={{ ...styles.icon, color: '#059669' }}></i>
                </div>
                <h3 style={styles.title}>All Caught Up!</h3>
                <p style={styles.description}>
                    You have completed all your assigned reports. Great job staying on top of your submissions!
                </p>
                <div style={styles.tipsSection}>
                    <div style={styles.tipCard}>
                        <i className="fas fa-calendar-check" style={styles.tipIcon}></i>
                        <div>
                            <div style={styles.tipTitle}>New reports every week</div>
                            <div style={styles.tipText}>Check back on Monday for new weekly reports</div>
                        </div>
                    </div>
                    <div style={styles.tipCard}>
                        <i className="fas fa-bell" style={styles.tipIcon}></i>
                        <div>
                            <div style={styles.tipTitle}>Stay notified</div>
                            <div style={styles.tipText}>Enable notifications to never miss a deadline</div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <div style={styles.iconWrapper}>
                <i className="fas fa-eye" style={styles.icon}></i>
            </div>
            <h3 style={styles.title}>No Reports to Review</h3>
            <p style={styles.description}>There are no submitted reports waiting for your review at this time.</p>
            <div style={styles.infoCards}>
                <div style={styles.infoCard}>
                    <i className="fas fa-info-circle" style={styles.infoIcon}></i>
                    <div>
                        Reports will appear here once team members submit them. You will be able to review and provide
                        feedback.
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: {
        alignItems: 'center',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 32px',
        textAlign: 'center'
    },
    description: {
        color: '#64748b',
        fontSize: '15px',
        lineHeight: 1.6,
        margin: '0 0 24px 0',
        maxWidth: '400px'
    },
    helpIcon: {
        color: '#f59e0b'
    },
    helpSection: {
        background: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: '12px',
        marginTop: '16px',
        maxWidth: '400px',
        padding: '16px 20px',
        textAlign: 'left'
    },
    helpText: {
        color: '#92400e',
        fontSize: '13px',
        lineHeight: 1.5,
        margin: '8px 0 0 0'
    },
    helpTitle: {
        alignItems: 'center',
        color: '#92400e',
        display: 'flex',
        fontSize: '14px',
        fontWeight: 600,
        gap: '8px'
    },
    icon: {
        color: '#94a3b8',
        fontSize: '48px'
    },
    iconWrapper: {
        alignItems: 'center',
        background: '#f8fafc',
        borderRadius: '50%',
        display: 'flex',
        height: '100px',
        justifyContent: 'center',
        marginBottom: '24px',
        width: '100px'
    },
    infoCard: {
        alignItems: 'flex-start',
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        color: '#0369a1',
        display: 'flex',
        fontSize: '14px',
        gap: '12px',
        lineHeight: 1.5,
        maxWidth: '450px',
        padding: '16px',
        textAlign: 'left'
    },
    infoCards: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '8px'
    },
    infoIcon: {
        flexShrink: 0,
        fontSize: '18px',
        marginTop: '2px'
    },
    tipCard: {
        alignItems: 'center',
        background: '#f8fafc',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        display: 'flex',
        gap: '14px',
        padding: '14px 18px',
        textAlign: 'left'
    },
    tipIcon: {
        color: '#6366f1',
        fontSize: '20px'
    },
    tipText: {
        color: '#64748b',
        fontSize: '13px'
    },
    tipTitle: {
        color: '#1e293b',
        fontSize: '14px',
        fontWeight: 600
    },
    tipsSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginTop: '8px',
        maxWidth: '350px',
        width: '100%'
    },
    title: {
        color: '#1e293b',
        fontSize: '20px',
        fontWeight: 700,
        margin: '0 0 8px 0'
    }
}

export default ReportsEmptyState
