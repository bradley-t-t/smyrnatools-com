import React, { useEffect, useState } from 'react'

import { DateUtility } from '../../../utils/DateUtility'
import { HistoryUtility } from '../../../utils/HistoryUtility'
import { HISTORY_TAB_DEFINITIONS } from '../../constants/historyConstants'
import { useConfirm } from '../../context/ConfirmContext'
import useHistoryAiTypewriter from '../../hooks/useHistoryAiTypewriter'
import useHistoryAnalysisScrollCollapse from '../../hooks/useHistoryAnalysisScrollCollapse'
import useHistoryData from '../../hooks/useHistoryData'
import Skeleton, { SkeletonStack } from '../common/Skeleton'
import StarRating from '../common/StarRating'
import HistoryAssignmentsTab from '../history/HistoryAssignmentsTab'
import HistoryMileageTab from '../history/HistoryMileageTab'
import HistoryOperatorsTab from '../history/HistoryOperatorsTab'
import HistoryOverviewTab from '../history/HistoryOverviewTab'
import HistoryPositionTab from '../history/HistoryPositionTab'
import HistoryRatingsTab from '../history/HistoryRatingsTab'
import HistoryServiceTab from '../history/HistoryServiceTab'
import HistorySimpleTimelineTab from '../history/HistorySimpleTimelineTab'
import HistoryTimelineTab from '../history/HistoryTimelineTab'
import HistoryViewModal from '../history/HistoryViewModal'
import HistoryEmptyState from '../ui/HistoryEmptyState'
import RatingChart from '../ui/RatingChart'

/** Formats a single field value for display in the timeline change cards. */
function buildFormatValue({ getOperatorName, getUserName, type }) {
    // eslint-disable-next-line react/display-name -- value formatter that occasionally returns JSX (cleanliness_rating), not a React component
    return (fieldName, value) => {
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
            return Number.isFinite(n) && n > 0 ? <StarRating value={n} tone="warning" size="xs" /> : String(value)
        }
        if (key === 'last_service_date' || key === 'last_chip_date') {
            return value ? DateUtility.formatDate(value) : 'Not Assigned'
        }
        if (type === 'tractor' && key === 'has_blower') return value ? 'Yes' : 'No'
        if (key.includes('date') && value) return DateUtility.formatDate(value)
        if (key === 'assigned_trainer') return getUserName(value)
        return value
    }
}

const PLANT_STATS = [
    { label: 'Current Plant', value: ({ currentValue }) => currentValue },
    { label: 'Total Transfers', value: ({ data }) => data.length },
    { label: 'Unique Plants', value: ({ counts }) => Object.keys(counts).length },
    { label: 'Most Frequent', value: ({ counts }) => HistoryUtility.findMostFrequent(counts) }
]

const STATUS_STATS = [
    { label: 'Current Status', value: ({ currentValue }) => currentValue },
    { label: 'Total Changes', value: ({ data }) => data.length },
    { label: 'Unique Statuses', value: ({ counts }) => Object.keys(counts).length },
    { label: 'Most Frequent', value: ({ counts }) => HistoryUtility.findMostFrequent(counts) }
]

/**
 * Full-screen history view for an asset showing AI summary, status timeline,
 * operator history, service/maintenance records, issues, and cleanliness ratings.
 * Orchestrates the useHistoryData hook with tab-specific render components.
 */
function HistoryViewSection({ item, onClose, type }) {
    const confirm = useConfirm()
    const [activeTab, setActiveTab] = useState('timeline')
    const historyState = useHistoryData(item, type)
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
    } = historyState

    const { analysisVisible, scrollContainerRef } = useHistoryAnalysisScrollCollapse(activeTab)
    const { displayText: aiDisplayText, isTypingComplete } = useHistoryAiTypewriter(aiSummary)

    useEffect(() => {
        if (!isLoading && activeTab === 'timeline' && !aiSummary && !aiSummaryLoading) {
            generateAISummary()
        }
    }, [isLoading, activeTab, aiSummary, aiSummaryLoading, generateAISummary])

    const itemName = HistoryUtility.resolveItemName(type, item)
    const formatValue = buildFormatValue({ getOperatorName, getUserName, type })
    const getCreatorName = (issue) =>
        issue.created_by && userNames[issue.created_by] ? userNames[issue.created_by] : 'Unknown'

    const onDeleteIssue = async (issueId) => {
        if (!(await confirm({ confirmLabel: 'Delete', title: 'Delete this issue?' }))) return
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

    const tabs = HISTORY_TAB_DEFINITIONS.filter((tab) => tab.show(type))

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="px-6 py-6">
                    <SkeletonStack count={5} gapClassName="gap-3">
                        {(i) => (
                            <div className="rounded-md p-4 bg-bg-secondary border border-border-light">
                                <div className="flex items-center gap-3 mb-2">
                                    <Skeleton className="h-8 w-8" rounded="rounded-full" />
                                    <div className="flex-1">
                                        <Skeleton className="h-3.5 w-40 mb-1.5" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className={`h-3 ${['w-full', 'w-3/4', 'w-5/6', 'w-2/3', 'w-1/2'][i % 5]}`} />
                            </div>
                        )}
                    </SkeletonStack>
                </div>
            )
        }
        if (error) {
            return (
                <div className="text-center py-8 text-text-primary">
                    <p>{error}</p>
                    <button type="button"
                        className="bg-red-600 text-white border-none rounded-lg px-5 py-2.5 mt-4 text-sm font-semibold cursor-pointer hover:bg-red-700"
                        onClick={fetchHistory}
                    >
                        Retry
                    </button>
                </div>
            )
        }
        if (history.length === 0 && activeTab !== 'timeline') {
            return (
                <HistoryEmptyState
                    title={`No history records found for this ${type}.`}
                    subtitle={`History entries will appear here when changes are made to this ${type}.`}
                />
            )
        }
        switch (activeTab) {
            case 'timeline':
                return (
                    <HistoryTimelineTab
                        aiDisplayText={aiDisplayText}
                        aiSummary={aiSummary}
                        aiSummaryError={aiSummaryError}
                        aiSummaryLoading={aiSummaryLoading}
                        analysisVisible={analysisVisible}
                        formatValue={formatValue}
                        handleRegenerateAISummary={handleRegenerateAISummary}
                        history={history}
                        issues={issues}
                        isTypingComplete={isTypingComplete}
                        operatorData={operatorData}
                        sortedHistory={sortedHistory}
                        statusData={statusData}
                        type={type}
                    />
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
                return <HistoryOverviewTab allStatusPeriodsData={allStatusPeriodsData} history={history} item={item} />
            case 'operators':
                return <HistoryOperatorsTab item={item} operatorData={operatorData} statusData={statusData} />
            case 'service':
                return (
                    <HistoryServiceTab
                        error={error}
                        getCreatorName={getCreatorName}
                        issues={issues}
                        onCompleteIssue={onCompleteIssue}
                        onDeleteIssue={onDeleteIssue}
                        serviceData={serviceData}
                        setError={setError}
                    />
                )
            case 'plant':
                return (
                    <HistorySimpleTimelineTab
                        data={plantData}
                        emptySubtitle="Plant assignments will appear here once they are recorded."
                        emptyTitle="No plant assignment history available"
                        statsConfig={PLANT_STATS}
                        title="Assignment Timeline"
                        valueKey="plant"
                    />
                )
            case 'status':
                return (
                    <HistorySimpleTimelineTab
                        data={statusData}
                        emptySubtitle="Status changes will appear here once they are recorded."
                        emptyTitle="No status history available"
                        statsConfig={STATUS_STATS}
                        title="Status Timeline"
                        valueKey="status"
                    />
                )
            case 'position':
                return <HistoryPositionTab positionData={positionData} />
            case 'ratings':
                return <HistoryRatingsTab ratingsData={ratingsData} />
            case 'mileage':
                return <HistoryMileageTab mileageData={mileageData} />
            case 'assignments':
                return <HistoryAssignmentsTab assignmentsData={assignmentsData} />
            default:
                return null
        }
    }

    return (
        <HistoryViewModal
            activeTab={activeTab}
            itemName={itemName}
            onClose={onClose}
            scrollContainerRef={scrollContainerRef}
            setActiveTab={setActiveTab}
            tabs={tabs}
        >
            {renderContent()}
        </HistoryViewModal>
    )
}

export default HistoryViewSection
