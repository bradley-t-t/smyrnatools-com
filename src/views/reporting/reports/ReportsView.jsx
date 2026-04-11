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
import ThirdPartyLabDetailModal from '../../../app/components/reports/ThirdPartyLabDetailModal'
import ThirdPartyLabReportModal from '../../../app/components/reports/ThirdPartyLabReportModal'
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
const _now = new Date()
const currentMonthStartIso = new Date(_now.getFullYear(), _now.getMonth(), 1).toISOString().slice(0, 10)
const currentMonthEndIso = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).toISOString().slice(0, 10)

function ReportsView() {
    const {
        addLostLoadReport,
        deleteLostLoadReport,
        fetchProfilesFor,
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
    const [showLabReportModal, setShowLabReportModal] = useState(false)
    const [qcReports, setQcReports] = useState([])
    const [isLoadingQC, setIsLoadingQC] = useState(false)
    const [qcLoaded, setQcLoaded] = useState(false)
    const [selectedQCReport, setSelectedQCReport] = useState(null)
    const [selectedLabReport, setSelectedLabReport] = useState(null)
    const [currentUserWeight, setCurrentUserWeight] = useState(0)
    const [userWeights, setUserWeights] = useState({})
    const [selectedLostLoad, setSelectedLostLoad] = useState(null)
    const [submitInitialData, setSubmitInitialData] = useState(null)
    const [filterReportType, setFilterReportType] = useState('')
    const [filterPlant, setFilterPlant] = useState('')
    const [managerEditUser, setManagerEditUser] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [qcTypeFilter, setQcTypeFilter] = useState('all')
    const [qcStatusFilter, setQcStatusFilter] = useState('all')
    const [qcSort, setQcSort] = useState('newest')
    const [qcDateFrom, setQcDateFrom] = useState(currentMonthStartIso)
    const [qcDateTo, setQcDateTo] = useState(currentMonthEndIso)
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
        return lostLoadReports.filter((r) => {
            const reportPlant = r.data?.plant || ''
            const matchPlant =
                !filterPlant ||
                filterPlant === 'All' ||
                (filterPlant === 'MY_PLANTS'
                    ? myPlantCodesSet?.has(reportPlant)
                    : filterPlant.startsWith('DISTRICT:')
                      ? districtPlantSet?.has(reportPlant)
                      : reportPlant === filterPlant)
            const matchSearch =
                !searchLower ||
                reportPlant.toLowerCase().includes(searchLower) ||
                r.data?.truck_number?.toLowerCase().includes(searchLower) ||
                r.data?.reason?.toLowerCase().includes(searchLower) ||
                getUserName(r.userId)?.toLowerCase().includes(searchLower)
            return matchPlant && matchSearch
        })
    }, [lostLoadReports, filterPlant, myPlantCodesSet, districtPlantSet, searchLower, getUserName])
    const lostLoadsPagination = usePagination({
        initialPageSize: 25,
        items: visibleLostLoads,
        resetDependencies: [filterPlant, searchInput]
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
    const loadQCReports = useCallback(async () => {
        if (!user || qcLoaded) return
        setIsLoadingQC(true)
        try {
            const { data, error } = await Database.from('reports')
                .select('id,report_name,user_id,submitted_at,data,completed,week,been_reviewed')
                .in('report_name', ['qc_strength', 'third_party_lab'])
                .eq('completed', true)
                .order('submitted_at', { ascending: false })
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
                const uniqueUserIds = [...new Set(mapped.map((r) => r.userId).filter(Boolean))]
                if (uniqueUserIds.length > 0) fetchProfilesFor(uniqueUserIds)
            }
        } catch (err) {
            console.error('Failed to load QC reports:', err)
        }
        setIsLoadingQC(false)
        setQcLoaded(true)
        // Fetch current user weight in background — doesn't block loading
        UserService.getUserWeight(user.id)
            .then(setCurrentUserWeight)
            .catch(() => {})
    }, [user, qcLoaded, fetchProfilesFor])
    useEffect(() => {
        if (tab === 'review') loadReviewReports()
        if (tab === 'lost_loads') loadLostLoadReports()
        if (tab === 'quality') loadQCReports()
    }, [tab, loadReviewReports, loadLostLoadReports, loadQCReports])
    const fetchWeightForUser = useCallback(
        async (userId) => {
            if (userWeights[userId] !== undefined) return userWeights[userId]
            const weight = await UserService.getUserWeight(userId).catch(() => 0)
            setUserWeights((prev) => ({ ...prev, [userId]: weight }))
            return weight
        },
        [userWeights]
    )
    const handleDeleteQCReport = useCallback(
        async (report) => {
            const submitterWeight = await fetchWeightForUser(report.userId)
            if (currentUserWeight < submitterWeight) return
            if (!window.confirm('Delete this QC Strength Report?')) return
            await Database.from('reports').delete().eq('id', report.id)
            setQcReports((prev) => prev.filter((r) => r.id !== report.id))
        },
        [currentUserWeight, fetchWeightForUser]
    )
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
    const qcReviewedSet = useMemo(() => new Set(qcReports.filter((r) => r.reviewed).map((r) => r.id)), [qcReports])
    const qcAsReviewItems = useMemo(
        () => qcReports.map((r) => ({ id: r.id, week: r.week, completed: true })),
        [qcReports]
    )
    const lostLoadsAsItems = useMemo(
        () =>
            (Array.isArray(lostLoadReports) ? lostLoadReports : []).map((r) => ({
                id: r.id,
                week: r.week,
                completed: true
            })),
        [lostLoadReports]
    )
    const visibleQcReports = useMemo(() => {
        let result = qcReports
        if (qcTypeFilter !== 'all') result = result.filter((r) => r.name === qcTypeFilter)
        if (qcStatusFilter === 'pending') result = result.filter((r) => !r.reviewed)
        else if (qcStatusFilter === 'reviewed') result = result.filter((r) => r.reviewed)
        if (qcDateFrom) {
            const from = new Date(qcDateFrom + 'T00:00:00')
            result = result.filter((r) => r.submittedAt && new Date(r.submittedAt) >= from)
        }
        if (qcDateTo) {
            const to = new Date(qcDateTo + 'T23:59:59')
            result = result.filter((r) => r.submittedAt && new Date(r.submittedAt) <= to)
        }
        return [...result].sort((a, b) => {
            if (qcSort === 'oldest') return new Date(a.submittedAt) - new Date(b.submittedAt)
            if (qcSort === 'cast_asc') return (a.data?.date_molded || '') < (b.data?.date_molded || '') ? -1 : 1
            if (qcSort === 'cast_desc') return (a.data?.date_molded || '') > (b.data?.date_molded || '') ? -1 : 1
            return new Date(b.submittedAt) - new Date(a.submittedAt)
        })
    }, [qcReports, qcTypeFilter, qcStatusFilter, qcSort, qcDateFrom, qcDateTo])
    const qcHasActiveFilters =
        qcTypeFilter !== 'all' ||
        qcStatusFilter !== 'all' ||
        qcSort !== 'newest' ||
        qcDateFrom !== currentMonthStartIso ||
        qcDateTo !== currentMonthEndIso
    const clearQcFilters = () => {
        setQcTypeFilter('all')
        setQcStatusFilter('all')
        setQcSort('newest')
        setQcDateFrom(currentMonthStartIso)
        setQcDateTo(currentMonthEndIso)
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
        if (isCurrentTabLoading) return null
        if (tab === 'all') return <ReportsStatsCards items={allMyItems} tab={tab} />
        if (tab === 'quality')
            return <ReportsStatsCards items={qcAsReviewItems} tab="review" reviewedByCurrentUser={qcReviewedSet} />
        if (tab === 'lost_loads') return <ReportsStatsCards items={lostLoadsAsItems} tab="all" />
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
    const pendingReviewCount = visibleReviewReports.filter((r) => !reviewedByCurrentUser.has(r.id)).length
    const pendingQcCount = qcReports.filter((r) => !r.reviewed).length

    const sideNavTabs = [
        { key: 'all', label: 'My Reports', icon: 'fa-file-alt', count: allMyItems.length || null },
        ...(hasLostLoadsPermission
            ? [{ key: 'lost_loads', label: 'Loss Reports', icon: 'fa-truck', count: lostLoadReports.length || null }]
            : []),
        ...(hasOneOffReviewPermission?.qc_strength
            ? [
                  {
                      key: 'quality',
                      label: 'Quality Reports',
                      icon: 'fa-flask',
                      count: pendingQcCount || null,
                      countAlert: pendingQcCount > 0
                  }
              ]
            : []),
        ...(hasAnyReviewPermission
            ? [
                  {
                      key: 'review',
                      label: 'Review',
                      icon: 'fa-clipboard-check',
                      count: pendingReviewCount || null,
                      countAlert: pendingReviewCount > 0
                  }
              ]
            : [])
    ]

    return (
        <div className="bg-slate-50 min-h-screen w-full pb-16">
            {loadError && (
                <div className="flex items-center gap-2 m-3 sm:m-4 p-3 sm:p-4 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                    <i className="fas fa-exclamation-circle" />
                    {loadError}
                </div>
            )}
            <ReportsToolbar
                tab={tab}
                isLoading={isCurrentTabLoading}
                filterReportType={filterReportType}
                onFilterReportTypeChange={setFilterReportType}
                plantDisplayText={plantDisplayText}
                onPlantModalOpen={() => setIsPlantModalOpen(true)}
                isRefreshing={isRefreshing}
                onRefresh={triggerRefresh}
                hasAssigned={hasAssigned}
                hasReviewPermission={hasReviewPermission}
                regionType={regionType}
                statsContent={isCurrentTabLoading ? statsSkeleton : statsContent}
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onClearSearch={() => setSearchInput('')}
                qcTypeFilter={qcTypeFilter}
                onQcTypeFilterChange={setQcTypeFilter}
                qcStatusFilter={qcStatusFilter}
                onQcStatusFilterChange={setQcStatusFilter}
                qcSort={qcSort}
                onQcSortChange={setQcSort}
                qcDateFrom={qcDateFrom}
                onQcDateFromChange={setQcDateFrom}
                qcDateTo={qcDateTo}
                onQcDateToChange={setQcDateTo}
                qcHasActiveFilters={qcHasActiveFilters}
                onClearQcFilters={clearQcFilters}
            />
            <div className="px-3 py-4 sm:px-4 md:px-6 lg:px-8">
                {/* Mobile tab strip */}
                {sideNavTabs.length > 1 && (
                    <div className="sm:hidden flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
                        {sideNavTabs.map(({ key, label, icon }) => {
                            const isActive = tab === key
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setTab(key)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                        isActive
                                            ? 'text-white shadow-sm'
                                            : 'bg-white border border-gray-200 text-slate-500 hover:text-slate-700'
                                    }`}
                                    style={isActive ? { background: preferences.accentColor || '#1e3a5f' } : {}}
                                >
                                    <i className={`fas ${icon} text-[10px]`} />
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className="px-3 sm:px-4 md:px-6 lg:px-8 pb-4 flex gap-5 items-start">
                {/* Desktop side nav */}
                {sideNavTabs.length > 1 && (
                    <aside className="hidden sm:block w-52 shrink-0 sticky top-24">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {sideNavTabs.map(({ key, label, icon, count, countAlert }) => {
                                const isActive = tab === key
                                const accent = preferences.accentColor || '#1e3a5f'
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setTab(key)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50"
                                        style={isActive ? { backgroundColor: `${accent}12` } : {}}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                            style={
                                                isActive
                                                    ? { backgroundColor: accent, color: '#fff' }
                                                    : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
                                            }
                                        >
                                            <i className={`fas ${icon} text-[11px]`} />
                                        </div>
                                        <span
                                            className={`flex-1 font-medium truncate ${isActive ? 'font-semibold' : 'text-slate-600'}`}
                                            style={isActive ? { color: accent } : {}}
                                        >
                                            {label}
                                        </span>
                                        {count != null && (
                                            <span
                                                className={`text-[11px] font-semibold shrink-0 ${countAlert ? 'text-amber-500' : 'text-slate-400'}`}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </aside>
                )}
                <div className="flex-1 min-w-0">
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
                                        {/* Third Party Lab Report */}
                                        {hasQCStrengthPermission && (
                                            <div
                                                className="flex items-center px-4 sm:px-5 py-3.5 cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-100"
                                                onClick={() => setShowLabReportModal(true)}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
                                                        <i className="fas fa-vial text-white text-[10px]" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-sm font-medium text-slate-800">
                                                            Third Party Lab Report
                                                        </span>
                                                        <span className="text-xs text-slate-400 block">
                                                            Report issues with third party lab results
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
                            {isLoadingQC ? (
                                <div className="mb-5">
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="h-4 w-44 rounded bg-slate-200 animate-pulse mb-1.5" />
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
                                                        <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                                                        <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
                                                    </div>
                                                </div>
                                                <div className="h-6 w-16 rounded bg-slate-200 animate-pulse shrink-0" />
                                                <div className="h-7 w-14 rounded bg-slate-200 animate-pulse shrink-0 hidden sm:block" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : qcReports.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
                                        <i className="fas fa-flask text-4xl mb-3" />
                                        <div className="text-sm">No quality reports submitted yet</div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        <span className="text-sm font-bold text-slate-700">Quality Reports</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-slate-600 bg-slate-100">
                                            {qcHasActiveFilters
                                                ? `${visibleQcReports.length} of ${qcReports.length}`
                                                : `${qcReports.length} submitted`}
                                        </span>
                                    </div>
                                    {visibleQcReports.length === 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="flex flex-col items-center justify-center py-10 px-4 text-slate-400">
                                                <i className="fas fa-filter text-3xl mb-2" />
                                                <div className="text-sm">No reports match your filters</div>
                                            </div>
                                        </div>
                                    )}
                                    {visibleQcReports.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            {visibleQcReports.map((report) => {
                                                const submittedLabel = report.submittedAt
                                                    ? new Date(report.submittedAt).toLocaleDateString(undefined, {
                                                          month: 'short',
                                                          day: 'numeric'
                                                      })
                                                    : ''
                                                const submitterName = getUserName(report.userId) || 'Unknown'
                                                const initials = submitterName
                                                    .split(' ')
                                                    .map((w) => w[0])
                                                    .join('')
                                                    .slice(0, 2)
                                                    .toUpperCase()
                                                const d = report.data || {}
                                                const isLabReport = report.name === 'third_party_lab'
                                                const meaningfulStr = (val) =>
                                                    val && typeof val === 'string' && val.trim() && val.trim() !== 'N/A'
                                                        ? val.trim()
                                                        : null
                                                const title = isLabReport
                                                    ? meaningfulStr(d.lab_company_name) || 'Third Party Lab Report'
                                                    : meaningfulStr(d.contractor) ||
                                                      meaningfulStr(d.project) ||
                                                      'QC Strength Report'
                                                const iconClass = isLabReport ? 'fa-vial' : 'fa-flask'
                                                const iconBg = isLabReport ? 'bg-rose-600' : 'bg-violet-600'
                                                return (
                                                    <div
                                                        key={report.id}
                                                        className="flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50"
                                                        onClick={() =>
                                                            isLabReport
                                                                ? setSelectedLabReport(report)
                                                                : setSelectedQCReport(report)
                                                        }
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div
                                                                className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}
                                                            >
                                                                <i
                                                                    className={`fas ${iconClass} text-white text-[10px]`}
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-sm font-medium text-slate-800 block truncate">
                                                                    {title}
                                                                </span>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div
                                                                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                                            style={{
                                                                                background: `${preferences.accentColor || '#1e3a5f'}20`,
                                                                                color:
                                                                                    preferences.accentColor || '#1e3a5f'
                                                                            }}
                                                                        >
                                                                            <span className="text-[8px] font-bold">
                                                                                {initials}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-slate-500 truncate">
                                                                            {submitterName}
                                                                        </span>
                                                                    </div>
                                                                    {submittedLabel && (
                                                                        <>
                                                                            <span className="text-slate-300 text-[8px]">
                                                                                ●
                                                                            </span>
                                                                            <span className="text-xs text-slate-400">
                                                                                {submittedLabel}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {isLabReport && d.customer && (
                                                                        <>
                                                                            <span className="text-slate-300 text-[8px]">
                                                                                ●
                                                                            </span>
                                                                            <span className="text-xs text-slate-400">
                                                                                {d.customer}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {!isLabReport && d.mix_id && (
                                                                        <>
                                                                            <span className="text-slate-300 text-[8px]">
                                                                                ●
                                                                            </span>
                                                                            <span className="text-xs text-slate-400">
                                                                                Mix {d.mix_id}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {!isLabReport && meaningfulStr(d.contractor) && (
                                                                        <>
                                                                            <span className="text-slate-300 text-[8px]">
                                                                                ●
                                                                            </span>
                                                                            <span className="text-xs text-slate-400 truncate">
                                                                                {meaningfulStr(d.contractor)}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {!isLabReport && d.date_molded && (
                                                                        <>
                                                                            <span className="text-slate-300 text-[8px]">
                                                                                ●
                                                                            </span>
                                                                            <span className="text-xs text-slate-400">
                                                                                Cast{' '}
                                                                                {new Date(
                                                                                    d.date_molded + 'T00:00:00'
                                                                                ).toLocaleDateString(undefined, {
                                                                                    month: 'short',
                                                                                    day: 'numeric'
                                                                                })}
                                                                            </span>
                                                                        </>
                                                                    )}
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
                                                        <button
                                                            className="ml-3 px-3 py-1.5 rounded-md text-white text-xs font-semibold shrink-0 hidden sm:block"
                                                            style={{ background: preferences.accentColor || '#1e3a5f' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                isLabReport
                                                                    ? setSelectedLabReport(report)
                                                                    : setSelectedQCReport(report)
                                                            }}
                                                        >
                                                            {report.reviewed ? 'View' : 'Review'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteQCReport(report)
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-2 hidden sm:flex"
                                                            title="Delete"
                                                        >
                                                            <i className="fas fa-trash-alt text-xs" />
                                                        </button>
                                                        <i className="fas fa-chevron-right text-slate-300 text-xs ml-3 sm:hidden" />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>{' '}
                {/* end flex-1 content */}
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
            {selectedLabReport && (
                <ThirdPartyLabDetailModal
                    report={selectedLabReport}
                    getUserName={getUserName}
                    onClose={() => setSelectedLabReport(null)}
                    onReviewed={(id) => {
                        setQcReports((prev) => prev.map((r) => (r.id === id ? { ...r, reviewed: true } : r)))
                        setSelectedLabReport(null)
                    }}
                />
            )}
            {showLabReportModal && (
                <ThirdPartyLabReportModal
                    onClose={() => setShowLabReportModal(false)}
                    onSubmitted={() => {
                        setQcLoaded(false)
                        if (tab === 'quality') loadQCReports()
                    }}
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
