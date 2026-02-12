export const reportsViewStyles = {
    actionBtn: {
        background: '#1e3a5f',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.8125rem',
        fontWeight: 600,
        padding: '0.5rem 1rem',
        transition: 'all 0.2s'
    },
    badge: (type) => {
        const colors = {
            'Last Week': { bg: '#fef3c7', color: '#92400e' },
            Older: { bg: '#f1f5f9', color: '#64748b' },
            'This Week': { bg: '#dbeafe', color: '#1e40af' }
        }
        const c = colors[type] || colors['Older']
        return {
            background: c.bg,
            borderRadius: '6px',
            color: c.color,
            display: 'inline-flex',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.3px',
            marginRight: '0.5rem',
            padding: '0.25rem 0.5rem',
            textTransform: 'uppercase'
        }
    },
    content: {
        padding: '1.5rem'
    },
    empty: {
        alignItems: 'center',
        color: '#64748b',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '1rem',
        gap: '1rem',
        justifyContent: 'center',
        padding: '4rem 2rem'
    },
    emptyIcon: {
        color: '#cbd5e1',
        fontSize: '3rem'
    },
    filters: {
        alignItems: 'center',
        display: 'flex',
        gap: '0.75rem'
    },
    headerRow: {
        background: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        color: '#64748b',
        display: 'grid',
        fontSize: '0.75rem',
        fontWeight: 600,
        gap: '1rem',
        letterSpacing: '0.5px',
        padding: '0.875rem 1.25rem',
        textTransform: 'uppercase'
    },
    headerRowMy: {
        gridTemplateColumns: '1fr 1fr 120px 120px 100px'
    },
    headerRowReview: {
        gridTemplateColumns: '1fr 1fr 1fr 120px 120px 100px'
    },
    list: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
    },
    loadError: {
        alignItems: 'center',
        background: '#fee2e2',
        borderRadius: '8px',
        color: '#dc2626',
        display: 'flex',
        fontSize: '0.875rem',
        fontWeight: 500,
        gap: '0.5rem',
        margin: '1rem',
        padding: '1rem'
    },
    loading: {
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        padding: '3rem'
    },
    pageBtn: (disabled) => ({
        background: disabled ? '#f1f5f9' : 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        color: disabled ? '#94a3b8' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '0.5rem 1rem',
        transition: 'all 0.2s'
    }),
    pageControls: {
        alignItems: 'center',
        display: 'flex',
        gap: '0.75rem'
    },
    pageInfo: {
        color: '#64748b',
        fontSize: '0.875rem'
    },
    pageSize: {
        alignItems: 'center',
        color: '#64748b',
        display: 'flex',
        fontSize: '0.875rem',
        gap: '0.5rem'
    },
    pageSizeSelect: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        padding: '0.375rem 0.75rem'
    },
    pagination: {
        alignItems: 'center',
        background: '#fafafa',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem'
    },
    refreshBtn: {
        alignItems: 'center',
        background: '#1e3a5f',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '13px',
        fontWeight: 600,
        gap: '6px',
        padding: '10px 16px',
        transition: 'all 0.15s ease'
    },
    reviewedCheck: {
        color: '#10b981',
        marginRight: '0.375rem'
    },
    reviewedFlag: {
        color: '#f59e0b',
        marginRight: '0.375rem'
    },
    root: {
        background: '#f8fafc',
        minHeight: '100vh',
        padding: '0',
        paddingBottom: '4rem',
        width: '100%'
    },
    selectControl: {
        MozAppearance: 'none',
        WebkitAppearance: 'none',
        appearance: 'none',
        backgroundColor: 'white',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundPosition: 'right 10px center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        color: '#1e293b',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        minWidth: '140px',
        outline: 'none',
        padding: '10px 36px 10px 14px',
        transition: 'all 0.15s'
    },
    status: (type) => {
        const colors = {
            error: { bg: '#fee2e2', color: '#dc2626' },
            info: { bg: '#dbeafe', color: '#1e40af' },
            success: { bg: '#d1fae5', color: '#059669' },
            warning: { bg: '#fef3c7', color: '#d97706' }
        }
        const c = colors[type] || colors.error
        return {
            alignItems: 'center',
            background: c.bg,
            borderRadius: '6px',
            color: c.color,
            display: 'inline-flex',
            fontSize: '0.8125rem',
            fontWeight: 600,
            gap: '0.375rem',
            padding: '0.375rem 0.75rem'
        }
    },
    tab: (active) => ({
        background: active ? '#1e3a5f' : 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: active ? 'white' : '#64748b',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 600 : 500,
        padding: '8px 14px',
        transition: 'all 0.2s'
    }),
    tableCell: {
        padding: '0 8px'
    },
    tableCellFixed100: {
        flexShrink: 0,
        padding: '0 8px',
        textAlign: 'right',
        width: '100px'
    },
    tableCellFixed120: {
        flexShrink: 0,
        padding: '0 8px',
        width: '120px'
    },
    tableCellFlex: {
        flex: 1,
        minWidth: 0,
        padding: '0 8px'
    },
    tableRow: {
        alignItems: 'center',
        borderBottom: '1px solid #f1f5f9',
        color: '#1e293b',
        display: 'flex',
        fontSize: '0.9375rem',
        padding: '12px 28px',
        transition: 'background 0.15s'
    },
    tableRowMy: {},
    tableRowReview: {},
    tabs: {
        background: '#f1f5f9',
        borderRadius: '8px',
        display: 'flex',
        gap: '3px',
        padding: '3px'
    },
    toolbar: {
        alignItems: 'center',
        background: 'white',
        backgroundImage: `
            linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
        `,
        backgroundSize: '20px 20px, 20px 20px, 40px 40px',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
    },
    toolbarLeft: {
        alignItems: 'center',
        display: 'flex',
        gap: '0.75rem'
    },
    toolbarRight: {
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    toolbarTitle: {
        alignItems: 'center',
        color: '#1e293b',
        display: 'flex',
        fontSize: '1.5rem',
        fontWeight: 700,
        gap: '0.75rem'
    }
}
