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

/** Computes delta miles + days between this entry and the previous chronological one. */
function computeDelta(mileageData, reversedIndex, entry) {
    if (reversedIndex <= 0) return { daysSince: 0, milesDriven: 0 }
    const previous = mileageData[reversedIndex - 1]
    return {
        daysSince: HistoryUtility.daysBetween(previous.date, entry.date),
        milesDriven: entry.mileage - previous.mileage
    }
}

/**
 * Pickup truck mileage tab: shows current/avg/total stats and a timeline of
 * every mileage update, including the miles-driven and days-elapsed delta.
 */
export default function HistoryMileageTab({ mileageData }) {
    if (mileageData.length === 0) {
        return (
            <HistoryEmptyState
                title="No mileage history available"
                subtitle="Mileage updates will be tracked here once they are recorded."
            />
        )
    }
    const currentMileage = mileageData[mileageData.length - 1].mileage
    const totalMileageChange = currentMileage - mileageData[0].mileage
    const avgMileage = mileageData.reduce((sum, d) => sum + d.mileage, 0) / mileageData.length
    const milestone = HistoryUtility.getMaintenanceMilestone(currentMileage)
    return (
        <div className="flex flex-col gap-4">
            <StatCardGrid>
                <StatCard label="Current Mileage" value={currentMileage.toLocaleString()} sublabel={milestone.label} />
                <StatCard
                    label="Total Change"
                    value={`${totalMileageChange > 0 ? '+' : ''}${totalMileageChange.toLocaleString()}`}
                    sublabel="miles tracked"
                />
                <StatCard label="Average" value={Math.round(avgMileage).toLocaleString()} sublabel="miles" />
                <StatCard label="Updates" value={mileageData.length} sublabel="recorded" />
            </StatCardGrid>
            <TimelineSectionTitle title="Mileage Timeline" />
            <div className="flex flex-col gap-0">
                {mileageData
                    .slice()
                    .reverse()
                    .map((entry, index) => {
                        const reversedIndex = mileageData.length - 1 - index
                        const { daysSince, milesDriven } = computeDelta(mileageData, reversedIndex, entry)
                        return (
                            <TimelineItem key={index} dotClassName="bg-accent" isLast={index >= mileageData.length - 1}>
                                <TimelineHeader
                                    label={`${entry.mileage.toLocaleString()} miles`}
                                    isCurrent={index === 0}
                                />
                                <TimelineMeta>
                                    <TimelineDate date={DateUtility.formatDate(entry.timestamp)} />
                                    {milesDriven > 0 && daysSince > 0 && (
                                        <TimelineDuration
                                            text={`+${milesDriven.toLocaleString()} miles in ${HistoryUtility.pluralizeDays(daysSince)}`}
                                        />
                                    )}
                                </TimelineMeta>
                            </TimelineItem>
                        )
                    })}
            </div>
        </div>
    )
}
