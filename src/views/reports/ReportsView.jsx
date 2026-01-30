import React, { useEffect, useMemo, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import LoadingScreen from '../../components/common/LoadingScreen'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import TopSection from '../../components/sections/TopSection'
import { supabase } from '../../services/DatabaseService'
import { RegionService } from '../../services/RegionService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'
import { reportTypeMap, reportTypes } from '../../types/ReportTypes'
import { ReportUtility } from '../../utils/ReportUtility'
import ReportsReviewView from './ReportsReviewView'
import ReportsSubmitView from './ReportsSubmitView'

const HARDCODED_TODAY = new Date()
const REPORTS_START_DATE = new Date('2025-07-20')
const totalMyWeeks = ReportUtility.getTotalWeeksSince(REPORTS_START_DATE, HARDCODED_TODAY)

function ReportsView() {
    const [localReports, setLocalReports] = useState([])
    const [showForm, setShowForm] = useState(null)
    const [showReview, setShowReview] = useState(null)
    const [reviewData, setReviewData] = useState(null)
    const [tab, setTab] = useState('all')
    const [loadError, setLoadError] = useState('')
    const [user, setUser] = useState(null)
    const [userProfiles, setUserProfiles] = useState({})
    const [hasAssigned, setHasAssigned] = useState({})
    const [hasReviewPermission, setHasReviewPermission] = useState({})
    const [submitInitialData, setSubmitInitialData] = useState(null)
    const [plants, setPlants] = useState([])
    const [filterReportType, setFilterReportType] = useState('')
    const [filterPlant, setFilterPlant] = useState('')
    const [managerEditUser, setManagerEditUser] = useState(null)
    const [regionType, setRegionType] = useState(null)
    const [isLoadingUser, setIsLoadingUser] = useState(true)
    const [isLoadingMy, setIsLoadingMy] = useState(true)
    const [isLoadingReview, setIsLoadingReview] = useState(true)
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)
    const [reviewLoadedWeeks, setReviewLoadedWeeks] = useState(new Set())
    const { preferences } = usePreferences()
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [reporterPlantMap, setReporterPlantMap] = useState({})
    const [loadingReporterPlants, setLoadingReporterPlants] = useState(false)
    const [hasAnyReviewPermissionPrefix, setHasAnyReviewPermissionPrefix] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [myPageSize, setMyPageSize] = useState(25)
    const [myCurrentPage, setMyCurrentPage] = useState(1)
    const [reviewPageSize, setReviewPageSize] = useState(25)
    const [reviewCurrentPage, setReviewCurrentPage] = useState(1)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [reviewedByCurrentUser, setReviewedByCurrentUser] = useState(new Set())

    const styles = {
        actionBtn: {
            background: '#1e3a5f',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            transition: 'all 0.2s'
        },
        badge: (type) => {
            const colors = {
                'Last Week': { bg: '#fef3c7', color: '#92400e' },
                Older: { bg: '#f1f5f9', color: '#64748b' },
                'This Week': { bg: '#dbeafe', color: '#1e40af' }
            }
            const c = colors[type] || colors['Older']
            return {
                background: c.bg,
                borderRadius: '6px',
                color: c.color,
                display: 'inline-flex',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.3px',
                marginRight: '0.5rem',
                padding: '0.25rem 0.5rem',
                textTransform: 'uppercase'
            }
        },
        content: {
            padding: '1.5rem'
        },
        empty: {
            alignItems: 'center',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            fontSize: '1rem',
            gap: '1rem',
            justifyContent: 'center',
            padding: '4rem 2rem'
        },
        emptyIcon: {
            color: '#cbd5e1',
            fontSize: '3rem'
        },
        filters: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.75rem'
        },
        headerRow: {
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            color: '#64748b',
            display: 'grid',
            fontSize: '0.75rem',
            fontWeight: 600,
            gap: '1rem',
            letterSpacing: '0.5px',
            padding: '0.875rem 1.25rem',
            textTransform: 'uppercase'
        },
        headerRowMy: {
            gridTemplateColumns: '1fr 1fr 120px 120px 100px'
        },
        headerRowReview: {
            gridTemplateColumns: '1fr 1fr 1fr 120px 120px 100px'
        },
        list: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden'
        },
        loadError: {
            alignItems: 'center',
            background: '#fee2e2',
            borderRadius: '8px',
            color: '#dc2626',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 500,
            gap: '0.5rem',
            margin: '1rem',
            padding: '1rem'
        },
        loading: {
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'center',
            padding: '3rem'
        },
        pageBtn: (disabled) => ({
            background: disabled ? '#f1f5f9' : 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            color: disabled ? '#94a3b8' : '#374151',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '0.5rem 1rem',
            transition: 'all 0.2s'
        }),
        pageControls: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.75rem'
        },
        pageInfo: {
            color: '#64748b',
            fontSize: '0.875rem'
        },
        pageSize: {
            alignItems: 'center',
            color: '#64748b',
            display: 'flex',
            fontSize: '0.875rem',
            gap: '0.5rem'
        },
        pageSizeSelect: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            padding: '0.375rem 0.75rem'
        },
        pagination: {
            alignItems: 'center',
            background: '#fafafa',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem'
        },
        refreshBtn: {
            alignItems: 'center',
            background: '#1e3a5f',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '13px',
            fontWeight: 600,
            gap: '6px',
            padding: '10px 16px',
            transition: 'all 0.15s ease'
        },
        reviewedCheck: {
            color: '#10b981',
            marginRight: '0.375rem'
        },
        reviewedFlag: {
            color: '#f59e0b',
            marginRight: '0.375rem'
        },
        root: {
            background: '#f8fafc',
            minHeight: '100vh',
            padding: '0',
            paddingBottom: '4rem',
            width: '100%'
        },
        selectControl: {
            MozAppearance: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            backgroundColor: 'white',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundPosition: 'right 10px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            minWidth: '140px',
            outline: 'none',
            padding: '10px 36px 10px 14px',
            transition: 'all 0.15s'
        },
        status: (type) => {
            const colors = {
                error: { bg: '#fee2e2', color: '#dc2626' },
                info: { bg: '#dbeafe', color: '#1e40af' },
                success: { bg: '#d1fae5', color: '#059669' },
                warning: { bg: '#fef3c7', color: '#d97706' }
            }
            const c = colors[type] || colors.error
            return {
                alignItems: 'center',
                background: c.bg,
                borderRadius: '6px',
                color: c.color,
                display: 'inline-flex',
                fontSize: '0.8125rem',
                fontWeight: 600,
                gap: '0.375rem',
                padding: '0.375rem 0.75rem'
            }
        },
        tab: (active) => ({
            background: active ? '#1e3a5f' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: active ? 'white' : '#64748b',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: active ? 600 : 500,
            padding: '8px 14px',
            transition: 'all 0.2s'
        }),
        tableCell: {
            padding: '0 8px'
        },
        tableCellFixed100: {
            flexShrink: 0,
            padding: '0 8px',
            textAlign: 'right',
            width: '100px'
        },
        tableCellFixed120: {
            flexShrink: 0,
            padding: '0 8px',
            width: '120px'
        },
        tableCellFlex: {
            flex: 1,
            minWidth: 0,
            padding: '0 8px'
        },
        tableRow: {
            alignItems: 'center',
            borderBottom: '1px solid #f1f5f9',
            color: '#1e293b',
            display: 'flex',
            fontSize: '0.9375rem',
            padding: '12px 28px',
            transition: 'background 0.15s'
        },
        tableRowMy: {},
        tableRowReview: {},
        tabs: {
            background: '#f1f5f9',
            borderRadius: '8px',
            display: 'flex',
            gap: '3px',
            padding: '3px'
        },
        toolbar: {
            alignItems: 'center',
            background: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 40
        },
        toolbarLeft: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.75rem'
        },
        toolbarRight: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem'
        },
        toolbarTitle: {
            alignItems: 'center',
            color: '#1e293b',
            display: 'flex',
            fontSize: '1.5rem',
            fontWeight: 700,
            gap: '0.75rem'
        }
    }

    async function fetchProfilesFor(userIds) {
        const missing = userIds.filter((id) => !userProfiles[id])
        if (missing.length === 0) return
        const { data: profiles, error } = await supabase
            .from('users_profiles')
            .select('id, first_name, last_name')
            .in('id', missing)
        if (!error && Array.isArray(profiles)) {
            setUserProfiles((prev) => ({
                ...prev,
                ...profiles.reduce((map, p) => ({ ...map, [p.id]: p }), {})
            }))
        }
    }

    async function fetchReportsBatch({ weeks, scope }) {
        if (!user || !Array.isArray(weeks) || weeks.length === 0) return
        const isoList = weeks.map((w) => new Date(w).toISOString())
        let query = supabase
            .from('reports')
            .select(
                'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
            )
            .in('week', isoList)
        if (scope === 'my') {
            const allowedMy =
                regionType === 'office'
                    ? hasAssigned['general_manager']
                        ? ['general_manager']
                        : []
                    : reportTypes.filter((rt) => hasAssigned[rt.name]).map((rt) => rt.name)
            query = query.eq('user_id', user.id)
            if (allowedMy.length > 0) query = query.in('report_name', allowedMy)
        } else if (scope === 'review') {
            const allowedReview =
                regionType === 'office'
                    ? hasReviewPermission['general_manager']
                        ? ['general_manager']
                        : []
                    : reportTypes
                          .filter((rt) => hasReviewPermission[rt.name] && rt.name !== 'general_manager')
                          .map((rt) => rt.name)
            query = query.neq('user_id', user.id).eq('completed', true)
            if (allowedReview.length > 0) query = query.in('report_name', allowedReview)
        }
        const { data, error } = await query
        if (error) {
            setLoadError(error.message || 'Error fetching reports')
            return
        }
        if (!Array.isArray(data)) return

        const reportIds = data.map((r) => r.id).filter((id) => id != null)
        if (reportIds.length > 0 && scope === 'review' && user?.id) {
            const { data: reviewedData } = await supabase
                .from('reports_reviewed')
                .select('report_id')
                .in('report_id', reportIds)
                .eq('reviewed_by_user_id', user.id)

            if (reviewedData && Array.isArray(reviewedData)) {
                const reviewedSet = new Set(reviewedData.map((r) => r.report_id))
                setReviewedByCurrentUser((prev) => {
                    const newSet = new Set(prev)
                    reviewedSet.forEach((id) => newSet.add(id))
                    return newSet
                })
            }
        }

        setLocalReports((prev) => {
            const existingIds = new Set(prev.map((r) => r.id))
            const mapped = data
                .filter((r) => !existingIds.has(r.id))
                .map((r) => ({
                    completed: !!r.completed,
                    completedDate: r.submitted_at,
                    data: r.data,
                    id: r.id,
                    name: r.report_name,
                    report_date_range_end: r.report_date_range_end ? new Date(r.report_date_range_end) : null,
                    report_date_range_start: r.report_date_range_start ? new Date(r.report_date_range_start) : null,
                    title: (reportTypeMap[r.report_name] || {}).title || r.report_name,
                    userId: r.user_id,
                    week: r.week || r.data?.week || null
                }))
            return [...prev, ...mapped]
        })
        const ids = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean)))
        await fetchProfilesFor(ids)
    }

    useEffect(() => {
        async function init() {
            setIsLoadingUser(true)
            try {
                const u = await UserService.getCurrentUser()
                setUser(u && typeof u.id === 'string' ? u : null)
            } catch (err) {
                setLoadError(err?.message || 'Error fetching user')
                setUser(null)
            } finally {
                setIsLoadingUser(false)
            }
        }

        init()
    }, [])

    useEffect(() => {
        async function checkAssignedAndReview() {
            if (!user?.id) {
                setHasAssigned({})
                setHasReviewPermission({})
                setIsLoadingPermissions(false)
                return
            }
            setIsLoadingPermissions(true)
            const assigned = {}
            const review = {}
            await Promise.all(
                reportTypes.map(async (rt) => {
                    assigned[rt.name] = await UserService.hasAnyPermission(user.id, rt.assignment)
                    review[rt.name] = (
                        await Promise.all(rt.review.map((perm) => UserService.hasPermission(user.id, perm)))
                    ).some(Boolean)
                })
            )
            setHasAssigned(assigned)
            setHasReviewPermission(review)
            setIsLoadingPermissions(false)
        }

        checkAssignedAndReview()
    }, [user?.id])

    useEffect(() => {
        if (isLoadingPermissions) return
        const allowedReviewTypes =
            regionType === 'office'
                ? hasReviewPermission['general_manager']
                    ? ['general_manager']
                    : []
                : reportTypes
                      .filter((rt) => hasReviewPermission[rt.name] && rt.name !== 'general_manager')
                      .map((rt) => rt.name)
        setHasAnyReviewPermissionPrefix(allowedReviewTypes.length > 0)
    }, [hasReviewPermission, regionType, isLoadingPermissions])

    useEffect(() => {
        async function fetchPlants() {
            const { data, error } = await supabase
                .from('plants')
                .select('plant_code,plant_name')
                .order('plant_code', { ascending: true })
            setPlants(!error && Array.isArray(data) ? data.filter((p) => p.plant_code && p.plant_name) : [])
        }

        fetchPlants()
    }, [])

    useEffect(() => {
        if (!user || isLoadingPermissions) return
        const initialMyWeeks = ReportUtility.getLastNWeekIsos(totalMyWeeks, HARDCODED_TODAY)

        async function loadInitial() {
            setIsLoadingMy(true)
            await fetchReportsBatch({ scope: 'my', weeks: initialMyWeeks })
            setIsLoadingMy(false)
        }

        loadInitial()
    }, [user?.id, isLoadingPermissions, hasAssigned, regionType, refreshKey])

    useEffect(() => {
        if (!user || isLoadingPermissions || tab !== 'review') return
        const desiredWeeks = new Set(ReportUtility.getLastNWeekIsos(52, HARDCODED_TODAY))
        const toLoad = Array.from(desiredWeeks).filter((w) => !reviewLoadedWeeks.has(w))
        if (toLoad.length === 0) {
            if (isLoadingReview) setIsLoadingReview(false)
            return
        }
        let cancelled = false

        async function loadReview() {
            setIsLoadingReview(true)
            await fetchReportsBatch({ scope: 'review', weeks: toLoad })
            if (!cancelled) setReviewLoadedWeeks((prev) => new Set([...toLoad, ...prev]))
            setIsLoadingReview(false)
        }

        loadReview()
        return () => {
            cancelled = true
        }
    }, [tab, user?.id, isLoadingPermissions, regionType, refreshKey])

    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false

        async function loadRegion() {
            if (!code) {
                setRegionPlantCodes(null)
                setRegionType(null)
                return
            }
            try {
                const region = await RegionService.fetchRegionByCode(code)
                setRegionType(region?.type || null)
                const list = await RegionService.fetchRegionPlants(code)
                if (cancelled) return
                setRegionPlantCodes(new Set(list.map((p) => p.plantCode)))
                if (filterPlant && !regionPlantCodes?.has(filterPlant)) setFilterPlant('')
            } catch {
                setRegionPlantCodes(new Set())
                setRegionType(null)
            }
        }

        loadRegion()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, filterPlant])

    useEffect(() => {
        const ids = Array.from(
            new Set([
                ...localReports.filter((r) => r.completed && r.userId && r.userId !== user?.id).map((r) => r.userId)
            ])
        ).filter((id) => !(id in reporterPlantMap))
        if (ids.length === 0) return
        let cancelled = false

        async function loadReporterPlants() {
            setLoadingReporterPlants(true)
            try {
                const entries = await Promise.all(
                    ids.map(async (id) => [
                        id,
                        await Promise.race([
                            UserService.getUserPlant(id),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                        ]).catch(() => '')
                    ])
                )
                if (!cancelled) {
                    setReporterPlantMap((prev) => ({
                        ...prev,
                        ...Object.fromEntries(entries)
                    }))
                }
            } finally {
                if (!cancelled) setLoadingReporterPlants(false)
            }
        }

        loadReporterPlants()
        return () => {
            cancelled = true
        }
    }, [localReports, user?.id])

    useEffect(() => {
        const interval = setInterval(() => setRefreshKey((prev) => prev + 1), 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        setMyCurrentPage(1)
    }, [filterReportType, filterPlant])

    useEffect(() => {
        setReviewCurrentPage(1)
    }, [filterReportType, filterPlant])

    const weeksToShow = useMemo(() => ReportUtility.getLastNWeekIsos(totalMyWeeks, HARDCODED_TODAY), [totalMyWeeks])

    const myReportsByWeek = useMemo(() => {
        const grouped = {}
        weeksToShow.forEach((weekIso) => {
            reportTypes.forEach((rt) => {
                if (!user || !hasAssigned[rt.name] || (regionType === 'office' && rt.name !== 'general_manager')) return
                const existing = localReports.find(
                    (r) =>
                        r.name === rt.name &&
                        r.userId === user.id &&
                        r.week &&
                        new Date(r.week).toISOString().slice(0, 10) === weekIso
                )
                grouped[weekIso] = grouped[weekIso] || []
                grouped[weekIso].push({
                    ...rt,
                    completed: !!(existing && existing.completed),
                    report: existing || null,
                    weekIso
                })
            })
        })
        return grouped
    }, [weeksToShow, user?.id, hasAssigned, localReports, regionType])

    const reviewableReports = useMemo(
        () =>
            localReports
                .filter(
                    (r) =>
                        r.completed &&
                        r.week &&
                        r.userId &&
                        r.userId !== user?.id &&
                        hasReviewPermission[r.name] &&
                        (regionType !== 'office' || r.name === 'general_manager')
                )
                .sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime()),
        [localReports, hasReviewPermission, user?.id, regionType]
    )

    const reviewReportsByWeek = useMemo(() => {
        const grouped = {}
        reviewableReports.forEach((report) => {
            const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : ''
            grouped[weekIso] = grouped[weekIso] || []
            grouped[weekIso].push(report)
        })
        return grouped
    }, [reviewableReports])

    const sortedReviewWeeks = useMemo(
        () => Object.keys(reviewReportsByWeek).sort((a, b) => new Date(b) - new Date(a)),
        [reviewReportsByWeek]
    )

    function getUserName(userId) {
        const profile = userProfiles[userId]
        return profile && (profile.first_name || profile.last_name)
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : typeof userId === 'string' && userId.length > 0
              ? userId.slice(0, 8)
              : ''
    }

    async function handleSubmitReport(formData, completed = true) {
        if (!showForm || !user?.id) {
            setLoadError('User not found')
            return
        }
        const { weekIso, name: reportName } = showForm
        const userId = user.id
        const monday = weekIso ? new Date(weekIso) : null
        const saturday = monday ? new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000) : null
        const upsertData = {
            completed: completed === true,
            data: { ...formData, week: weekIso },
            report_date_range_end: saturday?.toISOString() || null,
            report_date_range_start: monday?.toISOString() || null,
            report_name: reportName,
            submitted_at: completed ? new Date().toISOString() : null,
            user_id: userId,
            week: monday?.toISOString() || null
        }
        const { data: existing, error: findError } = await supabase
            .from('reports')
            .select('id')
            .eq('report_name', reportName)
            .eq('user_id', userId)
            .eq('week', monday?.toISOString() || null)
            .maybeSingle()
        if (findError) {
            setLoadError(findError.message || 'Error checking for existing report')
            return
        }
        const response = existing?.id
            ? await supabase
                  .from('reports')
                  .update(upsertData)
                  .eq('id', existing.id)
                  .select(
                      'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
                  )
                  .single()
            : await supabase
                  .from('reports')
                  .insert([upsertData])
                  .select(
                      'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
                  )
                  .single()
        const { data, error } = response
        if (error) {
            setLoadError(error.message || 'Error submitting report')
            return
        }
        if (data?.id) {
            setLocalReports((prev) => [
                ...prev.filter((r) => r.id !== data.id),
                {
                    completed: !!data.completed,
                    completedDate: data.submitted_at,
                    data: data.data,
                    id: data.id,
                    name: data.report_name,
                    report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : saturday,
                    report_date_range_start: data.report_date_range_start
                        ? new Date(data.report_date_range_start)
                        : monday,
                    title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
                    userId: data.user_id,
                    week: data.week || data.data?.week || weekIso
                }
            ])
            setShowForm(null)
        }
    }

    async function handleManagerEditSubmit(formData) {
        if (!showForm || !managerEditUser) {
            setLoadError('No user selected for manager edit')
            return
        }
        const { weekIso, name: reportName } = showForm
        const userId = managerEditUser
        const monday = weekIso ? new Date(weekIso) : null
        const saturday = monday ? new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000) : null
        const upsertData = {
            completed: true,
            data: { ...formData, week: weekIso },
            report_date_range_end: saturday?.toISOString() || null,
            report_date_range_start: monday?.toISOString() || null,
            report_name: reportName,
            submitted_at: new Date().toISOString(),
            user_id: userId,
            week: monday?.toISOString() || null
        }
        const { data: existing, error: findError } = await supabase
            .from('reports')
            .select('id')
            .eq('report_name', reportName)
            .eq('user_id', userId)
            .eq('week', monday?.toISOString() || null)
            .maybeSingle()
        if (findError) {
            setLoadError(findError.message || 'Error checking for existing report')
            return
        }
        const response = existing?.id
            ? await supabase
                  .from('reports')
                  .update(upsertData)
                  .eq('id', existing.id)
                  .select(
                      'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
                  )
                  .single()
            : await supabase
                  .from('reports')
                  .insert([upsertData])
                  .select(
                      'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
                  )
                  .single()
        const { data, error } = response
        if (error) {
            setLoadError(error.message || 'Error submitting report')
            return
        }
        if (data?.id) {
            setLocalReports((prev) => [
                ...prev.filter((r) => r.id !== data.id),
                {
                    completed: !!data.completed,
                    completedDate: data.submitted_at,
                    data: data.data,
                    id: data.id,
                    name: data.report_name,
                    report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : saturday,
                    report_date_range_start: data.report_date_range_start
                        ? new Date(data.report_date_range_start)
                        : monday,
                    title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
                    userId: data.user_id,
                    week: data.week || data.data?.week || weekIso
                }
            ])
            setShowForm(null)
            setManagerEditUser(null)
            window.dispatchEvent(new CustomEvent('notifications-refresh'))
        }
    }

    async function handleReview(report) {
        if (report.userId !== user?.id) {
            const { error } = await supabase.from('reports_reviewed').upsert(
                {
                    report_id: report.id,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by_user_id: user.id
                },
                {
                    onConflict: 'report_id,reviewed_by_user_id'
                }
            )
            if (!error) {
                setReviewedByCurrentUser((prev) => {
                    const newSet = new Set(prev)
                    newSet.add(report.id)
                    return newSet
                })
            }
        }
        setReviewData(report)
        setShowReview(reportTypes.find((rt) => rt.name === report.name))
    }

    function handleManagerEdit(reportType, reportData) {
        setShowReview(null)
        setReviewData(null)
        setShowForm({
            ...reportType,
            name: reportType.name,
            weekIso: reportData.week || reportData.data?.week
        })
        setSubmitInitialData({
            ...reportData,
            data: reportData.data
        })
        setManagerEditUser(reportData.userId)
    }

    async function handleShowForm(item) {
        setSubmitInitialData(null)
        if (!user || !item?.name || !item.weekIso) {
            setShowForm(item)
            return
        }
        const { data, error } = await supabase
            .from('reports')
            .select(
                'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
            )
            .eq('report_name', item.name)
            .eq('user_id', user.id)
            .eq('week', new Date(item.weekIso).toISOString())
            .maybeSingle()
        if (!error && data) {
            setSubmitInitialData({
                completed: !!data.completed,
                completedDate: data.submitted_at,
                data: data.data,
                id: data.id,
                name: data.report_name,
                report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : null,
                report_date_range_start: data.report_date_range_start ? new Date(data.report_date_range_start) : null,
                title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
                userId: data.user_id,
                week: data.week || data.data?.week || item.weekIso
            })
        }
        setShowForm(item)
    }

    const visibleReviewReports = useMemo(() =>
        reviewableReports.filter(
            (report) => {
                const reporterPlant = reporterPlantMap[report.userId] || ''
                const matchPlant = !filterPlant || reporterPlant === filterPlant
                const matchRegion =
                    !preferences.selectedRegion?.code ||
                    !regionPlantCodes ||
                    regionPlantCodes.has(reporterPlant) ||
                    report.name === 'general_manager'
                return (!filterReportType || report.name === filterReportType) && matchPlant && matchRegion
            },
            [
                reviewableReports,
                filterReportType,
                filterPlant,
                preferences.selectedRegion?.code,
                regionPlantCodes,
                reporterPlantMap
            ]
        )
    )

    const allMyItems = useMemo(() => Object.values(myReportsByWeek).flat(), [myReportsByWeek])
    const myTotalPages = useMemo(() => Math.ceil(allMyItems.length / myPageSize), [allMyItems.length, myPageSize])
    const myPaginatedItems = useMemo(
        () => allMyItems.slice((myCurrentPage - 1) * myPageSize, myCurrentPage * myPageSize),
        [allMyItems, myCurrentPage, myPageSize]
    )

    const reviewTotalPages = useMemo(
        () => Math.ceil(visibleReviewReports.length / reviewPageSize),
        [visibleReviewReports.length, reviewPageSize]
    )
    const reviewPaginatedItems = useMemo(
        () => visibleReviewReports.slice((reviewCurrentPage - 1) * reviewPageSize, reviewCurrentPage * reviewPageSize),
        [visibleReviewReports, reviewCurrentPage, reviewPageSize]
    )

    const regionalPlants = plants.filter(
        (p) => !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(p.plant_code)
    )
    const selectedPlantObj = regionalPlants.find((p) => p.plant_code === filterPlant)
    const plantDisplayText = filterPlant
        ? `(${selectedPlantObj?.plant_code}) ${selectedPlantObj?.plant_name}`
        : 'All Plants'

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
                        <TopSection
                            title="Reports"
                            hideViewModeToggle={true}
                            hidePlantFilter={true}
                            sticky={true}
                            viewMode="list"
                            listLabels={
                                tab === 'review'
                                    ? ['Week', 'Report Type', 'Submitted By', 'Submitted', 'Status', 'Actions']
                                    : ['Week', 'Report Type', 'Status', 'Due Date', 'Actions']
                            }
                            colWidths={
                                tab === 'review'
                                    ? ['auto', 'auto', 'auto', '120px', '120px', '100px']
                                    : ['auto', 'auto', '120px', '120px', '100px']
                            }
                            customFilters={
                                <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                    <button
                                        style={styles.refreshBtn}
                                        onClick={() => {
                                            setIsRefreshing(true)
                                            setRefreshKey((prev) => prev + 1)
                                            setTimeout(() => setIsRefreshing(false), 1000)
                                        }}
                                        type="button"
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#162d4a')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = '#1e3a5f')}
                                    >
                                        <i className={`fas fa-sync ${isRefreshing ? 'fa-spin' : ''}`}></i> Refresh
                                    </button>
                                    <select
                                        value={filterReportType}
                                        onChange={(e) => setFilterReportType(e.target.value)}
                                        style={styles.selectControl}
                                    >
                                        <option value="">All Report Types</option>
                                        {reportTypes
                                            .filter(
                                                (rt) =>
                                                    (tab === 'all'
                                                        ? hasAssigned[rt.name]
                                                        : hasReviewPermission[rt.name]) &&
                                                    (regionType !== 'office' || rt.name === 'general_manager')
                                            )
                                            .map((rt) => (
                                                <option key={rt.name} value={rt.name}>
                                                    {rt.title}
                                                </option>
                                            ))}
                                    </select>
                                    <button
                                        style={styles.selectControl}
                                        onClick={() => setIsPlantModalOpen(true)}
                                        type="button"
                                    >
                                        {plantDisplayText}
                                    </button>
                                    <div style={styles.tabs}>
                                        <button
                                            style={styles.tab(tab === 'all')}
                                            onClick={() => setTab('all')}
                                            type="button"
                                        >
                                            My Reports
                                        </button>
                                        {hasAnyReviewPermissionPrefix && (
                                            <button
                                                style={styles.tab(tab === 'review')}
                                                onClick={() => setTab('review')}
                                                type="button"
                                            >
                                                Review
                                            </button>
                                        )}
                                    </div>
                                </div>
                            }
                        />
                        <div style={styles.content}>
                            {tab === 'all' && (
                                <div style={styles.list}>
                                    {weeksToShow.length === 0 &&
                                    !(isLoadingUser || isLoadingMy || isLoadingPermissions) ? (
                                        <div style={styles.empty}>
                                            <i className="fas fa-check-circle" style={styles.emptyIcon}></i>
                                            <div>No reports</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div>
                                                {isLoadingUser || isLoadingMy || isLoadingPermissions ? (
                                                    <div style={styles.loading}>
                                                        <LoadingScreen message="Loading your reports..." inline />
                                                    </div>
                                                ) : (
                                                    myPaginatedItems.map((item, index) => {
                                                        const { weekIso } = item
                                                        const { monday, saturday } =
                                                            ReportUtility.getWeekDatesFromIso(weekIso)
                                                        const weekRange = ReportService.getWeekRangeString(
                                                            monday,
                                                            saturday
                                                        )
                                                        const hasSavedData = !!(item.report && item.report.data)
                                                        const { statusText, statusClass, buttonLabel } =
                                                            ReportUtility.computeMyReportStatus({
                                                                completed: item.completed,
                                                                hasSavedData,
                                                                today: new Date(),
                                                                weekIso
                                                            })
                                                        const badge = ReportUtility.getWeekBadge(weekIso)
                                                        return (
                                                            <div
                                                                key={item.name + item.weekIso}
                                                                style={styles.tableRow}
                                                                onMouseEnter={(e) =>
                                                                    (e.currentTarget.style.background = '#f8fafc')
                                                                }
                                                                onMouseLeave={(e) =>
                                                                    (e.currentTarget.style.background = 'transparent')
                                                                }
                                                            >
                                                                <div style={styles.tableCellFlex}>
                                                                    <span style={styles.badge(badge)}>{badge}</span>
                                                                    {weekRange}
                                                                </div>
                                                                <div style={styles.tableCellFlex}>{item.title}</div>
                                                                <div style={styles.tableCellFixed120}>
                                                                    <span style={styles.status(statusClass)}>
                                                                        {statusText}
                                                                    </span>
                                                                </div>
                                                                <div style={styles.tableCellFixed120}>
                                                                    {saturday.toLocaleDateString()}
                                                                </div>
                                                                <div style={styles.tableCellFixed100}>
                                                                    <button
                                                                        style={styles.actionBtn}
                                                                        onClick={() => handleShowForm(item)}
                                                                        onMouseEnter={(e) =>
                                                                            (e.currentTarget.style.background =
                                                                                '#162d4a')
                                                                        }
                                                                        onMouseLeave={(e) =>
                                                                            (e.currentTarget.style.background =
                                                                                '#1e3a5f')
                                                                        }
                                                                    >
                                                                        {buttonLabel}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                            <div style={styles.pagination}>
                                                <div style={styles.pageSize}>
                                                    <label>Show:</label>
                                                    <select
                                                        value={myPageSize}
                                                        onChange={(e) => {
                                                            setMyPageSize(Number(e.target.value))
                                                            setMyCurrentPage(1)
                                                        }}
                                                        style={styles.pageSizeSelect}
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                        <option value={9999}>All</option>
                                                    </select>
                                                </div>
                                                <div style={styles.pageControls}>
                                                    <button
                                                        style={styles.pageBtn(myCurrentPage === 1)}
                                                        onClick={() => setMyCurrentPage(Math.max(1, myCurrentPage - 1))}
                                                        disabled={myCurrentPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span style={styles.pageInfo}>
                                                        Page {myCurrentPage} of {myTotalPages}
                                                    </span>
                                                    <button
                                                        style={styles.pageBtn(myCurrentPage === myTotalPages)}
                                                        onClick={() =>
                                                            setMyCurrentPage(Math.min(myTotalPages, myCurrentPage + 1))
                                                        }
                                                        disabled={myCurrentPage === myTotalPages}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {tab === 'review' && (
                                <div style={styles.list}>
                                    {visibleReviewReports.length === 0 &&
                                    !(
                                        isLoadingUser ||
                                        isLoadingPermissions ||
                                        loadingReporterPlants ||
                                        isLoadingReview
                                    ) ? (
                                        <div style={styles.empty}>
                                            <i className="fas fa-user-check" style={styles.emptyIcon}></i>
                                            <div>No reports to review</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div>
                                                {isLoadingUser ||
                                                isLoadingPermissions ||
                                                loadingReporterPlants ||
                                                isLoadingReview ? (
                                                    <div style={styles.loading}>
                                                        <LoadingScreen message="Loading reports to review..." inline />
                                                    </div>
                                                ) : (
                                                    reviewPaginatedItems.map((report, index) => {
                                                        const weekIso = report.week
                                                            ? new Date(report.week).toISOString().slice(0, 10)
                                                            : ''
                                                        const { monday, saturday } =
                                                            ReportUtility.getWeekDatesFromIso(weekIso)
                                                        const weekRange = ReportService.getWeekRangeString(
                                                            monday,
                                                            saturday
                                                        )
                                                        const badge = ReportUtility.getWeekBadge(weekIso)
                                                        return (
                                                            <div
                                                                key={report.id}
                                                                style={styles.tableRow}
                                                                onMouseEnter={(e) =>
                                                                    (e.currentTarget.style.background = '#f8fafc')
                                                                }
                                                                onMouseLeave={(e) =>
                                                                    (e.currentTarget.style.background = 'transparent')
                                                                }
                                                            >
                                                                <div style={styles.tableCellFlex}>
                                                                    <span style={styles.badge(badge)}>{badge}</span>
                                                                    {weekRange}
                                                                </div>
                                                                <div style={styles.tableCellFlex}>{report.title}</div>
                                                                <div style={styles.tableCellFlex}>
                                                                    {getUserName(report.userId)}
                                                                </div>
                                                                <div style={styles.tableCellFixed120}>
                                                                    {new Date(
                                                                        report.completedDate
                                                                    ).toLocaleDateString()}
                                                                </div>
                                                                <div style={styles.tableCellFixed120}>
                                                                    {reviewedByCurrentUser.has(report.id) ? (
                                                                        <span
                                                                            style={{
                                                                                color: '#10b981',
                                                                                fontWeight: 500
                                                                            }}
                                                                        >
                                                                            <i
                                                                                className="fas fa-check-circle"
                                                                                style={styles.reviewedCheck}
                                                                            ></i>
                                                                            Reviewed
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            style={{
                                                                                color: '#f59e0b',
                                                                                fontWeight: 500
                                                                            }}
                                                                        >
                                                                            <i
                                                                                className="fas fa-flag"
                                                                                style={styles.reviewedFlag}
                                                                            ></i>
                                                                            Not Reviewed
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={styles.tableCellFixed100}>
                                                                    <button
                                                                        style={styles.actionBtn}
                                                                        onClick={() => handleReview(report)}
                                                                        onMouseEnter={(e) =>
                                                                            (e.currentTarget.style.background =
                                                                                '#162d4a')
                                                                        }
                                                                        onMouseLeave={(e) =>
                                                                            (e.currentTarget.style.background =
                                                                                '#1e3a5f')
                                                                        }
                                                                    >
                                                                        Review
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                            <div style={styles.pagination}>
                                                <div style={styles.pageSize}>
                                                    <label>Show:</label>
                                                    <select
                                                        value={reviewPageSize}
                                                        onChange={(e) => {
                                                            setReviewPageSize(Number(e.target.value))
                                                            setReviewCurrentPage(1)
                                                        }}
                                                        style={styles.pageSizeSelect}
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                        <option value={9999}>All</option>
                                                    </select>
                                                </div>
                                                <div style={styles.pageControls}>
                                                    <button
                                                        style={styles.pageBtn(reviewCurrentPage === 1)}
                                                        onClick={() =>
                                                            setReviewCurrentPage(Math.max(1, reviewCurrentPage - 1))
                                                        }
                                                        disabled={reviewCurrentPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span style={styles.pageInfo}>
                                                        Page {reviewCurrentPage} of {reviewTotalPages}
                                                    </span>
                                                    <button
                                                        style={styles.pageBtn(reviewCurrentPage === reviewTotalPages)}
                                                        onClick={() =>
                                                            setReviewCurrentPage(
                                                                Math.min(reviewTotalPages, reviewCurrentPage + 1)
                                                            )
                                                        }
                                                        disabled={reviewCurrentPage === reviewTotalPages}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {showForm && (
                    <ReportsSubmitView
                        report={
                            reportTypeMap[showForm.name]
                                ? {
                                      ...reportTypeMap[showForm.name],
                                      weekIso: showForm.weekIso
                                  }
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
