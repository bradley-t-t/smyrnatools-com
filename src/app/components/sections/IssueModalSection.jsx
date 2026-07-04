/* eslint-disable react/forbid-dom-props */
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import { SEVERITY_PALETTE, SEVERITY_TO_TONE } from '../../constants/issueModalConstants'
import { usePreferences } from '../../context/PreferencesContext'
import Badge from '../common/Badge'
import ConfirmDialog from '../common/ConfirmDialog'
import ErrorMessage from '../common/ErrorMessage'
import { SkeletonStack } from '../common/Skeleton'
import UserAvatar from '../common/UserAvatar'
import { formatDate, getNameInitials } from './issue-modal/issueModalHelpers'
import { IssueRowSkeleton } from './issue-modal/IssueModalSkeletons'
import SendIssueMessageModal from './issue-modal/SendIssueMessageModal'

/**
 * Issue tracker for an asset or person.
 *
 * @param {Object}   props
 * @param {string}   props.itemId
 * @param {string}   props.itemNumber
 * @param {string}   props.itemType
 * @param {Function} props.onClose
 * @param {Object}   props.service
 * @param {'modal'|'panel'} [props.displayMode='modal']
 *        'modal' renders a centered portal with overlay (default).
 *        'panel' renders inline as a flush-fitting card for use as a right-side
 *        side panel on the asset/people list views. The nested SendIssueMessageModal
 *        stays a portal modal regardless of displayMode.
 */
function IssueModalSection({ itemId, itemNumber, itemType, onClose, service, displayMode = 'modal' }) {
    const { preferences } = usePreferences()
    const accent = preferences?.accentColor || '#1e3a5f'
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
    const [pendingDeleteId, setPendingDeleteId] = useState(null)

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
        if (itemId) fetchIssues()
    }, [itemId, fetchIssues])

    const handleDeleteIssue = (issueId) => setPendingDeleteId(issueId)

    const confirmDeleteIssue = async () => {
        const issueId = pendingDeleteId
        setPendingDeleteId(null)
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

    const getCreatorName = (issue) => {
        if (issue.created_by && userNames[issue.created_by]) return userNames[issue.created_by]
        return 'Unknown'
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose()
    }

    const displayIssues = activeTab === 'open' ? openIssues : resolvedIssues
    if (typeof document === 'undefined' || !document.body) return null

    const TabBtn = ({ id, label, count, icon }) => {
        const isActive = activeTab === id
        return (
            <button type="button"
                onClick={() => setActiveTab(id)}
                className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider"
                style={{
                    background: isActive ? accent : 'var(--bg-tertiary)',
                    color: isActive ? '#fff' : 'var(--text-secondary)'
                }}
            >
                <i className={`fas ${icon} text-[10px]`} />
                {label}
                {count > 0 && (
                    <span
                        className="rounded px-1 font-mono tabular-nums"
                        style={{
                            background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                            color: isActive ? '#fff' : 'var(--text-secondary)'
                        }}
                    >
                        {count}
                    </span>
                )}
            </button>
        )
    }

    const isPanel = displayMode === 'panel'

    const card = (
        <div
            onClick={isPanel ? undefined : (e) => e.stopPropagation()}
            className={
                isPanel
                    ? 'flex flex-col h-full w-full overflow-hidden rounded bg-bg-primary border border-border-light'
                    : 'flex flex-col max-h-[90vh] max-w-[580px] w-full overflow-hidden rounded bg-bg-primary border border-border-light'
            }
        >
            <div className="px-4 py-3 border-b border-border-light">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 bg-bg-tertiary text-text-secondary">
                            <i className="fas fa-exclamation-circle text-[12px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                {itemType} · Issues
                            </div>
                            <div className="text-[14px] font-semibold font-mono tabular-nums truncate text-text-primary">
                                {itemNumber || itemId}
                            </div>
                        </div>
                    </div>
                    <button type="button"
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded transition-colors bg-transparent text-text-secondary"
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <i className="fas fa-times text-[12px]" />
                    </button>
                </div>
                <div className="flex gap-1.5 mt-2.5">
                    <TabBtn id="open" label="Open" count={openIssues.length} icon="fa-clock" />
                    <TabBtn id="resolved" label="Resolved" count={resolvedIssues.length} icon="fa-check-circle" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
                <ErrorMessage message={error} onDismiss={() => setError(null)} />

                {activeTab === 'open' && (
                    <form onSubmit={handleAddIssue} className="mb-3">
                        <div className="rounded p-2.5 bg-bg-secondary border border-border-light">
                            <textarea
                                value={newIssue}
                                onChange={(e) => setNewIssue(e.target.value)}
                                placeholder="What's the issue?"
                                aria-label="Describe the issue"
                                disabled={isSubmitting}
                                rows="2"
                                className="w-full rounded outline-none p-2 resize-none text-[12px] bg-bg-primary border border-border-light text-text-primary placeholder:text-text-tertiary transition-colors duration-150 hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {['Low', 'Medium', 'High'].map((sev) => {
                                        const config = SEVERITY_PALETTE[sev]
                                        const isActive = severity === sev
                                        const iconKey = config.icon.replace(/^fa-/, '')
                                        return (
                                            <Badge
                                                key={sev}
                                                as="button"
                                                tone={SEVERITY_TO_TONE[sev]}
                                                variant={isActive ? 'soft' : 'outline'}
                                                size="md"
                                                weight="semibold"
                                                active={isActive}
                                                icon={iconKey}
                                                onClick={() => setSeverity(sev)}
                                            >
                                                {sev}
                                            </Badge>
                                        )
                                    })}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newIssue.trim()}
                                    className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider"
                                    style={{
                                        background: isSubmitting || !newIssue.trim() ? 'var(--bg-tertiary)' : accent,
                                        color: isSubmitting || !newIssue.trim() ? 'var(--text-tertiary)' : '#fff',
                                        cursor: isSubmitting || !newIssue.trim() ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <i className="fas fa-paper-plane text-[10px]" />
                                    {isSubmitting ? 'Submitting' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {isLoading ? (
                    <div className="rounded overflow-hidden bg-bg-primary border border-border-light">
                        <SkeletonStack count={3} gapClassName="gap-0">
                            {() => <IssueRowSkeleton />}
                        </SkeletonStack>
                    </div>
                ) : displayIssues.length === 0 ? (
                    <div className="flex flex-col items-center py-8 px-4 text-center text-text-tertiary">
                        <i
                            className={`fas ${activeTab === 'open' ? 'fa-clipboard-check' : 'fa-trophy'} text-2xl mb-2`}
                        />
                        <p className="text-[12px] m-0 font-semibold text-text-secondary">
                            {activeTab === 'open' ? 'No open issues' : 'No resolved issues yet'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded overflow-hidden bg-bg-primary border border-border-light">
                        {displayIssues.map((issue) => {
                            const sevConfig = SEVERITY_PALETTE[issue.severity] || SEVERITY_PALETTE.Medium
                            const isResolved = !!issue.time_completed
                            const creatorName = getCreatorName(issue)
                            return (
                                <div
                                    key={issue.id}
                                    className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border-light"
                                    style={{ opacity: isResolved ? 0.7 : 1 }}
                                >
                                    <UserAvatar
                                        userId={issue.created_by}
                                        initials={getNameInitials(creatorName)}
                                        size="md"
                                        rounded="md"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                            <span className="text-[12px] font-semibold text-text-primary">
                                                {creatorName}
                                            </span>
                                            <Badge
                                                tone={SEVERITY_TO_TONE[issue.severity] || 'warning'}
                                                size="md"
                                                weight="semibold"
                                                icon={sevConfig.icon.replace(/^fa-/, '')}
                                            >
                                                {issue.severity}
                                            </Badge>
                                            <span className="text-[10.5px] font-mono tabular-nums text-text-tertiary">
                                                {formatDate(issue.time_created)}
                                            </span>
                                        </div>
                                        <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap break-words text-text-secondary">
                                            {issue.issue}
                                        </p>
                                        {isResolved && (
                                            <div className="flex items-center gap-1 mt-1 text-[10.5px] font-semibold text-text-primary">
                                                <i className="fas fa-check text-[9px]" />
                                                Resolved {formatDate(issue.time_completed)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        {!isResolved && (
                                            <>
                                                <button type="button"
                                                    onClick={() => handleCompleteIssue(issue.id)}
                                                    title="Mark resolved"
                                                    className="w-6 h-6 flex items-center justify-center rounded transition-colors bg-transparent text-text-primary"
                                                    onMouseEnter={(e) =>
                                                        (e.currentTarget.style.background = 'var(--bg-tertiary)')
                                                    }
                                                    onMouseLeave={(e) =>
                                                        (e.currentTarget.style.background = 'transparent')
                                                    }
                                                >
                                                    <i className="fas fa-check text-[10px]" />
                                                </button>
                                                <button type="button"
                                                    onClick={() => setMessageIssue(issue)}
                                                    title="Send message"
                                                    className="w-6 h-6 flex items-center justify-center rounded transition-colors bg-transparent text-text-primary"
                                                    onMouseEnter={(e) =>
                                                        (e.currentTarget.style.background = 'var(--bg-tertiary)')
                                                    }
                                                    onMouseLeave={(e) =>
                                                        (e.currentTarget.style.background = 'transparent')
                                                    }
                                                >
                                                    <i className="fas fa-paper-plane text-[10px]" />
                                                </button>
                                            </>
                                        )}
                                        {canDelete && (
                                            <button type="button"
                                                onClick={() => handleDeleteIssue(issue.id)}
                                                title="Delete"
                                                className="w-6 h-6 flex items-center justify-center rounded transition-colors bg-transparent text-text-tertiary"
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--bg-tertiary)'
                                                    e.currentTarget.style.color = '#dc2626'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent'
                                                    e.currentTarget.style.color = 'var(--text-tertiary)'
                                                }}
                                            >
                                                <i className="fas fa-trash text-[10px]" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )

    const overlays = (
        <>
            {messageIssue && (
                <SendIssueMessageModal
                    issue={messageIssue}
                    itemNumber={itemNumber}
                    itemType={itemType}
                    creatorName={getCreatorName(messageIssue)}
                    onClose={() => setMessageIssue(null)}
                />
            )}
            <ConfirmDialog
                isOpen={pendingDeleteId !== null}
                onConfirm={confirmDeleteIssue}
                onCancel={() => setPendingDeleteId(null)}
                title="Delete Issue"
                message="Are you sure you want to delete this issue?"
                confirmLabel="Delete"
                variant="danger"
            />
        </>
    )

    if (isPanel) {
        return (
            <>
                {card}
                {overlays}
            </>
        )
    }

    return ReactDOM.createPortal(
        <>
            <div
                onClick={handleBackdropClick}
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[rgba(15,_23,_42,_0.65)]"
            >
                {card}
            </div>
            {overlays}
        </>,
        document.body
    )
}

export default IssueModalSection
