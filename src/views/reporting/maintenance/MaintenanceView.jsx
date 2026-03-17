import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import TopSection from '../../../app/components/sections/TopSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { MaintenanceLogService } from '../../../services/MaintenanceLogService'
import { MaintenanceService } from '../../../services/MaintenanceService'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import { formatFrequency, formatMaintenanceDate } from '../../../utils/MaintenanceUtility'
import MaintenanceCreateFormView from './MaintenanceCreateFormView'
import MaintenanceFormView from './MaintenanceFormView'
import MaintenanceLogView from './MaintenanceLogView'

// ── Constants ───────────────────────────────────────────────────

const STATUS_BADGE_CLASSES = {
    approved: 'bg-emerald-100 text-emerald-700 border border-emerald-500',
    completed: 'bg-emerald-100 text-emerald-700 border border-emerald-500',
    default: 'bg-indigo-100 text-indigo-700 border border-indigo-500',
    overdue: 'bg-red-100 text-red-700 border border-red-500',
    pending: 'bg-amber-100 text-amber-700 border border-amber-500',
    rejected: 'bg-red-100 text-red-700 border border-red-500',
    submitted: 'bg-indigo-100 text-indigo-700 border border-indigo-500'
}

const ICON_BY_STATUS = {
    approved: 'fa-check-circle',
    completed: 'fa-check-circle',
    overdue: 'fa-exclamation-circle',
    pending: 'fa-clipboard-list',
    rejected: 'fa-times-circle',
    submitted: 'fa-clock'
}

const ICON_BG_BY_STATUS = {
    completed: 'bg-emerald-100 text-emerald-500',
    overdue: 'bg-red-100 text-red-500',
    approved: 'bg-emerald-100 text-emerald-500',
    rejected: 'bg-red-100 text-red-500',
    submitted: 'bg-blue-100 text-blue-500'
}

const TAB_DEFS = [
    { key: 'log', icon: 'fa-chart-line', label: 'Maintenance Log' },
    { key: 'due', icon: 'fa-clipboard-list', label: 'My Tasks' },
    { key: 'review', icon: 'fa-clipboard-check', label: 'Review', permission: 'canReview' },
    { key: 'history', icon: 'fa-history', label: 'History' },
    { key: 'manage', icon: 'fa-cog', label: 'Manage Forms' }
]

const STATUS_OPTIONS = ['All Statuses', 'OK', 'Due Soon', 'Overdue', 'Never Serviced']

// ── Sub-components ──────────────────────────────────────────────

function StatusBadge({ status }) {
    const cls = STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.default
    return (
        <span className={`inline-block rounded-md text-xs font-bold uppercase tracking-wide px-3 py-1.5 ${cls}`}>
            {status}
        </span>
    )
}

function FormTabSkeleton({ count = 5 }) {
    return (
        <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
            <div className="flex flex-col gap-4">
                {Array.from({ length: count }, (_, i) => (
                    <div
                        key={i}
                        className="flex items-start gap-4 rounded-xl border border-[var(--border-light)] p-5"
                        style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                    >
                        <div className="w-12 h-12 rounded-xl bg-slate-200 animate-pulse shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="h-4 w-48 rounded bg-slate-200 animate-pulse mb-2" />
                            <div className="h-3 w-64 rounded bg-slate-200 animate-pulse mb-3" />
                            <div className="flex gap-4">
                                <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                                <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                            </div>
                        </div>
                        <div className="h-6 w-20 rounded-md bg-slate-200 animate-pulse shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    )
}

function ItemIcon({ status }) {
    const icon = ICON_BY_STATUS[status] || ICON_BY_STATUS.pending
    const bg = ICON_BG_BY_STATUS[status] || 'bg-blue-100 text-blue-500'
    return (
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-xl shrink-0 ${bg}`}>
            <i className={`fas ${icon}`} />
        </div>
    )
}

function EmptyState({ icon, title, message, children }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <i className={`fas ${icon} text-[4rem] mb-4 text-[var(--border-medium)]`} />
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{title}</h3>
            <p className="text-[0.9375rem] text-[var(--text-secondary)] mb-6">{message}</p>
            {children}
        </div>
    )
}

function ItemCard({ item, status, title, description, meta, onClick }) {
    return (
        <div
            className={`flex items-start gap-4 rounded-xl border border-[var(--border-light)] p-5 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                status === 'completed' ? 'bg-[var(--bg-secondary)] opacity-70' : 'bg-[var(--bg-primary)]'
            }`}
            onClick={onClick}
        >
            <ItemIcon status={status} />
            <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h4>
                {description && <p className="text-sm text-[var(--text-secondary)] mb-3">{description}</p>}
                <div className="flex items-center flex-wrap gap-4">
                    {meta.map(({ icon, text, highlight }) => (
                        <span
                            key={text}
                            className={`flex items-center gap-1.5 text-[0.8125rem] ${
                                highlight
                                    ? 'bg-[var(--bg-secondary)] border border-blue-500 rounded-md text-blue-500 font-semibold px-2.5 py-1'
                                    : 'text-[var(--text-secondary)]'
                            }`}
                        >
                            <i className={`fas ${icon}`} />
                            {text}
                        </span>
                    ))}
                </div>
            </div>
            <div className="shrink-0">
                <StatusBadge status={status} />
            </div>
        </div>
    )
}

// ── Main View ───────────────────────────────────────────────────

export default function MaintenanceView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#2A3163'
    const headerRef = useRef(null)

    const [activeTab, setActiveTab] = useState('log')

    // ── Shared filter state (lives in TopSection) ───────────────
    const [searchText, setSearchText] = useState('')
    const [selectedPlant, setSelectedPlant] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    // ── Equipment log data ──────────────────────────────────────
    const [logLoading, setLogLoading] = useState(true)
    const [equipment, setEquipment] = useState([])
    const [categories, setCategories] = useState([])
    const [recentEntries, setRecentEntries] = useState([])
    const [serviceTypes, setServiceTypes] = useState([])
    const [regionPlants, setRegionPlants] = useState([])
    const [showAddModal, setShowAddModal] = useState(false)

    // ── Form system state ───────────────────────────────────────
    const [formLoading, setFormLoading] = useState(true)
    const [dueItems, setDueItems] = useState([])
    const [pendingReviews, setPendingReviews] = useState([])
    const [reviewedSubmissions, setReviewedSubmissions] = useState([])
    const [mySubmissions, setMySubmissions] = useState([])
    const [myForms, setMyForms] = useState([])
    const [permissions, setPermissions] = useState({ canCreate: false, canReview: false })

    // Form navigation
    const [selectedItem, setSelectedItem] = useState(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingForm, setEditingForm] = useState(null)

    const regionCode = preferences.selectedRegion?.code

    // ── Data Loading ────────────────────────────────────────────

    useEffect(() => {
        loadLogData()
        loadFormData()
    }, [regionCode])

    const loadLogData = useCallback(async () => {
        setLogLoading(true)
        try {
            const [eq, cats, svcTypes, recent, plants] = await Promise.all([
                MaintenanceLogService.fetchEquipmentSummary().catch(() => []),
                MaintenanceLogService.fetchCategories().catch(() => []),
                MaintenanceLogService.fetchServiceTypes().catch(() => []),
                MaintenanceLogService.fetchRecentEntries(10).catch(() => []),
                regionCode ? PlantService.fetchRegionPlants(regionCode).catch(() => []) : []
            ])
            setEquipment(eq)
            setCategories(cats)
            setServiceTypes(svcTypes)
            setRecentEntries(recent)
            setRegionPlants(plants)
        } catch {
            setEquipment([])
        } finally {
            setLogLoading(false)
        }
    }, [regionCode])

    const loadFormData = async () => {
        setFormLoading(true)
        try {
            const perms = await MaintenanceService.checkPermissions().catch(() => ({
                canCreate: false,
                canReview: false
            }))
            setPermissions(perms)
            const user = await UserService.getCurrentUser()
            const [due, reviews, reviewed, submissions, forms] = await Promise.all([
                MaintenanceService.fetchMyDueItems().catch(() => []),
                perms.canReview ? MaintenanceService.fetchPendingReviews().catch(() => []) : [],
                perms.canReview ? MaintenanceService.fetchReviewedSubmissions().catch(() => []) : [],
                MaintenanceService.fetchMySubmissions(user?.id).catch(() => []),
                MaintenanceService.fetchForms({ createdBy: user?.id }).catch(() => [])
            ])
            setDueItems(due)
            setPendingReviews(reviews)
            setReviewedSubmissions(reviewed)
            setMySubmissions(submissions)
            setMyForms(forms)
        } catch {
            setDueItems([])
            setPendingReviews([])
            setReviewedSubmissions([])
            setMySubmissions([])
            setMyForms([])
        } finally {
            setFormLoading(false)
        }
    }

    // ── Derived state ───────────────────────────────────────────

    const isLoading = logLoading || formLoading

    const regionPlantCodes = useMemo(() => {
        const codes = new Set()
        regionPlants.forEach((p) => {
            const code = String(p.plantCode || p.plant_code || '')
                .trim()
                .toUpperCase()
            if (code) codes.add(code)
        })
        return codes
    }, [regionPlants])

    const categoryOptions = useMemo(() => {
        const names = [...new Set(equipment.map((e) => e.category_name).filter(Boolean))].sort()
        return ['All Categories', ...names]
    }, [equipment])

    const logCounts = useMemo(() => {
        const query = searchText.trim().toLowerCase()
        const scoped = equipment.filter((item) => {
            if (query) {
                const searchable = [
                    item.name,
                    item.serial_number,
                    item.manufacturer,
                    item.model,
                    item.category_name,
                    item.plant_code
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                if (!searchable.includes(query)) return false
            }
            if (selectedPlant && selectedPlant !== 'All' && !selectedPlant.startsWith('DISTRICT:')) {
                if ((item.plant_code || '').toUpperCase() !== selectedPlant.toUpperCase()) return false
            }
            if (categoryFilter && item.category_name !== categoryFilter) return false
            return true
        })
        return MaintenanceLogService.getStatusCounts(scoped)
    }, [equipment, searchText, selectedPlant, categoryFilter])

    const showReset =
        searchText ||
        (selectedPlant && selectedPlant !== 'All') ||
        categoryFilter ||
        (statusFilter && statusFilter !== 'All Statuses')

    const badge = !logLoading
        ? `${logCounts.total} Total · ${logCounts.ok} OK · ${logCounts.dueSoon} Due Soon · ${logCounts.overdue} Overdue`
        : undefined

    // ── Handlers ────────────────────────────────────────────────

    const handlePillClick = useCallback((label) => {
        const map = { 'Due Soon': 'Due Soon', OK: 'OK', Overdue: 'Overdue', Total: 'All Statuses' }
        setStatusFilter((prev) => {
            const target = map[label] || 'All Statuses'
            return prev === target ? 'All Statuses' : target
        })
    }, [])

    const handleItemClick = async (item) => {
        if (item.status === 'completed' && item.submission_id) {
            try {
                const submission = await MaintenanceService.fetchSubmissionById(item.submission_id)
                setSelectedItem({ ...item, ...submission, isEditing: true })
            } catch {
                setSelectedItem(item)
            }
        } else {
            setSelectedItem(item)
        }
    }

    const handleViewSubmission = (submission) => {
        setSelectedItem({
            ...submission,
            isReview: permissions.canReview,
            isViewOnly: submission.status !== 'submitted'
        })
    }

    const handleFormSubmitted = () => {
        setSelectedItem(null)
        loadFormData()
    }

    const handleFormCreated = () => {
        setShowCreateForm(false)
        setEditingForm(null)
        loadFormData()
    }

    const handleEditForm = (form) => {
        setEditingForm(form)
        setShowCreateForm(true)
    }

    const handleReset = () => {
        setSearchText('')
        setSelectedPlant('')
        setCategoryFilter('')
        setStatusFilter('')
    }

    // ── Badge counts ────────────────────────────────────────────

    const dueBadgeCount = dueItems.filter((i) => i.status !== 'completed').length
    const reviewBadgeCount = pendingReviews.length

    const getBadge = (tabKey) => {
        if (tabKey === 'due' && dueBadgeCount > 0) return dueBadgeCount
        if (tabKey === 'review' && reviewBadgeCount > 0) return reviewBadgeCount
        return null
    }

    // ── Full-screen form views ──────────────────────────────────

    if (selectedItem) {
        return (
            <MaintenanceFormView
                item={selectedItem}
                onBack={() => setSelectedItem(null)}
                onSubmitted={handleFormSubmitted}
            />
        )
    }

    if (showCreateForm) {
        return (
            <MaintenanceCreateFormView
                editingForm={editingForm}
                onBack={() => {
                    setShowCreateForm(false)
                    setEditingForm(null)
                }}
                onSaved={handleFormCreated}
            />
        )
    }

    // ── Tab content renderers ───────────────────────────────────

    const renderDueTab = () => {
        if (formLoading) return <FormTabSkeleton />

        const filtered = dueItems.filter((item) => {
            if (selectedPlant && selectedPlant !== 'All' && item.plant_code !== selectedPlant) return false
            if (searchText) {
                const q = searchText.trim().toLowerCase()
                const searchable = [item.form?.title, item.plant_code].filter(Boolean).join(' ').toLowerCase()
                if (!searchable.includes(q)) return false
            }
            return true
        })

        if (filtered.length === 0) {
            return (
                <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                    <EmptyState
                        icon="fa-check-circle"
                        title={dueItems.length === 0 ? 'All caught up!' : 'No matching tasks'}
                        message={
                            dueItems.length === 0
                                ? 'You have no maintenance tasks due at this time.'
                                : 'Try adjusting your filters.'
                        }
                    />
                </div>
            )
        }

        return (
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                <div className="flex flex-col gap-4">
                    {filtered.map((item) => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            status={item.status}
                            title={item.form?.title}
                            description={item.form?.description}
                            meta={[
                                { icon: 'fa-calendar', text: `Due: ${formatMaintenanceDate(item.due_date)}` },
                                {
                                    icon: 'fa-sync-alt',
                                    text: formatFrequency(item.form?.frequency, item.form?.frequency_value)
                                },
                                ...(item.plant_code
                                    ? [{ icon: 'fa-building', text: item.plant_code, highlight: true }]
                                    : [])
                            ]}
                            onClick={() => handleItemClick(item)}
                        />
                    ))}
                </div>
            </div>
        )
    }

    const renderReviewTab = () => {
        if (formLoading) return <FormTabSkeleton />

        const allReviews = [...pendingReviews, ...reviewedSubmissions].sort((a, b) => {
            if (a.status === 'submitted' && b.status !== 'submitted') return -1
            if (a.status !== 'submitted' && b.status === 'submitted') return 1
            return new Date(b.submitted_at || b.reviewed_at) - new Date(a.submitted_at || a.reviewed_at)
        })

        if (allReviews.length === 0) {
            return (
                <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                    <EmptyState
                        icon="fa-clipboard-check"
                        title="No submissions to review"
                        message="Submissions requiring review will appear here."
                    />
                </div>
            )
        }

        return (
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                <div className="flex flex-col gap-4">
                    {allReviews.map((submission) => {
                        const isPending = submission.status === 'submitted'
                        return (
                            <ItemCard
                                key={submission.id}
                                item={submission}
                                status={submission.status}
                                title={submission.maintenance_forms?.title}
                                description={
                                    isPending
                                        ? 'Pending review'
                                        : submission.status === 'approved'
                                          ? 'Approved'
                                          : 'Rejected'
                                }
                                meta={[
                                    {
                                        icon: 'fa-calendar',
                                        text: isPending
                                            ? `Submitted: ${formatMaintenanceDate(submission.submitted_at)}`
                                            : `Reviewed: ${formatMaintenanceDate(submission.reviewed_at)}`
                                    },
                                    { icon: 'fa-building', text: submission.plant_code || 'N/A' },
                                    ...(submission.submitted_by_name
                                        ? [{ icon: 'fa-user', text: submission.submitted_by_name }]
                                        : [])
                                ]}
                                onClick={() =>
                                    isPending
                                        ? handleItemClick({
                                              ...submission,
                                              form: submission.maintenance_forms,
                                              isReview: true
                                          })
                                        : handleViewSubmission(submission)
                                }
                            />
                        )
                    })}
                </div>
            </div>
        )
    }

    const renderHistoryTab = () => {
        if (formLoading) return <FormTabSkeleton />

        if (mySubmissions.length === 0) {
            return (
                <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                    <EmptyState
                        icon="fa-history"
                        title="No submission history"
                        message="Your completed submissions will appear here."
                    />
                </div>
            )
        }

        return (
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                <div className="flex flex-col gap-4">
                    {mySubmissions.map((submission) => (
                        <ItemCard
                            key={submission.id}
                            item={submission}
                            status={submission.status}
                            title={submission.maintenance_forms?.title}
                            description={[
                                submission.status === 'approved' && 'Approved',
                                submission.status === 'rejected' && 'Rejected',
                                submission.status === 'submitted' && 'Pending Review',
                                submission.review_notes && `— ${submission.review_notes}`
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            meta={[
                                {
                                    icon: 'fa-calendar',
                                    text: `Submitted: ${formatMaintenanceDate(submission.submitted_at)}`
                                },
                                ...(submission.reviewed_at
                                    ? [
                                          {
                                              icon: 'fa-clipboard-check',
                                              text: `Reviewed: ${formatMaintenanceDate(submission.reviewed_at)}`
                                          }
                                      ]
                                    : [])
                            ]}
                            onClick={() => handleViewSubmission(submission)}
                        />
                    ))}
                </div>
            </div>
        )
    }

    const renderManageTab = () => {
        if (formLoading) return <FormTabSkeleton />

        if (myForms.length === 0) {
            return (
                <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                    <EmptyState
                        icon="fa-folder-open"
                        title="No forms created"
                        message={
                            permissions.canCreate
                                ? 'Create your first maintenance form to get started.'
                                : 'No maintenance forms have been created yet.'
                        }
                    >
                        {permissions.canCreate && (
                            <button
                                className="flex items-center gap-2 rounded-xl text-sm font-semibold px-5 py-2.5 border-none cursor-pointer text-white transition-all"
                                style={{ background: accentColor }}
                                onClick={() => setShowCreateForm(true)}
                            >
                                <i className="fas fa-plus" /> Create Form
                            </button>
                        )}
                    </EmptyState>
                </div>
            )
        }

        return (
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm p-6">
                <div className="flex flex-col gap-4">
                    {myForms.map((form) => (
                        <ItemCard
                            key={form.id}
                            item={form}
                            status="default"
                            title={form.title}
                            description={form.description}
                            meta={[
                                { icon: 'fa-sync-alt', text: formatFrequency(form.frequency, form.frequency_value) },
                                { icon: 'fa-list', text: `${form.maintenance_form_fields?.length || 0} fields` },
                                { icon: 'fa-calendar-plus', text: `Created: ${formatMaintenanceDate(form.created_at)}` }
                            ]}
                            onClick={() => handleEditForm(form)}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // ── Render ──────────────────────────────────────────────────

    const visibleTabs = TAB_DEFS.filter((tab) => !tab.permission || permissions[tab.permission])

    const tabBar = (
        <div className="flex gap-1 -mx-7 px-7 border-t border-slate-200 mt-2 overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.key
                const tabBadge = getBadge(tab.key)
                return (
                    <button
                        key={tab.key}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-none bg-transparent cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                            isActive
                                ? 'border-b-2'
                                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                        style={isActive ? { borderColor: accentColor, color: accentColor } : undefined}
                        onClick={() => setActiveTab(tab.key)}
                        type="button"
                    >
                        <i className={`fas ${tab.icon}`} />
                        <span>{tab.label}</span>
                        {tabBadge && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[0.6875rem] font-bold">
                                {tabBadge}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )

    // Category filter dropdown for TopSection customFilters
    const categoryFilterSelect =
        categoryOptions.length > 1 ? (
            <select
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm cursor-pointer min-w-[140px] py-3 pl-4 pr-10 bg-no-repeat"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '18px'
                }}
                value={categoryFilter || 'All Categories'}
                onChange={(e) => setCategoryFilter(e.target.value === 'All Categories' ? '' : e.target.value)}
                aria-label="Category filter"
            >
                {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        ) : null

    return (
        <div className="min-h-full w-full" style={{ background: 'var(--bg-secondary)' }}>
            <TopSection
                isLoading={isLoading}
                title="Maintenance"
                forwardedRef={headerRef}
                sticky
                badge={badge}
                onPillClick={handlePillClick}
                addButtonLabel={activeTab === 'log' ? 'Add Part / Unit / Component' : undefined}
                onAddClick={activeTab === 'log' ? () => setShowAddModal(true) : undefined}
                searchInput={searchText}
                onSearchInputChange={setSearchText}
                onClearSearch={() => setSearchText('')}
                searchPlaceholder="Search equipment, forms, plants..."
                plants={regionPlants}
                regionPlantCodes={regionPlantCodes}
                selectedPlant={selectedPlant}
                onSelectedPlantChange={setSelectedPlant}
                statusFilter={statusFilter}
                statusOptions={STATUS_OPTIONS}
                onStatusFilterChange={setStatusFilter}
                customFilters={categoryFilterSelect}
                hideViewModeToggle
                showReset={showReset}
                onReset={handleReset}
                customBottomContent={tabBar}
                customBottomSkeleton={
                    <div className="flex gap-1 -mx-7 px-7 border-t border-slate-200 mt-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-3">
                                <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                                <div
                                    className="h-4 rounded bg-slate-200 animate-pulse"
                                    style={{ width: `${50 + i * 12}px` }}
                                />
                            </div>
                        ))}
                    </div>
                }
            />

            {/* Tab Content */}
            <div>
                {activeTab === 'log' && (
                    <MaintenanceLogView
                        searchText={searchText}
                        selectedPlant={selectedPlant}
                        categoryFilter={categoryFilter}
                        statusFilter={statusFilter}
                        plants={regionPlants}
                        loading={logLoading}
                        equipment={equipment}
                        categories={categories}
                        recentEntries={recentEntries}
                        serviceTypes={serviceTypes}
                        showAddModal={showAddModal}
                        onCloseAddModal={() => setShowAddModal(false)}
                        onReload={loadLogData}
                    />
                )}
                {activeTab === 'due' && <div className="p-4 md:p-8">{renderDueTab()}</div>}
                {activeTab === 'review' && permissions.canReview && (
                    <div className="p-4 md:p-8">{renderReviewTab()}</div>
                )}
                {activeTab === 'history' && <div className="p-4 md:p-8">{renderHistoryTab()}</div>}
                {activeTab === 'manage' && <div className="p-4 md:p-8">{renderManageTab()}</div>}
            </div>
        </div>
    )
}
