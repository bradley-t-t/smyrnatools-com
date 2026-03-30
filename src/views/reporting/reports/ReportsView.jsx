import React, { useCallback, useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import LostLoadDetailModal from '../../../app/components/reports/LostLoadDetailModal'
import LostLoadReportModal from '../../../app/components/reports/LostLoadReportModal'
import LostLoadsList from '../../../app/components/reports/LostLoadsList'
import MyReportsList from '../../../app/components/reports/MyReportsList'
import QCStrengthDetailModal from '../../../app/components/reports/QCStrengthDetailModal'
import QCStrengthReportModal from '../../../app/components/reports/QCStrengthReportModal'
import ReportsEmptyState from '../../../app/components/reports/ReportsEmptyState'
import ReportsStatsCards from '../../../app/components/reports/ReportsStatsCards'
import ReportsToolbar from '../../../app/components/reports/ReportsToolbar'
import ReviewReportsList from '../../../app/components/reports/ReviewReportsList'
import { usePagination } from '../../../app/hooks/usePagination'
import { useReportsData } from '../../../app/hooks/useReportsData'
import { useReportSubmission } from '../../../app/hooks/useReportSubmission'
import { reportTypeMap, reportTypes } from '../../../app/types/ReportTypes'
import { Database } from '../../../services/DatabaseService'
import { ReportService } from '../../../services/ReportService'
import { UserService } from '../../../services/UserService'
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
        hasOneOffReviewPermission,
        hasQCStrengthPermission,
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
    const [showQCStrengthModal, setShowQCStrengthModal] = useState(false)
    const [qcReports, setQcReports] = useState([])
    const [isLoadingQC, setIsLoadingQC] = useState(false)
    const [selectedQCReport, setSelectedQCReport] = useState(null)
    const [currentUserWeight, setCurrentUserWeight] = useState(0)
    const [userWeights, setUserWeights] = useState({})
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
        if (tab === 'quality') loadQCReports()
    }, [tab, loadReviewReports, loadLostLoadReports]) // eslint-disable-line react-hooks/exhaustive-deps
    const loadQCReports = useCallback(async () => {
        if (!user) return
        setIsLoadingQC(true)
        try {
            const [{ data, error }, myWeight] = await Promise.all([
                Database.from('reports')
                    .select('id,report_name,user_id,submitted_at,data,completed,week,been_reviewed')
                    .eq('report_name', 'qc_strength')
                    .eq('completed', true)
                    .order('submitted_at', { ascending: false }),
                UserService.getUserWeight(user.id)
            ])
            setCurrentUserWeight(myWeight)
            if (!error && Array.isArray(data)) {
                const mapped = data.map((r) => ({
                    id: r.id,
                    name: r.report_name,
                    userId: r.user_id,
                    data: r.data,
                    week: r.week,
                    submittedAt: r.submitted_at,
                    reviewed: r.been_reviewed
                }))
                setQcReports(mapped)
                // Fetch weights for all submitters
                const uniqueUserIds = [...new Set(mapped.map((r) => r.userId).filter(Boolean))]
                const weights = {}
                await Promise.all(
                    uniqueUserIds.map(async (uid) => {
                        weights[uid] = await UserService.getUserWeight(uid)
                    })
                )
                setUserWeights(weights)
            }
        } catch {}
        setIsLoadingQC(false)
    }, [user])
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
        tab === 'all'
            ? isMyReportsLoading
            : tab === 'review'
              ? isReviewLoading
              : tab === 'quality'
                ? isLoadingQC
                : isLoadingLostLoads
    const statsContent = (() => {
        if (isCurrentTabLoading || tab === 'lost_loads' || tab === 'quality') return null
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
                hasQCReviewPermission={hasOneOffReviewPermission?.qc_strength}
                onLostLoadClick={() => setShowLostLoadModal(true)}
                regionType={regionType}
                statsContent={statsContent}
                statsSkeleton={tab !== 'lost_loads' && tab !== 'quality' ? statsSkeleton : null}
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onClearSearch={() => setSearchInput('')}
            />
            <div className="px-3 py-4 sm:px-4 md:px-6 lg:px-8">
                {tab === 'all' && (
                    <>
                        {/* One-Off Reports section — above recurring */}
                        {(hasQCStrengthPermission || hasLostLoadsPermission) && (
                            <div className="mb-5">
                                <div className="flex items-center gap-3 mb-2 px-1">
                                    <span className="text-sm font-bold text-slate-700">One-Off Reports</span>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    {/* QC Strength Report */}
                                    {hasQCStrengthPermission && (
                                        <div
                                            className="flex items-center px-4 sm:px-5 py-3.5 cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-100"
                                            onClick={() => setShowQCStrengthModal(true)}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                                                    <i className="fas fa-flask text-white text-[10px]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium text-slate-800">
                                                        Quality Control Strength Report
                                                    </span>
                                                    <span className="text-xs text-slate-400 block">
                                                        Concrete cylinder strength testing and sample data
                                                    </span>
                                                </div>
                                            </div>
                                            <span
                                                className="text-xs font-semibold shrink-0 hidden sm:block"
                                                style={{ color: preferences.accentColor || '#1e3a5f' }}
                                            >
                                                Submit New →
                                            </span>
                                            <i className="fas fa-chevron-right text-slate-300 text-xs ml-3 sm:hidden" />
                                        </div>
                                    )}
                                    {/* Lost Load Report */}
                                    {hasLostLoadsPermission && (
                                        <>
                                            <div
                                                className="flex items-center px-4 sm:px-5 py-3.5 cursor-pointer transition-colors hover:bg-slate-50"
                                                onClick={() => setShowLostLoadModal(true)}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
                                                        <i className="fas fa-truck text-white text-[10px]" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-sm font-medium text-slate-800">
                                                            Lost Load Report
                                                        </span>
                                                        <span className="text-xs text-slate-400 block">
                                                            Report lost or spilled loads with details
                                                        </span>
                                                    </div>
                                                </div>
                                                {lostLoadReports.length > 0 && (
                                                    <span className="text-xs text-slate-400 shrink-0 mr-3">
                                                        {lostLoadReports.length} submitted
                                                    </span>
                                                )}
                                                <span
                                                    className="text-xs font-semibold shrink-0 hidden sm:block"
                                                    style={{ color: preferences.accentColor || '#1e3a5f' }}
                                                >
                                                    Submit New →
                                                </span>
                                                <i className="fas fa-chevron-right text-slate-300 text-xs ml-3 sm:hidden" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Recurring Reports */}
                        {allMyItems.length === 0 && !isMyReportsLoading ? (
                            <ReportsEmptyState
                                tab={tab}
                                hasAssigned={hasAssigned}
                                hasOneOffAccess={hasLostLoadsPermission || hasQCStrengthPermission}
                            />
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
                        )}
                    </>
                )}
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
                {tab === 'quality' && (
                    <div>
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <span className="text-sm font-bold text-slate-700">Quality Control Strength Reports</span>
                            <span className="text-xs text-slate-400">{qcReports.length} total</span>
                        </div>
                        {isLoadingQC ? (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex items-center justify-center">
                                <i className="fas fa-spinner fa-spin text-slate-400 text-lg" />
                            </div>
                        ) : qcReports.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
                                    <i className="fas fa-flask text-4xl mb-3" />
                                    <div className="text-sm">No quality reports submitted yet</div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {qcReports.map((report) => {
                                    const submittedDate = report.submittedAt
                                        ? new Date(report.submittedAt).toLocaleDateString(undefined, {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric'
                                          })
                                        : ''
                                    const d = report.data || {}
                                    return (
                                        <div
                                            key={report.id}
                                            className="flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50"
                                            onClick={() => setSelectedQCReport(report)}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                                                    <i className="fas fa-flask text-white text-[10px]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-800 truncate">
                                                            {d.project || 'QC Strength Report'}
                                                        </span>
                                                        {d.mix_id && (
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-100 text-violet-700 shrink-0">
                                                                Mix {d.mix_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                                        {d.contractor && <span>{d.contractor}</span>}
                                                        {d.sample_location && (
                                                            <>
                                                                <span className="text-slate-300 text-[8px]">●</span>
                                                                <span>{d.sample_location}</span>
                                                            </>
                                                        )}
                                                        {d.psi && (
                                                            <>
                                                                <span className="text-slate-300 text-[8px]">●</span>
                                                                <span>{d.psi} PSI</span>
                                                            </>
                                                        )}
                                                        <span className="text-slate-300 text-[8px]">●</span>
                                                        <span>{getUserName(report.userId)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {report.reviewed ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                                                    <i className="fas fa-check text-[9px]" />
                                                    Reviewed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
                                                    <i className="fas fa-flag text-[9px]" />
                                                    Pending
                                                </span>
                                            )}
                                            <span className="text-xs text-slate-400 ml-3 shrink-0 hidden sm:block">
                                                {submittedDate}
                                            </span>
                                            {currentUserWeight >= (userWeights[report.userId] || 0) && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (window.confirm('Delete this QC Strength Report?')) {
                                                            Database.from('reports')
                                                                .delete()
                                                                .eq('id', report.id)
                                                                .then(() => {
                                                                    setQcReports((prev) =>
                                                                        prev.filter((r) => r.id !== report.id)
                                                                    )
                                                                })
                                                        }
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-2"
                                                    title="Delete"
                                                >
                                                    <i className="fas fa-trash-alt text-xs" />
                                                </button>
                                            )}
                                            <i className="fas fa-chevron-right text-slate-300 text-xs ml-3" />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
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
            {showQCStrengthModal && (
                <QCStrengthReportModal
                    onClose={() => setShowQCStrengthModal(false)}
                    onSubmitted={() => triggerRefresh()}
                    user={user}
                />
            )}
            {selectedQCReport && (
                <QCStrengthDetailModal
                    report={selectedQCReport}
                    getUserName={getUserName}
                    onClose={() => setSelectedQCReport(null)}
                    onReviewed={(id) => {
                        setQcReports((prev) => prev.map((r) => (r.id === id ? { ...r, reviewed: true } : r)))
                        setSelectedQCReport(null)
                    }}
                />
            )}
        </div>
    )
}
export default ReportsView
