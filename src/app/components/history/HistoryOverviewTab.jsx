/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { DateUtility } from '../../../utils/DateUtility'
import { HistoryUtility } from '../../../utils/HistoryUtility'
import UserLabel from '../common/UserLabel'
import StatCard from '../ui/StatCard'
import StatCardGrid from '../ui/StatCardGrid'
import TimelineItem, {
    TimelineDate,
    TimelineDuration,
    TimelineHeader,
    TimelineMeta,
    TimelineSectionTitle
} from '../ui/TimelineItem'

/** Computes the status distribution (days and percentages) for the overview chart. */
function computeStatusDistribution(allStatusPeriodsData, currentStatus, totalDaysSinceCreation) {
    if (allStatusPeriodsData.length === 0) {
        const fallbackDays = totalDaysSinceCreation > 0 ? totalDaysSinceCreation : 1
        return {
            statusDaysMap: { [currentStatus]: fallbackDays },
            statusPercentages: [{ days: fallbackDays, percentage: '100.0', status: currentStatus }],
            totalShopDays: 0
        }
    }
    const statusDaysMap = {}
    allStatusPeriodsData.forEach((period) => {
        statusDaysMap[period.status] = (statusDaysMap[period.status] ?? 0) + period.days
    })
    const statusPercentages = Object.entries(statusDaysMap)
        .map(([status, days]) => ({
            days,
            percentage: totalDaysSinceCreation > 0 ? ((days / totalDaysSinceCreation) * 100).toFixed(1) : 0,
            status
        }))
        .sort((a, b) => b.days - a.days)
    const totalShopDays = allStatusPeriodsData.filter((p) => p.status === 'In Shop').reduce((sum, p) => sum + p.days, 0)
    return { statusDaysMap, statusPercentages, totalShopDays }
}

/** Horizontal stacked bar and legend showing how status time was distributed. */
function StatusDistributionBar({ statusPercentages }) {
    return (
        <div className="rounded p-3 bg-bg-primary border border-border-light">
            <div className="text-[9.5px] font-bold uppercase tracking-wider mb-2 text-text-secondary">
                Asset Status Distribution
            </div>
            <div className="flex h-2 rounded-full overflow-hidden mb-2 bg-bg-tertiary">
                {statusPercentages.map(
                    (sp, idx) =>
                        parseFloat(sp.percentage) > 0 && (
                            <div
                                key={idx}
                                style={{
                                    background: HistoryUtility.getStatusColor(sp.status),
                                    width: `${sp.percentage}%`
                                }}
                                title={`${sp.status}: ${sp.percentage}%`}
                            />
                        )
                )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px]">
                {statusPercentages.map((sp, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5">
                        <span
                            className="inline-block rounded-sm shrink-0 h-2 w-2"
                            style={{ background: HistoryUtility.getStatusColor(sp.status) }}
                        />
                        <span className="font-semibold text-text-primary">{sp.status}</span>
                        <span className="font-mono tabular-nums text-text-tertiary">
                            {sp.days}d · {sp.percentage}%
                        </span>
                    </span>
                ))}
            </div>
        </div>
    )
}

/**
 * Overview tab: shows the asset's status distribution, top-line stats, and a
 * chronological list of every status period with start/end attribution.
 */
export default function HistoryOverviewTab({ allStatusPeriodsData, history, item }) {
    const currentStatus = item.status ?? 'Unknown'
    const oldestEntry =
        history.length > 0
            ? new Date(Math.min(...history.map((h) => new Date(h.changedAt ?? h.changed_at))))
            : new Date()
    const totalDaysSinceCreation = HistoryUtility.daysBetween(oldestEntry, new Date())
    const { statusDaysMap, statusPercentages, totalShopDays } = computeStatusDistribution(
        allStatusPeriodsData,
        currentStatus,
        totalDaysSinceCreation
    )
    return (
        <div className="flex flex-col gap-2.5">
            <StatusDistributionBar statusPercentages={statusPercentages} />
            <StatCardGrid>
                <StatCard label="Current Status" value={currentStatus} />
                <StatCard label="Total Status Changes" value={allStatusPeriodsData.length} />
                <StatCard label="Total Shop Days" value={totalShopDays} />
                <StatCard label="Days Since Creation" value={totalDaysSinceCreation} />
            </StatCardGrid>
            <TimelineSectionTitle title="Status Timeline" />
            <div className="flex flex-col gap-0">
                {allStatusPeriodsData.length === 0 ? (
                    <TimelineItem dotColor={HistoryUtility.getStatusColor(currentStatus)} isLast>
                        <TimelineHeader label={currentStatus} isCurrent />
                        <TimelineMeta>
                            <TimelineDate date="Since Creation" />
                            <TimelineDuration text={HistoryUtility.pluralizeDays(statusDaysMap[currentStatus])} />
                        </TimelineMeta>
                        <TimelineMeta>
                            <span className="text-xs text-slate-500 italic">No status changes recorded</span>
                        </TimelineMeta>
                    </TimelineItem>
                ) : (
                    allStatusPeriodsData
                        .slice()
                        .reverse()
                        .map((period, index) => (
                            <TimelineItem
                                key={index}
                                dotColor={HistoryUtility.getStatusColor(period.status)}
                                isLast={index >= allStatusPeriodsData.length - 1}
                            >
                                <TimelineHeader label={period.status} isCurrent={period.isCurrent} />
                                <TimelineMeta>
                                    <TimelineDate
                                        date={`${DateUtility.formatDate(period.startTimestamp)}${
                                            period.endTimestamp
                                                ? ` - ${DateUtility.formatDate(period.endTimestamp)}`
                                                : ' - Present'
                                        }`}
                                    />
                                    <TimelineDuration text={HistoryUtility.pluralizeDays(period.days)} />
                                </TimelineMeta>
                                <div className="flex items-center gap-3 flex-wrap mt-1">
                                    <span className="text-xs text-slate-500">
                                        Started by: <UserLabel userId={period.changedBy} showIcon={false} />
                                    </span>
                                    {period.endChangedBy && (
                                        <span className="text-xs text-slate-500">
                                            Ended by: <UserLabel userId={period.endChangedBy} showIcon={false} />
                                        </span>
                                    )}
                                </div>
                            </TimelineItem>
                        ))
                )}
            </div>
        </div>
    )
}
