import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { FormatUtility } from '../../../utils/FormatUtility'
import {
    buildConsolidatedTimeline,
    countByKey,
    daysBetween,
    findMostFrequent,
    formatDuration,
    formatFieldName,
    formatHistoryDate,
    formatHistoryTimestamp,
    getMaintenanceMilestone,
    getStatusColor,
    pluralizeDays,
    resolveItemName
} from '../../../utils/HistoryViewHelpersUtility'
import {
    ASSET_TYPES_WITH_CLEANLINESS,
    ASSET_TYPES_WITH_OPERATORS,
    ASSET_TYPES_WITH_OVERVIEW,
    ASSET_TYPES_WITH_PLANT,
    ASSET_TYPES_WITH_SERVICE,
    RATING_LABELS,
    RESOLVED_ISSUE_COLOR,
    SEVERITY_COLORS
} from '../../constants/historyConstants'
import useHistoryData from '../../hooks/useHistoryData'
import ErrorMessage from '../common/ErrorMessage'
import LoadingScreen from '../common/LoadingScreen'
import UserLabel from '../common/UserLabel'
import HistoryEmptyState from '../ui/HistoryEmptyState'
import RatingChart from '../ui/RatingChart'
import StatCard from '../ui/StatCard'
import StatCardGrid from '../ui/StatCardGrid'
import TabButton from '../ui/TabButton'
import TimelineItem, {
    TimelineDate,
    TimelineDuration,
    TimelineHeader,
    TimelineMeta,
    TimelineSectionTitle
} from '../ui/TimelineItem'
/**
 * Full-screen history view for an asset showing AI summary, status timeline,
 * operator history, service/maintenance records, issues, and cleanliness ratings.
 * Uses the useHistoryData hook for data fetching and consolidation.
 */
function HistoryViewSection({ item, type, onClose }) {
    const [activeTab, setActiveTab] = useState('ai-summary')
    const {
        aiSummary,
        aiSummaryError,
        aiSummaryLoading,
        allStatusPeriodsData,
        assignmentsData,
        cleanlinessData,
        conditionData,
        error,
        fetchHistory,
        generateAISummary,
        getOperatorName,
        getUserName,
        handleCompleteIssue,
        handleDeleteIssue,
        handleRegenerateAISummary,
        history,
        isLoading,
        issues,
        mileageData,
        operatorData,
        plantData,
        positionData,
        ratingsData,
        serviceData,
        setError,
        sortedHistory,
        statusData,
        userNames
    } = useHistoryData(item, type)
    useEffect(() => {
        if (!isLoading && activeTab === 'ai-summary' && !aiSummary && !aiSummaryLoading) {
            generateAISummary()
        }
    }, [isLoading, activeTab, aiSummary, aiSummaryLoading, generateAISummary])
    const itemName = resolveItemName(type, item)
    const formatValue = (fieldName, value) => {
        const key = fieldName?.includes('_')
            ? fieldName
            : String(fieldName ?? '')
                  .replace(/([A-Z])/g, '_$1')
                  .toLowerCase()
        if (key === 'created') return value ?? ''
        if (value === null || value === undefined || value === '') return 'Not Assigned'
        if (key === 'assigned_operator') return getOperatorName(value)
        if (key === 'cleanliness_rating') {
            const n = parseInt(value, 10)
            return Number.isFinite(n) && n > 0 ? '\u2605'.repeat(n) : String(value)
        }
        if (key === 'last_service_date' || key === 'last_chip_date')
            return value ? FormatUtility.formatDate(value) : 'Not Assigned'
        if (type === 'tractor' && key === 'has_blower') return value ? 'Yes' : 'No'
        if (key.includes('date') && value) return FormatUtility.formatDate(value)
        if (key === 'assigned_trainer') return getUserName(value)
        return value
    }
    const getCreatorName = (issue) =>
        issue.created_by && userNames[issue.created_by] ? userNames[issue.created_by] : 'Unknown'
    const onDeleteIssue = async (issueId) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) return
        try {
            await handleDeleteIssue(issueId)
        } catch {
            setError('Failed to delete issue. Please try again.')
        }
    }
    const onCompleteIssue = async (issueId) => {
        try {
            await handleCompleteIssue(issueId)
        } catch {
            setError('Failed to complete issue. Please try again.')
        }
    }
    const renderAISummary = () => {
        if (aiSummaryLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                        <i className="fas fa-robot text-accent text-xl animate-pulse" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Analyzing history...</p>
                    <p className="text-xs text-slate-400 mt-1">This may take a moment</p>
                </div>
            )
        }
        if (aiSummaryError) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <i className="fas fa-exclamation-triangle text-red-500 text-xl" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Failed to generate analysis</p>
                    <button
                        onClick={handleRegenerateAISummary}
                        className="mt-3 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )
        }
        if (!aiSummary) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <i className="fas fa-robot text-slate-400 text-xl" />
                    </div>
                    <p className="text-sm text-slate-500">No analysis available</p>
                </div>
            )
        }
        return (
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-accent to-accent/70 rounded-xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <i className="fas fa-robot text-lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base m-0">AI Analysis</h3>
                            <p className="text-xs text-white/70 m-0">Based on {history.length} history entries</p>
                        </div>
                    </div>
                    <div className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{aiSummary}</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-accent">{history.length}</div>
                        <div className="text-xs text-slate-500">Total Changes</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-accent">{statusData.length}</div>
                        <div className="text-xs text-slate-500">Status Changes</div>
                    </div>
                    {ASSET_TYPES_WITH_OPERATORS.includes(type) && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-accent">{operatorData.length}</div>
                            <div className="text-xs text-slate-500">Operator Changes</div>
                        </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-accent">{issues.length}</div>
                        <div className="text-xs text-slate-500">Total Issues</div>
                    </div>
                </div>
                <button
                    onClick={handleRegenerateAISummary}
                    className="w-full py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                    <i className="fas fa-sync-alt text-xs" />
                    Regenerate Analysis
                </button>
            </div>
        )
    }
    const renderOperatorChart = () => {
        if (operatorData.length === 0) {
            return (
                <HistoryEmptyState
                    title="No operator assignment history available"
                    subtitle="Operator assignments will be charted here once they are recorded."
                />
            )
        }
        const operatorCounts = countByKey(operatorData, (e) => e.operator)
        const calculateDuration = (startIndex, operatorName) => {
            let endIndex = startIndex + 1
            while (endIndex < operatorData.length && operatorData[endIndex].operator === operatorName) endIndex++
            return {
                days: daysBetween(
                    operatorData[startIndex].date,
                    endIndex < operatorData.length ? operatorData[endIndex].date : new Date()
                ),
                endIndex
            }
        }
        const operatorDurations = {}
        let i = 0
        while (i < operatorData.length) {
            const { days, endIndex } = calculateDuration(i, operatorData[i].operator)
            operatorDurations[operatorData[i].operator] = (operatorDurations[operatorData[i].operator] ?? 0) + days
            i = endIndex
        }
        const totalAssignments = operatorData.length
        const uniqueOperators = Object.keys(operatorCounts).filter((op) => op !== 'Empty').length
        const lastEntry = operatorData[operatorData.length - 1]
        const currentOperator = lastEntry ? (lastEntry.isEmpty ? 'Empty' : lastEntry.operator) : null
        const mostFrequentOperator =
            findMostFrequent(Object.fromEntries(Object.entries(operatorDurations).filter(([op]) => op !== 'Empty'))) ??
            'Not Assigned'
        const consolidatedTimeline = []
        let j = 0
        while (j < operatorData.length) {
            const entry = operatorData[j]
            const { days, endIndex } = calculateDuration(j, entry.operator)
            let statusPeriods = []
            if (entry.isEmpty) {
                const periodStart = new Date(entry.timestamp)
                const periodEnd =
                    endIndex < operatorData.length ? new Date(operatorData[endIndex].timestamp) : new Date()
                const statusChangesInPeriod = statusData.filter((s) => {
                    const d = new Date(s.timestamp)
                    return d >= periodStart && d < periodEnd
                })
                if (statusChangesInPeriod.length > 0) {
                    const statusDaysMap = {}
                    let currentStatus = statusChangesInPeriod[0]
                    let statusStart = periodStart
                    for (let k = 1; k < statusChangesInPeriod.length; k++) {
                        const nextStatus = statusChangesInPeriod[k]
                        const statusEnd = new Date(nextStatus.timestamp)
                        statusDaysMap[currentStatus.status] =
                            (statusDaysMap[currentStatus.status] ?? 0) + daysBetween(statusStart, statusEnd)
                        currentStatus = nextStatus
                        statusStart = statusEnd
                    }
                    statusDaysMap[currentStatus.status] =
                        (statusDaysMap[currentStatus.status] ?? 0) + daysBetween(statusStart, periodEnd)
                    statusPeriods = Object.entries(statusDaysMap).map(([status, totalDays]) => ({
                        days: totalDays,
                        status
                    }))
                } else {
                    statusPeriods.push({ days, status: item.status ?? 'Unknown' })
                }
            }
            consolidatedTimeline.push({
                days,
                isCurrent: endIndex >= operatorData.length,
                isEmpty: entry.isEmpty,
                operator: entry.operator,
                startDate: entry.timestamp,
                statusPeriods
            })
            j = endIndex
        }
        return (
            <div className="flex flex-col gap-2.5">
                <StatCardGrid>
                    <StatCard label="Current Operator" value={currentOperator ?? 'Not Assigned'} />
                    <StatCard label="Total Assignments" value={totalAssignments} />
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
                                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                                                No Operator
                                            </span>
                                        ) : null
                                    }
                                />
                                <TimelineMeta>
                                    <TimelineDate date={FormatUtility.formatDate(entry.startDate)} />
                                    <TimelineDuration text={pluralizeDays(entry.days)} />
                                </TimelineMeta>
                                {entry.isEmpty && entry.statusPeriods?.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="text-[10px] text-slate-500 font-semibold mb-1">
                                            Status during period:
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {entry.statusPeriods.map((sp, spIdx) => (
                                                <div
                                                    key={spIdx}
                                                    className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"
                                                >
                                                    <span className="font-medium">{sp.status}</span>
                                                    <span className="text-slate-400 ml-1">
                                                        ({pluralizeDays(sp.days)})
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </TimelineItem>
                        ))}
                </div>
            </div>
        )
    }
    const renderOverviewChart = () => {
        const currentStatus = item.status ?? 'Unknown'
        const oldestEntry =
            history.length > 0
                ? new Date(Math.min(...history.map((h) => new Date(h.changedAt ?? h.changed_at))))
                : new Date()
        const totalDaysSinceCreation = daysBetween(oldestEntry, new Date())
        let statusDaysMap = {}
        let statusPercentages
        let totalShopDays = 0
        if (allStatusPeriodsData.length === 0) {
            statusDaysMap[currentStatus] = totalDaysSinceCreation > 0 ? totalDaysSinceCreation : 1
            statusPercentages = [{ days: statusDaysMap[currentStatus], percentage: '100.0', status: currentStatus }]
        } else {
            totalShopDays = allStatusPeriodsData
                .filter((p) => p.status === 'In Shop')
                .reduce((sum, p) => sum + p.days, 0)
            allStatusPeriodsData.forEach((period) => {
                statusDaysMap[period.status] = (statusDaysMap[period.status] ?? 0) + period.days
            })
            statusPercentages = Object.entries(statusDaysMap)
                .map(([status, days]) => ({
                    days,
                    percentage: totalDaysSinceCreation > 0 ? ((days / totalDaysSinceCreation) * 100).toFixed(1) : 0,
                    status
                }))
                .sort((a, b) => b.days - a.days)
        }
        return (
            <div className="flex flex-col gap-2.5">
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 m-0 mb-4">Asset Status Distribution</h3>
                    <div className="mb-4">
                        <div className="flex h-6 rounded-xl overflow-hidden bg-slate-100">
                            {statusPercentages.map(
                                (sp, idx) =>
                                    parseFloat(sp.percentage) > 0 && (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-center text-white text-xs font-semibold min-w-[30px] transition-all"
                                            style={{
                                                background: getStatusColor(sp.status),
                                                width: `${sp.percentage}%`
                                            }}
                                            title={`${sp.status}: ${sp.percentage}%`}
                                        >
                                            {parseFloat(sp.percentage) > 10 && <span>{sp.percentage}%</span>}
                                        </div>
                                    )
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {statusPercentages.map((sp, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ background: getStatusColor(sp.status) }} />
                                <div className="flex flex-col">
                                    <div className="text-xs font-semibold text-slate-800">{sp.status}</div>
                                    <div className="text-[11px] text-slate-500">
                                        {sp.days} days ({sp.percentage}%)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <StatCardGrid>
                    <StatCard label="Current Status" value={currentStatus} />
                    <StatCard label="Total Status Changes" value={allStatusPeriodsData.length} />
                    <StatCard label="Total Shop Days" value={totalShopDays} />
                    <StatCard label="Days Since Creation" value={totalDaysSinceCreation} />
                </StatCardGrid>
                <TimelineSectionTitle title="Status Timeline" />
                <div className="flex flex-col gap-0">
                    {allStatusPeriodsData.length === 0 ? (
                        <TimelineItem dotColor={getStatusColor(currentStatus)} isLast>
                            <TimelineHeader label={currentStatus} isCurrent />
                            <TimelineMeta>
                                <TimelineDate date="Since Creation" />
                                <TimelineDuration text={pluralizeDays(statusDaysMap[currentStatus])} />
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
                                    dotColor={getStatusColor(period.status)}
                                    isLast={index >= allStatusPeriodsData.length - 1}
                                >
                                    <TimelineHeader label={period.status} isCurrent={period.isCurrent} />
                                    <TimelineMeta>
                                        <TimelineDate
                                            date={`${FormatUtility.formatDate(period.startTimestamp)}${
                                                period.endTimestamp
                                                    ? ` - ${FormatUtility.formatDate(period.endTimestamp)}`
                                                    : ' - Present'
                                            }`}
                                        />
                                        <TimelineDuration text={pluralizeDays(period.days)} />
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
    const renderServiceHistory = () => {
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
        const daysSinceLastService = lastService ? daysBetween(new Date(lastService.serviceDate), new Date()) : null
        const combinedTimeline = [
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
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-200">
                    {lastService && (
                        <div className="flex items-center gap-2">
                            <i className="fas fa-wrench text-accent" />
                            <div>
                                <div className="text-xs text-slate-500">Last Service</div>
                                <div className="text-sm font-semibold text-slate-800">
                                    {FormatUtility.formatDate(lastService.serviceDate)} ({daysSinceLastService} days
                                    ago)
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <i className="fas fa-exclamation-circle text-amber-500" />
                        <div>
                            <div className="text-xs text-slate-500">Open Issues</div>
                            <div className="text-sm font-semibold text-slate-800">{openIssues.length}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fas fa-check-circle text-green-600" />
                        <div>
                            <div className="text-xs text-slate-500">Resolved</div>
                            <div className="text-sm font-semibold text-slate-800">{resolvedIssues.length}</div>
                        </div>
                    </div>
                </div>
                <h3 className="m-0 text-xs font-bold text-slate-800 uppercase tracking-wide">Timeline</h3>
                <ErrorMessage message={error} onDismiss={() => setError(null)} />
                <div className="flex flex-col gap-0">
                    {combinedTimeline.map((entry, index) => {
                        if (entry.type === 'service') {
                            return (
                                <TimelineItem
                                    key={`service-${index}`}
                                    dotClassName="bg-green-600"
                                    isLast={index >= combinedTimeline.length - 1}
                                >
                                    <TimelineHeader
                                        label={
                                            <>
                                                <i className="fas fa-wrench mr-1" /> {entry.serviceType}
                                            </>
                                        }
                                    />
                                    <TimelineMeta>
                                        <TimelineDate date={FormatUtility.formatDate(entry.date)} />
                                    </TimelineMeta>
                                </TimelineItem>
                            )
                        }
                        const issue = entry.issue
                        const severityColor = entry.isCompleted
                            ? RESOLVED_ISSUE_COLOR
                            : (SEVERITY_COLORS[issue.severity] ?? '#3b82f6')
                        return (
                            <div key={`issue-${issue.id}`} className="flex gap-3 py-2">
                                <div className="flex flex-col items-center w-5 flex-shrink-0">
                                    <div
                                        className="w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"
                                        style={{ background: severityColor }}
                                    />
                                    {index < combinedTimeline.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5" />
                                    )}
                                </div>
                                <div
                                    className={`flex-1 bg-white border rounded-lg p-3 ${entry.isCompleted ? 'border-green-200' : 'border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <i
                                                    className={
                                                        entry.isCompleted
                                                            ? 'fas fa-check-circle text-green-600'
                                                            : 'fas fa-exclamation-circle text-amber-500'
                                                    }
                                                />
                                                <span
                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                                        issue.severity === 'High'
                                                            ? 'bg-red-100 text-red-800'
                                                            : issue.severity === 'Medium'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : 'bg-blue-100 text-blue-800'
                                                    }`}
                                                >
                                                    {issue.severity}
                                                </span>
                                                {entry.isCompleted && (
                                                    <span className="text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase">
                                                        RESOLVED
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-700">{issue.issue}</div>
                                        </div>
                                        <button
                                            onClick={() => onDeleteIssue(issue.id)}
                                            title="Delete issue"
                                            className="text-slate-400 hover:text-red-600 p-1"
                                        >
                                            <i className="fas fa-trash text-xs" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 flex-wrap gap-2">
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span>
                                                <i className="fas fa-user mr-1" /> {getCreatorName(issue)}
                                            </span>
                                            <span>
                                                <i className="fas fa-calendar-plus mr-1" />{' '}
                                                {formatHistoryDate(issue.time_created)}
                                            </span>
                                        </div>
                                        {entry.isCompleted && entry.completedDate && (
                                            <span className="text-xs text-green-600">
                                                <i className="fas fa-check mr-1" /> Completed:{' '}
                                                {formatHistoryDate(issue.time_completed)}
                                            </span>
                                        )}
                                        {!entry.isCompleted && (
                                            <button
                                                onClick={() => onCompleteIssue(issue.id)}
                                                title="Mark as resolved"
                                                className="text-xs text-green-600 hover:text-green-800 font-semibold"
                                            >
                                                <i className="fas fa-check mr-1" /> Mark as Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }
    const renderSimpleTimeline = (data, valueKey, title, emptyTitle, emptySubtitle, statsConfig) => {
        if (data.length === 0) {
            return <HistoryEmptyState title={emptyTitle} subtitle={emptySubtitle} />
        }
        const counts = countByKey(data, (e) => e[valueKey])
        const timeline = buildConsolidatedTimeline(data, valueKey, (e) => e[valueKey])
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
                                    <TimelineDate date={FormatUtility.formatDate(entry.startDate)} />
                                    <TimelineDuration text={pluralizeDays(entry.days)} />
                                </TimelineMeta>
                            </TimelineItem>
                        ))}
                </div>
            </div>
        )
    }
    const renderPlantAssignments = () =>
        renderSimpleTimeline(
            plantData,
            'plant',
            'Assignment Timeline',
            'No plant assignment history available',
            'Plant assignments will appear here once they are recorded.',
            [
                { label: 'Current Plant', value: ({ currentValue }) => currentValue },
                { label: 'Total Transfers', value: ({ data }) => data.length },
                { label: 'Unique Plants', value: ({ counts }) => Object.keys(counts).length },
                { label: 'Most Frequent', value: ({ counts }) => findMostFrequent(counts) }
            ]
        )
    const renderStatusHistory = () =>
        renderSimpleTimeline(
            statusData,
            'status',
            'Status Timeline',
            'No status history available',
            'Status changes will appear here once they are recorded.',
            [
                { label: 'Current Status', value: ({ currentValue }) => currentValue },
                { label: 'Total Changes', value: ({ data }) => data.length },
                { label: 'Unique Statuses', value: ({ counts }) => Object.keys(counts).length },
                { label: 'Most Frequent', value: ({ counts }) => findMostFrequent(counts) }
            ]
        )
    const renderPositionHistory = () => {
        if (positionData.length === 0) {
            return (
                <HistoryEmptyState
                    title="No position history available"
                    subtitle="Position changes will appear here once they are recorded."
                />
            )
        }
        const positionCounts = countByKey(positionData, (e) => e.position)
        const totalChanges = positionData.length
        const currentPosition = positionData[positionData.length - 1].position
        const chartData = Object.entries(positionCounts)
            .map(([position, count]) => ({ count, percentage: ((count / totalChanges) * 100).toFixed(1), position }))
            .sort((a, b) => b.count - a.count)
        const timeline = buildConsolidatedTimeline(positionData, 'position', (e) => e.position)
        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Position
                        </div>
                        <div className="text-sm font-bold text-slate-800 truncate">{currentPosition}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Changes
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{totalChanges}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Unique Positions
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{Object.keys(positionCounts).length}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Most Frequent
                        </div>
                        <div className="text-sm font-bold text-slate-800 truncate">
                            {findMostFrequent(positionCounts)}
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <i className="fas fa-clock text-blue-500" /> Position Timeline
                    </h3>
                    <div className="relative pl-6">
                        {timeline
                            .slice()
                            .reverse()
                            .map((entry, index) => (
                                <div key={index} className="relative pb-4 last:pb-0">
                                    <div
                                        className="absolute left-0 top-0 flex flex-col items-center"
                                        style={{ transform: 'translateX(-50%)' }}
                                    >
                                        <div
                                            className={`w-3 h-3 rounded-full border-2 ${entry.isCurrent ? 'bg-green-500 border-green-500' : 'bg-white border-blue-500'}`}
                                        />
                                        {index < timeline.length - 1 && (
                                            <div className="w-0.5 bg-gray-200 flex-1 min-h-[40px]" />
                                        )}
                                    </div>
                                    <div
                                        className={`ml-4 p-3 rounded-lg border ${entry.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-800">{entry.position}</span>
                                            {entry.isCurrent && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                            <span>
                                                <i className="fas fa-calendar-alt mr-1" />
                                                {FormatUtility.formatDate(entry.startDate)}
                                                {entry.endDate
                                                    ? ` - ${FormatUtility.formatDate(entry.endDate)}`
                                                    : ' - Present'}
                                            </span>
                                            <span>
                                                <i className="fas fa-hourglass-half mr-1" />(
                                                {formatDuration(entry.duration)})
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <i className="fas fa-chart-bar text-blue-500" /> Position Distribution
                    </h3>
                    <div className="flex flex-col gap-2">
                        {chartData.map((data, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg border ${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-800">{data.position}</span>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>
                                            {data.count} {data.count === 1 ? 'time' : 'times'}
                                        </span>
                                        <span className="font-semibold text-slate-700">{data.percentage}%</span>
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-slate-400'}`}
                                        style={{ width: `${data.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }
    const renderRatingsHistory = () => {
        if (ratingsData.length === 0) {
            return (
                <HistoryEmptyState
                    title="No rating history available"
                    subtitle="Rating changes will be charted here once they are recorded."
                />
            )
        }
        const avgRating = ratingsData.reduce((sum, d) => sum + d.rating, 0) / ratingsData.length
        const currentRating = ratingsData[ratingsData.length - 1].rating
        const highestRating = Math.max(...ratingsData.map((d) => d.rating))
        return (
            <div className="flex flex-col gap-4">
                <StatCardGrid>
                    <StatCard
                        label="Current Rating"
                        value={currentRating > 0 ? `${currentRating}\u2605` : 'None'}
                        sublabel={currentRating > 0 ? RATING_LABELS[currentRating] : undefined}
                    />
                    <StatCard label="Average Rating" value={`${avgRating.toFixed(1)}\u2605`} />
                    <StatCard label="Highest Rating" value={`${highestRating}\u2605`} />
                    <StatCard label="Total Changes" value={ratingsData.length} />
                </StatCardGrid>
                <TimelineSectionTitle title="Rating Timeline" />
                <div className="flex flex-col gap-0">
                    {ratingsData
                        .slice()
                        .reverse()
                        .map((entry, index) => (
                            <TimelineItem key={index} dotClassName="bg-accent" isLast={index >= ratingsData.length - 1}>
                                <TimelineHeader
                                    label={`${entry.rating}\u2605 - ${RATING_LABELS[entry.rating]}`}
                                    isCurrent={index === 0}
                                />
                                <TimelineMeta>
                                    <TimelineDate date={FormatUtility.formatDate(entry.timestamp)} />
                                    <UserLabel userId={entry.changedBy} showIcon />
                                </TimelineMeta>
                            </TimelineItem>
                        ))}
                </div>
            </div>
        )
    }
    const renderMileageTracking = () => {
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
        const milestone = getMaintenanceMilestone(currentMileage)
        return (
            <div className="flex flex-col gap-4">
                <StatCardGrid>
                    <StatCard
                        label="Current Mileage"
                        value={currentMileage.toLocaleString()}
                        sublabel={milestone.label}
                    />
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
                            const milesDriven =
                                reversedIndex > 0 ? entry.mileage - mileageData[reversedIndex - 1].mileage : 0
                            const daysSince =
                                reversedIndex > 0 ? daysBetween(mileageData[reversedIndex - 1].date, entry.date) : 0
                            return (
                                <TimelineItem
                                    key={index}
                                    dotClassName="bg-accent"
                                    isLast={index >= mileageData.length - 1}
                                >
                                    <TimelineHeader
                                        label={`${entry.mileage.toLocaleString()} miles`}
                                        isCurrent={index === 0}
                                    />
                                    <TimelineMeta>
                                        <TimelineDate date={FormatUtility.formatDate(entry.timestamp)} />
                                        {milesDriven > 0 && daysSince > 0 && (
                                            <TimelineDuration
                                                text={`+${milesDriven.toLocaleString()} miles in ${pluralizeDays(daysSince)}`}
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
    const renderAssignmentsHistory = () => {
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
        const buildAssignmentTimeline = () => {
            const timeline = []
            let currentMixerEntry = null
            let currentTractorEntry = null
            const calcDuration = (startDate, endDate) =>
                daysBetween(new Date(startDate), endDate ? new Date(endDate) : new Date())
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
                } else {
                    if (isMixer) currentMixerEntry = null
                    else currentTractorEntry = null
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
        const consolidatedTimeline = buildAssignmentTimeline()
        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Mixer
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                            {currentMixer ? `#${currentMixer}` : 'Not Assigned'}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Tractor
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                            {currentTractor ? `#${currentTractor}` : 'Not Assigned'}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Assignments
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{totalAssignments}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Assignment Changes
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{assignmentsData.length}</div>
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <i className="fas fa-clock text-blue-500" /> Assignment Timeline
                    </h3>
                    <div className="relative pl-6">
                        {consolidatedTimeline.map((entry, index) => (
                            <div key={index} className="relative pb-4 last:pb-0">
                                <div
                                    className="absolute left-0 top-0 flex flex-col items-center"
                                    style={{ transform: 'translateX(-50%)' }}
                                >
                                    <div
                                        className={`w-3 h-3 rounded-full border-2 ${entry.isCurrent ? 'bg-green-500 border-green-500' : 'bg-white border-blue-500'}`}
                                    />
                                    {index < consolidatedTimeline.length - 1 && (
                                        <div className="w-0.5 bg-gray-200 flex-1 min-h-[40px]" />
                                    )}
                                </div>
                                <div
                                    className={`ml-4 p-3 rounded-lg border ${entry.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-800">
                                            {entry.assignmentType} #{entry.vehicleNumber}
                                        </span>
                                        {entry.isCurrent && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span>
                                            <i className="fas fa-calendar-alt mr-1" />
                                            {FormatUtility.formatDate(entry.startDate)}
                                            {entry.endDate
                                                ? ` - ${FormatUtility.formatDate(entry.endDate)}`
                                                : ' - Present'}
                                        </span>
                                        <span>
                                            <i className="fas fa-hourglass-half mr-1" />(
                                            {formatDuration(entry.duration)})
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <UserLabel userId={entry.changedBy} showIcon />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-slate-500">
                    <LoadingScreen message="Loading history..." inline />
                </div>
            )
        }
        if (error) {
            return (
                <div className="text-center py-8 text-red-600">
                    <p>{error}</p>
                    <button
                        className="bg-red-600 text-white border-none rounded-lg px-5 py-2.5 mt-4 text-sm font-semibold cursor-pointer hover:bg-red-700"
                        onClick={fetchHistory}
                    >
                        Retry
                    </button>
                </div>
            )
        }
        if (history.length === 0 && activeTab !== 'ai-summary') {
            return (
                <HistoryEmptyState
                    title={`No history records found for this ${type}.`}
                    subtitle={`History entries will appear here when changes are made to this ${type}.`}
                />
            )
        }
        switch (activeTab) {
            case 'ai-summary':
                return renderAISummary()
            case 'timeline':
                return (
                    <div className="flex flex-col gap-3">
                        {sortedHistory.map((entry, index) => {
                            const fieldName = entry.fieldName ?? entry.field_name
                            const isCreatedEntry = fieldName === 'created'
                            return (
                                <div
                                    key={entry.id ?? index}
                                    className="bg-white border border-gray-200 rounded-lg p-3.5 hover:border-slate-400 hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-center mb-2.5">
                                        <div className="text-sm font-bold text-slate-800 capitalize">
                                            {formatFieldName(fieldName, type)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium">
                                            {formatHistoryTimestamp(entry.changedAt ?? entry.changed_at)}
                                        </div>
                                    </div>
                                    {isCreatedEntry ? (
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <div className="text-sm text-green-600 font-semibold">
                                                {formatValue(fieldName, entry.newValue ?? entry.new_value)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <div className="text-[13px] text-slate-500">
                                                <span className="text-[11px] uppercase font-bold tracking-wide opacity-70">
                                                    From:
                                                </span>{' '}
                                                {formatValue(fieldName, entry.oldValue ?? entry.old_value)}
                                            </div>
                                            <div className="text-accent text-sm">{'\u2192'}</div>
                                            <div className="text-[13px] text-slate-800 font-semibold">
                                                <span className="text-[11px] uppercase font-bold tracking-wide opacity-70">
                                                    To:
                                                </span>{' '}
                                                {formatValue(fieldName, entry.newValue ?? entry.new_value)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-500">
                                        <UserLabel userId={entry.changedBy ?? entry.changed_by} showIcon />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            case 'cleanliness':
                return (
                    <RatingChart
                        data={cleanlinessData}
                        title="Cleanliness Rating Over Time"
                        emptyTitle="No cleanliness rating history available"
                        emptySubtitle="Cleanliness ratings will be charted here once they are recorded."
                    />
                )
            case 'condition':
                return (
                    <RatingChart
                        data={conditionData}
                        title="Condition Rating Over Time"
                        emptyTitle="No condition rating history available"
                        emptySubtitle="Condition ratings will be charted here once they are recorded."
                    />
                )
            case 'overview':
                return renderOverviewChart()
            case 'operators':
                return renderOperatorChart()
            case 'service':
                return renderServiceHistory()
            case 'plant':
                return renderPlantAssignments()
            case 'status':
                return renderStatusHistory()
            case 'position':
                return renderPositionHistory()
            case 'ratings':
                return renderRatingsHistory()
            case 'mileage':
                return renderMileageTracking()
            case 'assignments':
                return renderAssignmentsHistory()
            default:
                return null
        }
    }
    const tabs = [
        { id: 'timeline', label: 'Timeline', show: true },
        { id: 'overview', label: 'Overview', show: ASSET_TYPES_WITH_OVERVIEW.includes(type) },
        { id: 'operators', label: 'Operators', show: ASSET_TYPES_WITH_OPERATORS.includes(type) },
        { id: 'service', label: 'Service History', show: ASSET_TYPES_WITH_SERVICE.includes(type) },
        { id: 'plant', label: 'Plant Assignments', show: ASSET_TYPES_WITH_PLANT.includes(type) },
        { id: 'status', label: 'Status History', show: type === 'operator' || type === 'pickup-truck' },
        { id: 'position', label: 'Position History', show: type === 'operator' },
        { id: 'ratings', label: 'Ratings History', show: type === 'operator' },
        { id: 'assignments', label: 'Assignments', show: type === 'operator' },
        { id: 'mileage', label: 'Mileage Tracking', show: type === 'pickup-truck' },
        { id: 'condition', label: 'Condition', show: type === 'equipment' },
        { id: 'cleanliness', label: 'Cleanliness', show: ASSET_TYPES_WITH_CLEANLINESS.includes(type) }
    ]
    if (typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-[900px] w-full max-h-[85vh] flex flex-col border border-gray-200">
                <div className="bg-slate-50 flex justify-between items-center px-6 py-5 border-b border-gray-200 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-history text-xl text-accent" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 m-0">{itemName}</h2>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                Change History
                            </span>
                        </div>
                    </div>
                    <button
                        className="bg-transparent border-none text-xl text-slate-500 cursor-pointer p-2 flex items-center justify-center rounded-md hover:bg-gray-200 hover:text-slate-800 w-8 h-8"
                        onClick={onClose}
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>
                <div className="flex gap-2 px-6 py-4 overflow-x-auto border-b border-gray-200 bg-slate-50 flex-shrink-0">
                    {tabs
                        .filter((t) => t.show)
                        .map((tab) => (
                            <TabButton
                                key={tab.id}
                                label={tab.label}
                                isActive={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            />
                        ))}
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white">{renderContent()}</div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-slate-50 rounded-b-2xl">
                    <button
                        className="px-6 py-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-semibold cursor-pointer hover:bg-slate-100 hover:border-slate-300"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
export default HistoryViewSection
