import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../services/UserService'
import ErrorMessage from '../common/ErrorMessage'
import LoadingScreen from '../common/LoadingScreen'

function IssueModalSection({ itemId, itemNumber, itemType, onClose, service }) {
    const [issues, setIssues] = useState([])
    const [newIssue, setNewIssue] = useState('')
    const [severity, setSeverity] = useState('Medium')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [userNames, setUserNames] = useState({})
    const [canDelete, setCanDelete] = useState(false)
    const [activeTab, setActiveTab] = useState('open')

    useEffect(() => {
        if (itemId) {
            fetchIssues()
        }
    }, [itemId])

    useEffect(() => {
        async function checkDeletePermission() {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || null
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.bypass.plantrestriction')
                    setCanDelete(hasPermission)
                }
            } catch {
                setCanDelete(false)
            }
        }
        checkDeletePermission()
    }, [])

    const sortedIssues = [...issues].sort((a, b) => new Date(b.time_created) - new Date(a.time_created))
    const openIssues = sortedIssues.filter((issue) => !issue.time_completed)
    const resolvedIssues = sortedIssues.filter((issue) => issue.time_completed)

    const fetchIssues = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const fetchedIssues = await service.fetchIssues(itemId)
            setIssues(Array.isArray(fetchedIssues) ? fetchedIssues : [])
            const userIds = new Set()
            fetchedIssues.forEach((issue) => {
                if (issue.created_by) userIds.add(issue.created_by)
            })
            const names = {}
            for (const userId of userIds) {
                try {
                    const displayName = await UserService.getUserDisplayName(userId)
                    names[userId] = displayName || 'Unknown'
                } catch {
                    names[userId] = 'Unknown'
                }
            }
            setUserNames((prev) => ({ ...prev, ...names }))
        } catch {
            setError('Failed to load issues. Please try again.')
            setIssues([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteIssue = async (issueId) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) return
        try {
            await service.deleteIssue(issueId)
            fetchIssues()
        } catch {
            setError('Failed to delete issue. Please try again.')
        }
    }

    const handleCompleteIssue = async (issueId) => {
        try {
            await service.completeIssue(issueId)
            fetchIssues()
        } catch {
            setError('Failed to complete issue. Please try again.')
        }
    }

    const handleAddIssue = async (e) => {
        e.preventDefault()
        if (!newIssue.trim()) {
            setError('Please enter an issue description')
            return
        }
        setIsSubmitting(true)
        setError(null)
        try {
            const currentUser = await UserService.getCurrentUser()
            const userId = currentUser?.id || null
            if (!userId) {
                setError('You must be logged in to add an issue')
                return
            }
            await service.addIssue(itemId, newIssue, severity, userId)
            setNewIssue('')
            setSeverity('Medium')
            fetchIssues()
        } catch (err) {
            setError(err.message || 'Failed to add issue. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diff = now - date
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString()
    }

    const getCreatorName = (issue) => {
        if (issue.created_by && userNames[issue.created_by]) return userNames[issue.created_by]
        return 'Unknown'
    }

    const getInitials = (name) => {
        if (!name || name === 'Unknown') return '?'
        const parts = name.split(' ')
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return name.slice(0, 2).toUpperCase()
    }

    const getAvatarGradient = (name) => {
        const gradients = [
            'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)',
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
        ]
        if (!name) return gradients[0]
        let hash = 0
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        return gradients[Math.abs(hash) % gradients.length]
    }

    const getSeverityConfig = (sev) => {
        const configs = {
            High: { bg: '#dc2626', color: '#fff', icon: 'fa-fire' },
            Low: { bg: '#22c55e', color: '#fff', icon: 'fa-leaf' },
            Medium: { bg: '#3b82f6', color: '#fff', icon: 'fa-bolt' }
        }
        return configs[sev] || configs.Medium
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose()
    }

    const displayIssues = activeTab === 'open' ? openIssues : resolvedIssues

    if (typeof document === 'undefined' || !document.body) return null

    return ReactDOM.createPortal(
        <>
            <style>{`
                @keyframes issueSlideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes issueFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes issuePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .issue-card-hover:hover {
                    transform: translateX(4px);
                    box-shadow: -4px 0 0 0 #64748b, 0 4px 20px rgba(0,0,0,0.08);
                }
                .issue-card-resolved:hover {
                    transform: translateX(4px);
                    box-shadow: -4px 0 0 0 #94a3b8, 0 4px 20px rgba(0,0,0,0.08);
                }
            `}</style>
            <div
                onClick={handleBackdropClick}
                style={{
                    alignItems: 'center',
                    animation: 'issueFadeIn 0.2s ease',
                    backdropFilter: 'blur(8px)',
                    background: 'rgba(15, 23, 42, 0.7)',
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    left: 0,
                    padding: '1rem',
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    zIndex: 2000
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        animation: 'issueSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        background: '#f8fafc',
                        borderRadius: '20px',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '90vh',
                        maxWidth: '580px',
                        overflow: 'hidden',
                        width: '100%'
                    }}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                            borderBottom: '1px solid #e2e8f0',
                            padding: '1.5rem',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                alignItems: 'center',
                                background: '#e2e8f0',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '1rem',
                                height: '36px',
                                justifyContent: 'center',
                                position: 'absolute',
                                right: '1rem',
                                top: '1rem',
                                transition: 'all 0.2s',
                                width: '36px'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#cbd5e1')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}>
                            <div
                                style={{
                                    alignItems: 'center',
                                    background: '#e2e8f0',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    height: '52px',
                                    justifyContent: 'center',
                                    width: '52px'
                                }}
                            >
                                <i
                                    className="fas fa-exclamation-circle"
                                    style={{ color: '#475569', fontSize: '1.5rem' }}
                                ></i>
                            </div>
                            <div>
                                <div
                                    style={{
                                        color: '#64748b',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        letterSpacing: '1px',
                                        marginBottom: '2px',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {itemType}
                                </div>
                                <div style={{ color: '#1e293b', fontSize: '1.375rem', fontWeight: 700 }}>
                                    {itemNumber || itemId}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                            <button
                                onClick={() => setActiveTab('open')}
                                style={{
                                    alignItems: 'center',
                                    background: activeTab === 'open' ? '#1e293b' : '#e2e8f0',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: activeTab === 'open' ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    gap: '0.5rem',
                                    padding: '0.625rem 1rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className="fas fa-clock"></i>
                                Open
                                {openIssues.length > 0 && (
                                    <span
                                        style={{
                                            background: activeTab === 'open' ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                                            borderRadius: '6px',
                                            color: activeTab === 'open' ? 'white' : '#475569',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            padding: '2px 6px'
                                        }}
                                    >
                                        {openIssues.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('resolved')}
                                style={{
                                    alignItems: 'center',
                                    background: activeTab === 'resolved' ? '#1e293b' : '#e2e8f0',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: activeTab === 'resolved' ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    gap: '0.5rem',
                                    padding: '0.625rem 1rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className="fas fa-check-circle"></i>
                                Resolved
                                {resolvedIssues.length > 0 && (
                                    <span
                                        style={{
                                            background: activeTab === 'resolved' ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                                            borderRadius: '6px',
                                            color: activeTab === 'resolved' ? 'white' : '#475569',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            padding: '2px 6px'
                                        }}
                                    >
                                        {resolvedIssues.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                        <ErrorMessage message={error} onDismiss={() => setError(null)} />

                        {activeTab === 'open' && (
                            <form onSubmit={handleAddIssue} style={{ marginBottom: '1.25rem' }}>
                                <div
                                    style={{
                                        background: 'white',
                                        borderRadius: '14px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        padding: '1rem'
                                    }}
                                >
                                    <textarea
                                        value={newIssue}
                                        onChange={(e) => setNewIssue(e.target.value)}
                                        placeholder="What's the issue?"
                                        disabled={isSubmitting}
                                        rows="2"
                                        style={{
                                            background: '#f8fafc',
                                            border: '2px solid transparent',
                                            borderRadius: '10px',
                                            color: '#1e293b',
                                            fontFamily: 'inherit',
                                            fontSize: '0.9375rem',
                                            outline: 'none',
                                            padding: '0.875rem',
                                            resize: 'none',
                                            transition: 'all 0.2s',
                                            width: '100%'
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = '#dc2626'
                                            e.currentTarget.style.background = 'white'
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'transparent'
                                            e.currentTarget.style.background = '#f8fafc'
                                        }}
                                    />
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            display: 'flex',
                                            gap: '0.75rem',
                                            justifyContent: 'space-between',
                                            marginTop: '0.75rem'
                                        }}
                                    >
                                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.375rem' }}>
                                            {['Low', 'Medium', 'High'].map((sev) => {
                                                const config = getSeverityConfig(sev)
                                                const isActive = severity === sev
                                                return (
                                                    <button
                                                        key={sev}
                                                        type="button"
                                                        onClick={() => setSeverity(sev)}
                                                        style={{
                                                            alignItems: 'center',
                                                            background: isActive ? config.bg : '#f1f5f9',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: isActive ? config.color : '#64748b',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            gap: '0.25rem',
                                                            padding: '0.5rem 0.75rem',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <i
                                                            className={`fas ${config.icon}`}
                                                            style={{ fontSize: '0.625rem' }}
                                                        ></i>
                                                        {sev}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !newIssue.trim()}
                                            style={{
                                                alignItems: 'center',
                                                background:
                                                    isSubmitting || !newIssue.trim()
                                                        ? '#cbd5e1'
                                                        : 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                                                border: 'none',
                                                borderRadius: '10px',
                                                boxShadow:
                                                    isSubmitting || !newIssue.trim()
                                                        ? 'none'
                                                        : '0 4px 12px rgba(30, 58, 95, 0.3)',
                                                color: 'white',
                                                cursor: isSubmitting || !newIssue.trim() ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                fontSize: '0.8125rem',
                                                fontWeight: 600,
                                                gap: '0.375rem',
                                                padding: '0.625rem 1.25rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <i className="fas fa-paper-plane" style={{ fontSize: '0.75rem' }}></i>
                                            {isSubmitting ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {isLoading ? (
                            <div
                                style={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    padding: '3rem'
                                }}
                            >
                                <LoadingScreen message="Loading issues..." inline={true} />
                            </div>
                        ) : displayIssues.length === 0 ? (
                            <div
                                style={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '3rem 1rem',
                                    textAlign: 'center'
                                }}
                            >
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: activeTab === 'open' ? '#dbeafe' : '#dcfce7',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        height: '64px',
                                        justifyContent: 'center',
                                        marginBottom: '1rem',
                                        width: '64px'
                                    }}
                                >
                                    <i
                                        className={`fas ${activeTab === 'open' ? 'fa-clipboard-check' : 'fa-trophy'}`}
                                        style={{
                                            color: activeTab === 'open' ? '#1e3a5f' : '#22c55e',
                                            fontSize: '1.5rem'
                                        }}
                                    ></i>
                                </div>
                                <p style={{ color: '#64748b', fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>
                                    {activeTab === 'open' ? 'No open issues' : 'No resolved issues yet'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                {displayIssues.map((issue) => {
                                    const sevConfig = getSeverityConfig(issue.severity)
                                    const isResolved = !!issue.time_completed
                                    const creatorName = getCreatorName(issue)
                                    const avatarGradient = getAvatarGradient(creatorName)
                                    return (
                                        <div
                                            key={issue.id}
                                            className={isResolved ? 'issue-card-resolved' : 'issue-card-hover'}
                                            style={{
                                                background: 'white',
                                                borderRadius: '12px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                opacity: isResolved ? 0.75 : 1,
                                                padding: '1rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ alignItems: 'flex-start', display: 'flex', gap: '0.75rem' }}>
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        background: avatarGradient,
                                                        border: '2px solid rgba(255, 255, 255, 0.2)',
                                                        borderRadius: '50%',
                                                        boxShadow: '0 2px 8px rgba(30, 58, 95, 0.25)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        flexShrink: 0,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        height: '36px',
                                                        justifyContent: 'center',
                                                        width: '36px'
                                                    }}
                                                >
                                                    {getInitials(creatorName)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            alignItems: 'center',
                                                            display: 'flex',
                                                            gap: '0.5rem',
                                                            marginBottom: '0.375rem'
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                color: '#1e293b',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            {creatorName}
                                                        </span>
                                                        <span
                                                            style={{
                                                                alignItems: 'center',
                                                                background: sevConfig.bg,
                                                                borderRadius: '6px',
                                                                color: 'white',
                                                                display: 'inline-flex',
                                                                fontSize: '0.625rem',
                                                                fontWeight: 600,
                                                                gap: '0.25rem',
                                                                padding: '0.125rem 0.375rem'
                                                            }}
                                                        >
                                                            <i
                                                                className={`fas ${sevConfig.icon}`}
                                                                style={{ fontSize: '0.5rem' }}
                                                            ></i>
                                                            {issue.severity}
                                                        </span>
                                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                                            {formatDate(issue.time_created)}
                                                        </span>
                                                    </div>
                                                    <p
                                                        style={{
                                                            color: '#475569',
                                                            fontSize: '0.9375rem',
                                                            lineHeight: 1.5,
                                                            margin: 0,
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word'
                                                        }}
                                                    >
                                                        {issue.issue}
                                                    </p>
                                                    {isResolved && (
                                                        <div
                                                            style={{
                                                                alignItems: 'center',
                                                                color: '#22c55e',
                                                                display: 'flex',
                                                                fontSize: '0.75rem',
                                                                gap: '0.25rem',
                                                                marginTop: '0.5rem'
                                                            }}
                                                        >
                                                            <i className="fas fa-check"></i>
                                                            Resolved {formatDate(issue.time_completed)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexShrink: 0, gap: '0.375rem' }}>
                                                    {!isResolved && (
                                                        <button
                                                            onClick={() => handleCompleteIssue(issue.id)}
                                                            title="Mark resolved"
                                                            style={{
                                                                alignItems: 'center',
                                                                background: '#f0fdf4',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                color: '#22c55e',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                fontSize: '0.8125rem',
                                                                height: '32px',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.15s',
                                                                width: '32px'
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.background = '#dcfce7')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.background = '#f0fdf4')
                                                            }
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDeleteIssue(issue.id)}
                                                            title="Delete"
                                                            style={{
                                                                alignItems: 'center',
                                                                background: '#fef2f2',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                fontSize: '0.75rem',
                                                                height: '32px',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.15s',
                                                                width: '32px'
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.background = '#fee2e2')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.background = '#fef2f2')
                                                            }
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}

export default IssueModalSection
