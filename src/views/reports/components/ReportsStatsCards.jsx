import React from 'react'

function ReportsStatsCards({ items, tab }) {
    const stats = React.useMemo(() => {
        if (tab === 'all') {
            const total = items.length
            const completed = items.filter((item) => item.completed).length
            const pending = items.filter((item) => !item.completed && item.hasSavedData).length
            const notStarted = total - completed - pending
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

            return {
                cards: [
                    {
                        color: '#059669',
                        count: completed,
                        icon: 'fa-check-circle',
                        label: 'Completed'
                    },
                    {
                        color: '#d97706',
                        count: pending,
                        icon: 'fa-clock',
                        label: 'In Progress'
                    },
                    {
                        color: '#6366f1',
                        count: notStarted,
                        icon: 'fa-file-alt',
                        label: 'Not Started'
                    }
                ],
                completionRate,
                total
            }
        } else {
            const total = items.length
            const reviewed = items.filter((item) => item.reviewed).length
            const pending = total - reviewed

            return {
                cards: [
                    {
                        color: '#059669',
                        count: reviewed,
                        icon: 'fa-check-double',
                        label: 'Reviewed'
                    },
                    {
                        color: '#f59e0b',
                        count: pending,
                        icon: 'fa-eye',
                        label: 'Pending Review'
                    }
                ],
                completionRate: total > 0 ? Math.round((reviewed / total) * 100) : 0,
                total
            }
        }
    }, [items, tab])

    return (
        <div style={styles.container}>
            <div style={styles.cardsRow}>
                {stats.cards.map((card) => (
                    <div key={card.label} style={styles.card}>
                        <div style={{ ...styles.cardIcon, background: `${card.color}15`, color: card.color }}>
                            <i className={`fas ${card.icon}`}></i>
                        </div>
                        <div style={styles.cardContent}>
                            <div style={styles.cardCount}>{card.count}</div>
                            <div style={styles.cardLabel}>{card.label}</div>
                        </div>
                    </div>
                ))}
                <div style={styles.progressCard}>
                    <div style={styles.progressHeader}>
                        <span style={styles.progressLabel}>
                            {tab === 'all' ? 'Completion Rate' : 'Review Progress'}
                        </span>
                        <span style={styles.progressPercent}>{stats.completionRate}%</span>
                    </div>
                    <div style={styles.progressBar}>
                        <div
                            style={{
                                ...styles.progressFill,
                                background:
                                    stats.completionRate >= 80
                                        ? '#059669'
                                        : stats.completionRate >= 50
                                          ? '#d97706'
                                          : '#ef4444',
                                width: `${stats.completionRate}%`
                            }}
                        />
                    </div>
                    <div style={styles.progressSubtext}>
                        {tab === 'all'
                            ? `${stats.cards[0].count} of ${stats.total} reports submitted`
                            : `${stats.cards[0].count} of ${stats.total} reports reviewed`}
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles = {
    card: {
        alignItems: 'center',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        display: 'flex',
        flex: '1',
        gap: '12px',
        minWidth: '140px',
        padding: '16px'
    },
    cardContent: {
        display: 'flex',
        flexDirection: 'column'
    },
    cardCount: {
        color: '#1e293b',
        fontSize: '24px',
        fontWeight: 700,
        lineHeight: 1
    },
    cardIcon: {
        alignItems: 'center',
        borderRadius: '10px',
        display: 'flex',
        fontSize: '18px',
        height: '44px',
        justifyContent: 'center',
        width: '44px'
    },
    cardLabel: {
        color: '#64748b',
        fontSize: '13px',
        fontWeight: 500,
        marginTop: '4px'
    },
    cardsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px'
    },
    container: {
        marginBottom: '16px'
    },
    progressBar: {
        background: '#e5e7eb',
        borderRadius: '4px',
        height: '8px',
        marginBottom: '8px',
        overflow: 'hidden',
        width: '100%'
    },
    progressCard: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        flex: '1.5',
        minWidth: '200px',
        padding: '16px'
    },
    progressFill: {
        borderRadius: '4px',
        height: '100%',
        transition: 'width 0.5s ease'
    },
    progressHeader: {
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px'
    },
    progressLabel: {
        color: '#64748b',
        fontSize: '13px',
        fontWeight: 500
    },
    progressPercent: {
        color: '#1e293b',
        fontSize: '18px',
        fontWeight: 700
    },
    progressSubtext: {
        color: '#94a3b8',
        fontSize: '12px'
    }
}

export default ReportsStatsCards
