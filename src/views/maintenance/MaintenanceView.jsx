import React, {useEffect, useState} from 'react'
import './styles/Maintenance.css'
import {MaintenanceService} from '../../services/MaintenanceService'
import {UserService} from '../../services/UserService'
import PlantService from '../../services/PlantService'
import LoadingScreen from '../../components/common/LoadingScreen'
import MaintenanceFormView from './MaintenanceFormView'
import MaintenanceCreateFormView from './MaintenanceCreateFormView'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import {formatFrequency, formatMaintenanceDate, getStatusBadgeClass} from '../../utils/MaintenanceUtility'

export default function MaintenanceView() {
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('due')
    const [reviewSubTab, setReviewSubTab] = useState('pending')
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
        <div className="maintenance-view">
            <div className="maintenance-header">
                <div className="maintenance-header-inner">
                    <div className="maintenance-title-row">
                        <h1 className="maintenance-title">Maintenance</h1>
                        {permissions.canCreate && (
                            <button
                                className="maintenance-create-btn"
                                onClick={() => setShowCreateForm(true)}
                            >
                                <i className="fas fa-plus"></i>
                                <span>Create Form</span>
                            </button>
                        )}
                    </div>
                    <div className="maintenance-tabs">
                        <button
                            className={`maintenance-tab ${activeTab === 'due' ? 'active' : ''}`}
                            onClick={() => setActiveTab('due')}
                        >
                            <i className="fas fa-clipboard-list"></i>
                            <span>My Tasks</span>
                            {dueItems.filter(i => i.status !== 'completed').length > 0 && (
                                <span
                                    className="tab-badge">{dueItems.filter(i => i.status !== 'completed').length}</span>
                            )}
                        </button>
                        {permissions.canReview && (
                            <button
                                className={`maintenance-tab ${activeTab === 'review' ? 'active' : ''}`}
                                onClick={() => setActiveTab('review')}
                            >
                                <i className="fas fa-clipboard-check"></i>
                                <span>Review</span>
                                {pendingReviews.length > 0 && (
                                    <span className="tab-badge">{pendingReviews.length}</span>
                                )}
                            </button>
                        )}
                        {permissions.canCreate && (
                            <button
                                className={`maintenance-tab ${activeTab === 'manage' ? 'active' : ''}`}
                                onClick={() => setActiveTab('manage')}
                            >
                                <i className="fas fa-cog"></i>
                                <span>Manage Forms</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="maintenance-content">
                {loading ? (
                    <LoadingScreen inline message="Loading maintenance data..."/>
                ) : (
                    <>
                        {activeTab === 'due' && (
                            <div className="maintenance-section">
                                {dueItems.length > 0 && (
                                    <div className="maintenance-filters">
                                        <div className="filter-group">
                                            <label className="filter-label">
                                                <i className="fas fa-building"></i>
                                                Plant
                                            </label>
                                            <button 
                                                className={`filter-button ${plantFilter ? 'active' : ''}`}
                                                onClick={() => setShowPlantModal(true)}
                                            >
                                                <span>{plantFilter || 'All Plants'}</span>
                                                <i className="fas fa-chevron-down"></i>
                                            </button>
                                        </div>
                                        <div className="filter-group">
                                            <label className="filter-label">
                                                <i className="fas fa-file-alt"></i>
                                                Form
                                            </label>
                                            <select 
                                                className="filter-select"
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
                                                className="filter-clear-btn"
                                                onClick={() => { setPlantFilter(''); setFormTypeFilter(''); }}
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
                                    <div className="maintenance-empty">
                                        <i className="fas fa-check-circle"></i>
                                        <h3>{dueItems.length === 0 ? 'All caught up!' : 'No matching tasks'}</h3>
                                        <p>{dueItems.length === 0 ? 'You have no maintenance tasks due at this time.' : 'Try adjusting your filters.'}</p>
                                    </div>
                                ) : (
                                    <div className="maintenance-list">
                                        {filteredDueItems.map(item => (
                                            <div
                                                key={item.id}
                                                className={`maintenance-item ${item.status === 'completed' ? 'completed' : ''}`}
                                                onClick={() => handleItemClick(item)}
                                            >
                                                <div className="maintenance-item-icon">
                                                    {item.status === 'completed' ? (
                                                        <i className="fas fa-check-circle"></i>
                                                    ) : item.status === 'overdue' ? (
                                                        <i className="fas fa-exclamation-circle"></i>
                                                    ) : (
                                                        <i className="fas fa-clipboard-list"></i>
                                                    )}
                                                </div>
                                                <div className="maintenance-item-content">
                                                    <h4>{item.form?.title}</h4>
                                                    <p>{item.form?.description}</p>
                                                    <div className="maintenance-item-meta">
                                                        <span className="meta-item">
                                                            <i className="fas fa-calendar"></i>
                                                            Due: {formatMaintenanceDate(item.due_date)}
                                                        </span>
                                                        <span className="meta-item">
                                                            <i className="fas fa-sync-alt"></i>
                                                            {formatFrequency(item.form?.frequency, item.form?.frequency_value)}
                                                        </span>
                                                        {item.plant_code && (
                                                            <span className="meta-item plant-tag">
                                                                <i className="fas fa-building"></i>
                                                                {item.plant_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="maintenance-item-status">
                                                    <span
                                                        className={`status-badge ${getStatusBadgeClass(item.status)}`}>
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
                            <div className="maintenance-section">
                                <div className="review-sub-tabs">
                                    <button
                                        className={`review-sub-tab ${reviewSubTab === 'pending' ? 'active' : ''}`}
                                        onClick={() => setReviewSubTab('pending')}
                                    >
                                        Pending
                                        {pendingReviews.length > 0 && (
                                            <span className="sub-tab-badge">{pendingReviews.length}</span>
                                        )}
                                    </button>
                                    <button
                                        className={`review-sub-tab ${reviewSubTab === 'reviewed' ? 'active' : ''}`}
                                        onClick={() => setReviewSubTab('reviewed')}
                                    >
                                        Reviewed
                                    </button>
                                </div>

                                {reviewSubTab === 'pending' && (
                                    <>
                                        {filteredPendingReviews.length === 0 ? (
                                            <div className="maintenance-empty">
                                                <i className="fas fa-inbox"></i>
                                                <h3>{pendingReviews.length === 0 ? 'No pending reviews' : 'No matching reviews'}</h3>
                                                <p>{pendingReviews.length === 0 ? 'All submissions have been reviewed.' : 'Try adjusting your filters.'}</p>
                                            </div>
                                        ) : (
                                            <div className="maintenance-list">
                                                {filteredPendingReviews.map(submission => (
                                                    <div
                                                        key={submission.id}
                                                        className="maintenance-item"
                                                        onClick={() => handleItemClick({
                                                            ...submission,
                                                            form: submission.maintenance_forms,
                                                            isReview: true
                                                        })}
                                                    >
                                                        <div className="maintenance-item-icon">
                                                            <i className="fas fa-file-alt"></i>
                                                        </div>
                                                        <div className="maintenance-item-content">
                                                            <h4>{submission.maintenance_forms?.title}</h4>
                                                            <p>Submitted for review</p>
                                                            <div className="maintenance-item-meta">
                                                                <span className="meta-item">
                                                                    <i className="fas fa-clock"></i>
                                                                    Submitted: {formatMaintenanceDate(submission.submitted_at)}
                                                                </span>
                                                                <span className="meta-item">
                                                                    <i className="fas fa-building"></i>
                                                                    {submission.plant_code || 'N/A'}
                                                                </span>
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
                                    </>
                                )}

                                {reviewSubTab === 'reviewed' && (
                                    <>
                                        {filteredReviewedSubmissions.length === 0 ? (
                                            <div className="maintenance-empty">
                                                <i className="fas fa-clipboard-check"></i>
                                                <h3>{reviewedSubmissions.length === 0 ? 'No reviewed submissions' : 'No matching submissions'}</h3>
                                                <p>{reviewedSubmissions.length === 0 ? 'Submissions you have reviewed will appear here.' : 'Try adjusting your filters.'}</p>
                                            </div>
                                        ) : (
                                            <div className="maintenance-list">
                                                {filteredReviewedSubmissions.map(submission => (
                                                    <div
                                                        key={submission.id}
                                                        className="maintenance-item"
                                                        onClick={() => handleViewSubmission(submission)}
                                                    >
                                                        <div className="maintenance-item-icon">
                                                            {submission.status === 'approved' ? (
                                                                <i className="fas fa-check-circle"></i>
                                                            ) : (
                                                                <i className="fas fa-times-circle"></i>
                                                            )}
                                                        </div>
                                                        <div className="maintenance-item-content">
                                                            <h4>{submission.maintenance_forms?.title}</h4>
                                                            <p>{submission.status === 'approved' ? 'Approved' : 'Rejected'}</p>
                                                            <div className="maintenance-item-meta">
                                                                <span className="meta-item">
                                                                    <i className="fas fa-calendar-check"></i>
                                                                    Reviewed: {formatMaintenanceDate(submission.reviewed_at)}
                                                                </span>
                                                                <span className="meta-item">
                                                                    <i className="fas fa-building"></i>
                                                                    {submission.plant_code || 'N/A'}
                                                                </span>
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
                                    </>
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
                            <div className="maintenance-section">
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