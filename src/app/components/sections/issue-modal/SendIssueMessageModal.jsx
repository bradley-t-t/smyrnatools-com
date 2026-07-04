/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import MessageService from '../../../../services/MessageService'
import { UserService } from '../../../../services/UserService'
import { SEVERITY_PALETTE, SEVERITY_TO_TONE } from '../../../constants/issueModalConstants'
import { usePreferences } from '../../../context/PreferencesContext'
import Badge from '../../common/Badge'
import { SkeletonStack } from '../../common/Skeleton'
import UserAvatar from '../../common/UserAvatar'
import { getInitials } from './issueModalHelpers'
import { TeamMemberSkeleton } from './IssueModalSkeletons'

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
    const accent = preferences?.accentColor || '#1e3a5f'
    const regionCode = preferences?.selectedRegion?.code || ''
    const sevConfig = SEVERITY_PALETTE[issue.severity] || SEVERITY_PALETTE.Medium

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

    if (typeof document === 'undefined' || !document.body) return null

    /* Portaled to document.body so the z-[2100] backdrop lives in the
     * root stacking context — required when IssueModalSection is rendered
     * in `displayMode="panel"` from AssetSidePanel. That aside uses
     * `position: sticky`, which creates its own stacking context; without
     * the portal the modal's z-index is scoped to the aside and gets
     * painted under sibling elements at root (Navigation, other panels,
     * etc.) — the "send message popup is cut off" symptom on Mixers /
     * Tractors / Trailers / Equipment list views. */
    return ReactDOM.createPortal(
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-[rgba(15,_23,_42,_0.65)]"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col max-h-[90vh] max-w-[520px] w-full overflow-hidden rounded bg-bg-primary border border-border-light"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 bg-bg-tertiary text-text-primary">
                            <i className="fas fa-paper-plane text-[12px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                Send Message
                            </div>
                            <div className="text-[12px] truncate text-text-primary">Notify a team member</div>
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

                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {sent ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <div className="w-12 h-12 rounded flex items-center justify-center bg-green-100 text-text-primary">
                                <i className="fas fa-check text-[18px]" />
                            </div>
                            <div className="text-[14px] font-semibold text-text-primary">Message Sent</div>
                            <div className="text-[11px] text-text-secondary">
                                {selectedManager?.firstName} {selectedManager?.lastName} will be notified
                            </div>
                            <button type="button"
                                onClick={onClose}
                                className="rounded text-[10.5px] font-semibold uppercase tracking-wider px-3 py-1.5 mt-1 text-white"
                                style={{ background: accent }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <div
                                className="rounded mb-3 overflow-hidden bg-bg-secondary border border-border-light"
                                style={{ borderLeft: `3px solid ${sevConfig.fg}` }}
                            >
                                <div className="px-3 py-2.5">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                            {itemType}
                                        </span>
                                        <span className="text-[12px] font-semibold font-mono tabular-nums text-text-primary">
                                            {itemNumber || 'N/A'}
                                        </span>
                                        <Badge
                                            tone={SEVERITY_TO_TONE[issue.severity] || 'warning'}
                                            size="md"
                                            weight="semibold"
                                            icon={sevConfig.icon.replace(/^fa-/, '')}
                                            className="ml-auto"
                                        >
                                            {issue.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap text-text-primary">
                                        {issue.issue}
                                    </p>
                                    <div className="text-[10.5px] mt-1.5 text-text-tertiary">
                                        Reported by {creatorName}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-text-secondary">
                                    Send to
                                </label>
                                {loading ? (
                                    <div className="rounded px-3 py-2 bg-bg-secondary border border-border-light">
                                        <SkeletonStack count={3} gapClassName="gap-0">
                                            {() => <TeamMemberSkeleton />}
                                        </SkeletonStack>
                                    </div>
                                ) : (
                                    <div ref={dropdownRef} className="relative">
                                        <button type="button"
                                            onClick={() => setManagerDropdownOpen((prev) => !prev)}
                                            className="w-full flex items-center gap-2.5 rounded px-3 py-2 text-left text-[12px] bg-bg-secondary"
                                            style={{
                                                border: `1px solid ${managerDropdownOpen ? accent : 'var(--border-light)'}`,
                                                color: selectedManager ? 'var(--text-primary)' : 'var(--text-tertiary)'
                                            }}
                                        >
                                            {selectedManager ? (
                                                <>
                                                    <UserAvatar
                                                        userId={selectedManager.id}
                                                        initials={getInitials(selectedManager)}
                                                        size="md"
                                                        rounded="md"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold truncate">
                                                            {selectedManager.firstName} {selectedManager.lastName}
                                                        </div>
                                                        <div className="text-[10.5px] truncate text-text-secondary">
                                                            {selectedManager.roleName}
                                                            {selectedManager.plantCode
                                                                ? ` · ${selectedManager.plantCode}`
                                                                : ''}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-user-plus text-[12px]" />
                                                    <span>Select a recipient...</span>
                                                </>
                                            )}
                                            <i
                                                className="fas fa-chevron-down text-[9px] ml-auto text-text-secondary"
                                                style={{
                                                    transform: managerDropdownOpen ? 'rotate(180deg)' : 'none',
                                                    transition: 'transform 0.2s'
                                                }}
                                            />
                                        </button>
                                        {managerDropdownOpen && (
                                            <div
                                                className="absolute left-0 right-0 mt-1 rounded overflow-y-auto z-10 bg-bg-primary border border-border-light"
                                                style={{ maxHeight: 220, top: '100%' }}
                                            >
                                                {managers.length === 0 ? (
                                                    <div className="text-center py-3 text-[11px] text-text-tertiary">
                                                        No team members found
                                                    </div>
                                                ) : (
                                                    managers.map((mgr) => {
                                                        const isSelected = selectedManager?.id === mgr.id
                                                        return (
                                                            <button type="button"
                                                                key={mgr.id}
                                                                onClick={() => {
                                                                    setSelectedManager(mgr)
                                                                    setManagerDropdownOpen(false)
                                                                }}
                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-border-light"
                                                                style={{
                                                                    background: isSelected
                                                                        ? 'var(--bg-tertiary)'
                                                                        : 'transparent'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isSelected)
                                                                        e.currentTarget.style.background =
                                                                            'var(--bg-secondary)'
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isSelected)
                                                                        e.currentTarget.style.background = 'transparent'
                                                                }}
                                                            >
                                                                <UserAvatar
                                                                    userId={mgr.id}
                                                                    initials={getInitials(mgr)}
                                                                    size="sm"
                                                                    rounded="md"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[12px] font-semibold truncate text-text-primary">
                                                                        {mgr.firstName} {mgr.lastName}
                                                                    </div>
                                                                    <div className="text-[10.5px] truncate text-text-secondary">
                                                                        {mgr.roleName}
                                                                        {mgr.plantCode ? ` · ${mgr.plantCode}` : ''}
                                                                    </div>
                                                                </div>
                                                                {isSelected && (
                                                                    <i className="fas fa-check text-[10px] text-text-primary" />
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

                            <div className="mb-3">
                                <label
                                    htmlFor="issue-message-textarea"
                                    className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-text-secondary"
                                >
                                    Message{' '}
                                    <span className="font-normal normal-case text-text-tertiary">(optional)</span>
                                </label>
                                <textarea
                                    id="issue-message-textarea"
                                    value={commentary}
                                    onChange={(e) => setCommentary(e.target.value)}
                                    placeholder="Add context, questions, or instructions..."
                                    aria-label="Message"
                                    rows="3"
                                    className="w-full rounded outline-none px-3 py-2 text-[12px] resize-vertical bg-bg-secondary border border-border-light text-text-primary placeholder:text-text-tertiary transition-colors duration-150 hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                                />
                            </div>

                            {error && (
                                <div className="rounded px-3 py-2 mb-3 text-[11px] font-semibold bg-red-100 text-text-primary">
                                    <i className="fas fa-exclamation-triangle mr-2 text-[10px]" />
                                    {error}
                                </div>
                            )}

                            <button type="button"
                                onClick={handleSend}
                                disabled={!selectedManager || sending}
                                className="w-full rounded text-[11px] font-semibold uppercase tracking-wider py-2 inline-flex items-center justify-center gap-1.5"
                                style={{
                                    background: !selectedManager || sending ? 'var(--bg-tertiary)' : accent,
                                    color: !selectedManager || sending ? 'var(--text-tertiary)' : '#fff',
                                    cursor: !selectedManager || sending ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-[10px]`} />
                                {sending ? 'Sending' : 'Send Message'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

export default SendIssueMessageModal
