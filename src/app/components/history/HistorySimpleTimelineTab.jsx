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

/**
 * Generic single-axis timeline reused by Plant Assignments and Status History.
 * `statsConfig` describes the stat cards (label + computed value), `valueKey`
 * is the field shown in the header of each row.
 */
export default function HistorySimpleTimelineTab({ data, emptySubtitle, emptyTitle, statsConfig, title, valueKey }) {
    if (data.length === 0) {
        return <HistoryEmptyState title={emptyTitle} subtitle={emptySubtitle} />
    }
    const counts = HistoryUtility.countByKey(data, (e) => e[valueKey])
    const timeline = HistoryUtility.buildConsolidatedTimeline(data, valueKey, (e) => e[valueKey])
    const currentValue = data[data.length - 1][valueKey]
    return (
        <div className="flex flex-col gap-2.5">
            <StatCardGrid>
                {statsConfig.map((stat, idx) => (
                    <StatCard
                        key={idx}
                        label={stat.label}
                        value={stat.value({ counts, currentValue, data, timeline })}
                    />
                ))}
            </StatCardGrid>
            <TimelineSectionTitle title={title} />
            <div className="flex flex-col gap-0">
                {timeline
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                        <TimelineItem key={index} dotClassName="bg-accent" isLast={index >= timeline.length - 1}>
                            <TimelineHeader label={entry[valueKey]} isCurrent={entry.isCurrent} />
                            <TimelineMeta>
                                <TimelineDate date={DateUtility.formatDate(entry.startDate)} />
                                <TimelineDuration text={HistoryUtility.pluralizeDays(entry.days)} />
                            </TimelineMeta>
                        </TimelineItem>
                    ))}
            </div>
        </div>
    )
}
