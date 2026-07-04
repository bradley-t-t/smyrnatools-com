/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { DateUtility } from '../../../utils/DateUtility'
import { HistoryUtility } from '../../../utils/HistoryUtility'
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

/** Horizontal bar showing one position's share of total changes. */
function PositionDistributionRow({ data, index }) {
    return (
        <div className="rounded p-2 bg-bg-secondary border border-border-light">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-text-primary">{data.position}</span>
                <span className="text-[11px] font-mono tabular-nums text-text-tertiary">
                    {data.count} {data.count === 1 ? 'time' : 'times'} ·{' '}
                    <span className="text-text-primary font-semibold">{data.percentage}%</span>
                </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-bg-tertiary">
                <div
                    className="h-full rounded-full"
                    style={{
                        background: index === 0 ? 'var(--accent, #1e3a5f)' : 'var(--border-medium)',
                        width: `${data.percentage}%`
                    }}
                />
            </div>
        </div>
    )
}

/**
 * Position history tab: shows the operator's position runs as a timeline plus a
 * "distribution" panel ranking each position by frequency.
 */
export default function HistoryPositionTab({ positionData }) {
    if (positionData.length === 0) {
        return (
            <HistoryEmptyState
                title="No position history available"
                subtitle="Position changes will appear here once they are recorded."
            />
        )
    }
    const positionCounts = HistoryUtility.countByKey(positionData, (e) => e.position)
    const totalChanges = positionData.length
    const currentPosition = positionData[positionData.length - 1].position
    const chartData = Object.entries(positionCounts)
        .map(([position, count]) => ({ count, percentage: ((count / totalChanges) * 100).toFixed(1), position }))
        .sort((a, b) => b.count - a.count)
    const timeline = HistoryUtility.buildConsolidatedTimeline(positionData, 'position', (e) => e.position)
    return (
        <div className="flex flex-col gap-3">
            <StatCardGrid>
                <StatCard label="Current Position" value={currentPosition} />
                <StatCard label="Total Changes" value={totalChanges} />
                <StatCard label="Unique Positions" value={Object.keys(positionCounts).length} />
                <StatCard label="Most Frequent" value={HistoryUtility.findMostFrequent(positionCounts)} />
            </StatCardGrid>
            <TimelineSectionTitle title="Position Timeline" />
            <div className="flex flex-col gap-0">
                {timeline
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                        <TimelineItem
                            key={index}
                            dotColor={entry.isCurrent ? '#16a34a' : 'var(--accent, #1e3a5f)'}
                            isLast={index >= timeline.length - 1}
                        >
                            <TimelineHeader label={entry.position} isCurrent={entry.isCurrent} />
                            <TimelineMeta>
                                <TimelineDate
                                    date={`${DateUtility.formatDate(entry.startDate)}${
                                        entry.endDate ? ` - ${DateUtility.formatDate(entry.endDate)}` : ' - Present'
                                    }`}
                                />
                                <TimelineDuration text={HistoryUtility.formatDuration(entry.duration)} />
                            </TimelineMeta>
                        </TimelineItem>
                    ))}
            </div>
            <TimelineSectionTitle title="Position Distribution" />
            <div className="flex flex-col gap-1.5">
                {chartData.map((data, index) => (
                    <PositionDistributionRow key={index} data={data} index={index} />
                ))}
            </div>
        </div>
    )
}
