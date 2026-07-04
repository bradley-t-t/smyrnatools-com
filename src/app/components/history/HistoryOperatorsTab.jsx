import React from 'react'

import { DateUtility } from '../../../utils/DateUtility'
import { HistoryUtility } from '../../../utils/HistoryUtility'
import Badge from '../common/Badge'
import HistoryEmptyState from '../ui/HistoryEmptyState'
import StatCard from '../ui/StatCard'
import StatCardGrid from '../ui/StatCardGrid'
import TimelineItem, {
    TimelineDate,
    TimelineDuration,
    TimelineHeader,
    TimelineMeta,
    TimelineSectionTitle
} from '../ui/TimelineItem'

const STATUS_TO_TONE = {
    Active: 'success',
    Down: 'danger',
    'In Service': 'info',
    Retired: 'neutral',
    Shop: 'info',
    Spare: 'neutral',
    Unknown: 'neutral'
}

const resolveStatusTone = (status) => STATUS_TO_TONE[status] ?? 'neutral'

/** Walks operator entries grouping consecutive same-operator runs. */
function findRunEnd(operatorData, startIndex, operatorName) {
    let endIndex = startIndex + 1
    while (endIndex < operatorData.length && operatorData[endIndex].operator === operatorName) endIndex++
    return {
        days: HistoryUtility.daysBetween(
            operatorData[startIndex].date,
            endIndex < operatorData.length ? operatorData[endIndex].date : new Date()
        ),
        endIndex
    }
}

/** Computes the total days each operator was assigned across all their runs. */
function buildOperatorDurations(operatorData) {
    const durations = {}
    let i = 0
    while (i < operatorData.length) {
        const { days, endIndex } = findRunEnd(operatorData, i, operatorData[i].operator)
        durations[operatorData[i].operator] = (durations[operatorData[i].operator] ?? 0) + days
        i = endIndex
    }
    return durations
}

/** For an "empty" operator window, breaks the status changes in that window
 *  into per-status day totals so we can show what state the asset was in. */
function computeStatusPeriodsForEmptyWindow(statusData, periodStart, periodEnd, fallbackStatus, fallbackDays) {
    const statusChangesInPeriod = statusData.filter((s) => {
        const d = new Date(s.timestamp)
        return d >= periodStart && d < periodEnd
    })
    if (statusChangesInPeriod.length === 0) {
        return [{ days: fallbackDays, status: fallbackStatus }]
    }
    const statusDaysMap = {}
    let currentStatus = statusChangesInPeriod[0]
    let statusStart = periodStart
    for (let k = 1; k < statusChangesInPeriod.length; k++) {
        const nextStatus = statusChangesInPeriod[k]
        const statusEnd = new Date(nextStatus.timestamp)
        statusDaysMap[currentStatus.status] =
            (statusDaysMap[currentStatus.status] ?? 0) + HistoryUtility.daysBetween(statusStart, statusEnd)
        currentStatus = nextStatus
        statusStart = statusEnd
    }
    statusDaysMap[currentStatus.status] =
        (statusDaysMap[currentStatus.status] ?? 0) + HistoryUtility.daysBetween(statusStart, periodEnd)
    return Object.entries(statusDaysMap).map(([status, totalDays]) => ({ days: totalDays, status }))
}

/** Builds the consolidated timeline of operator runs, attaching status periods
 *  when the operator slot was empty so we can show the asset's status at the time. */
function buildOperatorTimeline(operatorData, statusData, item) {
    const timeline = []
    let j = 0
    while (j < operatorData.length) {
        const entry = operatorData[j]
        const { days, endIndex } = findRunEnd(operatorData, j, entry.operator)
        let statusPeriods = []
        if (entry.isEmpty) {
            const periodStart = new Date(entry.timestamp)
            const periodEnd = endIndex < operatorData.length ? new Date(operatorData[endIndex].timestamp) : new Date()
            statusPeriods = computeStatusPeriodsForEmptyWindow(
                statusData,
                periodStart,
                periodEnd,
                item.status ?? 'Unknown',
                days
            )
        }
        timeline.push({
            days,
            isCurrent: endIndex >= operatorData.length,
            isEmpty: entry.isEmpty,
            operator: entry.operator,
            startDate: entry.timestamp,
            statusPeriods
        })
        j = endIndex
    }
    return timeline
}

/** Status chip shown under an empty-operator timeline row. */
function StatusDuringEmptyWindow({ statusPeriods }) {
    if (!statusPeriods?.length) return null
    return (
        <div className="mt-2 pt-2 border-t border-border-light">
            <div className="text-[10px] text-text-tertiary font-semibold mb-1">Status during period:</div>
            <div className="flex flex-wrap gap-1">
                {statusPeriods.map((sp, spIdx) => (
                    <Badge key={spIdx} tone={resolveStatusTone(sp.status)} size="xs" weight="bold">
                        {sp.status} ({HistoryUtility.pluralizeDays(sp.days)})
                    </Badge>
                ))}
            </div>
        </div>
    )
}

/**
 * Operators tab: top stats summarize current/unique/most-frequent operators,
 * then a reverse-chronological run timeline. Empty operator windows expose
 * what status the asset was in during that gap.
 */
export default function HistoryOperatorsTab({ item, operatorData, statusData }) {
    if (operatorData.length === 0) {
        return (
            <HistoryEmptyState
                title="No operator assignment history available"
                subtitle="Operator assignments will be charted here once they are recorded."
            />
        )
    }
    const operatorCounts = HistoryUtility.countByKey(operatorData, (e) => e.operator)
    const operatorDurations = buildOperatorDurations(operatorData)
    const uniqueOperators = Object.keys(operatorCounts).filter((op) => op !== 'Empty').length
    const lastEntry = operatorData[operatorData.length - 1]
    const currentOperator = lastEntry ? (lastEntry.isEmpty ? 'Empty' : lastEntry.operator) : null
    const mostFrequentOperator =
        HistoryUtility.findMostFrequent(
            Object.fromEntries(Object.entries(operatorDurations).filter(([op]) => op !== 'Empty'))
        ) ?? 'Not Assigned'
    const consolidatedTimeline = buildOperatorTimeline(operatorData, statusData, item)
    return (
        <div className="flex flex-col gap-2.5">
            <StatCardGrid>
                <StatCard label="Current Operator" value={currentOperator ?? 'Not Assigned'} />
                <StatCard label="Unique Operators" value={uniqueOperators} />
                <StatCard label="Most Frequent" value={mostFrequentOperator} />
            </StatCardGrid>
            <TimelineSectionTitle title="Assignment Timeline" />
            <div className="flex flex-col gap-0">
                {consolidatedTimeline
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                        <TimelineItem
                            key={index}
                            dotClassName="bg-accent"
                            isLast={index >= consolidatedTimeline.length - 1}
                        >
                            <TimelineHeader
                                label={entry.operator}
                                isCurrent={entry.isCurrent}
                                badge={
                                    entry.isEmpty && !entry.isCurrent ? (
                                        <Badge tone="warning" size="xs" weight="bold">
                                            No Operator
                                        </Badge>
                                    ) : null
                                }
                            />
                            <TimelineMeta>
                                <TimelineDate date={DateUtility.formatDate(entry.startDate)} />
                                <TimelineDuration text={HistoryUtility.pluralizeDays(entry.days)} />
                            </TimelineMeta>
                            {entry.isEmpty && <StatusDuringEmptyWindow statusPeriods={entry.statusPeriods} />}
                        </TimelineItem>
                    ))}
            </div>
        </div>
    )
}
