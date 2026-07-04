/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { DateUtility } from '../../../utils/DateUtility'
import { HistoryUtility } from '../../../utils/HistoryUtility'
import { RESOLVED_ISSUE_COLOR, SEVERITY_COLORS, SEVERITY_PALETTES } from '../../constants/historyConstants'
import Badge from '../common/Badge'
import ErrorMessage from '../common/ErrorMessage'
import HistoryEmptyState from '../ui/HistoryEmptyState'
import StatCard from '../ui/StatCard'
import StatCardGrid from '../ui/StatCardGrid'
import TimelineItem, { TimelineDate, TimelineHeader, TimelineMeta, TimelineSectionTitle } from '../ui/TimelineItem'

const LOW_SEVERITY_FALLBACK = SEVERITY_PALETTES.Low

function paletteFor(severity) {
    return SEVERITY_PALETTES[severity] ?? LOW_SEVERITY_FALLBACK
}

/** Combines service entries and issues into one chronological timeline. */
function buildCombinedTimeline(serviceData, issues) {
    return [
        ...serviceData.map((s) => ({
            changedBy: s.changedBy,
            date: s.serviceDate,
            serviceType: s.serviceType,
            timestamp: s.timestamp,
            type: 'service'
        })),
        ...issues.map((issue) => ({
            completedDate: issue.time_completed,
            date: issue.time_created,
            isCompleted: !!issue.time_completed,
            issue,
            timestamp: issue.time_created,
            type: 'issue'
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
}

/** A service-history row in the combined timeline. */
function ServiceRow({ entry, isLast }) {
    return (
        <TimelineItem dotClassName="bg-green-600" isLast={isLast}>
            <TimelineHeader
                label={
                    <>
                        <i className="fas fa-wrench mr-1" /> {entry.serviceType}
                    </>
                }
            />
            <TimelineMeta>
                <TimelineDate date={DateUtility.formatDate(entry.date)} />
            </TimelineMeta>
        </TimelineItem>
    )
}

/** Header line for an issue card: status icon, severity chip, resolved chip. */
function IssueCardHeader({ isCompleted, sevPalette, severity }) {
    return (
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <i
                className={isCompleted ? 'fas fa-check-circle text-[11px]' : 'fas fa-exclamation-circle text-[11px]'}
                style={{ color: 'var(--text-primary)' }}
            />
            <Badge variant="custom" bg={sevPalette.bg} fg={sevPalette.color} size="xs" weight="bold">
                {severity}
            </Badge>
            {isCompleted && (
                <Badge tone="success" size="xs" weight="bold">
                    Resolved
                </Badge>
            )}
        </div>
    )
}

/** Footer row for an issue card: creator/date, mark-resolved action or completion date. */
function IssueCardFooter({ entry, getCreatorName, issue, onCompleteIssue }) {
    return (
        <div className="flex items-center justify-between mt-1.5 pt-1.5 flex-wrap gap-2 border-t border-border-light">
            <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary">
                <span>
                    <i className="fas fa-user mr-1 text-[9px]" />
                    {getCreatorName(issue)}
                </span>
                <span className="tabular-nums">
                    <i className="fas fa-calendar-plus mr-1 text-[9px]" />
                    {HistoryUtility.formatHistoryDate(issue.time_created)}
                </span>
            </div>
            {entry.isCompleted && entry.completedDate && (
                <span className="text-[11px] font-semibold tabular-nums text-text-primary">
                    <i className="fas fa-check mr-1 text-[9px]" />
                    {HistoryUtility.formatHistoryDate(issue.time_completed)}
                </span>
            )}
            {!entry.isCompleted && (
                <Badge
                    as="button"
                    tone="success"
                    size="md"
                    weight="bold"
                    icon="check"
                    onClick={() => onCompleteIssue(issue.id)}
                    title="Mark as resolved"
                    aria-label="Mark issue as resolved"
                    className="border-none active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/40"
                >
                    Mark Resolved
                </Badge>
            )}
        </div>
    )
}

/** An issue row in the combined timeline, with its own dot+rail. */
function IssueRow({ entry, getCreatorName, isLast, onCompleteIssue, onDeleteIssue }) {
    const issue = entry.issue
    const severityColor = entry.isCompleted ? RESOLVED_ISSUE_COLOR : (SEVERITY_COLORS[issue.severity] ?? '#3b82f6')
    const sevPalette = paletteFor(issue.severity)
    return (
        <div className="flex gap-2.5 py-1.5">
            <div className="flex flex-col items-center w-5 flex-shrink-0">
                <div
                    className="w-2.5 h-2.5 rounded-full z-[1]"
                    style={{
                        background: severityColor,
                        boxShadow: '0 0 0 2px var(--bg-primary), 0 0 0 3px var(--border-light)'
                    }}
                />
                {!isLast && <div className="w-px flex-1 -mt-0.5 bg-[var(--border-light)]" />}
            </div>
            <div
                className="flex-1 rounded p-2.5"
                style={{
                    background: entry.isCompleted ? 'rgba(22, 163, 74, 0.06)' : 'var(--bg-secondary)',
                    border: `1px solid ${entry.isCompleted ? 'rgba(22, 163, 74, 0.35)' : 'var(--border-light)'}`
                }}
            >
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <IssueCardHeader
                            isCompleted={entry.isCompleted}
                            sevPalette={sevPalette}
                            severity={issue.severity}
                        />
                        <div className="text-[12.5px] leading-snug text-text-primary">{issue.issue}</div>
                    </div>
                    <button type="button"
                        onClick={() => onDeleteIssue(issue.id)}
                        title="Delete issue"
                        aria-label="Delete issue"
                        className="rounded border-none cursor-pointer flex items-center justify-center bg-[rgba(220,_38,_38,_0.12)] text-text-primary h-8 w-8 active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-[rgba(220,_38,_38,_0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]/40"
                    >
                        <i className="fas fa-trash text-[10px]" />
                    </button>
                </div>
                <IssueCardFooter
                    entry={entry}
                    getCreatorName={getCreatorName}
                    issue={issue}
                    onCompleteIssue={onCompleteIssue}
                />
            </div>
        </div>
    )
}

/**
 * Service-history tab: combines service entries and issues into one chronological
 * timeline. Each row is either a service marker or an issue card with delete and
 * mark-resolved actions.
 */
export default function HistoryServiceTab({
    error,
    getCreatorName,
    issues,
    onCompleteIssue,
    onDeleteIssue,
    serviceData,
    setError
}) {
    const sortedIssues = [...issues].sort((a, b) => new Date(b.time_created) - new Date(a.time_created))
    const openIssues = sortedIssues.filter((issue) => !issue.time_completed)
    const resolvedIssues = sortedIssues.filter((issue) => issue.time_completed)
    if (serviceData.length === 0 && issues.length === 0) {
        return (
            <HistoryEmptyState
                title="No service history or issues available"
                subtitle="Service records and issues will appear here once they are logged."
            />
        )
    }
    const actualServices = serviceData.filter((s) => s.serviceType === 'Service')
    const lastService = actualServices[actualServices.length - 1] ?? null
    const daysSinceLastService = lastService
        ? HistoryUtility.daysBetween(new Date(lastService.serviceDate), new Date())
        : null
    const combinedTimeline = buildCombinedTimeline(serviceData, issues)
    return (
        <div className="flex flex-col gap-2.5">
            <StatCardGrid>
                {lastService && (
                    <StatCard
                        label="Last Service"
                        value={DateUtility.formatDate(lastService.serviceDate)}
                        sublabel={`${daysSinceLastService} days ago`}
                    />
                )}
                <StatCard label="Open Issues" value={openIssues.length} />
                <StatCard label="Resolved" value={resolvedIssues.length} />
            </StatCardGrid>
            <TimelineSectionTitle title="Timeline" />
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
            <div className="flex flex-col gap-0">
                {combinedTimeline.map((entry, index) => {
                    const isLast = index >= combinedTimeline.length - 1
                    if (entry.type === 'service') {
                        return <ServiceRow key={`service-${index}`} entry={entry} isLast={isLast} />
                    }
                    return (
                        <IssueRow
                            key={`issue-${entry.issue.id}`}
                            entry={entry}
                            getCreatorName={getCreatorName}
                            isLast={isLast}
                            onCompleteIssue={onCompleteIssue}
                            onDeleteIssue={onDeleteIssue}
                        />
                    )
                })}
            </div>
        </div>
    )
}
