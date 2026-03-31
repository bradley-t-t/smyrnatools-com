import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import TopSection from '../../../app/components/sections/TopSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { Database } from '../../../services/DatabaseService'
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
    { key: 'due', icon: 'fa-clipboard-list', label: 'Recurring Forms' },
    { key: 'review', icon: 'fa-clipboard-check', label: 'Review Forms', permission: 'canReview' },
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0"
                >
                    <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="h-4 w-44 rounded bg-slate-200 animate-pulse mb-1.5" />
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                            <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
                        </div>
                    </div>
                    <div className="h-6 w-16 rounded bg-slate-200 animate-pulse shrink-0" />
                </div>
            ))}
        </div>
    )
}

function ItemIcon({ status }) {
    const icon = ICON_BY_STATUS[status] || ICON_BY_STATUS.pending
    const bg = ICON_BG_BY_STATUS[status] || 'bg-blue-100 text-blue-500'
    return (
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-[10px] shrink-0 ${bg}`}>
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

const BASE_ROW_DELAY_MS = 160
const MIN_ROW_DELAY_MS = 12
const DECAY_FACTOR = 0.9

function getRowDelay(index) {
    let total = 0
    for (let i = 0; i < index; i++) {
        total += Math.max(MIN_ROW_DELAY_MS, BASE_ROW_DELAY_MS * Math.pow(DECAY_FACTOR, i))
    }
    return Math.round(total)
}

function FormTable({ columns, rows, emptyIcon, emptyTitle, emptyMessage, emptyChildren, onRowClick }) {
    if (!rows || rows.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage}>
                    {emptyChildren}
                </EmptyState>
            </div>
        )
    }

    // First column = title (with icon), last column with 'status' key = badge, rest = metadata
    const titleCol = columns.find((c) => c.highlight) || columns[0]
    const statusCol = columns.find((c) => c.key === 'status' || c.key === 'actions')
    const metaCols = columns.filter((c) => c !== titleCol && c !== statusCol)

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {rows.map((row) => (
                <div
                    key={row.id}
                    className="flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => onRowClick?.(row)}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ItemIcon status={row.status} />
                        <div className="min-w-0">
                            <span className="text-sm font-medium text-slate-800 block truncate">
                                {titleCol.render ? titleCol.render(row) : row[titleCol.key]}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {metaCols.map((col, i) => {
                                    const val = col.render ? col.render(row) : row[col.key]
                                    if (!val || val === '—') return null
                                    return (
                                        <React.Fragment key={col.key}>
                                            {i > 0 && (
                                                <span className="text-slate-300 text-[8px] hidden sm:inline">●</span>
                                            )}
                                            <span className="text-xs text-slate-500">{val}</span>
                                        </React.Fragment>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    {statusCol && (
                        <div className="shrink-0 ml-3">
                            {statusCol.render ? statusCol.render(row) : row[statusCol.key]}
                        </div>
                    )}
                    <i className="fas fa-chevron-right text-slate-300 text-xs ml-3 sm:hidden" />
                </div>
            ))}
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
                MaintenanceService.fetchForms({ regionCode }).catch(() => [])
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

    const dueColumns = [
        { highlight: true, key: 'title', label: 'Form', render: (row) => row.form?.title || '—' },
        {
            key: 'plant',
            label: 'Plant',
            render: (row) =>
                row.plant_code ? (
                    <span className="bg-[var(--bg-secondary)] border border-blue-500 rounded-md text-blue-500 font-semibold px-2.5 py-1 text-xs">
                        {row.plant_code}
                    </span>
                ) : (
                    '—'
                ),
            width: '100px'
        },
        { key: 'due_date', label: 'Due Date', render: (row) => formatMaintenanceDate(row.due_date), width: '140px' },
        {
            key: 'frequency',
            label: 'Frequency',
            render: (row) => formatFrequency(row.form?.frequency, row.form?.frequency_value),
            width: '140px'
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
            width: '120px'
        }
    ]

    const renderDueTab = () => {
        if (formLoading) return <FormTabSkeleton />

        const filtered = dueItems
            .filter((item) => {
                if (selectedPlant && selectedPlant !== 'All' && item.plant_code !== selectedPlant) return false
                if (searchText) {
                    const q = searchText.trim().toLowerCase()
                    const searchable = [item.form?.title, item.plant_code].filter(Boolean).join(' ').toLowerCase()
                    if (!searchable.includes(q)) return false
                }
                return true
            })
            .sort((a, b) => (a.plant_code || '').localeCompare(b.plant_code || ''))

        return (
            <FormTable
                columns={dueColumns}
                rows={filtered}
                emptyIcon="fa-check-circle"
                emptyTitle={dueItems.length === 0 ? 'All caught up!' : 'No matching tasks'}
                emptyMessage={
                    dueItems.length === 0
                        ? 'You have no maintenance tasks due at this time.'
                        : 'Try adjusting your filters.'
                }
                onRowClick={handleItemClick}
            />
        )
    }

    const handleDeleteSubmission = async (e, submissionId) => {
        e.stopPropagation()
        if (!window.confirm('Delete this submission?')) return
        try {
            await Database.from('maintenance_submission_responses').delete().eq('submission_id', submissionId)
            await Database.from('maintenance_submissions').delete().eq('id', submissionId)
            setPendingReviews((prev) => prev.filter((r) => r.id !== submissionId))
            setReviewedSubmissions((prev) => prev.filter((r) => r.id !== submissionId))
            setMySubmissions((prev) => prev.filter((r) => r.id !== submissionId))
        } catch (err) {
            console.error('Failed to delete submission:', err)
        }
    }

    const reviewColumns = [
        { highlight: true, key: 'title', label: 'Form', render: (row) => row.maintenance_forms?.title || '—' },
        {
            key: 'plant',
            label: 'Plant',
            render: (row) =>
                row.plant_code ? (
                    <span className="bg-[var(--bg-secondary)] border border-blue-500 rounded-md text-blue-500 font-semibold px-2.5 py-1 text-xs">
                        {row.plant_code}
                    </span>
                ) : (
                    '—'
                ),
            width: '100px'
        },
        { key: 'submitted_by', label: 'Submitted By', render: (row) => row.submitted_by_name || '—', width: '160px' },
        {
            key: 'date',
            label: 'Date',
            render: (row) =>
                row.status === 'submitted'
                    ? formatMaintenanceDate(row.submitted_at)
                    : formatMaintenanceDate(row.reviewed_at),
            width: '140px'
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
            width: '120px'
        },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <button
                    type="button"
                    onClick={(e) => handleDeleteSubmission(e, row.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer"
                    title="Delete"
                >
                    <i className="fas fa-trash-alt text-xs" />
                </button>
            ),
            width: '50px'
        }
    ]

    const renderReviewTab = () => {
        if (formLoading) return <FormTabSkeleton />

        const allItems = [...pendingReviews, ...reviewedSubmissions, ...mySubmissions]
        // Deduplicate by id
        const seen = new Set()
        const deduped = allItems.filter((item) => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
        // Pending first, then by date
        deduped.sort((a, b) => {
            if (a.status === 'submitted' && b.status !== 'submitted') return -1
            if (a.status !== 'submitted' && b.status === 'submitted') return 1
            return new Date(b.submitted_at || b.reviewed_at) - new Date(a.submitted_at || a.reviewed_at)
        })

        return (
            <FormTable
                columns={reviewColumns}
                rows={deduped}
                emptyIcon="fa-clipboard-check"
                emptyTitle="No submissions"
                emptyMessage="Submissions and your history will appear here."
                onRowClick={(row) =>
                    row.status === 'submitted'
                        ? handleItemClick({ ...row, form: row.maintenance_forms, isReview: true })
                        : handleViewSubmission(row)
                }
            />
        )
    }

    const historyColumns = [
        { highlight: true, key: 'title', label: 'Form', render: (row) => row.maintenance_forms?.title || '—' },
        {
            key: 'submitted_at',
            label: 'Submitted',
            render: (row) => formatMaintenanceDate(row.submitted_at),
            width: '140px'
        },
        {
            key: 'reviewed_at',
            label: 'Reviewed',
            render: (row) => (row.reviewed_at ? formatMaintenanceDate(row.reviewed_at) : '—'),
            width: '140px'
        },
        {
            key: 'notes',
            label: 'Notes',
            render: (row) => (
                <span className="text-[var(--text-secondary)] truncate max-w-[200px] inline-block">
                    {row.review_notes || '—'}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
            width: '120px'
        }
    ]

    const renderHistoryTab = () => {
        if (formLoading) return <FormTabSkeleton />

        return (
            <FormTable
                columns={historyColumns}
                rows={mySubmissions}
                emptyIcon="fa-history"
                emptyTitle="No submission history"
                emptyMessage="Your completed submissions will appear here."
                onRowClick={handleViewSubmission}
            />
        )
    }

    const manageColumns = [
        { highlight: true, key: 'title', label: 'Form Title', render: (row) => row.title || '—' },
        {
            key: 'description',
            label: 'Description',
            render: (row) => (
                <span className="text-[var(--text-secondary)] truncate max-w-[250px] inline-block">
                    {row.description || '—'}
                </span>
            )
        },
        {
            key: 'frequency',
            label: 'Frequency',
            render: (row) => formatFrequency(row.frequency, row.frequency_value),
            width: '140px'
        },
        {
            key: 'fields',
            label: 'Fields',
            render: (row) => `${row.maintenance_form_fields?.length || 0}`,
            width: '80px'
        },
        {
            key: 'created_at',
            label: 'Created',
            render: (row) => formatMaintenanceDate(row.created_at),
            width: '140px'
        }
    ]

    const renderManageTab = () => {
        if (formLoading) return <FormTabSkeleton />

        return (
            <FormTable
                columns={manageColumns}
                rows={myForms}
                emptyIcon="fa-folder-open"
                emptyTitle="No forms created"
                emptyMessage={
                    permissions.canCreate
                        ? 'Create your first maintenance form to get started.'
                        : 'No maintenance forms have been created yet.'
                }
                emptyChildren={
                    permissions.canCreate ? (
                        <button
                            className="flex items-center gap-2 rounded-xl text-sm font-semibold px-5 py-2.5 border-none cursor-pointer text-white transition-all"
                            style={{ background: accentColor }}
                            onClick={() => setShowCreateForm(true)}
                        >
                            <i className="fas fa-plus" /> Create Form
                        </button>
                    ) : undefined
                }
                onRowClick={handleEditForm}
            />
        )
    }

    // ── Render ──────────────────────────────────────────────────

    const visibleTabs = TAB_DEFS.filter((tab) => !tab.permission || permissions[tab.permission])

    const tabBar = (
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.key
                const tabBadge = getBadge(tab.key)
                return (
                    <button
                        key={tab.key}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border-none cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                            isActive
                                ? 'text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                        style={isActive ? { backgroundColor: accentColor } : undefined}
                        onClick={() => {
                            setActiveTab(tab.key)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        type="button"
                    >
                        <i className={`fas ${tab.icon} text-xs`} />
                        <span>{tab.label}</span>
                        {tabBadge && (
                            <span
                                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[0.6875rem] font-bold ${
                                    isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                                }`}
                            >
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
        <div className="min-h-screen w-full" style={{ background: 'var(--bg-secondary)' }}>
            <TopSection
                isLoading={logLoading}
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
                    <div className="flex gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-9 rounded-full bg-slate-200 animate-pulse shrink-0"
                                style={{ width: `${70 + i * 14}px` }}
                            />
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
                {activeTab === 'manage' && <div className="p-4 md:p-8">{renderManageTab()}</div>}
            </div>
        </div>
    )
}
