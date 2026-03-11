import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import MessageService from '../../../services/MessageService'
import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
import ErrorMessage from '../common/ErrorMessage'
import LoadingScreen from '../common/LoadingScreen'
const SEVERITY_COLORS = {
    High: { accent: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', icon: 'fa-fire' },
    Low: { accent: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: 'fa-leaf' },
    Medium: { accent: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: 'fa-bolt' }
}
/** Modal for sending a message about an issue to a regional manager. */
function SendIssueMessageModal({ issue, itemNumber, itemType, creatorName, onClose }) {
    const [managers, setManagers] = useState([])
    const [selectedManager, setSelectedManager] = useState(null)
    const [commentary, setCommentary] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [managerDropdownOpen, setManagerDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)
    const { preferences } = usePreferences()
    const accentColor = preferences?.accentColor || '#1e3a5f'
    const regionCode = preferences?.selectedRegion?.code || ''
    const sevConfig = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.Medium

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setManagerDropdownOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const list = await MessageService.getRegionalRecipients(regionCode)
                if (!cancelled) setManagers(list)
            } catch {
                setError('Failed to load team members')
            }
            setLoading(false)
        }
        load()
        return () => {
            cancelled = true
        }
    }, [regionCode])

    const handleSend = async () => {
        if (!selectedManager || sending) return
        setSending(true)
        setError('')
        try {
            const currentUser = await UserService.getCurrentUser()
            const subject = `Issue on ${itemType} ${itemNumber || ''} — ${issue.severity} Severity`
            const attachment = {
                meta: {
                    issueId: issue.id,
                    issueText: issue.issue,
                    itemNumber,
                    itemType,
                    reportedBy: creatorName,
                    severity: issue.severity
                },
                type: 'issue'
            }
            await MessageService.sendMessage(
                currentUser?.id,
                selectedManager.id,
                subject,
                commentary || issue.issue,
                attachment
            )
            window.dispatchEvent(new Event('messages-refresh'))
            setSent(true)
        } catch (e) {
            setError(e?.message || 'Failed to send message')
        }
        setSending(false)
    }

    const getInitials = (mgr) => {
        const f = mgr.firstName?.[0] || ''
        const l = mgr.lastName?.[0] || ''
        return (f + l).toUpperCase() || '?'
    }

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            style={{
                alignItems: 'center',
                animation: 'issueFadeIn 0.2s ease',
                background: 'rgba(15, 23, 42, 0.8)',
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                left: 0,
                padding: '1rem',
                position: 'fixed',
                right: 0,
                top: 0,
                zIndex: 2100
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    animation: 'issueSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: 'var(--bg-secondary)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh',
                    maxWidth: '520px',
                    overflow: 'hidden',
                    width: '100%'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        alignItems: 'center',
                        borderBottom: '1px solid var(--bg-hover)',
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'space-between',
                        padding: '1.25rem 1.5rem'
                    }}
                >
                    <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem' }}>
                        <div
                            style={{
                                alignItems: 'center',
                                background: `${accentColor}20`,
                                borderRadius: '12px',
                                display: 'flex',
                                height: '42px',
                                justifyContent: 'center',
                                width: '42px'
                            }}
                        >
                            <i className="fas fa-paper-plane" style={{ color: accentColor, fontSize: '1rem' }}></i>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700 }}>
                                Send Message
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                Notify a team member about this issue
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            alignItems: 'center',
                            background: 'var(--bg-hover)',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            fontSize: '0.875rem',
                            height: '34px',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            width: '34px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-medium)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                    {sent ? (
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                padding: '2rem 0',
                                textAlign: 'center'
                            }}
                        >
                            <div
                                style={{
                                    alignItems: 'center',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    height: '64px',
                                    justifyContent: 'center',
                                    width: '64px'
                                }}
                            >
                                <i className="fas fa-check" style={{ color: '#22c55e', fontSize: '1.5rem' }}></i>
                            </div>
                            <div style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 600 }}>
                                Message Sent
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                {selectedManager?.firstName} {selectedManager?.lastName} will be notified
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: accentColor,
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    marginTop: '0.5rem',
                                    padding: '0.625rem 1.5rem',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Issue Preview Card */}
                            <div
                                style={{
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--bg-hover)',
                                    borderLeft: `4px solid ${sevConfig.accent}`,
                                    borderRadius: '12px',
                                    marginBottom: '1.25rem',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ padding: '1rem 1.25rem' }}>
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            display: 'flex',
                                            gap: '0.625rem',
                                            marginBottom: '0.75rem'
                                        }}
                                    >
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                background: 'var(--bg-hover)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                gap: '0.375rem',
                                                padding: '0.25rem 0.5rem'
                                            }}
                                        >
                                            <i
                                                className="fas fa-tag"
                                                style={{ color: 'var(--text-secondary)', fontSize: '0.625rem' }}
                                            ></i>
                                            <span
                                                style={{
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.5px',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                {itemType}
                                            </span>
                                        </div>
                                        <span
                                            style={{
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9375rem',
                                                fontWeight: 700
                                            }}
                                        >
                                            {itemNumber || 'N/A'}
                                        </span>
                                        <span
                                            style={{
                                                alignItems: 'center',
                                                background: sevConfig.bg,
                                                borderRadius: '6px',
                                                color: sevConfig.accent,
                                                display: 'inline-flex',
                                                fontSize: '0.625rem',
                                                fontWeight: 700,
                                                gap: '0.25rem',
                                                marginLeft: 'auto',
                                                padding: '0.2rem 0.5rem'
                                            }}
                                        >
                                            <i className={`fas ${sevConfig.icon}`} style={{ fontSize: '0.5rem' }}></i>
                                            {issue.severity}
                                        </span>
                                    </div>
                                    <p
                                        style={{
                                            color: 'var(--text-primary)',
                                            fontSize: '0.875rem',
                                            lineHeight: 1.6,
                                            margin: 0,
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    >
                                        {issue.issue}
                                    </p>
                                    <div
                                        style={{
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            marginTop: '0.625rem'
                                        }}
                                    >
                                        Reported by {creatorName}
                                    </div>
                                </div>
                            </div>

                            {/* Manager Selector */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label
                                    style={{
                                        color: 'var(--text-secondary)',
                                        display: 'block',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        marginBottom: '0.5rem',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    Send to
                                </label>
                                {loading ? (
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            background: 'var(--bg-primary)',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            gap: '0.75rem',
                                            padding: '0.875rem 1rem'
                                        }}
                                    >
                                        <LoadingScreen message="Loading team members..." inline />
                                    </div>
                                ) : (
                                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                                        <button
                                            type="button"
                                            onClick={() => setManagerDropdownOpen((prev) => !prev)}
                                            style={{
                                                alignItems: 'center',
                                                background: 'var(--bg-primary)',
                                                border: managerDropdownOpen
                                                    ? `2px solid ${accentColor}`
                                                    : '2px solid transparent',
                                                borderRadius: '12px',
                                                boxShadow: managerDropdownOpen ? `0 0 0 3px ${accentColor}20` : 'none',
                                                color: selectedManager
                                                    ? 'var(--text-primary)'
                                                    : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                fontSize: '0.875rem',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                textAlign: 'left',
                                                transition: 'all 0.2s',
                                                width: '100%'
                                            }}
                                        >
                                            {selectedManager ? (
                                                <>
                                                    <div
                                                        style={{
                                                            alignItems: 'center',
                                                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                                                            borderRadius: '8px',
                                                            color: 'white',
                                                            display: 'flex',
                                                            flexShrink: 0,
                                                            fontSize: '0.6875rem',
                                                            fontWeight: 700,
                                                            height: '32px',
                                                            justifyContent: 'center',
                                                            width: '32px'
                                                        }}
                                                    >
                                                        {getInitials(selectedManager)}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600 }}>
                                                            {selectedManager.firstName} {selectedManager.lastName}
                                                        </div>
                                                        <div
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        >
                                                            {selectedManager.roleName}
                                                            {selectedManager.plantCode
                                                                ? ` · ${selectedManager.plantCode}`
                                                                : ''}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <i
                                                        className="fas fa-user-plus"
                                                        style={{ fontSize: '0.875rem' }}
                                                    ></i>
                                                    <span>Select a recipient...</span>
                                                </>
                                            )}
                                            <i
                                                className={`fas fa-chevron-down`}
                                                style={{
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.625rem',
                                                    marginLeft: 'auto',
                                                    transform: managerDropdownOpen ? 'rotate(180deg)' : 'none',
                                                    transition: 'transform 0.2s'
                                                }}
                                            ></i>
                                        </button>
                                        {managerDropdownOpen && (
                                            <div
                                                style={{
                                                    background: 'var(--bg-primary)',
                                                    border: '1px solid var(--bg-hover)',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                                                    left: 0,
                                                    maxHeight: '220px',
                                                    overflowY: 'auto',
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 'calc(100% + 6px)',
                                                    zIndex: 10
                                                }}
                                            >
                                                {managers.length === 0 ? (
                                                    <div
                                                        style={{
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '0.8125rem',
                                                            padding: '1rem',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        No team members found
                                                    </div>
                                                ) : (
                                                    managers.map((mgr) => {
                                                        const isSelected = selectedManager?.id === mgr.id
                                                        return (
                                                            <button
                                                                key={mgr.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedManager(mgr)
                                                                    setManagerDropdownOpen(false)
                                                                }}
                                                                style={{
                                                                    alignItems: 'center',
                                                                    background: isSelected
                                                                        ? `${accentColor}15`
                                                                        : 'transparent',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    gap: '0.75rem',
                                                                    padding: '0.625rem 1rem',
                                                                    textAlign: 'left',
                                                                    transition: 'background 0.15s',
                                                                    width: '100%'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isSelected)
                                                                        e.currentTarget.style.background =
                                                                            'var(--bg-hover)'
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isSelected)
                                                                        e.currentTarget.style.background = 'transparent'
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        alignItems: 'center',
                                                                        background: isSelected
                                                                            ? accentColor
                                                                            : 'var(--bg-hover)',
                                                                        borderRadius: '8px',
                                                                        color: isSelected
                                                                            ? 'white'
                                                                            : 'var(--text-secondary)',
                                                                        display: 'flex',
                                                                        flexShrink: 0,
                                                                        fontSize: '0.625rem',
                                                                        fontWeight: 700,
                                                                        height: '30px',
                                                                        justifyContent: 'center',
                                                                        width: '30px'
                                                                    }}
                                                                >
                                                                    {getInitials(mgr)}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div
                                                                        style={{
                                                                            color: 'var(--text-primary)',
                                                                            fontSize: '0.8125rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {mgr.firstName} {mgr.lastName}
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            color: 'var(--text-secondary)',
                                                                            fontSize: '0.6875rem'
                                                                        }}
                                                                    >
                                                                        {mgr.roleName}
                                                                        {mgr.plantCode ? ` · ${mgr.plantCode}` : ''}
                                                                    </div>
                                                                </div>
                                                                {isSelected && (
                                                                    <i
                                                                        className="fas fa-check"
                                                                        style={{
                                                                            color: accentColor,
                                                                            fontSize: '0.75rem'
                                                                        }}
                                                                    ></i>
                                                                )}
                                                            </button>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Commentary */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label
                                    style={{
                                        color: 'var(--text-secondary)',
                                        display: 'block',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        marginBottom: '0.5rem',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    Message <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                                </label>
                                <textarea
                                    value={commentary}
                                    onChange={(e) => setCommentary(e.target.value)}
                                    placeholder="Add context, questions, or instructions..."
                                    rows="3"
                                    style={{
                                        background: 'var(--bg-primary)',
                                        border: '2px solid transparent',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.6,
                                        outline: 'none',
                                        padding: '0.875rem 1rem',
                                        resize: 'vertical',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = accentColor
                                        e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}20`
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'transparent'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                />
                            </div>

                            {error && (
                                <div
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '10px',
                                        color: '#ef4444',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        marginBottom: '1rem',
                                        padding: '0.75rem 1rem'
                                    }}
                                >
                                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                                    {error}
                                </div>
                            )}

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={!selectedManager || sending}
                                style={{
                                    alignItems: 'center',
                                    background: !selectedManager || sending ? 'var(--border-medium)' : accentColor,
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: !selectedManager || sending ? 'none' : `0 4px 14px ${accentColor}40`,
                                    color: !selectedManager || sending ? 'var(--text-secondary)' : 'white',
                                    cursor: !selectedManager || sending ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    fontSize: '0.9375rem',
                                    fontWeight: 600,
                                    gap: '0.5rem',
                                    justifyContent: 'center',
                                    padding: '0.875rem',
                                    transition: 'all 0.2s',
                                    width: '100%'
                                }}
                            >
                                <i
                                    className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}
                                    style={{ fontSize: '0.8125rem' }}
                                ></i>
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
/**
 * Portal-rendered modal for managing asset issues.
 * Supports creating, resolving, and deleting issues with severity levels.
 * Shows open and resolved issues in tabbed views.
 */
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
    const [messageIssue, setMessageIssue] = useState(null)
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
    const fetchIssues = useCallback(async () => {
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
    }, [itemId, service])
    useEffect(() => {
        if (itemId) {
            fetchIssues()
        }
    }, [itemId, fetchIssues])
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
            'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
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
                    box-shadow: -4px 0 0 0 var(--text-secondary), 0 4px 20px rgba(0,0,0,0.08);
                }
                .issue-card-resolved:hover {
                    transform: translateX(4px);
                    box-shadow: -4px 0 0 0 var(--text-secondary), 0 4px 20px rgba(0,0,0,0.08);
                }
                @media (max-width: 480px) {
                    .issue-modal-header { padding: 1rem !important; }
                    .issue-modal-header-icon { height: 40px !important; width: 40px !important; border-radius: 10px !important; }
                    .issue-modal-header-icon i { font-size: 1.125rem !important; }
                    .issue-modal-title { font-size: 1.125rem !important; }
                    .issue-modal-body { padding: 0.75rem !important; }
                    .issue-modal-form-inner { padding: 0.75rem !important; }
                    .issue-severity-row { flex-wrap: wrap !important; }
                    .issue-severity-btn { padding: 0.375rem 0.5rem !important; font-size: 0.6875rem !important; }
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
                        background: 'var(--bg-secondary)',
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
                        className="issue-modal-header"
                        style={{
                            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-hover) 100%)',
                            borderBottom: '1px solid var(--bg-hover)',
                            padding: '1.5rem',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                alignItems: 'center',
                                background: 'var(--bg-hover)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'var(--text-secondary)',
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
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-medium)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem' }}>
                            <div
                                className="issue-modal-header-icon"
                                style={{
                                    alignItems: 'center',
                                    background: 'var(--bg-hover)',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    height: '52px',
                                    justifyContent: 'center',
                                    width: '52px'
                                }}
                            >
                                <i
                                    className="fas fa-exclamation-circle"
                                    style={{ color: 'var(--text-secondary)', fontSize: '1.5rem' }}
                                ></i>
                            </div>
                            <div>
                                <div
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        letterSpacing: '1px',
                                        marginBottom: '2px',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {itemType}
                                </div>
                                <div
                                    className="issue-modal-title"
                                    style={{ color: 'var(--text-primary)', fontSize: '1.375rem', fontWeight: 700 }}
                                >
                                    {itemNumber || itemId}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                            <button
                                onClick={() => setActiveTab('open')}
                                style={{
                                    alignItems: 'center',
                                    background: activeTab === 'open' ? 'var(--text-primary)' : 'var(--bg-hover)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: activeTab === 'open' ? 'var(--bg-primary)' : 'var(--text-secondary)',
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
                                            background:
                                                activeTab === 'open' ? 'rgba(255,255,255,0.2)' : 'var(--border-medium)',
                                            borderRadius: '6px',
                                            color: activeTab === 'open' ? 'white' : 'var(--text-secondary)',
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
                                    background: activeTab === 'resolved' ? 'var(--text-primary)' : 'var(--bg-hover)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: activeTab === 'resolved' ? 'var(--bg-primary)' : 'var(--text-secondary)',
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
                                            background:
                                                activeTab === 'resolved'
                                                    ? 'rgba(255,255,255,0.2)'
                                                    : 'var(--border-medium)',
                                            borderRadius: '6px',
                                            color: activeTab === 'resolved' ? 'white' : 'var(--text-secondary)',
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
                    <div className="issue-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                        <ErrorMessage message={error} onDismiss={() => setError(null)} />
                        {activeTab === 'open' && (
                            <form onSubmit={handleAddIssue} style={{ marginBottom: '1.25rem' }}>
                                <div
                                    className="issue-modal-form-inner"
                                    style={{
                                        background: 'var(--bg-primary)',
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
                                            background: 'var(--bg-secondary)',
                                            border: '2px solid transparent',
                                            borderRadius: '10px',
                                            color: 'var(--text-primary)',
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
                                            e.currentTarget.style.background = 'var(--bg-primary)'
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'transparent'
                                            e.currentTarget.style.background = 'var(--bg-secondary)'
                                        }}
                                    />
                                    <div
                                        className="issue-severity-row"
                                        style={{
                                            alignItems: 'center',
                                            display: 'flex',
                                            gap: '0.75rem',
                                            justifyContent: 'space-between',
                                            marginTop: '0.75rem'
                                        }}
                                    >
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '0.375rem'
                                            }}
                                        >
                                            {['Low', 'Medium', 'High'].map((sev) => {
                                                const config = getSeverityConfig(sev)
                                                const isActive = severity === sev
                                                return (
                                                    <button
                                                        key={sev}
                                                        type="button"
                                                        className="issue-severity-btn"
                                                        onClick={() => setSeverity(sev)}
                                                        style={{
                                                            alignItems: 'center',
                                                            background: isActive ? config.bg : 'var(--bg-tertiary)',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: isActive ? config.color : 'var(--text-secondary)',
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
                                                        ? 'var(--border-medium)'
                                                        : 'linear-gradient(135deg, var(--accent), #0f172a)',
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
                                            color: activeTab === 'open' ? 'var(--accent)' : '#22c55e',
                                            fontSize: '1.5rem'
                                        }}
                                    ></i>
                                </div>
                                <p
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.9375rem',
                                        fontWeight: 500,
                                        margin: 0
                                    }}
                                >
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
                                                background: 'var(--bg-primary)',
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
                                                                color: 'var(--text-primary)',
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
                                                        <span
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        >
                                                            {formatDate(issue.time_created)}
                                                        </span>
                                                    </div>
                                                    <p
                                                        style={{
                                                            color: 'var(--text-secondary)',
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
                                                        <>
                                                            <button
                                                                onClick={() => handleCompleteIssue(issue.id)}
                                                                title="Mark resolved"
                                                                style={{
                                                                    alignItems: 'center',
                                                                    background: 'var(--bg-hover)',
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
                                                                    (e.currentTarget.style.background =
                                                                        'var(--border-medium)')
                                                                }
                                                                onMouseLeave={(e) =>
                                                                    (e.currentTarget.style.background =
                                                                        'var(--bg-hover)')
                                                                }
                                                            >
                                                                <i className="fas fa-check"></i>
                                                            </button>
                                                            <button
                                                                onClick={() => setMessageIssue(issue)}
                                                                title="Send message about this issue"
                                                                style={{
                                                                    alignItems: 'center',
                                                                    background: 'var(--bg-hover)',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: 'var(--accent, #3b82f6)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    fontSize: '0.75rem',
                                                                    height: '32px',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.15s',
                                                                    width: '32px'
                                                                }}
                                                                onMouseEnter={(e) =>
                                                                    (e.currentTarget.style.background =
                                                                        'var(--border-medium)')
                                                                }
                                                                onMouseLeave={(e) =>
                                                                    (e.currentTarget.style.background =
                                                                        'var(--bg-hover)')
                                                                }
                                                            >
                                                                <i className="fas fa-paper-plane"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDeleteIssue(issue.id)}
                                                            title="Delete"
                                                            style={{
                                                                alignItems: 'center',
                                                                background: 'var(--bg-hover)',
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
                                                                (e.currentTarget.style.background =
                                                                    'var(--border-medium)')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.background = 'var(--bg-hover)')
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
            {messageIssue && (
                <SendIssueMessageModal
                    issue={messageIssue}
                    itemNumber={itemNumber}
                    itemType={itemType}
                    creatorName={getCreatorName(messageIssue)}
                    onClose={() => setMessageIssue(null)}
                />
            )}
        </>,
        document.body
    )
}
export default IssueModalSection
