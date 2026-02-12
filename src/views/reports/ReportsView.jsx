import React, { useEffect, useMemo, useState } from 'react'

import { usePagination } from '../../app/hooks/usePagination'
import { useReportsData } from '../../app/hooks/useReportsData'
import { useReportSubmission } from '../../app/hooks/useReportSubmission'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import { supabase } from '../../services/DatabaseService'
import { reportTypeMap, reportTypes } from '../../types/ReportTypes'
import MyReportsList from './components/MyReportsList'
import ReportsEmptyState from './components/ReportsEmptyState'
import ReportsStatsCards from './components/ReportsStatsCards'
import ReportsToolbar from './components/ReportsToolbar'
import ReviewReportsList from './components/ReviewReportsList'
import ReportsReviewView from './ReportsReviewView'
import ReportsSubmitView from './ReportsSubmitView'
import { reportsViewStyles } from './styles/ReportsViewStyles'

function ReportsView() {
    const {
        getUserName,
        hasAnyReviewPermission,
        hasAssigned,
        hasReviewPermission,
        isLoadingMy,
        isLoadingPermissions,
        isLoadingReview,
        isLoadingUser,
        isRefreshing,
        loadError,
        loadReviewReports,
        loadingReporterPlants,
        markReportReviewed,
        myReportsByWeek,
        plants,
        preferences,
        regionPlantCodes,
        regionType,
        reporterPlantMap,
        reviewableReports,
        reviewedByCurrentUser,
        setLoadError,
        triggerRefresh,
        updateLocalReport,
        user,
        userProfiles,
        weeksToShow
    } = useReportsData()

    const { submitReport, submitManagerEdit, fetchReportForEdit } = useReportSubmission({
        setLoadError,
        updateLocalReport,
        user
    })

    const [showForm, setShowForm] = useState(null)
    const [showReview, setShowReview] = useState(null)
    const [reviewData, setReviewData] = useState(null)
    const [tab, setTab] = useState('all')
    const [submitInitialData, setSubmitInitialData] = useState(null)
    const [filterReportType, setFilterReportType] = useState('')
    const [filterPlant, setFilterPlant] = useState('')
    const [managerEditUser, setManagerEditUser] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)

    const styles = reportsViewStyles

    const allMyItems = useMemo(() => Object.values(myReportsByWeek).flat(), [myReportsByWeek])

    const visibleReviewReports = useMemo(
        () =>
            reviewableReports.filter((report) => {
                const reporterPlant = reporterPlantMap[report.userId] || ''
                const matchPlant = !filterPlant || filterPlant === 'All' || reporterPlant === filterPlant
                const matchRegion =
                    !preferences.selectedRegion?.code ||
                    !regionPlantCodes ||
                    regionPlantCodes.has(reporterPlant) ||
                    report.name === 'general_manager'
                return (!filterReportType || report.name === filterReportType) && matchPlant && matchRegion
            }),
        [
            reviewableReports,
            filterReportType,
            filterPlant,
            preferences.selectedRegion?.code,
            regionPlantCodes,
            reporterPlantMap
        ]
    )

    const myPagination = usePagination({
        initialPageSize: 25,
        items: allMyItems,
        resetDependencies: [filterReportType, filterPlant]
    })

    const reviewPagination = usePagination({
        initialPageSize: 25,
        items: visibleReviewReports,
        resetDependencies: [filterReportType, filterPlant]
    })

    useEffect(() => {
        if (tab === 'review') {
            loadReviewReports()
        }
    }, [tab, loadReviewReports])

    async function handleSubmitReport(formData, completed = true) {
        const result = await submitReport({ completed, formData, showForm })
        if (result.success) {
            setShowForm(null)
        }
    }

    async function handleManagerEditSubmit(formData) {
        const result = await submitManagerEdit({ formData, managerEditUser, showForm })
        if (result.success) {
            setShowForm(null)
            setManagerEditUser(null)
        }
    }

    async function handleReview(report) {
        if (report.userId !== user?.id) {
            const { error } = await supabase
                .from('reports_reviewed')
                .upsert(
                    { report_id: report.id, reviewed_at: new Date().toISOString(), reviewed_by_user_id: user.id },
                    { onConflict: 'report_id,reviewed_by_user_id' }
                )
            if (!error) {
                markReportReviewed(report.id)
            }
        }
        setReviewData(report)
        setShowReview(reportTypes.find((rt) => rt.name === report.name))
    }

    function handleManagerEdit(reportType, reportData) {
        setShowReview(null)
        setReviewData(null)
        setShowForm({ ...reportType, name: reportType.name, weekIso: reportData.week || reportData.data?.week })
        setSubmitInitialData({ ...reportData, data: reportData.data })
        setManagerEditUser(reportData.userId)
    }

    async function handleShowForm(item) {
        setSubmitInitialData(null)
        if (!user || !item?.name || !item.weekIso) {
            setShowForm(item)
            return
        }
        const existingData = await fetchReportForEdit({ item, userId: user.id })
        if (existingData) {
            setSubmitInitialData(existingData)
        }
        setShowForm(item)
    }

    const regionalPlants = plants.filter(
        (p) => !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(p.plant_code)
    )
    const selectedPlantObj = regionalPlants.find((p) => p.plant_code === filterPlant)
    const plantDisplayText = filterPlant
        ? `(${selectedPlantObj?.plant_code}) ${selectedPlantObj?.plant_name}`
        : 'All Plants'

    const isMyReportsLoading = isLoadingUser || isLoadingMy || isLoadingPermissions
    const isReviewLoading = isLoadingUser || isLoadingPermissions || loadingReporterPlants || isLoadingReview

    return (
        <>
            <div style={styles.root}>
                {loadError && (
                    <div style={styles.loadError}>
                        <i className="fas fa-exclamation-circle"></i>
                        {loadError}
                    </div>
                )}
                {!showForm && !showReview && (
                    <div>
                        <ReportsToolbar
                            tab={tab}
                            onTabChange={setTab}
                            filterReportType={filterReportType}
                            onFilterReportTypeChange={setFilterReportType}
                            plantDisplayText={plantDisplayText}
                            onPlantModalOpen={() => setIsPlantModalOpen(true)}
                            isRefreshing={isRefreshing}
                            onRefresh={triggerRefresh}
                            hasAssigned={hasAssigned}
                            hasReviewPermission={hasReviewPermission}
                            hasAnyReviewPermission={hasAnyReviewPermission}
                            regionType={regionType}
                        />
                        <div style={styles.content}>
                            {tab === 'all' && !isMyReportsLoading && <ReportsStatsCards items={allMyItems} tab={tab} />}
                            {tab === 'review' && !isReviewLoading && (
                                <ReportsStatsCards items={visibleReviewReports} tab={tab} />
                            )}
                            {tab === 'all' &&
                                (allMyItems.length === 0 && !isMyReportsLoading ? (
                                    <ReportsEmptyState tab={tab} hasAssigned={hasAssigned} />
                                ) : (
                                    <MyReportsList
                                        isLoading={isMyReportsLoading}
                                        items={myPagination.paginatedItems}
                                        weeksToShow={weeksToShow}
                                        pageSize={myPagination.pageSize}
                                        currentPage={myPagination.currentPage}
                                        totalPages={myPagination.totalPages}
                                        onPageSizeChange={myPagination.changePageSize}
                                        onPageChange={myPagination.goToPage}
                                        onShowForm={handleShowForm}
                                    />
                                ))}
                            {tab === 'review' &&
                                (visibleReviewReports.length === 0 && !isReviewLoading ? (
                                    <ReportsEmptyState tab={tab} />
                                ) : (
                                    <ReviewReportsList
                                        isLoading={isReviewLoading}
                                        items={reviewPagination.paginatedItems}
                                        reviewedByCurrentUser={reviewedByCurrentUser}
                                        pageSize={reviewPagination.pageSize}
                                        currentPage={reviewPagination.currentPage}
                                        totalPages={reviewPagination.totalPages}
                                        onPageSizeChange={reviewPagination.changePageSize}
                                        onPageChange={reviewPagination.goToPage}
                                        onReview={handleReview}
                                        getUserName={getUserName}
                                    />
                                ))}
                        </div>
                    </div>
                )}
                {showForm && (
                    <ReportsSubmitView
                        report={
                            reportTypeMap[showForm.name]
                                ? { ...reportTypeMap[showForm.name], weekIso: showForm.weekIso }
                                : showForm
                        }
                        initialData={submitInitialData}
                        onBack={() => {
                            setShowForm(null)
                            setManagerEditUser(null)
                        }}
                        onSubmit={(form, submitType) => {
                            if (managerEditUser) {
                                handleManagerEditSubmit(form)
                            } else {
                                handleSubmitReport(form, submitType === 'submit')
                            }
                        }}
                        user={user}
                        readOnly={showReview === null && reviewData !== null}
                        managerEditUser={managerEditUser}
                        userProfiles={userProfiles}
                    />
                )}
                {showReview && (
                    <ReportsReviewView
                        report={reportTypeMap[showReview.name] || showReview}
                        initialData={reviewData}
                        onBack={() => {
                            setShowReview(null)
                            setReviewData(null)
                        }}
                        user={user}
                        completedByUser={reviewData?.userId ? userProfiles[reviewData.userId] : undefined}
                        onManagerEdit={handleManagerEdit}
                    />
                )}
                {isPlantModalOpen && (
                    <PlantDropdownModal
                        isOpen={isPlantModalOpen}
                        onClose={() => setIsPlantModalOpen(false)}
                        plants={regionalPlants}
                        onSelect={(plantCode) => {
                            setFilterPlant(plantCode)
                            setIsPlantModalOpen(false)
                        }}
                        showAllPlants={true}
                    />
                )}
            </div>
        </>
    )
}

export default ReportsView
