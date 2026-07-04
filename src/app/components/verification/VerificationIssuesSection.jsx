/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react'

import {
    FIELD_STYLE,
    formatVerificationDate,
    getSeverityPalette,
    PILL_BASE
} from '../../constants/verificationModalConstants'
import Skeleton, { SkeletonStack } from '../common/Skeleton'
import { Banner, IconButton, Section, StatusMarker } from './VerificationAtoms'

function IssueSkeleton() {
    return (
        <div className="rounded-md p-3" style={FIELD_STYLE}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <div className="ml-auto flex gap-1">
                    <Skeleton className="h-7 w-7" />
                    <Skeleton className="h-7 w-7" />
                </div>
            </div>
            <Skeleton className="h-3 w-full mb-1.5" />
            <Skeleton className="h-3 w-4/5" />
        </div>
    )
}

const SEVERITIES = ['Low', 'Medium', 'High']

function IssueCard({ canDelete, issue, onComplete, onDelete, userNames }) {
    const palette = getSeverityPalette(issue.severity)
    return (
        <div className="rounded-md p-3" style={FIELD_STYLE}>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={PILL_BASE} style={{ background: palette.bg, color: palette.fg }}>
                    {issue.severity}
                </span>
                <span className="flex items-center gap-1 text-[11.5px] text-text-secondary">
                    <i className="fas fa-user text-[9px]" />
                    {userNames[issue.created_by] || 'Unknown'}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-text-tertiary">
                    {formatVerificationDate(issue.time_created)}
                </span>
                <div className="ml-auto flex gap-1">
                    <IconButton
                        icon="fa-check"
                        bg="rgba(22, 163, 74, 0.12)"
                        fg="#15803d"
                        onClick={() => onComplete(issue.id)}
                        title="Mark as resolved"
                    />
                    {canDelete && (
                        <IconButton
                            icon="fa-trash"
                            bg="rgba(220, 38, 38, 0.1)"
                            fg="#b91c1c"
                            onClick={() => onDelete(issue.id)}
                            title="Delete issue"
                        />
                    )}
                </div>
            </div>
            <div className="text-[12.5px] leading-relaxed text-text-primary">{issue.issue}</div>
        </div>
    )
}

function AddIssueComposer({ accentColor, onAddIssue }) {
    const [isOpen, setIsOpen] = useState(false)
    const [text, setText] = useState('')
    const [severity, setSeverity] = useState('Medium')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const reset = () => {
        setText('')
        setSeverity('Medium')
        setIsOpen(false)
    }

    const handleSubmit = async () => {
        if (!text.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            await onAddIssue({ severity, text })
            reset()
        } catch (error) {
            console.error('Failed to add issue:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) {
        return (
            <button type="button"
                onClick={() => setIsOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border-light bg-transparent px-3 py-2 text-[12px] font-medium text-text-secondary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary active:scale-[0.97]"
            >
                <i className="fas fa-plus text-[10px]" />
                Add an issue
            </button>
        )
    }

    return (
        <div className="rounded-md p-3" style={FIELD_STYLE}>
            <textarea
                rows={3}
                placeholder="What's the issue?"
                aria-label="Describe the issue"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full resize-none rounded-md px-3 py-2 text-[13px] outline-none bg-bg-primary border border-border-light text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                autoFocus
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1">
                    {SEVERITIES.map((sev) => {
                        const palette = getSeverityPalette(sev)
                        const active = severity === sev
                        return (
                            <button type="button"
                                key={sev}
                                onClick={() => setSeverity(sev)}
                                className="rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none active:scale-[0.99] active:opacity-70"
                                style={{
                                    background: active ? palette.bg : 'var(--bg-tertiary)',
                                    color: active ? palette.fg : 'var(--text-secondary)',
                                    opacity: active ? 1 : 0.7
                                }}
                            >
                                {sev}
                            </button>
                        )
                    })}
                </div>
                <div className="flex gap-1.5">
                    <button type="button"
                        onClick={reset}
                        className="rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-text-secondary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary active:scale-[0.97]"
                    >
                        Cancel
                    </button>
                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!text.trim() || isSubmitting}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white transition-[filter] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] disabled:active:scale-100"
                        style={{ background: accentColor }}
                    >
                        <i className={`fas ${isSubmitting ? 'fa-spinner animate-dv-spin' : 'fa-plus'} text-[10px]`} />
                        {isSubmitting ? 'Adding' : 'Add issue'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function buildSubtitle({ hasHighSeverityIssues, openIssues }) {
    if (openIssues.length === 0) return 'No open issues'
    const base = `${openIssues.length} open ${openIssues.length === 1 ? 'issue' : 'issues'}`
    return hasHighSeverityIssues ? `${base} · includes high severity` : base
}

function issuesStatus({ hasHighSeverityIssues, openIssues }) {
    if (openIssues.length === 0) return <StatusMarker tone="done" />
    if (hasHighSeverityIssues) return <StatusMarker tone="warn" />
    return <StatusMarker count={openIssues.length} />
}

/** "Maintenance issues" section — lists open issues with severity, author, and actions. */
export default function VerificationIssuesSection({
    accentColor,
    canAddIssue,
    canDelete,
    expanded,
    hasHighSeverityIssues,
    isLoadingIssues,
    onAddIssue,
    onCompleteIssue,
    onDeleteIssue,
    onToggle,
    openIssues,
    userNames
}) {
    return (
        <Section
            title="Maintenance issues"
            subtitle={buildSubtitle({ hasHighSeverityIssues, openIssues })}
            status={issuesStatus({ hasHighSeverityIssues, openIssues })}
            expanded={expanded}
            onToggle={onToggle}
        >
            {isLoadingIssues ? (
                <SkeletonStack count={2}>{() => <IssueSkeleton />}</SkeletonStack>
            ) : (
                <div className="flex flex-col gap-2">
                    {hasHighSeverityIssues && (
                        <Banner tone="danger" icon="fa-exclamation-triangle">
                            High-severity issues are open. Consider resolving them before verifying.
                        </Banner>
                    )}
                    {openIssues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-text-tertiary">
                            <i className="fas fa-check-circle text-[20px] mb-1.5 text-text-primary" />
                            <span className="text-[12.5px]">No open maintenance issues</span>
                        </div>
                    ) : (
                        openIssues.map((issue) => (
                            <IssueCard
                                key={issue.id}
                                canDelete={canDelete}
                                issue={issue}
                                onComplete={onCompleteIssue}
                                onDelete={onDeleteIssue}
                                userNames={userNames}
                            />
                        ))
                    )}
                    {canAddIssue && <AddIssueComposer accentColor={accentColor} onAddIssue={onAddIssue} />}
                </div>
            )}
        </Section>
    )
}
