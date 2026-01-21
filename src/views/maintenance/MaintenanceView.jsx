import React, {useEffect, useState} from 'react'
import {MaintenanceService} from '../../services/MaintenanceService'
import {UserService} from '../../services/UserService'
import LoadingScreen from '../../components/common/LoadingScreen'
import MaintenanceFormView from './MaintenanceFormView'
import MaintenanceCreateFormView from './MaintenanceCreateFormView'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import {formatFrequency, formatMaintenanceDate, getStatusBadgeClass} from '../../utils/MaintenanceUtility'

export default function MaintenanceView() {
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('due')
    const [dueItems, setDueItems] = useState([])
    const [pendingReviews, setPendingReviews] = useState([])
    const [allPlants, setAllPlants] = useState([])
    const [reviewedSubmissions, setReviewedSubmissions] = useState([])
    const [mySubmissions, setMySubmissions] = useState([])
    const [myForms, setMyForms] = useState([])
    const [permissions, setPermissions] = useState({canCreate: false, canReview: false})
    const [selectedItem, setSelectedItem] = useState(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingForm, setEditingForm] = useState(null)
    const [plantFilter, setPlantFilter] = useState('')
    const [formTypeFilter, setFormTypeFilter] = useState('')
    const [showPlantModal, setShowPlantModal] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const perms = await MaintenanceService.checkPermissions().catch(() => ({
                canCreate: false,
                canReview: false
            }))
            setPermissions(perms)

            const user = await UserService.getCurrentUser()

            const [due, reviews, reviewed, submissions, forms] = await Promise.all([
                MaintenanceService.fetchMyDueItems().catch(() => []),
                perms.canReview ? MaintenanceService.fetchPendingReviews().catch(() => []) : Promise.resolve([]),
                perms.canReview ? MaintenanceService.fetchReviewedSubmissions().catch(() => []) : Promise.resolve([]),
                MaintenanceService.fetchMySubmissions(user?.id).catch(() => []),
                perms.canCreate ? MaintenanceService.fetchForms({createdBy: user?.id}).catch(() => []) : Promise.resolve([])
            ])

            setDueItems(due)
            setPendingReviews(reviews)
            setReviewedSubmissions(reviewed)
            setMySubmissions(submissions)
            setMyForms(forms)
        } catch (error) {
            setDueItems([])
            setPendingReviews([])
            setReviewedSubmissions([])
            setMySubmissions([])
            setMyForms([])
        } finally {
            setLoading(false)
        }
    }

    const getUniquePlants = (items) => {
        const plantsMap = new Map()
        items.forEach(item => {
            if (item.plant_code && !plantsMap.has(item.plant_code)) {
                const plantData = allPlants.find(p => p.plantCode === item.plant_code || p.plant_code === item.plant_code)
                plantsMap.set(item.plant_code, {
                    plantCode: item.plant_code,
                    plantName: plantData?.plantName || plantData?.plant_name || item.plant_code
                })
            }
        })
        return Array.from(plantsMap.values()).sort((a, b) =>
            parseInt(a.plantCode.replace(/\D/g, '') || '0') - parseInt(b.plantCode.replace(/\D/g, '') || '0')
        )
    }

    const getUniqueFormTypes = (items, isSubmission = false) => {
        const forms = new Set()
        items.forEach(item => {
            const title = isSubmission ? item.maintenance_forms?.title : item.form?.title
            if (title) forms.add(title)
        })
        return Array.from(forms).sort()
    }

    const filterItems = (items, isSubmission = false) => {
        return items.filter(item => {
            const plantCode = item.plant_code
            const formTitle = isSubmission ? item.maintenance_forms?.title : item.form?.title
            if (plantFilter && plantCode !== plantFilter) return false
            if (formTypeFilter && formTitle !== formTypeFilter) return false
            return true
        })
    }

    const filteredDueItems = filterItems(dueItems, false)
    const filteredPendingReviews = filterItems(pendingReviews, true)
    const filteredReviewedSubmissions = filterItems(reviewedSubmissions, true)
    const duePlants = getUniquePlants(dueItems)
    const dueFormTypes = getUniqueFormTypes(dueItems, false)
    const reviewPlants = getUniquePlants([...pendingReviews, ...reviewedSubmissions])
    const reviewFormTypes = getUniqueFormTypes([...pendingReviews, ...reviewedSubmissions], true)

    const handleItemClick = async (item) => {
        if (item.status === 'completed' && item.submission_id) {
            try {
                const submission = await MaintenanceService.fetchSubmissionById(item.submission_id)
                setSelectedItem({
                    ...item,
                    ...submission,
                    isEditing: true
                })
            } catch (error) {
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
        loadData()
    }

    const handleFormCreated = () => {
        setShowCreateForm(false)
        setEditingForm(null)
        loadData()
    }

    const handleEditForm = (form) => {
        setEditingForm(form)
        setShowCreateForm(true)
    }

    const styles = {
        container: {
            width: '100%',
            minHeight: '100%',
            background: '#f8fafc'
        },
        header: {
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            padding: '1.5rem 2rem'
        },
        headerInner: {
            maxWidth: '1400px',
            margin: '0 auto'
        },
        titleRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
        },
        title: {
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0
        },
        createBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            background: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        tabs: {
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '2px solid #e5e7eb'
        },
        tab: (active) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: active ? '2px solid #1e3a5f' : '2px solid transparent',
            color: active ? '#1e3a5f' : '#64748b',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
        }),
        tabBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 0.375rem',
            background: '#ef4444',
            color: 'white',
            borderRadius: '10px',
            fontSize: '0.6875rem',
            fontWeight: 700
        },
        content: {
            padding: '2rem',
            maxWidth: '1400px',
            margin: '0 auto'
        },
        section: {
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        filters: {
            display: 'flex',
            alignItems: 'flex-end',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
        },
        filterGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        filterLabel: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#64748b'
        },
        filterButton: (active) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'white',
            border: active ? '2px solid #1e3a5f' : '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: active ? '#1e3a5f' : '#1e293b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '180px'
        }),
        filterSelect: {
            padding: '0.625rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1e293b',
            background: 'white',
            cursor: 'pointer',
            minWidth: '180px'
        },
        filterClearBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        empty: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center'
        },
        emptyIcon: {
            fontSize: '4rem',
            color: '#cbd5e1',
            marginBottom: '1rem'
        },
        emptyTitle: {
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '0.5rem'
        },
        emptyText: {
            fontSize: '0.9375rem',
            color: '#64748b',
            marginBottom: '1.5rem'
        },
        list: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        item: (status) => ({
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            padding: '1.25rem',
            background: status === 'completed' ? '#f8fafc' : 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: status === 'completed' ? 0.7 : 1
        }),
        itemIcon: (status) => {
            const colors = {
                completed: '#10b981',
                overdue: '#ef4444',
                default: '#3b82f6'
            }
            return {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: status === 'completed' ? '#d1fae5' : status === 'overdue' ? '#fee2e2' : '#dbeafe',
                color: colors[status] || colors.default,
                fontSize: '1.25rem',
                flexShrink: 0
            }
        },
        itemContent: {
            flex: 1,
            minWidth: 0
        },
        itemTitle: {
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '0.25rem'
        },
        itemDesc: {
            fontSize: '0.875rem',
            color: '#64748b',
            marginBottom: '0.75rem'
        },
        itemMeta: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
        },
        metaItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            color: '#64748b'
        },
        plantTag: {
            padding: '0.25rem 0.625rem',
            background: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            color: '#3b82f6',
            fontWeight: 600
        },
        itemStatus: {
            flexShrink: 0
        },
        statusBadge: (status) => {
            const colors = {
                completed: {bg: '#d1fae5', border: '#10b981', text: '#059669'},
                overdue: {bg: '#fee2e2', border: '#ef4444', text: '#dc2626'},
                pending: {bg: '#fef3c7', border: '#f59e0b', text: '#d97706'},
                approved: {bg: '#d1fae5', border: '#10b981', text: '#059669'},
                rejected: {bg: '#fee2e2', border: '#ef4444', text: '#dc2626'},
                submitted: {bg: '#e0e7ff', border: '#6366f1', text: '#4f46e5'},
                default: {bg: '#e0e7ff', border: '#6366f1', text: '#4f46e5'}
            }
            const color = colors[status] || colors.default
            return {
                display: 'inline-block',
                padding: '0.375rem 0.75rem',
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: '6px',
                color: color.text,
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }
        },
        reviewSubTabs: {
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '0.5rem'
        },
        reviewSubTab: (active) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: active ? '#f0f7ff' : 'transparent',
            border: active ? '1px solid #1e3a5f' : '1px solid transparent',
            borderRadius: '8px',
            color: active ? '#1e3a5f' : '#64748b',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        }),
        subTabBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 0.375rem',
            background: '#1e3a5f',
            color: 'white',
            borderRadius: '10px',
            fontSize: '0.6875rem',
            fontWeight: 700
        }
    }

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

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerInner}>
                    <div style={styles.titleRow}>
                        <h1 style={styles.title}>Maintenance</h1>
                        {permissions.canCreate && (
                            <button
                                style={styles.createBtn}
                                onClick={() => setShowCreateForm(true)}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#162d4a'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#1e3a5f'}
                            >
                                <i className="fas fa-plus"></i>
                                <span>Create Form</span>
                            </button>
                        )}
                    </div>
                    <div style={styles.tabs}>
                        <button
                            style={styles.tab(activeTab === 'due')}
                            onClick={() => setActiveTab('due')}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'due') e.currentTarget.style.color = '#1e3a5f';
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'due') e.currentTarget.style.color = '#64748b';
                            }}
                        >
                            <i className="fas fa-clipboard-list"></i>
                            <span>My Tasks</span>
                            {dueItems.filter(i => i.status !== 'completed').length > 0 && (
                                <span
                                    style={styles.tabBadge}>{dueItems.filter(i => i.status !== 'completed').length}</span>
                            )}
                        </button>
                        {permissions.canReview && (
                            <button
                                style={styles.tab(activeTab === 'review')}
                                onClick={() => setActiveTab('review')}
                                onMouseEnter={(e) => {
                                    if (activeTab !== 'review') e.currentTarget.style.color = '#1e3a5f';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== 'review') e.currentTarget.style.color = '#64748b';
                                }}
                            >
                                <i className="fas fa-clipboard-check"></i>
                                <span>Review</span>
                                {pendingReviews.length > 0 && (
                                    <span style={styles.tabBadge}>{pendingReviews.length}</span>
                                )}
                            </button>
                        )}
                        {permissions.canCreate && (
                            <button
                                style={styles.tab(activeTab === 'manage')}
                                onClick={() => setActiveTab('manage')}
                                onMouseEnter={(e) => {
                                    if (activeTab !== 'manage') e.currentTarget.style.color = '#1e3a5f';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== 'manage') e.currentTarget.style.color = '#64748b';
                                }}
                            >
                                <i className="fas fa-cog"></i>
                                <span>Manage Forms</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div style={styles.content}>
                {loading ? (
                    <LoadingScreen inline message="Loading maintenance data..."/>
                ) : (
                    <>
                        {activeTab === 'due' && (
                            <div style={styles.section}>
                                {dueItems.length > 0 && (
                                    <div style={styles.filters}>
                                        <div style={styles.filterGroup}>
                                            <label style={styles.filterLabel}>
                                                <i className="fas fa-building"></i>
                                                Plant
                                            </label>
                                            <button
                                                style={styles.filterButton(!!plantFilter)}
                                                onClick={() => setShowPlantModal(true)}
                                            >
                                                <span>{plantFilter || 'All Plants'}</span>
                                                <i className="fas fa-chevron-down"></i>
                                            </button>
                                        </div>
                                        <div style={styles.filterGroup}>
                                            <label style={styles.filterLabel}>
                                                <i className="fas fa-file-alt"></i>
                                                Form
                                            </label>
                                            <select
                                                style={styles.filterSelect}
                                                value={formTypeFilter}
                                                onChange={(e) => setFormTypeFilter(e.target.value)}
                                            >
                                                <option value="">All Forms</option>
                                                {dueFormTypes.map(form => (
                                                    <option key={form} value={form}>{form}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {(plantFilter || formTypeFilter) && (
                                            <button
                                                style={styles.filterClearBtn}
                                                onClick={() => {
                                                    setPlantFilter('');
                                                    setFormTypeFilter('');
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                            >
                                                <i className="fas fa-times"></i>
                                                <span>Clear Filters</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                                <PlantDropdownModal
                                    isOpen={showPlantModal && activeTab === 'due'}
                                    onClose={() => setShowPlantModal(false)}
                                    plants={duePlants}
                                    showAllPlants={true}
                                    onSelect={(code) => {
                                        setPlantFilter(code === 'All' ? '' : code)
                                        setShowPlantModal(false)
                                    }}
                                />
                                {filteredDueItems.length === 0 ? (
                                    <div style={styles.empty}>
                                        <div style={styles.emptyIcon}>
                                            <i className="fas fa-check-circle"></i>
                                        </div>
                                        <h3 style={styles.emptyTitle}>{dueItems.length === 0 ? 'All caught up!' : 'No matching tasks'}</h3>
                                        <p style={styles.emptyText}>{dueItems.length === 0 ? 'You have no maintenance tasks due at this time.' : 'Try adjusting your filters.'}</p>
                                    </div>
                                ) : (
                                    <div style={styles.list}>
                                        {filteredDueItems.map(item => (
                                            <div
                                                key={item.id}
                                                style={styles.item(item.status)}
                                                onClick={() => handleItemClick(item)}
                                                onMouseEnter={(e) => {
                                                    if (item.status !== 'completed') e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                <div style={styles.itemIcon(item.status)}>
                                                    {item.status === 'completed' ? (
                                                        <i className="fas fa-check-circle"></i>
                                                    ) : item.status === 'overdue' ? (
                                                        <i className="fas fa-exclamation-circle"></i>
                                                    ) : (
                                                        <i className="fas fa-clipboard-list"></i>
                                                    )}
                                                </div>
                                                <div style={styles.itemContent}>
                                                    <h4 style={styles.itemTitle}>{item.form?.title}</h4>
                                                    <p style={styles.itemDesc}>{item.form?.description}</p>
                                                    <div style={styles.itemMeta}>
                                                        <span style={styles.metaItem}>
                                                            <i className="fas fa-calendar"></i>
                                                            Due: {formatMaintenanceDate(item.due_date)}
                                                        </span>
                                                        <span style={styles.metaItem}>
                                                            <i className="fas fa-sync-alt"></i>
                                                            {formatFrequency(item.form?.frequency, item.form?.frequency_value)}
                                                        </span>
                                                        {item.plant_code && (
                                                            <span style={{...styles.metaItem, ...styles.plantTag}}>
                                                                <i className="fas fa-building"></i>
                                                                {item.plant_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={styles.itemStatus}>
                                                    <span style={styles.statusBadge(item.status)}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'review' && permissions.canReview && (
                            <div style={styles.sectionWithBg}>
                                {[...pendingReviews, ...reviewedSubmissions].length === 0 ? (
                                    <div style={styles.empty}>
                                        <div style={styles.emptyIcon}>
                                            <i className="fas fa-clipboard-check"></i>
                                        </div>
                                        <h3 style={styles.emptyTitle}>No submissions to review</h3>
                                        <p style={styles.emptyText}>Submissions requiring review will appear here.</p>
                                    </div>
                                ) : (
                                    <div style={styles.list}>
                                        {[...pendingReviews, ...reviewedSubmissions]
                                            .sort((a, b) => {
                                                if (a.status === 'submitted' && b.status !== 'submitted') return -1;
                                                if (a.status !== 'submitted' && b.status === 'submitted') return 1;
                                                const dateA = new Date(a.submitted_at || a.reviewed_at);
                                                const dateB = new Date(b.submitted_at || b.reviewed_at);
                                                return dateB - dateA;
                                            })
                                            .map(submission => {
                                                const isPending = submission.status === 'submitted';
                                                return (
                                                    <div
                                                        key={submission.id}
                                                        style={styles.item(submission.status)}
                                                        onClick={() => isPending ? handleItemClick({
                                                            ...submission,
                                                            form: submission.maintenance_forms,
                                                            isReview: true
                                                        }) : handleViewSubmission(submission)}
                                                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                                                    >
                                                        <div style={styles.itemIcon(submission.status)}>
                                                            {submission.status === 'submitted' ? (
                                                                <i className="fas fa-clock"></i>
                                                            ) : submission.status === 'approved' ? (
                                                                <i className="fas fa-check-circle"></i>
                                                            ) : (
                                                                <i className="fas fa-times-circle"></i>
                                                            )}
                                                        </div>
                                                        <div style={styles.itemContent}>
                                                            <h4 style={styles.itemTitle}>{submission.maintenance_forms?.title}</h4>
                                                            <p style={styles.itemDesc}>
                                                                {submission.status === 'submitted' && 'Pending review'}
                                                                {submission.status === 'approved' && 'Approved'}
                                                                {submission.status === 'rejected' && 'Rejected'}
                                                            </p>
                                                            <div style={styles.itemMeta}>
                                                                <span style={styles.metaItem}>
                                                                    <i className="fas fa-calendar"></i>
                                                                    {submission.status === 'submitted'
                                                                        ? `Submitted: ${formatMaintenanceDate(submission.submitted_at)}`
                                                                        : `Reviewed: ${formatMaintenanceDate(submission.reviewed_at)}`
                                                                    }
                                                                </span>
                                                                <span style={styles.metaItem}>
                                                                    <i className="fas fa-building"></i>
                                                                    {submission.plant_code || 'N/A'}
                                                                </span>
                                                                {submission.submitted_by_name && (
                                                                    <span style={styles.metaItem}>
                                                                        <i className="fas fa-user"></i>
                                                                        {submission.submitted_by_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={styles.itemStatus}>
                                                            <span style={styles.statusBadge(submission.status)}>
                                                                {submission.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="maintenance-section">
                                {mySubmissions.length === 0 ? (
                                    <div className="maintenance-empty">
                                        <i className="fas fa-history"></i>
                                        <h3>No submission history</h3>
                                        <p>Your completed submissions will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="maintenance-list">
                                        {mySubmissions.map(submission => (
                                            <div
                                                key={submission.id}
                                                className="maintenance-item"
                                                onClick={() => handleViewSubmission(submission)}
                                            >
                                                <div className="maintenance-item-icon">
                                                    {submission.status === 'approved' ? (
                                                        <i className="fas fa-check-circle"></i>
                                                    ) : submission.status === 'rejected' ? (
                                                        <i className="fas fa-times-circle"></i>
                                                    ) : (
                                                        <i className="fas fa-clock"></i>
                                                    )}
                                                </div>
                                                <div className="maintenance-item-content">
                                                    <h4>{submission.maintenance_forms?.title}</h4>
                                                    <p>
                                                        {submission.status === 'approved' && 'Approved'}
                                                        {submission.status === 'rejected' && 'Rejected'}
                                                        {submission.status === 'submitted' && 'Pending Review'}
                                                        {submission.review_notes && ` - ${submission.review_notes}`}
                                                    </p>
                                                    <div className="maintenance-item-meta">
                                                        <span className="meta-item">
                                                            <i className="fas fa-calendar"></i>
                                                            Submitted: {formatMaintenanceDate(submission.submitted_at)}
                                                        </span>
                                                        {submission.reviewed_at && (
                                                            <span className="meta-item">
                                                                <i className="fas fa-clipboard-check"></i>
                                                                Reviewed: {formatMaintenanceDate(submission.reviewed_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="maintenance-item-status">
                                                    <span
                                                        className={`status-badge ${getStatusBadgeClass(submission.status)}`}>
                                                        {submission.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'manage' && permissions.canCreate && (
                            <div style={myForms.length === 0 ? styles.section : styles.sectionWithBg}>
                                {myForms.length === 0 ? (
                                    <div className="maintenance-empty">
                                        <i className="fas fa-folder-open"></i>
                                        <h3>No forms created</h3>
                                        <p>Create your first maintenance form to get started.</p>
                                        <button
                                            className="maintenance-create-btn"
                                            onClick={() => setShowCreateForm(true)}
                                        >
                                            <i className="fas fa-plus"></i>
                                            <span>Create Form</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="maintenance-list">
                                        {myForms.map(form => (
                                            <div
                                                key={form.id}
                                                className="maintenance-item"
                                                onClick={() => handleEditForm(form)}
                                            >
                                                <div className="maintenance-item-icon">
                                                    <i className="fas fa-file-alt"></i>
                                                </div>
                                                <div className="maintenance-item-content">
                                                    <h4>{form.title}</h4>
                                                    <p>{form.description}</p>
                                                    <div className="maintenance-item-meta">
                                                        <span className="meta-item">
                                                            <i className="fas fa-sync-alt"></i>
                                                            {formatFrequency(form.frequency, form.frequency_value)}
                                                        </span>
                                                        <span className="meta-item">
                                                            <i className="fas fa-list"></i>
                                                            {form.maintenance_form_fields?.length || 0} fields
                                                        </span>
                                                        <span className="meta-item">
                                                            <i className="fas fa-calendar-plus"></i>
                                                            Created: {formatMaintenanceDate(form.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="maintenance-item-actions">
                                                    <button className="action-btn edit" title="Edit Form">
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}