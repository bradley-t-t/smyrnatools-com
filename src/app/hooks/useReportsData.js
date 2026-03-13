import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { PlantService } from '../../services/PlantService'
import { UserService } from '../../services/UserService'
import { ReportUtility } from '../../utils/ReportUtility'
import { usePreferences } from '../context/PreferencesContext'
import { reportTypeMap, reportTypes } from '../types/ReportTypes'
const REPORTS_START_DATE = new Date('2025-07-20')
/**
 * Loads all reports data: user's own reports, review permissions, assigned report types,
 * region-scoped plant lists, and reporter-to-plant mappings.
 */
export function useReportsData() {
    const [localReports, setLocalReports] = useState([])
    const [user, setUser] = useState(null)
    const [userProfiles, setUserProfiles] = useState({})
    const [hasAssigned, setHasAssigned] = useState({})
    const [hasReviewPermission, setHasReviewPermission] = useState({})
    const [plants, setPlants] = useState([])
    const [regionType, setRegionType] = useState(null)
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [regionPlantsWithDistricts, setRegionPlantsWithDistricts] = useState([])
    const [userPlantCode, setUserPlantCode] = useState('')
    const [userAdditionalPlants, setUserAdditionalPlants] = useState([])
    const [reporterPlantMap, setReporterPlantMap] = useState({})
    const [reviewedByCurrentUser, setReviewedByCurrentUser] = useState(new Set())
    const [reviewLoadedWeeks, setReviewLoadedWeeks] = useState(new Set())
    const [loadError, setLoadError] = useState('')
    const [isLoadingUser, setIsLoadingUser] = useState(true)
    const [isLoadingMy, setIsLoadingMy] = useState(true)
    const [isLoadingReview, setIsLoadingReview] = useState(true)
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)
    const [loadingReporterPlants, setLoadingReporterPlants] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [hasLostLoadsPermission, setHasLostLoadsPermission] = useState(false)
    const [hasLostLoadsDeletePermission, setHasLostLoadsDeletePermission] = useState(false)
    const [lostLoadReports, setLostLoadReports] = useState([])
    const [isLoadingLostLoads, setIsLoadingLostLoads] = useState(false)
    const [lostLoadsLoaded, setLostLoadsLoaded] = useState(false)
    const { preferences } = usePreferences()
    const fetchProfilesFor = useCallback(
        async (userIds) => {
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
        },
        [userProfiles]
    )
    const fetchReportsBatch = useCallback(
        async ({ weeks, scope }) => {
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
        },
        [user, regionType, hasAssigned, hasReviewPermission, fetchProfilesFor]
    )
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
        if (!user?.id) return
        async function loadUserPlants() {
            const [mainPlant, additional] = await Promise.all([
                UserService.getUserPlant(user.id).catch(() => ''),
                UserService.getAdditionalAssignedPlants(user.id).catch(() => [])
            ])
            setUserPlantCode(mainPlant || '')
            setUserAdditionalPlants(Array.isArray(additional) ? additional : [])
        }
        loadUserPlants()
    }, [user?.id])
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
            const [lostLoads, lostLoadsDelete] = await Promise.all([
                UserService.hasPermission(user.id, 'reports.lostloads'),
                UserService.hasPermission(user.id, 'reports.lostloads.delete')
            ])
            setHasAssigned(assigned)
            setHasReviewPermission(review)
            setHasLostLoadsPermission(lostLoads)
            setHasLostLoadsDeletePermission(lostLoadsDelete)
            setIsLoadingPermissions(false)
        }
        checkAssignedAndReview()
    }, [user?.id])
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
        const now = new Date()
        const initialMyWeeks = ReportUtility.getLastNWeekIsos(
            ReportUtility.getTotalWeeksSince(REPORTS_START_DATE, now),
            now
        )
        async function loadInitial() {
            setIsLoadingMy(true)
            await fetchReportsBatch({ scope: 'my', weeks: initialMyWeeks })
            setIsLoadingMy(false)
        }
        loadInitial()
    }, [user, isLoadingPermissions, hasAssigned, regionType, refreshKey, fetchReportsBatch])
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
                const region = await PlantService.fetchRegionByCode(code)
                setRegionType(region?.type || null)
                const list = await PlantService.fetchRegionPlants(code)
                if (cancelled) return
                setRegionPlantCodes(new Set(list.map((p) => p.plantCode)))
                setRegionPlantsWithDistricts(list)
            } catch {
                setRegionPlantCodes(new Set())
                setRegionType(null)
            }
        }
        loadRegion()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])
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
    }, [localReports, user?.id, reporterPlantMap])
    useEffect(() => {
        const interval = setInterval(() => setRefreshKey((prev) => prev + 1), 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])
    const hasAnyReviewPermission = useMemo(() => {
        if (isLoadingPermissions) return false
        const allowedReviewTypes =
            regionType === 'office'
                ? hasReviewPermission['general_manager']
                    ? ['general_manager']
                    : []
                : reportTypes
                      .filter((rt) => hasReviewPermission[rt.name] && rt.name !== 'general_manager')
                      .map((rt) => rt.name)
        return allowedReviewTypes.length > 0
    }, [hasReviewPermission, regionType, isLoadingPermissions])
    const weeksToShow = useMemo(() => {
        const now = new Date()
        return ReportUtility.getLastNWeekIsos(ReportUtility.getTotalWeeksSince(REPORTS_START_DATE, now), now)
    }, [refreshKey])
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
    }, [weeksToShow, user, hasAssigned, localReports, regionType])
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
    const loadReviewReports = useCallback(async () => {
        if (!user || isLoadingPermissions) return
        const desiredWeeks = new Set(ReportUtility.getLastNWeekIsos(52, new Date()))
        const toLoad = Array.from(desiredWeeks).filter((w) => !reviewLoadedWeeks.has(w))
        if (toLoad.length === 0) {
            if (isLoadingReview) setIsLoadingReview(false)
            return
        }
        setIsLoadingReview(true)
        await fetchReportsBatch({ scope: 'review', weeks: toLoad })
        setReviewLoadedWeeks((prev) => new Set([...toLoad, ...prev]))
        setIsLoadingReview(false)
    }, [user, isLoadingPermissions, reviewLoadedWeeks, isLoadingReview, fetchReportsBatch])
    const loadLostLoadReports = useCallback(async () => {
        if (!user || isLoadingPermissions || lostLoadsLoaded) return
        setIsLoadingLostLoads(true)
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('id,user_id,submitted_at,data,week')
                .eq('report_name', 'lost_load')
                .eq('completed', true)
                .order('submitted_at', { ascending: false })
            if (!error && Array.isArray(data)) {
                const mapped = data.map((r) => ({
                    data: r.data,
                    id: r.id,
                    submitted_at: r.submitted_at,
                    userId: r.user_id,
                    week: r.week
                }))
                setLostLoadReports(mapped)
                const ids = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean)))
                await fetchProfilesFor(ids)
            }
        } catch {}
        setIsLoadingLostLoads(false)
        setLostLoadsLoaded(true)
    }, [user, isLoadingPermissions, lostLoadsLoaded, fetchProfilesFor])
    const addLostLoadReport = useCallback((report) => {
        if (!report) return
        const mapped = {
            data: report.data,
            id: report.id,
            submitted_at: report.submitted_at,
            userId: report.user_id,
            week: report.week
        }
        setLostLoadReports((prev) => [mapped, ...prev])
    }, [])
    const deleteLostLoadReport = useCallback(async (reportId) => {
        const { error } = await supabase.from('reports').delete().eq('id', reportId)
        if (error) throw error
        setLostLoadReports((prev) => prev.filter((r) => r.id !== reportId))
    }, [])
    const triggerRefresh = useCallback(() => {
        setIsRefreshing(true)
        setRefreshKey((prev) => prev + 1)
        setTimeout(() => setIsRefreshing(false), 1000)
    }, [])
    const updateLocalReport = useCallback((reportData) => {
        setLocalReports((prev) => [...prev.filter((r) => r.id !== reportData.id), reportData])
    }, [])
    const markReportReviewed = useCallback((reportId) => {
        setReviewedByCurrentUser((prev) => {
            const newSet = new Set(prev)
            newSet.add(reportId)
            return newSet
        })
    }, [])
    const getUserName = useCallback(
        (userId) => {
            const profile = userProfiles[userId]
            return profile && (profile.first_name || profile.last_name)
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                : typeof userId === 'string' && userId.length > 0
                  ? userId.slice(0, 8)
                  : ''
        },
        [userProfiles]
    )
    return {
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
        localReports,
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
    }
}
