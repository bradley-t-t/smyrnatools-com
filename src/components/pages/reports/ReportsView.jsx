import React, {useEffect, useMemo, useState} from 'react'
import {reportTypeMap, reportTypes} from '../../../types/ReportTypes'
import './styles/Reports.css'
import ReportsSubmitView from './ReportsSubmitView'
import ReportsReviewView from './ReportsReviewView'
import {supabase} from '../../../services/DatabaseService'
import {UserService} from '../../../services/UserService'
import {ReportService} from '../../../services/ReportService'
import LoadingScreen from '../../common/LoadingScreen'
import {usePreferences} from '../../../app/context/PreferencesContext'
import {RegionService} from '../../../services/RegionService'
import {ReportUtility} from '../../../utils/ReportUtility'

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
    const [myLoadedWeeks, setMyLoadedWeeks] = useState(new Set())
    const [reviewLoadedWeeks, setReviewLoadedWeeks] = useState(new Set())

    const {preferences} = usePreferences()
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [reporterPlantMap, setReporterPlantMap] = useState({})
    const [loadingReporterPlants, setLoadingReporterPlants] = useState(false)

    const [overdueItems, setOverdueItems] = useState([])
    const [isLoadingOverdue, setIsLoadingOverdue] = useState(false)

    const [hasAnyReviewPermissionPrefix, setHasAnyReviewPermissionPrefix] = useState(false)

    async function fetchProfilesFor(userIds) {
        const missing = userIds.filter(id => !userProfiles[id])
        if (missing.length === 0) return
        const {data: profiles, error} = await supabase
            .from('users_profiles')
            .select('id, first_name, last_name')
            .in('id', missing)
        if (!error && Array.isArray(profiles)) {
            setUserProfiles(prev => profiles.reduce((map, p) => ({...map, [p.id]: p}), {...prev}))
        }
    }

    async function fetchReportsBatch({weeks, scope}) {
        if (!user || !Array.isArray(weeks) || weeks.length === 0) return
        const isoList = weeks.map(w => new Date(w).toISOString())
        let query = supabase
            .from('reports')
            .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
            .in('week', isoList)
        if (scope === 'my') {
            const allowedMy = regionType === 'office' ? (hasAssigned['general_manager'] ? ['general_manager'] : []) : reportTypes.filter(rt => hasAssigned[rt.name]).map(rt => rt.name)
            query = query.eq('user_id', user.id)
            if (allowedMy.length > 0) query = query.in('report_name', allowedMy)
        } else if (scope === 'review') {
            const allowedReview = regionType === 'office' ? (hasReviewPermission['general_manager'] ? ['general_manager'] : []) : reportTypes.filter(rt => hasReviewPermission[rt.name]).map(rt => rt.name)
            query = query.neq('user_id', user.id).eq('completed', true)
            if (allowedReview.length > 0) query = query.in('report_name', allowedReview)
        }
        const {data, error} = await query
        if (error) {
            setLoadError(error.message || 'Error fetching reports')
            return
        }
        if (!Array.isArray(data)) return
        setLocalReports(prev => {
            const existingIds = new Set(prev.map(r => r.id))
            const mapped = data
                .filter(r => !existingIds.has(r.id))
                .map(r => ({
                    id: r.id,
                    name: r.report_name,
                    title: (reportTypeMap[r.report_name] || {}).title || r.report_name,
                    completed: !!r.completed,
                    completedDate: r.submitted_at,
                    data: r.data,
                    userId: r.user_id,
                    week: r.week || r.data?.week || null,
                    report_date_range_start: r.report_date_range_start ? new Date(r.report_date_range_start) : null,
                    report_date_range_end: r.report_date_range_end ? new Date(r.report_date_range_end) : null,
                    been_reviewed: !!r.been_reviewed
                }))
            return [...prev, ...mapped]
        })
        const ids = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)))
        await fetchProfilesFor(ids)
    }

    useEffect(() => {
        async function init() {
            setIsLoadingUser(true)
            try {
                const u = await UserService.getCurrentUser()
                if (u && typeof u.id === 'string') {
                    setUser(u)
                } else {
                    setUser(null)
                }
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
            setIsLoadingPermissions(true)
            if (!user || !user.id) {
                setHasAssigned({})
                setHasReviewPermission({})
                setHasAnyReviewPermissionPrefix(false)
                setIsLoadingPermissions(false)
                return
            }
            const assigned = {}
            const review = {}
            await Promise.all(reportTypes.map(async rt => {
                const a = await UserService.hasAnyPermission(user.id, rt.assignment)
                console.log(`hasAssigned for ${rt.name}: ${a}, permissions: ${rt.assignment.join(', ')}`)
                assigned[rt.name] = !!a
                review[rt.name] = false
                const checks = await Promise.all(rt.review.map(perm => UserService.hasPermission(user.id, perm)))
                review[rt.name] = checks.some(Boolean)
            }))
            setHasAssigned(assigned)
            setHasReviewPermission(review)
            try {
                const permissions = await UserService.getUserPermissions(user.id)
                const anyReview = Array.isArray(permissions) && permissions.some(p => typeof p === 'string' && p.startsWith('reports.review.'))
                setHasAnyReviewPermissionPrefix(!!anyReview)
            } catch {
                setHasAnyReviewPermissionPrefix(false)
            }
            setIsLoadingPermissions(false)
        }

        checkAssignedAndReview()
    }, [user])

    useEffect(() => {
        async function fetchPlants() {
            const {data, error} = await supabase
                .from('plants')
                .select('plant_code,plant_name')
                .order('plant_code', {ascending: true})
            setPlants(!error && Array.isArray(data)
                ? data.filter(p => p.plant_code && p.plant_name)
                : []
            )
        }

        fetchPlants()
    }, [])

    useEffect(() => {
        if (!user || isLoadingPermissions) return
        const initialMyWeeks = ReportUtility.getLastNWeekIsos(totalMyWeeks, HARDCODED_TODAY)

        async function loadInitial() {
            setIsLoadingMy(true)
            await fetchReportsBatch({weeks: initialMyWeeks, scope: 'my'})
            setMyLoadedWeeks(new Set(initialMyWeeks))
            setIsLoadingMy(false)
        }

        loadInitial()
    }, [user, isLoadingPermissions, hasAssigned, regionType])

    useEffect(() => {
        if (!user || isLoadingPermissions || tab !== 'review') return
        const desiredWeeks = new Set(ReportUtility.getLastNWeekIsos(52, HARDCODED_TODAY))
        const toLoad = Array.from(desiredWeeks).filter(w => !reviewLoadedWeeks.has(w))
        if (toLoad.length === 0) {
            if (isLoadingReview) setIsLoadingReview(false)
            return
        }
        let cancelled = false

        async function loadReview() {
            setIsLoadingReview(true)
            await fetchReportsBatch({weeks: toLoad, scope: 'review'})
            if (!cancelled) setReviewLoadedWeeks(prev => new Set([...toLoad, ...prev]))
            setIsLoadingReview(false)
        }

        loadReview()
        return () => {
            cancelled = true
        }
    }, [tab, user, isLoadingPermissions, regionType])

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
                const codes = new Set(list.map(p => p.plantCode))
                setRegionPlantCodes(codes)
                if (filterPlant && !codes.has(filterPlant)) setFilterPlant('')
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
        const idsFromReview = Array.from(new Set(localReports.filter(r => r.completed && r.userId && r.userId !== user?.id).map(r => r.userId)))
        const idsFromOverdue = Array.from(new Set((overdueItems || []).map(o => o.userId).filter(Boolean)))
        const ids = Array.from(new Set([...idsFromReview, ...idsFromOverdue]))
        const missing = ids.filter(id => !(id in reporterPlantMap))
        if (missing.length === 0) return
        let cancelled = false

        async function loadReporterPlants() {
            try {
                setLoadingReporterPlants(true)
                const entries = await Promise.all(missing.map(async id => {
                    try {
                        const plantCode = await Promise.race([
                            UserService.getUserPlant(id),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                        ])
                        return [id, plantCode || '']
                    } catch {
                        return [id, '']
                    }
                }))
                if (cancelled) return
                setReporterPlantMap(prev => {
                    const next = {...prev}
                    entries.forEach(([id, code]) => {
                        next[id] = code || ''
                    })
                    return next
                })
            } finally {
                if (!cancelled) setLoadingReporterPlants(false)
            }
        }

        loadReporterPlants()
        return () => {
            cancelled = true
        }
    }, [localReports, user, overdueItems])

    useEffect(() => {
        if (tab !== 'overdue' || isLoadingPermissions) return
        let cancelled = false

        async function loadOverdue() {
            setIsLoadingOverdue(true)
            try {
                const allowedReview = regionType === 'office' ? (hasReviewPermission['general_manager'] ? ['general_manager'] : []) : reportTypes.filter(rt => hasReviewPermission[rt.name]).map(rt => rt.name)
                const items = await ReportService.fetchOverdueAssignments(HARDCODED_TODAY, {force: true, allowedReview})
                if (!cancelled) setOverdueItems(items || [])
                const ids = Array.from(new Set((items || []).map(i => i.userId).filter(Boolean)))
                if (ids.length > 0) await fetchProfilesFor(ids)
            } catch (e) {
                if (!cancelled) setOverdueItems([])
            } finally {
                if (!cancelled) setIsLoadingOverdue(false)
            }
        }

        loadOverdue()
        return () => {
            cancelled = true
        }
    }, [tab, isLoadingPermissions, hasReviewPermission, regionType])

    useEffect(() => {
        if (tab === 'overdue' && !hasAnyReviewPermissionPrefix) setTab('all')
    }, [tab, hasAnyReviewPermissionPrefix])

    const weeksToShow = useMemo(() => ReportUtility.getLastNWeekIsos(totalMyWeeks, HARDCODED_TODAY), [totalMyWeeks])

    const myReportsByWeek = useMemo(() => {
        const grouped = {}
        weeksToShow.forEach(weekIso => {
            reportTypes.forEach(rt => {
                if (!user || !hasAssigned[rt.name]) return
                if (regionType === 'office' && rt.name !== 'general_manager') return
                const existing = localReports.find(r =>
                    r.name === rt.name &&
                    r.userId === user.id &&
                    r.week &&
                    new Date(r.week).toISOString().slice(0, 10) === weekIso
                )
                if (!grouped[weekIso]) grouped[weekIso] = []
                grouped[weekIso].push({
                    ...rt,
                    weekIso,
                    completed: !!(existing && existing.completed),
                    report: existing || null
                })
            })
        })
        return grouped
    }, [weeksToShow, reportTypes, user, hasAssigned, localReports, regionType])

    const sortedMyWeeks = weeksToShow

    const reviewableReports = useMemo(() => (
        localReports
            .filter(r => r.completed && r.week && hasReviewPermission[r.name] && r.userId !== user?.id && (regionType !== 'office' || r.name === 'general_manager'))
            .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())
    ), [localReports, hasReviewPermission, user, regionType])

    const reviewReportsByWeek = useMemo(() => {
        const grouped = {}
        reviewableReports.forEach(report => {
            const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : ''
            if (!grouped[weekIso]) grouped[weekIso] = []
            grouped[weekIso].push(report)
        })
        return grouped
    }, [reviewableReports])

    const sortedReviewWeeks = useMemo(() => Object.keys(reviewReportsByWeek).sort((a, b) => new Date(b) - new Date(a)), [reviewReportsByWeek])

    const totalReviewWeeks = useMemo(() => Object.keys(reviewReportsByWeek).length, [reviewReportsByWeek])

    function getUserName(userId) {
        const profile = userProfiles[userId]
        if (profile && (profile.first_name || profile.last_name)) {
            return `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        }
        return typeof userId === 'string' && userId.length > 0 ? userId.slice(0, 8) : ''
    }

    async function handleSubmitReport(formData, completed = true) {
        if (!showForm || !user || typeof user.id !== 'string') {
            setLoadError('User not found')
            return
        }
        const weekIso = showForm.weekIso
        const reportName = showForm.name
        const userId = user.id
        let monday = weekIso ? new Date(weekIso) : null
        let saturday = monday ? new Date(monday) : null
        if (saturday) saturday.setDate(monday.getDate() + 5)
        const upsertData = {
            report_name: reportName,
            user_id: userId,
            data: {...formData, week: weekIso},
            week: monday ? monday.toISOString() : null,
            completed: completed,
            submitted_at: new Date().toISOString(),
            report_date_range_start: monday?.toISOString() || null,
            report_date_range_end: saturday?.toISOString() || null
        }
        let response
        const {data: existing, error: findError} = await supabase
            .from('reports')
            .select('id')
            .eq('report_name', reportName)
            .eq('user_id', userId)
            .eq('week', monday ? monday.toISOString() : null)
            .maybeSingle()
        if (findError) {
            setLoadError(findError.message || 'Error checking for existing report')
            return
        }
        if (existing && existing.id) {
            response = await supabase
                .from('reports')
                .update(upsertData)
                .eq('id', existing.id)
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single()
        } else {
            response = await supabase
                .from('reports')
                .insert([upsertData])
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single()
        }
        const {data, error} = response
        if (error) {
            setLoadError(error.message || 'Error submitting report')
            return
        }
        if (data && data.id) {
            setLocalReports(prev => {
                const filtered = prev.filter(r => r.id !== data.id)
                return [
                    ...filtered,
                    {
                        id: data.id,
                        name: data.report_name,
                        title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
                        completed: !!data.completed,
                        completedDate: data.submitted_at,
                        data: data.data,
                        userId: data.user_id,
                        week: data.week || data.data?.week || weekIso,
                        report_date_range_start: data.report_date_range_start ? new Date(data.report_date_range_start) : monday,
                        report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : saturday
                    }
                ]
            })
            setShowForm(null)
        }
    }

    async function handleManagerEditSubmit(formData) {
        if (!showForm || !managerEditUser) {
            setLoadError('No user selected for manager edit')
            return
        }
        const weekIso = showForm.weekIso
        const reportName = showForm.name
        const userId = managerEditUser
        let monday = weekIso ? new Date(weekIso) : null
        let saturday = monday ? new Date(monday) : null
        if (saturday) saturday.setDate(monday.getDate() + 5)
        const upsertData = {
            report_name: reportName,
            user_id: userId,
            data: {...formData, week: weekIso},
            week: monday ? monday.toISOString() : null,
            completed: true,
            submitted_at: new Date().toISOString(),
            report_date_range_start: monday?.toISOString() || null,
            report_date_range_end: saturday?.toISOString() || null
        }
        let response
        const {data: existing, error: findError} = await supabase
            .from('reports')
            .select('id')
            .eq('report_name', reportName)
            .eq('user_id', userId)
            .eq('week', monday ? monday.toISOString() : null)
            .maybeSingle()
        if (findError) {
            setLoadError(findError.message || 'Error checking for existing report')
            return
        }
        if (existing && existing.id) {
            response = await supabase
                .from('reports')
                .update(upsertData)
                .eq('id', existing.id)
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single()
        } else {
            response = await supabase
                .from('reports')
                .insert([upsertData])
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single()
        }
        const {data, error} = response
        if (error) {
            setLoadError(error.message || 'Error submitting report')
            return
        }
        if (data && data.id) {
            setLocalReports(prev => {
                const filtered = prev.filter(r => r.id !== data.id)
                return [
                    ...filtered,
                    {
                        id: data.id,
                        name: data.report_name,
                        title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
                        completed: !!data.completed,
                        completedDate: data.submitted_at,
                        data: data.data,
                        userId: data.user_id,
                        week: data.week || data.data?.week || weekIso,
                        report_date_range_start: data.report_date_range_start ? new Date(data.report_date_range_start) : monday,
                        report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : saturday
                    }
                ]
            })
            setShowForm(null)
            setManagerEditUser(null)
        }
    }

    async function handleReview(report) {
        // Mark as reviewed only if not reviewing own report
        if (report.userId !== user.id) {
            const {error} = await supabase
                .from('reports')
                .update({been_reviewed: true})
                .eq('id', report.id)
            if (!error) {
                setLocalReports(prev => prev.map(r => r.id === report.id ? {...r, been_reviewed: true} : r))
            }
        }
        setReviewData(report)
        setShowReview(reportTypes.find(rt => rt.name === report.name))
    }

    function handleManagerEdit(reportType, reportData) {
        setShowReview(null)
        setReviewData(null)
        setShowForm({
            ...reportType,
            weekIso: reportData.week || reportData.data?.week,
            name: reportType.name
        })
        setSubmitInitialData({
            ...reportData,
            data: reportData.data
        })
        setManagerEditUser(reportData.userId)
    }

    async function handleShowForm(item) {
        setSubmitInitialData(null)
        if (!user || !item || !item.name || !item.weekIso) {
            setShowForm(item)
            return
        }
        const {data, error} = await supabase
            .from('reports')
            .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
            .eq('report_name', item.name)
            .eq('user_id', user.id)
            .eq('week', new Date(item.weekIso).toISOString())
            .maybeSingle()
        if (!error && data) {
            setSubmitInitialData({
                id: data.id,
                name: data.report_name,
                title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
                completed: !!data.completed,
                completedDate: data.submitted_at,
                data: data.data,
                userId: data.user_id,
                week: data.week || data.data?.week || item.weekIso,
                report_date_range_start: data.report_date_range_start ? new Date(data.report_date_range_start) : null,
                report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : null
            })
        } else {
            setSubmitInitialData(null)
        }
        setShowForm(item)
    }

    const filteredMyWeeks = sortedMyWeeks
        .filter(weekIso => (myReportsByWeek[weekIso] || []).length > 0)

    const filteredReviewWeeks = useMemo(() => sortedReviewWeeks.filter(weekIso => {
        const weekReports = reviewReportsByWeek[weekIso] || []
        return weekReports.some(report => {
            const reporterPlant = reporterPlantMap[report.userId] || ''
            const matchPlant = !filterPlant || reporterPlant === filterPlant
            const matchRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(reporterPlant) || report.name === 'general_manager'
            return (!filterReportType || report.name === filterReportType) && matchPlant && matchRegion
        })
    }), [sortedReviewWeeks, reportTypes, filterReportType, filterPlant, preferences.selectedRegion?.code, regionPlantCodes, reporterPlantMap])

    const visibleReviewReports = useMemo(() => reviewableReports.filter(report => {
        const reporterPlant = reporterPlantMap[report.userId] || ''
        const matchPlant = !filterPlant || reporterPlant === filterPlant
        const matchRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(reporterPlant) || report.name === 'general_manager'
        return (!filterReportType || report.name === filterReportType) && matchPlant && matchRegion
    }), [reviewableReports, filterReportType, filterPlant, preferences.selectedRegion?.code, regionPlantCodes, reporterPlantMap])

    const filteredOverdueItems = useMemo(() => {
        return (overdueItems || [])
            .filter(item => {
                const matchType = (!filterReportType || item.report_name === filterReportType) && (regionType !== 'office' || item.report_name === 'general_manager')
                const reporterPlant = reporterPlantMap[item.userId] || ''
                const matchPlant = !filterPlant || reporterPlant === filterPlant
                const matchRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(reporterPlant)
                return matchType && matchPlant && matchRegion
            })
            .sort((a, b) => new Date(b.week) - new Date(a.week))
    }, [overdueItems, filterReportType, filterPlant, preferences.selectedRegion?.code, regionPlantCodes, reporterPlantMap, regionType])

    const overdueByWeek = useMemo(() => {
        const grouped = {}
        filteredOverdueItems.forEach(item => {
            const key = item.week
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(item)
        })
        return grouped
    }, [filteredOverdueItems])

    const sortedOverdueWeeks = useMemo(() => Object.keys(overdueByWeek).sort((a, b) => new Date(b) - new Date(a)), [overdueByWeek])

    const myCounts = useMemo(() => {
        const items = []
        weeksToShow.forEach(w => (myReportsByWeek[w] || []).forEach(i => items.push(i)))
        const completed = items.filter(i => i.completed).length
        const pending = items.filter(i => !i.completed).length
        return {total: items.length, completed, pending}
    }, [weeksToShow, myReportsByWeek])


    return (
        <>
            <div className="rpts-root">
                {loadError && <div className="rpts-load-error">{loadError}</div>}
                {!showForm && !showReview && (
                    <>
                        <div className="rpts-toolbar">
                            <div className="rpts-toolbar-left">
                                <div className="rpts-toolbar-title">
                                    <i className="fas fa-file-alt"></i>
                                    <span>Reports</span>
                                </div>
                            </div>
                            <div className="rpts-toolbar-right">
                                <div className="rpts-filters">
                                    <select
                                        value={filterReportType}
                                        onChange={e => setFilterReportType(e.target.value)}
                                        className="rpts-select-control"
                                    >
                                        <option value="">All Report Types</option>
                                        {reportTypes
                                            .filter(rt =>
                                                (tab === 'all' ? hasAssigned[rt.name] : hasReviewPermission[rt.name]) &&
                                                (regionType !== 'office' || rt.name === 'general_manager')
                                            )
                                            .map(rt => (
                                                <option key={rt.name} value={rt.name}>{rt.title}</option>
                                            ))}
                                    </select>
                                    <select
                                        value={filterPlant}
                                        onChange={e => setFilterPlant(e.target.value)}
                                        className="rpts-select-control"
                                    >
                                        <option value="">All Plants</option>
                                        {plants
                                            .filter(p => !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(p.plant_code))
                                            .sort((a, b) => {
                                                const an = parseInt(String(a.plant_code || '').replace(/\D/g, '') || '0', 10)
                                                const bn = parseInt(String(b.plant_code || '').replace(/\D/g, '') || '0', 10)
                                                return an - bn || String(a.plant_code || '').localeCompare(String(b.plant_code || ''))
                                            })
                                            .map(p => (
                                                <option key={p.plant_code}
                                                        value={p.plant_code}>{p.plant_name}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="rpts-tabs">
                                    <button
                                        className={tab === 'all' ? 'active' : ''}
                                        onClick={() => setTab('all')}
                                        type="button"
                                    >
                                        My Reports
                                    </button>
                                    {hasAnyReviewPermissionPrefix && (
                                        <button
                                            className={tab === 'review' ? 'active' : ''}
                                            onClick={() => setTab('review')}
                                            type="button"
                                        >
                                            Review
                                        </button>
                                    )}
                                    {hasAnyReviewPermissionPrefix && (
                                        <button
                                            className={tab === 'overdue' ? 'active' : ''}
                                            onClick={() => setTab('overdue')}
                                            type="button"
                                        >
                                            Overdue
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="rpts-content">
                            {tab === 'all' && (
                                <div className="rpts-list">
                                    {(isLoadingUser || isLoadingMy || isLoadingPermissions) && weeksToShow.length === 0 ? (
                                        <div className="rpts-loading">
                                            <LoadingScreen message="Loading your reports..." inline/>
                                        </div>
                                    ) : (
                                        <>
                                            {weeksToShow.length === 0 ? (
                                                <div className="rpts-empty">
                                                    <i className="fas fa-check-circle"></i>
                                                    <div>No reports</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="rpt-table-wrapper">
                                                        <table className="rpt-table">
                                                            <thead>
                                                                <tr>
                                                                    <th className="rpt-th">Week</th>
                                                                    <th className="rpt-th">Report Type</th>
                                                                    <th className="rpt-th">Status</th>
                                                                    <th className="rpt-th">Due Date</th>
                                                                    <th className="rpt-th right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {filteredMyWeeks.flatMap(weekIso => {
                                                                    const weekItems = myReportsByWeek[weekIso] || []
                                                                    const {monday, saturday} = ReportUtility.getWeekDatesFromIso(weekIso)
                                                                    const weekRange = ReportService.getWeekRangeString(monday, saturday)
                                                                    return weekItems.map(item => {
                                                                        const today = new Date()
                                                                        const hasSavedData = !!(item.report && item.report.data)
                                                                        const {statusText, statusClass, buttonLabel} = ReportUtility.computeMyReportStatus({
                                                                            completed: item.completed,
                                                                            hasSavedData,
                                                                            weekIso: item.weekIso,
                                                                            today
                                                                        })
                                                                        return (
                                                                            <tr key={item.name + item.weekIso} className="rpt-row">
                                                                                <td className="rpt-td">{weekRange}</td>
                                                                                <td className="rpt-td">{item.title}</td>
                                                                                <td className="rpt-td"><span className={`rpts-status ${statusClass}`}>{statusText}</span></td>
                                                                                <td className="rpt-td">{saturday.toLocaleDateString()}</td>
                                                                                <td className="rpt-td right"><button className="rpts-list-action" onClick={() => handleShowForm(item)}>{buttonLabel}</button></td>
                                                                            </tr>
                                                                        )
                                                                    })
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {tab === 'review' && (
                                <div className="rpts-list">
                                    {(isLoadingUser || isLoadingPermissions || loadingReporterPlants || (isLoadingReview && visibleReviewReports.length === 0)) ? (
                                        <div className="rpts-loading">
                                            <LoadingScreen message="Loading reports to review..." inline/>
                                        </div>
                                    ) : (
                                        <>
                                            {visibleReviewReports.length === 0 ? (
                                                <div className="rpts-empty">
                                                    <i className="fas fa-user-check"></i>
                                                    <div>No reports to review</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="rpt-table-wrapper">
                                                        <table className="rpt-table">
                                                            <thead>
                                                                <tr>
                                                                    <th className="rpt-th">Week</th>
                                                                    <th className="rpt-th">Report Type</th>
                                                                    <th className="rpt-th">Submitted By</th>
                                                                    <th className="rpt-th">Submitted Date</th>
                                                                    <th className="rpt-th">Reviewed</th>
                                                                    <th className="rpt-th right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {visibleReviewReports
                                                                    .map(report => {
                                                                        const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : ''
                                                                        const {monday, saturday} = ReportUtility.getWeekDatesFromIso(weekIso)
                                                                        const weekRange = ReportService.getWeekRangeString(monday, saturday)
                                                                        return (
                                                                            <tr key={report.id} className="rpt-row">
                                                                                <td className="rpt-td">{weekRange}</td>
                                                                                <td className="rpt-td">{report.title}</td>
                                                                                <td className="rpt-td">{getUserName(report.userId)}</td>
                                                                                <td className="rpt-td">{new Date(report.completedDate).toLocaleDateString()}</td>
                                                                                <td className="rpt-td">{report.been_reviewed ? <><i className="fas fa-check-circle rpts-reviewed-check"></i> Reviewed</> : <><i className="fas fa-flag rpts-reviewed-flag"></i> Not Reviewed</>}</td>
                                                                                <td className="rpt-td right"><button className="rpts-list-action" onClick={() => handleReview(report)}>Review</button></td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {tab === 'overdue' && (
                                <div className="rpts-list">
                                    {(isLoadingUser || isLoadingPermissions || isLoadingOverdue || loadingReporterPlants) ? (
                                        <div className="rpts-loading">
                                            <LoadingScreen message="Loading overdue reports..." inline/>
                                        </div>
                                    ) : (
                                        <>
                                            {filteredOverdueItems.length === 0 ? (
                                                <div className="rpts-empty">
                                                    <i className="fas fa-exclamation-circle"></i>
                                                    <div>No overdue reports</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="rpt-table-wrapper">
                                                        <table className="rpt-table">
                                                            <thead>
                                                                <tr>
                                                                    <th className="rpt-th">Week</th>
                                                                    <th className="rpt-th">Report Type</th>
                                                                    <th className="rpt-th">Owed By</th>
                                                                    <th className="rpt-th">Due Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {filteredOverdueItems.map(item => {
                                                                    const weekIso = item.week
                                                                    const {monday, saturday} = ReportUtility.getWeekDatesFromIso(weekIso)
                                                                    const weekRange = ReportService.getWeekRangeString(monday, saturday)
                                                                    const title = (reportTypeMap[item.report_name] || {}).title || item.report_name
                                                                    return (
                                                                        <tr key={`${item.userId}-${item.report_name}-${item.week}`} className="rpt-row">
                                                                            <td className="rpt-td">{weekRange}</td>
                                                                            <td className="rpt-td">{title}</td>
                                                                            <td className="rpt-td">{getUserName(item.userId)}</td>
                                                                            <td className="rpt-td">{saturday.toLocaleDateString()}</td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
                {showForm && (
                    <ReportsSubmitView
                        report={reportTypeMap[showForm.name] ? {
                            ...reportTypeMap[showForm.name],
                            weekIso: showForm.weekIso
                        } : showForm}
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
            </div>
        </>
    )
}

export default ReportsView
