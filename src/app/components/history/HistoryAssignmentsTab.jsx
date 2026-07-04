import React from 'react'

import { DateUtility } from '../../../utils/DateUtility'
import { HistoryUtility } from '../../../utils/HistoryUtility'
import UserLabel from '../common/UserLabel'
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
 * Walks the assignment history and produces a per-vehicle-run timeline. Each
 * entry tracks one continuous assignment of a vehicle to the operator; when the
 * operator switches vehicles (or vacates), the previous run is finalized and
 * pushed to the list.
 */
function buildAssignmentTimeline(assignmentsData) {
    const timeline = []
    let currentMixerEntry = null
    let currentTractorEntry = null
    const calcDuration = (startDate, endDate) =>
        HistoryUtility.daysBetween(new Date(startDate), endDate ? new Date(endDate) : new Date())
    const finalizeEntry = (current, newTimestamp) => {
        if (!current?.vehicleNumber) return null
        current.endDate = newTimestamp
        current.duration = calcDuration(current.startDate, current.endDate)
        return { ...current }
    }
    assignmentsData.forEach((entry, idx) => {
        const isMixer = entry.assignmentType === 'Mixer'
        const currentEntry = isMixer ? currentMixerEntry : currentTractorEntry
        const finalized = finalizeEntry(currentEntry, entry.timestamp)
        if (finalized) timeline.push(finalized)
        if (entry.vehicleNumber) {
            const newEntry = {
                assignmentType: entry.assignmentType,
                changedBy: entry.changedBy,
                endDate: null,
                isCurrent:
                    idx === assignmentsData.length - 1 ||
                    !assignmentsData.slice(idx + 1).some((e) => e.assignmentType === entry.assignmentType),
                startDate: entry.timestamp,
                vehicleNumber: entry.vehicleNumber
            }
            if (isMixer) currentMixerEntry = newEntry
            else currentTractorEntry = newEntry
        } else if (isMixer) {
            currentMixerEntry = null
        } else {
            currentTractorEntry = null
        }
    })
    ;[currentMixerEntry, currentTractorEntry].forEach((e) => {
        if (e?.vehicleNumber) {
            e.duration = calcDuration(e.startDate, new Date())
            e.isCurrent = true
            timeline.push(e)
        }
    })
    return timeline.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
}

/**
 * Operator assignments tab: tracks every mixer and tractor the operator has been
 * assigned to, with start/end dates and durations.
 */
export default function HistoryAssignmentsTab({ assignmentsData }) {
    if (assignmentsData.length === 0) {
        return (
            <HistoryEmptyState
                title="No assignment history available"
                subtitle="Vehicle assignments will be tracked here once they are recorded."
            />
        )
    }
    const mixerAssignments = assignmentsData.filter((a) => a.assignmentType === 'Mixer')
    const tractorAssignments = assignmentsData.filter((a) => a.assignmentType === 'Tractor')
    const totalAssignments = assignmentsData.filter((a) => a.isAssignment).length
    const currentMixer = mixerAssignments[mixerAssignments.length - 1]?.vehicleNumber ?? null
    const currentTractor = tractorAssignments[tractorAssignments.length - 1]?.vehicleNumber ?? null
    const consolidatedTimeline = buildAssignmentTimeline(assignmentsData)
    return (
        <div className="flex flex-col gap-3">
            <StatCardGrid>
                <StatCard label="Current Mixer" value={currentMixer ? `#${currentMixer}` : 'Not Assigned'} />
                <StatCard label="Current Tractor" value={currentTractor ? `#${currentTractor}` : 'Not Assigned'} />
                <StatCard label="Total Assignments" value={totalAssignments} />
                <StatCard label="Assignment Changes" value={assignmentsData.length} />
            </StatCardGrid>
            <TimelineSectionTitle title="Assignment Timeline" />
            <div className="flex flex-col gap-0">
                {consolidatedTimeline.map((entry, index) => (
                    <TimelineItem
                        key={index}
                        dotColor={entry.isCurrent ? '#16a34a' : 'var(--accent, #1e3a5f)'}
                        isLast={index >= consolidatedTimeline.length - 1}
                    >
                        <TimelineHeader
                            label={`${entry.assignmentType} #${entry.vehicleNumber}`}
                            isCurrent={entry.isCurrent}
                        />
                        <TimelineMeta>
                            <TimelineDate
                                date={`${DateUtility.formatDate(entry.startDate)}${
                                    entry.endDate ? ` - ${DateUtility.formatDate(entry.endDate)}` : ' - Present'
                                }`}
                            />
                            <TimelineDuration text={HistoryUtility.formatDuration(entry.duration)} />
                        </TimelineMeta>
                        <div className="mt-1">
                            <UserLabel userId={entry.changedBy} showIcon />
                        </div>
                    </TimelineItem>
                ))}
            </div>
        </div>
    )
}
