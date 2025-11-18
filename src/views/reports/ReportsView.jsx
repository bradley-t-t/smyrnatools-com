import React, {useEffect, useMemo, useState} from 'react';
import './styles/Reports.css';
import ReportsSubmitView from './ReportsSubmitView';
import ReportsReviewView from './ReportsReviewView';
import {supabase} from '../../services/DatabaseService';
import {UserService} from '../../services/UserService';
import {ReportService} from '../../services/ReportService';
import LoadingScreen from '../../components/common/LoadingScreen';
import {usePreferences} from '../../app/context/PreferencesContext';
import {RegionService} from '../../services/RegionService';
import {ReportUtility} from '../../utils/ReportUtility';
import PlantDropdownModal from '../../components/common/PlantDropdownModal';
import {reportTypeMap, reportTypes} from '../../types/ReportTypes';

const HARDCODED_TODAY = new Date();
const REPORTS_START_DATE = new Date('2025-07-20');
const totalMyWeeks = ReportUtility.getTotalWeeksSince(REPORTS_START_DATE, HARDCODED_TODAY);

function ReportsView() {
    const [localReports, setLocalReports] = useState([]);
    const [showForm, setShowForm] = useState(null);
    const [showReview, setShowReview] = useState(null);
    const [reviewData, setReviewData] = useState(null);
    const [tab, setTab] = useState('all');
    const [loadError, setLoadError] = useState('');
    const [user, setUser] = useState(null);
    const [userProfiles, setUserProfiles] = useState({});
    const [hasAssigned, setHasAssigned] = useState({});
    const [hasReviewPermission, setHasReviewPermission] = useState({});
    const [submitInitialData, setSubmitInitialData] = useState(null);
    const [plants, setPlants] = useState([]);
    const [filterReportType, setFilterReportType] = useState('');
    const [filterPlant, setFilterPlant] = useState('');
    const [managerEditUser, setManagerEditUser] = useState(null);
    const [regionType, setRegionType] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoadingMy, setIsLoadingMy] = useState(true);
    const [isLoadingReview, setIsLoadingReview] = useState(true);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [reviewLoadedWeeks, setReviewLoadedWeeks] = useState(new Set());
    const {preferences} = usePreferences();
    const [regionPlantCodes, setRegionPlantCodes] = useState(null);
    const [reporterPlantMap, setReporterPlantMap] = useState({});
    const [loadingReporterPlants, setLoadingReporterPlants] = useState(false);
    const [overdueItems, setOverdueItems] = useState([]);
    const [isLoadingOverdue, setIsLoadingOverdue] = useState(false);
    const [hasAnyReviewPermissionPrefix, setHasAnyReviewPermissionPrefix] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [myPageSize, setMyPageSize] = useState(10);
    const [myCurrentPage, setMyCurrentPage] = useState(1);
    const [reviewPageSize, setReviewPageSize] = useState(10);
    const [reviewCurrentPage, setReviewCurrentPage] = useState(1);
    const [overduePageSize, setOverduePageSize] = useState(10);
    const [overdueCurrentPage, setOverdueCurrentPage] = useState(1);
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);

    async function fetchProfilesFor(userIds) {
        const missing = userIds.filter(id => !userProfiles[id]);
        if (missing.length === 0) return;
        const {data: profiles, error} = await supabase
            .from('users_profiles')
            .select('id, first_name, last_name')
            .in('id', missing);
        if (!error && Array.isArray(profiles)) {
            setUserProfiles(prev => ({
                ...prev,
                ...profiles.reduce((map, p) => ({...map, [p.id]: p}), {})
            }));
        }
    }

    async function fetchReportsBatch({weeks, scope}) {
        if (!user || !Array.isArray(weeks) || weeks.length === 0) return;
        const isoList = weeks.map(w => new Date(w).toISOString());
        let query = supabase
            .from('reports')
            .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
            .in('week', isoList);
        if (scope === 'my') {
            const allowedMy = regionType === 'office'
                ? (hasAssigned['general_manager'] ? ['general_manager'] : [])
                : reportTypes.filter(rt => hasAssigned[rt.name]).map(rt => rt.name);
            query = query.eq('user_id', user.id);
            if (allowedMy.length > 0) query = query.in('report_name', allowedMy);
        } else if (scope === 'review') {
            const allowedReview = regionType === 'office'
                ? (hasReviewPermission['general_manager'] ? ['general_manager'] : [])
                : reportTypes.filter(rt => hasReviewPermission[rt.name] && rt.name !== 'general_manager').map(rt => rt.name);
            query = query.neq('user_id', user.id).eq('completed', true);
            if (allowedReview.length > 0) query = query.in('report_name', allowedReview);
        }
        const {data, error} = await query;
        if (error) {
            setLoadError(error.message || 'Error fetching reports');
            return;
        }
        if (!Array.isArray(data)) return;
        setLocalReports(prev => {
            const existingIds = new Set(prev.map(r => r.id));
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
                }));
            return [...prev, ...mapped];
        });
        const ids = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
        await fetchProfilesFor(ids);
    }

    useEffect(() => {
        async function init() {
            setIsLoadingUser(true);
            try {
                const u = await UserService.getCurrentUser();
                setUser(u && typeof u.id === 'string' ? u : null);
            } catch (err) {
                setLoadError(err?.message || 'Error fetching user');
                setUser(null);
            } finally {
                setIsLoadingUser(false);
            }
        }

        init();
    }, []);

    useEffect(() => {
        async function checkAssignedAndReview() {
            if (!user?.id) {
                setHasAssigned({});
                setHasReviewPermission({});
                setIsLoadingPermissions(false);
                return;
            }
            setIsLoadingPermissions(true);
            const assigned = {};
            const review = {};
            await Promise.all(reportTypes.map(async rt => {
                assigned[rt.name] = await UserService.hasAnyPermission(user.id, rt.assignment);
                review[rt.name] = (await Promise.all(rt.review.map(perm => UserService.hasPermission(user.id, perm)))).some(Boolean);
            }));
            setHasAssigned(assigned);
            setHasReviewPermission(review);
            setIsLoadingPermissions(false);
        }

        checkAssignedAndReview();
    }, [user?.id]);

    useEffect(() => {
        if (isLoadingPermissions) return;
        const allowedReviewTypes = regionType === 'office'
            ? (hasReviewPermission['general_manager'] ? ['general_manager'] : [])
            : reportTypes.filter(rt => hasReviewPermission[rt.name] && rt.name !== 'general_manager').map(rt => rt.name);
        setHasAnyReviewPermissionPrefix(allowedReviewTypes.length > 0);
    }, [hasReviewPermission, regionType, isLoadingPermissions]);

    useEffect(() => {
        async function fetchPlants() {
            const {data, error} = await supabase
                .from('plants')
                .select('plant_code,plant_name')
                .order('plant_code', {ascending: true});
            setPlants(!error && Array.isArray(data) ? data.filter(p => p.plant_code && p.plant_name) : []);
        }

        fetchPlants();
    }, []);

    useEffect(() => {
        if (!user || isLoadingPermissions) return;
        const initialMyWeeks = ReportUtility.getLastNWeekIsos(totalMyWeeks, HARDCODED_TODAY);

        async function loadInitial() {
            setIsLoadingMy(true);
            await fetchReportsBatch({weeks: initialMyWeeks, scope: 'my'});
            setIsLoadingMy(false);
        }

        loadInitial();
    }, [user?.id, isLoadingPermissions, hasAssigned, regionType, refreshKey]);

    useEffect(() => {
        if (!user || isLoadingPermissions || tab !== 'review') return;
        const desiredWeeks = new Set(ReportUtility.getLastNWeekIsos(52, HARDCODED_TODAY));
        const toLoad = Array.from(desiredWeeks).filter(w => !reviewLoadedWeeks.has(w));
        if (toLoad.length === 0) {
            if (isLoadingReview) setIsLoadingReview(false);
            return;
        }
        let cancelled = false;

        async function loadReview() {
            setIsLoadingReview(true);
            await fetchReportsBatch({weeks: toLoad, scope: 'review'});
            if (!cancelled) setReviewLoadedWeeks(prev => new Set([...toLoad, ...prev]));
            setIsLoadingReview(false);
        }

        loadReview();
        return () => {
            cancelled = true;
        };
    }, [tab, user?.id, isLoadingPermissions, regionType, refreshKey]);

    useEffect(() => {
        const code = preferences.selectedRegion?.code || '';
        let cancelled = false;

        async function loadRegion() {
            if (!code) {
                setRegionPlantCodes(null);
                setRegionType(null);
                return;
            }
            try {
                const region = await RegionService.fetchRegionByCode(code);
                setRegionType(region?.type || null);
                const list = await RegionService.fetchRegionPlants(code);
                if (cancelled) return;
                setRegionPlantCodes(new Set(list.map(p => p.plantCode)));
                if (filterPlant && !regionPlantCodes?.has(filterPlant)) setFilterPlant('');
            } catch {
                setRegionPlantCodes(new Set());
                setRegionType(null);
            }
        }

        loadRegion();
        return () => {
            cancelled = true;
        };
    }, [preferences.selectedRegion?.code, filterPlant]);

    useEffect(() => {
        const ids = Array.from(new Set([
            ...localReports.filter(r => r.completed && r.userId && r.userId !== user?.id).map(r => r.userId),
            ...(overdueItems || []).map(o => o.userId).filter(Boolean)
        ])).filter(id => !(id in reporterPlantMap));
        if (ids.length === 0) return;
        let cancelled = false;

        async function loadReporterPlants() {
            setLoadingReporterPlants(true);
            try {
                const entries = await Promise.all(ids.map(async id => [
                    id,
                    await Promise.race([
                        UserService.getUserPlant(id),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                    ]).catch(() => '')
                ]));
                if (!cancelled) {
                    setReporterPlantMap(prev => ({
                        ...prev,
                        ...Object.fromEntries(entries)
                    }));
                }
            } finally {
                if (!cancelled) setLoadingReporterPlants(false);
            }
        }

        loadReporterPlants();
        return () => {
            cancelled = true;
        };
    }, [localReports, user?.id, overdueItems]);

    useEffect(() => {
        if (tab !== 'overdue' || isLoadingPermissions) return;
        let cancelled = false;

        async function loadOverdue() {
            setIsLoadingOverdue(true);
            try {
                const allowedReview = regionType === 'office'
                    ? (hasReviewPermission['general_manager'] ? ['general_manager'] : [])
                    : reportTypes.filter(rt => hasReviewPermission[rt.name] && rt.name !== 'general_manager').map(rt => rt.name);
                const items = await ReportService.fetchOverdueAssignments(HARDCODED_TODAY, {
                    force: false,
                    allowedReview
                });
                if (!cancelled) {
                    setOverdueItems(items || []);
                    const ids = Array.from(new Set((items || []).map(i => i.userId).filter(Boolean)));
                    if (ids.length > 0) await fetchProfilesFor(ids);
                }
            } catch {
                if (!cancelled) setOverdueItems([]);
            } finally {
                if (!cancelled) setIsLoadingOverdue(false);
            }
        }

        loadOverdue();
        return () => {
            cancelled = true;
        };
    }, [tab, isLoadingPermissions, hasReviewPermission, regionType, refreshKey]);

    useEffect(() => {
        if (tab === 'overdue' && !hasAnyReviewPermissionPrefix) setTab('all');
    }, [tab, hasAnyReviewPermissionPrefix]);

    useEffect(() => {
        const interval = setInterval(() => setRefreshKey(prev => prev + 1), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setMyCurrentPage(1);
    }, [filterReportType, filterPlant]);

    useEffect(() => {
        setReviewCurrentPage(1);
    }, [filterReportType, filterPlant]);

    useEffect(() => {
        setOverdueCurrentPage(1);
    }, [filterReportType, filterPlant]);

    const weeksToShow = useMemo(() => ReportUtility.getLastNWeekIsos(totalMyWeeks, HARDCODED_TODAY), [totalMyWeeks]);

    const myReportsByWeek = useMemo(() => {
        const grouped = {};
        weeksToShow.forEach(weekIso => {
            reportTypes.forEach(rt => {
                if (!user || !hasAssigned[rt.name] || (regionType === 'office' && rt.name !== 'general_manager')) return;
                const existing = localReports.find(r =>
                    r.name === rt.name &&
                    r.userId === user.id &&
                    r.week &&
                    new Date(r.week).toISOString().slice(0, 10) === weekIso
                );
                grouped[weekIso] = grouped[weekIso] || [];
                grouped[weekIso].push({
                    ...rt,
                    weekIso,
                    completed: !!(existing && existing.completed),
                    report: existing || null
                });
            });
        });
        return grouped;
    }, [weeksToShow, user?.id, hasAssigned, localReports, regionType]);

    const reviewableReports = useMemo(() => (
        localReports
            .filter(r => r.completed && r.week && r.userId && r.userId !== user?.id && hasReviewPermission[r.name] && (regionType !== 'office' || r.name === 'general_manager'))
            .sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime())
    ), [localReports, hasReviewPermission, user?.id, regionType]);

    const reviewReportsByWeek = useMemo(() => {
        const grouped = {};
        reviewableReports.forEach(report => {
            const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : '';
            grouped[weekIso] = grouped[weekIso] || [];
            grouped[weekIso].push(report);
        });
        return grouped;
    }, [reviewableReports]);

    const sortedReviewWeeks = useMemo(() => Object.keys(reviewReportsByWeek).sort((a, b) => new Date(b) - new Date(a)), [reviewReportsByWeek]);

    function getUserName(userId) {
        const profile = userProfiles[userId];
        return profile && (profile.first_name || profile.last_name)
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : typeof userId === 'string' && userId.length > 0 ? userId.slice(0, 8) : '';
    }

    async function handleSubmitReport(formData, completed = true) {
        if (!showForm || !user?.id) {
            setLoadError('User not found');
            return;
        }
        const {weekIso, name: reportName} = showForm;
        const userId = user.id;
        const monday = weekIso ? new Date(weekIso) : null;
        const saturday = monday ? new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000) : null;
        const upsertData = {
            report_name: reportName,
            user_id: userId,
            data: {...formData, week: weekIso},
            week: monday?.toISOString() || null,
            completed,
            submitted_at: new Date().toISOString(),
            report_date_range_start: monday?.toISOString() || null,
            report_date_range_end: saturday?.toISOString() || null
        };
        const {data: existing, error: findError} = await supabase
            .from('reports')
            .select('id')
            .eq('report_name', reportName)
            .eq('user_id', userId)
            .eq('week', monday?.toISOString() || null)
            .maybeSingle();
        if (findError) {
            setLoadError(findError.message || 'Error checking for existing report');
            return;
        }
        const response = existing?.id
            ? await supabase
                .from('reports')
                .update(upsertData)
                .eq('id', existing.id)
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single()
            : await supabase
                .from('reports')
                .insert([upsertData])
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single();
        const {data, error} = response;
        if (error) {
            setLoadError(error.message || 'Error submitting report');
            return;
        }
        if (data?.id) {
            setLocalReports(prev => [
                ...prev.filter(r => r.id !== data.id),
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
            ]);
            setShowForm(null);
        }
    }

    async function handleManagerEditSubmit(formData) {
        if (!showForm || !managerEditUser) {
            setLoadError('No user selected for manager edit');
            return;
        }
        const {weekIso, name: reportName} = showForm;
        const userId = managerEditUser;
        const monday = weekIso ? new Date(weekIso) : null;
        const saturday = monday ? new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000) : null;
        const upsertData = {
            report_name: reportName,
            user_id: userId,
            data: {...formData, week: weekIso},
            week: monday?.toISOString() || null,
            completed: true,
            submitted_at: new Date().toISOString(),
            report_date_range_start: monday?.toISOString() || null,
            report_date_range_end: saturday?.toISOString() || null
        };
        const {data: existing, error: findError} = await supabase
            .from('reports')
            .select('id')
            .eq('report_name', reportName)
            .eq('user_id', userId)
            .eq('week', monday?.toISOString() || null)
            .maybeSingle();
        if (findError) {
            setLoadError(findError.message || 'Error checking for existing report');
            return;
        }
        const response = existing?.id
            ? await supabase
                .from('reports')
                .update(upsertData)
                .eq('id', existing.id)
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single()
            : await supabase
                .from('reports')
                .insert([upsertData])
                .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
                .single();
        const {data, error} = response;
        if (error) {
            setLoadError(error.message || 'Error submitting report');
            return;
        }
        if (data?.id) {
            setLocalReports(prev => [
                ...prev.filter(r => r.id !== data.id),
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
            ]);
            setShowForm(null);
            setManagerEditUser(null);
        }
    }

    async function handleReview(report) {
        if (report.userId !== user?.id) {
            const {error} = await supabase
                .from('reports')
                .update({been_reviewed: true})
                .eq('id', report.id);
            if (!error) {
                setLocalReports(prev => prev.map(r => r.id === report.id ? {...r, been_reviewed: true} : r));
            }
        }
        setReviewData(report);
        setShowReview(reportTypes.find(rt => rt.name === report.name));
    }

    function handleManagerEdit(reportType, reportData) {
        setShowReview(null);
        setReviewData(null);
        setShowForm({
            ...reportType,
            weekIso: reportData.week || reportData.data?.week,
            name: reportType.name
        });
        setSubmitInitialData({
            ...reportData,
            data: reportData.data
        });
        setManagerEditUser(reportData.userId);
    }

    async function handleShowForm(item) {
        setSubmitInitialData(null);
        if (!user || !item?.name || !item.weekIso) {
            setShowForm(item);
            return;
        }
        const {data, error} = await supabase
            .from('reports')
            .select('id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week,been_reviewed')
            .eq('report_name', item.name)
            .eq('user_id', user.id)
            .eq('week', new Date(item.weekIso).toISOString())
            .maybeSingle();
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
            });
        }
        setShowForm(item);
    }

    const visibleReviewReports = useMemo(() => reviewableReports.filter(report => {
        const reporterPlant = reporterPlantMap[report.userId] || '';
        const matchPlant = !filterPlant || reporterPlant === filterPlant;
        const matchRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(reporterPlant) || report.name === 'general_manager';
        return (!filterReportType || report.name === filterReportType) && matchPlant && matchRegion;
    }, [reviewableReports, filterReportType, filterPlant, preferences.selectedRegion?.code, regionPlantCodes, reporterPlantMap]));

    const allMyItems = useMemo(() => Object.values(myReportsByWeek).flat(), [myReportsByWeek]);
    const myTotalPages = useMemo(() => Math.ceil(allMyItems.length / myPageSize), [allMyItems.length, myPageSize]);
    const myPaginatedItems = useMemo(() => allMyItems.slice((myCurrentPage - 1) * myPageSize, myCurrentPage * myPageSize), [allMyItems, myCurrentPage, myPageSize]);

    const reviewTotalPages = useMemo(() => Math.ceil(visibleReviewReports.length / reviewPageSize), [visibleReviewReports.length, reviewPageSize]);
    const reviewPaginatedItems = useMemo(() => visibleReviewReports.slice((reviewCurrentPage - 1) * reviewPageSize, reviewCurrentPage * reviewPageSize), [visibleReviewReports, reviewCurrentPage, reviewPageSize]);

    const filteredOverdueItems = useMemo(() => (
        (overdueItems || [])
            .filter(item => {
                const matchType = (!filterReportType || item.report_name === filterReportType) && (regionType !== 'office' || item.report_name === 'general_manager');
                const reporterPlant = reporterPlantMap[item.userId] || '';
                const matchPlant = !filterPlant || reporterPlant === filterPlant;
                const matchRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(reporterPlant);
                return matchType && matchPlant && matchRegion;
            })
            .sort((a, b) => new Date(b.week) - new Date(a.week))
    ), [overdueItems, filterReportType, filterPlant, preferences.selectedRegion?.code, regionPlantCodes, reporterPlantMap, regionType]);

    const overdueTotalPages = useMemo(() => Math.ceil(filteredOverdueItems.length / overduePageSize), [filteredOverdueItems.length, overduePageSize]);
    const overduePaginatedItems = useMemo(() => filteredOverdueItems.slice((overdueCurrentPage - 1) * overduePageSize, overdueCurrentPage * overduePageSize), [filteredOverdueItems, overdueCurrentPage, overduePageSize]);

    const regionalPlants = plants.filter(p => !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(p.plant_code));
    const selectedPlantObj = regionalPlants.find(p => p.plant_code === filterPlant);
    const plantDisplayText = filterPlant ? `(${selectedPlantObj?.plant_code}) ${selectedPlantObj?.plant_name}` : 'All Plants';

    return (
        <div className="rpts-root">
            {loadError && <div className="rpts-load-error">{loadError}</div>}
            {!showForm && !showReview && (
                <div>
                    <div className="rpts-toolbar rpts-toolbar-sticky">
                        <div className="rpts-toolbar-left">
                            <div className="rpts-toolbar-title">
                                <i className="fas fa-file-alt"></i>
                                <span>Reports</span>
                            </div>
                        </div>
                        <div className="rpts-toolbar-right">
                            <button
                                className="rpts-refresh-btn"
                                onClick={() => {
                                    setIsRefreshing(true);
                                    setRefreshKey(prev => prev + 1);
                                    setTimeout(() => setIsRefreshing(false), 1000);
                                }}
                                type="button"
                            >
                                <i className={`fas fa-sync ${isRefreshing ? 'spinning' : ''}`}></i> Refresh
                            </button>
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
                                <button
                                    className="rpts-select-control"
                                    onClick={() => setIsPlantModalOpen(true)}
                                    type="button"
                                >
                                    {plantDisplayText}
                                </button>
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
                                    weeksToShow.length === 0 ? (
                                        <div className="rpts-empty">
                                            <i className="fas fa-check-circle"></i>
                                            <div>No reports</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="rpt-sticky-header-wrapper">
                                                <div className="rpt-list-headers header-row">
                                                    <div style={{width: '20%'}}>Week</div>
                                                    <div style={{width: '25%'}}>Report Type</div>
                                                    <div style={{width: '20%'}}>Status</div>
                                                    <div style={{width: '20%'}}>Due Date</div>
                                                    <div style={{width: '15%'}}>Actions</div>
                                                </div>
                                            </div>
                                            <div className="rpt-table-wrapper">
                                                <table className="rpt-table rpt-table-accent rpt-table-my-reports">
                                                    <tbody>
                                                    {myPaginatedItems.map((item, index) => {
                                                        const {weekIso} = item;
                                                        const {
                                                            monday,
                                                            saturday
                                                        } = ReportUtility.getWeekDatesFromIso(weekIso);
                                                        const weekRange = ReportService.getWeekRangeString(monday, saturday);
                                                        const today = new Date();
                                                        const hasSavedData = !!(item.report && item.report.data);
                                                        const {
                                                            statusText,
                                                            statusClass,
                                                            buttonLabel
                                                        } = ReportUtility.computeMyReportStatus({
                                                            completed: item.completed,
                                                            hasSavedData,
                                                            weekIso,
                                                            today
                                                        });
                                                        const badge = ReportUtility.getWeekBadge(weekIso);
                                                        const badgeClass = badge === 'This Week' ? 'rpts-badge-this-week' : badge === 'Last Week' ? 'rpts-badge-last-week' : badge === 'Older' ? 'rpts-badge-older' : '';
                                                        const baseDelay = 80;
                                                        const minDelay = baseDelay / 2;
                                                        const delayDecrement = Math.max(0, (baseDelay - minDelay) / myPaginatedItems.length);
                                                        const delay = Math.max(minDelay, baseDelay - (delayDecrement * index));
                                                        return (
                                                            <tr
                                                                key={item.name + item.weekIso}
                                                                className='rpt-row rpt-row-animated'
                                                                style={{animationDelay: `${index * delay}ms`}}
                                                            >
                                                                <td className="rpt-td rpt-week-td">
                                                                    <span
                                                                        className={`rpts-badge ${badgeClass}`}>{badge}</span> {weekRange}
                                                                </td>
                                                                <td className="rpt-td">{item.title}</td>
                                                                <td className="rpt-td">
                                                                    <span
                                                                        className={`rpts-status ${statusClass}`}>{statusText}</span>
                                                                </td>
                                                                <td className="rpt-td">{saturday.toLocaleDateString()}</td>
                                                                <td className="rpt-td right">
                                                                    <button className="rpts-list-action"
                                                                            onClick={() => handleShowForm(item)}>
                                                                        {buttonLabel}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="rpts-pagination rpts-pagination-animated">
                                                <div className="rpts-page-size">
                                                    <label>Show:</label>
                                                    <select
                                                        value={myPageSize}
                                                        onChange={e => {
                                                            setMyPageSize(Number(e.target.value));
                                                            setMyCurrentPage(1);
                                                        }}
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                                <div className="rpts-page-controls">
                                                    <button
                                                        onClick={() => setMyCurrentPage(Math.max(1, myCurrentPage - 1))}
                                                        disabled={myCurrentPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span>Page {myCurrentPage} of {myTotalPages}</span>
                                                    <button
                                                        onClick={() => setMyCurrentPage(Math.min(myTotalPages, myCurrentPage + 1))}
                                                        disabled={myCurrentPage === myTotalPages}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
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
                                    visibleReviewReports.length === 0 ? (
                                        <div className="rpts-empty">
                                            <i className="fas fa-user-check"></i>
                                            <div>No reports to review</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="rpt-sticky-header-wrapper">
                                                <div className="rpt-list-headers header-row">
                                                    <div style={{width: '18%'}}>Week</div>
                                                    <div style={{width: '22%'}}>Report Type</div>
                                                    <div style={{width: '20%'}}>Submitted By</div>
                                                    <div style={{width: '16%'}}>Submitted Date</div>
                                                    <div style={{width: '12%'}}>Reviewed</div>
                                                    <div style={{width: '12%'}}>Actions</div>
                                                </div>
                                            </div>
                                            <div className="rpt-table-wrapper">
                                                <table className="rpt-table rpt-table-accent rpt-table-review">
                                                    <tbody>
                                                    {reviewPaginatedItems.map((report, index) => {
                                                        const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : '';
                                                        const {
                                                            monday,
                                                            saturday
                                                        } = ReportUtility.getWeekDatesFromIso(weekIso);
                                                        const weekRange = ReportService.getWeekRangeString(monday, saturday);
                                                        const baseDelay = 80;
                                                        const minDelay = baseDelay / 2;
                                                        const delayDecrement = Math.max(0, (baseDelay - minDelay) / reviewPaginatedItems.length);
                                                        const delay = Math.max(minDelay, baseDelay - (delayDecrement * index));
                                                        return (
                                                            <tr
                                                                key={report.id}
                                                                className='rpt-row rpt-row-animated'
                                                                style={{animationDelay: `${index * delay}ms`}}
                                                            >
                                                                <td className="rpt-td rpt-week-td">
                                                                        <span
                                                                            className={`rpts-badge ${ReportUtility.getWeekBadge(weekIso) === 'This Week' ? 'rpts-badge-this-week' : ReportUtility.getWeekBadge(weekIso) === 'Last Week' ? 'rpts-badge-last-week' : ReportUtility.getWeekBadge(weekIso) === 'Older' ? 'rpts-badge-older' : ''}`}>
                                                                            {ReportUtility.getWeekBadge(weekIso)}
                                                                        </span> {weekRange}
                                                                </td>
                                                                <td className="rpt-td">{report.title}</td>
                                                                <td className="rpt-td">{getUserName(report.userId)}</td>
                                                                <td className="rpt-td">{new Date(report.completedDate).toLocaleDateString()}</td>
                                                                <td className="rpt-td">
                                                                    {report.been_reviewed ? (
                                                                        <>
                                                                            <i className="fas fa-check-circle rpts-reviewed-check"></i> Reviewed
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <i className="fas fa-flag rpts-reviewed-flag"></i> Not
                                                                            Reviewed
                                                                        </>
                                                                    )}
                                                                </td>
                                                                <td className="rpt-td right">
                                                                    <button className="rpts-list-action"
                                                                            onClick={() => handleReview(report)}>
                                                                        Review
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="rpts-pagination rpts-pagination-animated">
                                                <div className="rpts-page-size">
                                                    <label>Show:</label>
                                                    <select
                                                        value={reviewPageSize}
                                                        onChange={e => {
                                                            setReviewPageSize(Number(e.target.value));
                                                            setReviewCurrentPage(1);
                                                        }}
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                                <div className="rpts-page-controls">
                                                    <button
                                                        onClick={() => setReviewCurrentPage(Math.max(1, reviewCurrentPage - 1))}
                                                        disabled={reviewCurrentPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span>Page {reviewCurrentPage} of {reviewTotalPages}</span>
                                                    <button
                                                        onClick={() => setReviewCurrentPage(Math.min(reviewTotalPages, reviewCurrentPage + 1))}
                                                        disabled={reviewCurrentPage === reviewTotalPages}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
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
                                    filteredOverdueItems.length === 0 ? (
                                        <div className="rpts-empty">
                                            <i className="fas fa-exclamation-circle"></i>
                                            <div>No overdue reports</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="rpt-sticky-header-wrapper">
                                                <div className="rpt-list-headers header-row">
                                                    <div style={{width: '22%'}}>Week</div>
                                                    <div style={{width: '26%'}}>Report Type</div>
                                                    <div style={{width: '26%'}}>Owed By</div>
                                                    <div style={{width: '26%'}}>Due Date</div>
                                                </div>
                                            </div>
                                            <div className="rpt-table-wrapper">
                                                <table className="rpt-table rpt-table-accent rpt-table-overdue">
                                                    <tbody>
                                                    {overduePaginatedItems.map((item, index) => {
                                                        const {week: weekIso} = item;
                                                        const {
                                                            monday,
                                                            saturday
                                                        } = ReportUtility.getWeekDatesFromIso(weekIso);
                                                        const weekRange = ReportService.getWeekRangeString(monday, saturday);
                                                        const title = (reportTypeMap[item.report_name] || {}).title || item.report_name;
                                                        const baseDelay = 80;
                                                        const minDelay = baseDelay / 2;
                                                        const delayDecrement = Math.max(0, (baseDelay - minDelay) / overduePaginatedItems.length);
                                                        const delay = Math.max(minDelay, baseDelay - (delayDecrement * index));
                                                        return (
                                                            <tr
                                                                key={`${item.userId}-${item.report_name}-${item.week}`}
                                                                className='rpt-row rpt-row-animated'
                                                                style={{animationDelay: `${index * delay}ms`}}
                                                            >
                                                                <td className="rpt-td rpt-week-td">
                                                                        <span
                                                                            className={`rpts-badge ${ReportUtility.getWeekBadge(weekIso) === 'This Week' ? 'rpts-badge-this-week' : ReportUtility.getWeekBadge(weekIso) === 'Last Week' ? 'rpts-badge-last-week' : ReportUtility.getWeekBadge(weekIso) === 'Older' ? 'rpts-badge-older' : ''}`}>
                                                                            {ReportUtility.getWeekBadge(weekIso)}
                                                                        </span> {weekRange}
                                                                </td>
                                                                <td className="rpt-td">{title}</td>
                                                                <td className="rpt-td">{getUserName(item.userId)}</td>
                                                                <td className="rpt-td">{saturday.toLocaleDateString()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="rpts-pagination rpts-pagination-animated">
                                                <div className="rpts-page-size">
                                                    <label>Show:</label>
                                                    <select
                                                        value={overduePageSize}
                                                        onChange={e => {
                                                            setOverduePageSize(Number(e.target.value));
                                                            setOverdueCurrentPage(1);
                                                        }}
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                                <div className="rpts-page-controls">
                                                    <button
                                                        onClick={() => setOverdueCurrentPage(Math.max(1, overdueCurrentPage - 1))}
                                                        disabled={overdueCurrentPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span>Page {overdueCurrentPage} of {overdueTotalPages}</span>
                                                    <button
                                                        onClick={() => setOverdueCurrentPage(Math.min(overdueTotalPages, overdueCurrentPage + 1))}
                                                        disabled={overdueCurrentPage === overdueTotalPages}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showForm && (
                <ReportsSubmitView
                    report={reportTypeMap[showForm.name] ? {
                        ...reportTypeMap[showForm.name],
                        weekIso: showForm.weekIso
                    } : showForm}
                    initialData={submitInitialData}
                    onBack={() => {
                        setShowForm(null);
                        setManagerEditUser(null);
                    }}
                    onSubmit={(form, submitType) => {
                        if (managerEditUser) {
                            handleManagerEditSubmit(form);
                        } else {
                            handleSubmitReport(form, submitType === 'submit');
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
                        setShowReview(null);
                        setReviewData(null);
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
                        setFilterPlant(plantCode);
                        setIsPlantModalOpen(false);
                    }}
                    showAllPlants={true}
                />
            )}
        </div>
    );
}

export default ReportsView;