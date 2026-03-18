import React, { useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import LostLoadDetailModal from '../../../app/components/reports/LostLoadDetailModal'
import LostLoadReportModal from '../../../app/components/reports/LostLoadReportModal'
import LostLoadsList from '../../../app/components/reports/LostLoadsList'
import MyReportsList from '../../../app/components/reports/MyReportsList'
import ReportsEmptyState from '../../../app/components/reports/ReportsEmptyState'
import ReportsStatsCards from '../../../app/components/reports/ReportsStatsCards'
import ReportsToolbar from '../../../app/components/reports/ReportsToolbar'
import ReviewReportsList from '../../../app/components/reports/ReviewReportsList'
import { usePagination } from '../../../app/hooks/usePagination'
import { useReportsData } from '../../../app/hooks/useReportsData'
import { useReportSubmission } from '../../../app/hooks/useReportSubmission'
import { reportTypeMap, reportTypes } from '../../../app/types/ReportTypes'
import { ReportService } from '../../../services/ReportService'
import ReportsReviewView from './ReportsReviewView'
import ReportsSubmitView from './ReportsSubmitView'
/**
 * Top-level reports hub. Shows the user's submitted reports grouped by week
 * and a reviewable reports list (for managers with review permissions).
 * Supports report type and plant filtering, paginated lists, drill-down
 * into ReportsSubmitView for filling/editing and ReportsReviewView for
 * reviewing submissions. Managers can also edit reports on behalf of other users.
 */
function ReportsView() {
    const {
        addLostLoadReport,
        deleteLostLoadReport,
        getUserName,
        hasAnyReviewPermission,
        hasAssigned,
        hasLostLoadsDeletePermission,
        hasLostLoadsPermission,
        hasReviewPermission,
        isLoadingLostLoads,
        isLoadingMy,
        isLoadingPermissions,
        isLoadingReview,
        isLoadingUser,
        isRefreshing,
        loadError,
        loadLostLoadReports,
        loadReviewReports,
        loadingReporterPlants,
        lostLoadReports,
        markReportReviewed,
        myReportsByWeek,
        plants,
        preferences,
        regionPlantCodes,
        regionPlantsWithDistricts,
        regionType,
        reporterPlantMap,
        reviewableReports,
        reviewedByCurrentUser,
        setLoadError,
        triggerRefresh,
        updateLocalReport,
        user,
        userAdditionalPlants,
        userPlantCode,
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
    const [showLostLoadModal, setShowLostLoadModal] = useState(false)
    const [selectedLostLoad, setSelectedLostLoad] = useState(null)
    const [bannerDismissed, setBannerDismissed] = useState(false)
    const [submitInitialData, setSubmitInitialData] = useState(null)
    const [filterReportType, setFilterReportType] = useState('')
    const [filterPlant, setFilterPlant] = useState('')
    const [managerEditUser, setManagerEditUser] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const searchLower = searchInput.trim().toLowerCase()
    const allMyItems = useMemo(() => {
        const items = Object.values(myReportsByWeek).flat()
        if (!searchLower) return items
        return items.filter(
            (item) => item.title?.toLowerCase().includes(searchLower) || item.name?.toLowerCase().includes(searchLower)
        )
    }, [myReportsByWeek, searchLower])
    const myPlantCodesSet = useMemo(() => {
        if (!userPlantCode && !userAdditionalPlants.length) return null
        const codes = new Set()
        if (userPlantCode) codes.add(userPlantCode)
        userAdditionalPlants.forEach((code) => codes.add(code))
        return codes
    }, [userPlantCode, userAdditionalPlants])
    const _hasMyPlants = userAdditionalPlants.length > 0
    const districtPlantSet = useMemo(() => {
        if (!filterPlant?.startsWith('DISTRICT:')) return null
        const districtName = filterPlant.slice(9)
        const codes = new Set()
        regionPlantsWithDistricts.forEach((p) => {
            const dists = p.districts || []
            if (dists.some((d) => (typeof d === 'string' ? d : d?.name) === districtName)) {
                codes.add(p.plantCode || p.plant_code)
            }
        })
        return codes
    }, [filterPlant, regionPlantsWithDistricts])
    const visibleReviewReports = useMemo(
        () =>
            reviewableReports.filter((report) => {
                const reporterPlant = reporterPlantMap[report.userId] || ''
                const matchPlant =
                    !filterPlant ||
                    filterPlant === 'All' ||
                    (filterPlant === 'MY_PLANTS'
                        ? myPlantCodesSet?.has(reporterPlant)
                        : filterPlant.startsWith('DISTRICT:')
                          ? districtPlantSet?.has(reporterPlant)
                          : reporterPlant === filterPlant)
                const matchRegion =
                    !preferences.selectedRegion?.code ||
                    !regionPlantCodes ||
                    regionPlantCodes.has(reporterPlant) ||
                    report.name === 'general_manager'
                const matchSearch =
                    !searchLower ||
                    report.title?.toLowerCase().includes(searchLower) ||
                    report.name?.toLowerCase().includes(searchLower) ||
                    getUserName(report.userId)?.toLowerCase().includes(searchLower)
                return (
                    (!filterReportType || report.name === filterReportType) && matchPlant && matchRegion && matchSearch
                )
            }),
        [
            reviewableReports,
            filterReportType,
            filterPlant,
            preferences.selectedRegion?.code,
            regionPlantCodes,
            reporterPlantMap,
            searchLower,
            getUserName,
            myPlantCodesSet,
            districtPlantSet
        ]
    )
    const myPagination = usePagination({
        initialPageSize: 25,
        items: allMyItems,
        resetDependencies: [filterReportType, filterPlant, searchInput]
    })
    const reviewPagination = usePagination({
        initialPageSize: 25,
        items: visibleReviewReports,
        resetDependencies: [filterReportType, filterPlant, searchInput]
    })
    const visibleLostLoads = useMemo(() => {
        if (!searchLower) return lostLoadReports
        return lostLoadReports.filter(
            (r) =>
                r.data?.plant?.toLowerCase().includes(searchLower) ||
                r.data?.truck_number?.toLowerCase().includes(searchLower) ||
                r.data?.reason?.toLowerCase().includes(searchLower) ||
                getUserName(r.userId)?.toLowerCase().includes(searchLower)
        )
    }, [lostLoadReports, searchLower, getUserName])
    const lostLoadsPagination = usePagination({
        initialPageSize: 25,
        items: visibleLostLoads,
        resetDependencies: [searchInput]
    })
    const regionalPlants = useMemo(() => {
        const filtered = plants.filter(
            (p) => !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(p.plant_code)
        )
        if (!regionPlantsWithDistricts.length) return filtered
        const districtMap = {}
        regionPlantsWithDistricts.forEach((rp) => {
            const code = rp.plantCode || rp.plant_code
            if (code && rp.districts?.length) districtMap[code] = rp.districts
        })
        return filtered.map((p) => (districtMap[p.plant_code] ? { ...p, districts: districtMap[p.plant_code] } : p))
    }, [plants, preferences.selectedRegion?.code, regionPlantCodes, regionPlantsWithDistricts])
    const selectedPlantObj = regionalPlants.find((p) => p.plant_code === filterPlant)
    const plantDisplayText =
        filterPlant === 'MY_PLANTS'
            ? 'My Plants'
            : filterPlant?.startsWith('DISTRICT:')
              ? filterPlant.slice(9)
              : filterPlant
                ? `(${selectedPlantObj?.plant_code}) ${selectedPlantObj?.plant_name}`
                : 'All Plants'
    const isMyReportsLoading = isLoadingUser || isLoadingMy || isLoadingPermissions
    const isReviewLoading = isLoadingUser || isLoadingPermissions || loadingReporterPlants || isLoadingReview
    useEffect(() => {
        if (tab === 'review') loadReviewReports()
        if (tab === 'lost_loads') loadLostLoadReports()
    }, [tab, loadReviewReports, loadLostLoadReports])
    const handleSubmitReport = async (formData, completed = true) => {
        const result = await submitReport({ completed, formData, showForm })
        if (result.success) setShowForm(null)
    }
    const handleManagerEditSubmit = async (formData) => {
        const result = await submitManagerEdit({ formData, managerEditUser, showForm })
        if (result.success) {
            setShowForm(null)
            setManagerEditUser(null)
        }
    }
    const handleReview = async (report) => {
        if (report.userId !== user?.id) {
            const success = await ReportService.markReviewed(report.id, user.id)
            if (success) markReportReviewed(report.id)
        }
        setReviewData(report)
        setShowReview(reportTypes.find((rt) => rt.name === report.name))
    }
    const handleManagerEdit = (reportType, reportData) => {
        setShowReview(null)
        setReviewData(null)
        setShowForm({ ...reportType, name: reportType.name, weekIso: reportData.week || reportData.data?.week })
        setSubmitInitialData({ ...reportData, data: reportData.data })
        setManagerEditUser(reportData.userId)
    }
    const handleShowForm = async (item) => {
        setSubmitInitialData(null)
        if (user && item?.name && item.weekIso) {
            const existingData = await fetchReportForEdit({ item, userId: user.id })
            if (existingData) setSubmitInitialData(existingData)
        }
        setShowForm(item)
    }
    const handleBack = () => {
        setShowForm(null)
        setManagerEditUser(null)
    }
    const handleReviewBack = () => {
        setShowReview(null)
        setReviewData(null)
    }
    const handleFormSubmit = (form, submitType) => {
        managerEditUser ? handleManagerEditSubmit(form) : handleSubmitReport(form, submitType === 'submit')
    }
    if (showForm) {
        const report = reportTypeMap[showForm.name]
            ? { ...reportTypeMap[showForm.name], weekIso: showForm.weekIso }
            : showForm
        return (
            <div className="bg-slate-50 min-h-screen w-full pb-16">
                <ReportsSubmitView
                    report={report}
                    initialData={submitInitialData}
                    onBack={handleBack}
                    onSubmit={handleFormSubmit}
                    user={user}
                    readOnly={showReview === null && reviewData !== null}
                    managerEditUser={managerEditUser}
                    userProfiles={userProfiles}
                />
            </div>
        )
    }
    if (showReview) {
        return (
            <div className="bg-slate-50 min-h-screen w-full pb-16">
                <ReportsReviewView
                    report={reportTypeMap[showReview.name] || showReview}
                    initialData={reviewData}
                    onBack={handleReviewBack}
                    user={user}
                    completedByUser={reviewData?.userId ? userProfiles[reviewData.userId] : undefined}
                    onManagerEdit={handleManagerEdit}
                />
            </div>
        )
    }
    const isCurrentTabLoading =
        tab === 'all' ? isMyReportsLoading : tab === 'review' ? isReviewLoading : isLoadingLostLoads
    const statsContent = (() => {
        if (isCurrentTabLoading || tab === 'lost_loads') return null
        if (tab === 'all') return <ReportsStatsCards items={allMyItems} tab={tab} />
        return (
            <ReportsStatsCards items={visibleReviewReports} tab={tab} reviewedByCurrentUser={reviewedByCurrentUser} />
        )
    })()
    const statsSkeleton = (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 bg-slate-100 rounded-xl px-4 sm:px-5 py-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <React.Fragment key={i}>
                        {i > 1 && <div className="w-px h-6 sm:h-8 bg-slate-200 hidden sm:block" />}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-200" />
                            <div>
                                <div className="h-5 sm:h-6 w-6 rounded bg-slate-200 mb-1" />
                                <div className="h-2.5 sm:h-3 w-14 rounded bg-slate-200" />
                            </div>
                        </div>
                    </React.Fragment>
                ))}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-3 animate-pulse">
                <div className="w-16 sm:w-24 h-1.5 sm:h-2 rounded-full bg-slate-200" />
                <div className="h-5 sm:h-6 w-10 rounded bg-slate-200" />
            </div>
        </div>
    )
    return (
        <div className="bg-slate-50 min-h-screen w-full pb-16">
            {loadError && (
                <div className="flex items-center gap-2 m-3 sm:m-4 p-3 sm:p-4 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                    <i className="fas fa-exclamation-circle" />
                    {loadError}
                </div>
            )}
            {hasLostLoadsPermission && !bannerDismissed && (
                <div className="flex items-center gap-3 mx-3 sm:mx-4 md:mx-6 lg:mx-8 mt-3 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    <i className="fas fa-exclamation-triangle text-amber-500 shrink-0" />
                    <span className="flex-1">
                        <strong>Lost loads:</strong> You no longer need to email lost load reports to your General
                        Manager or District Manager. Instead, complete the report on{' '}
                        <button
                            onClick={() => setShowLostLoadModal(true)}
                            className="underline font-semibold hover:text-amber-900 border-none bg-transparent text-amber-800 cursor-pointer p-0 text-xs inline"
                            type="button"
                        >
                            Smyrna Tools
                        </button>
                        , write the reason on the ticket, and scan it into the O: Drive.
                    </span>
                    <button
                        onClick={() => setBannerDismissed(true)}
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-amber-200 text-amber-500"
                        type="button"
                        aria-label="Dismiss"
                    >
                        <i className="fas fa-times text-[10px]" />
                    </button>
                </div>
            )}
            <ReportsToolbar
                isLoading={isCurrentTabLoading}
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
                hasLostLoadsPermission={hasLostLoadsPermission}
                onLostLoadClick={() => setShowLostLoadModal(true)}
                regionType={regionType}
                statsContent={statsContent}
                statsSkeleton={tab !== 'lost_loads' ? statsSkeleton : null}
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onClearSearch={() => setSearchInput('')}
            />
            <div className="px-3 py-4 sm:px-4 md:px-6 lg:px-8">
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
                {tab === 'lost_loads' && (
                    <LostLoadsList
                        isLoading={isLoadingLostLoads}
                        items={lostLoadsPagination.paginatedItems}
                        pageSize={lostLoadsPagination.pageSize}
                        currentPage={lostLoadsPagination.currentPage}
                        totalPages={lostLoadsPagination.totalPages}
                        onPageSizeChange={lostLoadsPagination.changePageSize}
                        onPageChange={lostLoadsPagination.goToPage}
                        getUserName={getUserName}
                        canDelete={hasLostLoadsDeletePermission}
                        onDelete={deleteLostLoadReport}
                        onRowClick={setSelectedLostLoad}
                    />
                )}
            </div>
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
                    showMyPlants={false}
                    userPlantCode={userPlantCode}
                />
            )}
            {showLostLoadModal && (
                <LostLoadReportModal
                    onClose={() => setShowLostLoadModal(false)}
                    onSubmitted={(report) => {
                        addLostLoadReport(report)
                        if (tab !== 'lost_loads') setTab('lost_loads')
                    }}
                    plants={regionalPlants}
                    user={user}
                />
            )}
            {selectedLostLoad && (
                <LostLoadDetailModal
                    report={selectedLostLoad}
                    getUserName={getUserName}
                    onClose={() => setSelectedLostLoad(null)}
                />
            )}
        </div>
    )
}
export default ReportsView
