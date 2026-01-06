import React, {useState, useEffect} from 'react'
import './styles/Maintenance.css'
import {MaintenanceService} from '../../services/MaintenanceService'
import {UserService} from '../../services/UserService'
import LoadingScreen from '../../components/common/LoadingScreen'

export default function MaintenanceFormView({item, onBack, onSubmitted}) {
    const [submitting, setSubmitting] = useState(false)
    const [responses, setResponses] = useState({})
    const [checklistStates, setChecklistStates] = useState({})
    const [checklistComments, setChecklistComments] = useState({})
    const [errors, setErrors] = useState({})
    const [reviewNotes, setReviewNotes] = useState('')
    const [submitterName, setSubmitterName] = useState('')
    const [currentStep, setCurrentStep] = useState(0)
    const [formData, setFormData] = useState(null)
    const [loading, setLoading] = useState(true)

    const form = formData || item?.form || item?.maintenance_forms
    const fields = (form?.maintenance_form_fields || []).sort((a, b) => a.field_order - b.field_order)
    const isReview = item?.isReview
    const isViewOnly = item?.isViewOnly
    const isEditing = item?.isEditing
    const existingResponses = item?.maintenance_submission_responses || []
    const submissionId = item?.submission_id || item?.id
    
    const totalSteps = fields.length
    const currentField = fields[currentStep]
    const isLastStep = currentStep === totalSteps - 1
    const isFirstStep = currentStep === 0

    useEffect(() => {
        if (isReview || isViewOnly || isEditing || existingResponses.length > 0) {
            loadSubmissionDetails()
        } else {
            initializeResponses()
            setLoading(false)
        }
    }, [item])

    const loadSubmissionDetails = async () => {
        setLoading(true)
        try {
            if (!submissionId) {
                initializeResponses()
                setLoading(false)
                return
            }
            
            const data = await MaintenanceService.fetchSubmissionById(submissionId)
            
            if (data?.maintenance_forms) {
                setFormData(data.maintenance_forms)
            }
            
            if (data?.submitted_by) {
                const name = await UserService.getUserDisplayName(data.submitted_by)
                setSubmitterName(name)
            }
            
            if (data?.maintenance_submission_responses && data.maintenance_submission_responses.length > 0) {
                const respMap = {}
                const checkMap = {}
                const commentMap = {}
                data.maintenance_submission_responses.forEach(resp => {
                    if (resp.checklist_values) {
                        checkMap[resp.field_id] = resp.checklist_values
                    } else {
                        respMap[resp.field_id] = resp.response_value || ''
                    }
                    if (resp.checklist_comments) {
                        commentMap[resp.field_id] = resp.checklist_comments
                    }
                })
                setResponses(respMap)
                setChecklistStates(checkMap)
                setChecklistComments(commentMap)
            } else {
                initializeResponses()
            }
            
            if (data?.review_notes) {
                setReviewNotes(data.review_notes)
            }
        } catch (error) {
            initializeResponses()
        } finally {
            setLoading(false)
        }
    }

    const initializeResponses = () => {
        const initialResponses = {}
        const initialChecklists = {}

        fields.forEach(field => {
            if (field.field_type === 'checklist' && field.options?.items) {
                initialChecklists[field.id] = field.options.items.reduce((acc, item) => {
                    acc[item] = false
                    return acc
                }, {})
            } else {
                initialResponses[field.id] = ''
            }
        })

        if (existingResponses.length > 0) {
            existingResponses.forEach(resp => {
                if (resp.checklist_values) {
                    initialChecklists[resp.field_id] = resp.checklist_values
                } else {
                    initialResponses[resp.field_id] = resp.response_value || ''
                }
            })
        }

        setResponses(initialResponses)
        setChecklistStates(initialChecklists)
    }

    const handleResponseChange = (fieldId, value) => {
        setResponses(prev => ({...prev, [fieldId]: value}))
        if (errors[fieldId]) {
            setErrors(prev => ({...prev, [fieldId]: null}))
        }
    }

    const handleChecklistChange = (fieldId, checkItem, checked) => {
        setChecklistStates(prev => ({
            ...prev,
            [fieldId]: {
                ...prev[fieldId],
                [checkItem]: checked
            }
        }))
        if (errors[fieldId]) {
            setErrors(prev => ({...prev, [fieldId]: null}))
        }
    }

    const handleChecklistComment = (fieldId, checkItem, comment) => {
        setChecklistComments(prev => ({
            ...prev,
            [fieldId]: {
                ...prev[fieldId],
                [checkItem]: comment
            }
        }))
        if (errors[fieldId]) {
            setErrors(prev => ({...prev, [fieldId]: null}))
        }
    }

    const validateCurrentField = () => {
        if (!currentField) return true
        
        if (currentField.is_required) {
            if (currentField.field_type === 'checklist') {
                const checkState = checklistStates[currentField.id] || {}
                const comments = checklistComments[currentField.id] || {}
                const checkItems = currentField.options?.items || []
                const allValid = checkItems.every(item => {
                    const isChecked = checkState[item] === true
                    const hasComment = comments[item] && comments[item].trim() !== ''
                    return isChecked || hasComment
                })
                if (!allValid) {
                    setErrors({[currentField.id]: 'Please complete all items or provide a comment for unchecked items'})
                    return false
                }
            } else {
                const value = responses[currentField.id]
                if (!value || value.trim() === '') {
                    setErrors({[currentField.id]: 'This field is required'})
                    return false
                }
            }
        }
        setErrors({})
        return true
    }

    const validateAllFields = () => {
        const newErrors = {}
        
        fields.forEach(field => {
            if (field.is_required) {
                if (field.field_type === 'checklist') {
                    const checkState = checklistStates[field.id] || {}
                    const comments = checklistComments[field.id] || {}
                    const checkItems = field.options?.items || []
                    const allValid = checkItems.every(item => {
                        const isChecked = checkState[item] === true
                        const hasComment = comments[item] && comments[item].trim() !== ''
                        return isChecked || hasComment
                    })
                    if (!allValid) {
                        newErrors[field.id] = 'All items must be completed or have a comment'
                    }
                } else {
                    const value = responses[field.id]
                    if (!value || value.trim() === '') {
                        newErrors[field.id] = 'This field is required'
                    }
                }
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = () => {
        if (validateCurrentField() && currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
            setErrors({})
        }
    }

    const handleSubmit = async () => {
        if (!validateAllFields()) {
            const firstErrorField = fields.findIndex(f => errors[f.id])
            if (firstErrorField >= 0) {
                setCurrentStep(firstErrorField)
            }
            return
        }

        setSubmitting(true)
        try {
            const responseData = fields.map(field => {
                if (field.field_type === 'checklist') {
                    return {
                        field_id: field.id,
                        checklist_values: checklistStates[field.id] || {},
                        checklist_comments: checklistComments[field.id] || {}
                    }
                }
                return {
                    field_id: field.id,
                    response_value: responses[field.id] || ''
                }
            })

            if (isEditing && submissionId) {
                await MaintenanceService.updateSubmission(submissionId, responseData)
            } else {
                await MaintenanceService.submitForm(form.id, item.due_date, responseData)
            }
            onSubmitted()
        } catch (error) {
            setErrors({submit: error.message})
        } finally {
            setSubmitting(false)
        }
    }

    const handleReview = async (status) => {
        setSubmitting(true)
        try {
            await MaintenanceService.reviewSubmission(item.id, status, reviewNotes)
            onSubmitted()
        } catch (error) {
            setErrors({submit: error.message})
        } finally {
            setSubmitting(false)
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }

    const renderField = (field) => {
        const isDisabled = isReview || (isViewOnly && !isEditing)

        switch (field.field_type) {
            case 'short_answer':
                return (
                    <input
                        type="text"
                        className={`step-input ${errors[field.id] ? 'error' : ''}`}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        placeholder="Type your answer..."
                        disabled={isDisabled}
                        autoFocus
                    />
                )

            case 'long_answer':
                return (
                    <textarea
                        className={`step-textarea ${errors[field.id] ? 'error' : ''}`}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        placeholder="Type your answer..."
                        rows={5}
                        disabled={isDisabled}
                        autoFocus
                    />
                )

            case 'checklist': {
                const checkItems = field.options?.items || []
                const comments = checklistComments[field.id] || {}
                return (
                    <div className="step-checklist">
                        {checkItems.map((checkItem, idx) => {
                            const isChecked = checklistStates[field.id]?.[checkItem] || false
                            const hasComment = comments[checkItem] && comments[checkItem].trim() !== ''
                            return (
                                <div key={idx} className="step-check-wrapper">
                                    <label className={`step-check-item ${isChecked ? 'checked' : ''} ${hasComment && !isChecked ? 'has-comment' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => handleChecklistChange(field.id, checkItem, e.target.checked)}
                                            disabled={isDisabled}
                                        />
                                        <span className="step-checkmark">
                                            <i className="fas fa-check"></i>
                                        </span>
                                        <span className="step-check-label">{checkItem}</span>
                                    </label>
                                    {!isChecked && field.is_required && (
                                        <div className="step-check-comment">
                                            <input
                                                type="text"
                                                className="step-check-comment-input"
                                                value={comments[checkItem] || ''}
                                                onChange={(e) => handleChecklistComment(field.id, checkItem, e.target.value)}
                                                placeholder="Why is this incomplete?"
                                                disabled={isDisabled}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )
            }

            case 'notes':
                return (
                    <textarea
                        className={`step-textarea notes ${errors[field.id] ? 'error' : ''}`}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        placeholder="Add any notes..."
                        rows={4}
                        disabled={isDisabled}
                        autoFocus
                    />
                )

            default:
                return (
                    <input
                        type="text"
                        className={`step-input ${errors[field.id] ? 'error' : ''}`}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        disabled={isDisabled}
                        autoFocus
                    />
                )
        }
    }

    const getFieldIcon = (type) => {
        switch (type) {
            case 'short_answer': return 'fa-font'
            case 'long_answer': return 'fa-align-left'
            case 'checklist': return 'fa-check-square'
            case 'notes': return 'fa-sticky-note'
            default: return 'fa-question'
        }
    }

    if (isReview) {
        if (loading) {
            return (
                <div className="maintenance-form-view review-mode">
                    <div className="maintenance-form-header">
                        <button className="back-btn" onClick={onBack}>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div className="header-content">
                            <h1>Loading...</h1>
                        </div>
                    </div>
                    <div className="review-content">
                        <LoadingScreen inline message="Loading submission details..." />
                    </div>
                </div>
            )
        }
        
        return (
            <div className="maintenance-form-view review-mode">
                <div className="maintenance-form-header">
                    <button className="back-btn" onClick={onBack}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="header-content">
                        <h1>{form?.title}</h1>
                        <p className="header-subtitle">
                            Submitted by {submitterName || 'Unknown'} on {formatDate(item?.submitted_at)}
                        </p>
                    </div>
                </div>

                <div className="review-content">
                    <div className="review-responses">
                        {fields.length === 0 ? (
                            <p>No form fields found.</p>
                        ) : fields.map((field, idx) => (
                            <div key={field.id} className="review-response-item">
                                <div className="review-response-number">{idx + 1}</div>
                                <div className="review-response-content">
                                    <h4>{field.label}</h4>
                                    {field.field_type === 'checklist' ? (
                                        <div className="review-checklist">
                                            {(field.options?.items || []).map((checkItem, cidx) => {
                                                const isChecked = checklistStates[field.id]?.[checkItem]
                                                const comment = checklistComments[field.id]?.[checkItem]
                                                return (
                                                    <div key={cidx} className="review-check-row">
                                                        <span className={`review-check-item ${isChecked ? 'checked' : ''} ${comment && !isChecked ? 'has-comment' : ''}`}>
                                                            <i className={`fas ${isChecked ? 'fa-check-square' : 'fa-square'}`}></i>
                                                            {checkItem}
                                                        </span>
                                                        {comment && !isChecked && (
                                                            <span className="review-check-comment">{comment}</span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p className="review-response-text">{responses[field.id] || <span className="empty">No response</span>}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="review-decision">
                        <h3>Review Decision</h3>
                        <textarea
                            className="review-notes-input"
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes (optional)..."
                            rows={3}
                        />
                        <div className="review-buttons">
                            <button
                                className="review-btn approve"
                                onClick={() => handleReview('approved')}
                                disabled={submitting}
                            >
                                <i className="fas fa-check"></i>
                                Approve
                            </button>
                            <button
                                className="review-btn reject"
                                onClick={() => handleReview('rejected')}
                                disabled={submitting}
                            >
                                <i className="fas fa-times"></i>
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (isViewOnly && !isEditing) {
        return (
            <div className="maintenance-form-view view-mode">
                <div className="maintenance-form-header">
                    <button className="back-btn" onClick={onBack}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="header-content">
                        <h1>{form?.title}</h1>
                        <p className="header-subtitle">Due: {formatDate(item?.due_date)}</p>
                    </div>
                </div>

                <div className="view-content">
                    <div className={`view-status-banner ${item?.status}`}>
                        {item?.status === 'approved' && <><i className="fas fa-check-circle"></i> Approved</>}
                        {item?.status === 'rejected' && <><i className="fas fa-times-circle"></i> Rejected</>}
                        {item?.status === 'submitted' && <><i className="fas fa-clock"></i> Pending Review</>}
                    </div>

                    {reviewNotes && (
                        <div className="view-review-notes">
                            <label>Reviewer Notes</label>
                            <p>{reviewNotes}</p>
                        </div>
                    )}

                    <div className="view-responses">
                        {fields.map((field) => (
                            <div key={field.id} className="view-response-item">
                                <span className="view-response-label">{field.label}</span>
                                {field.field_type === 'checklist' ? (
                                    <div className="view-checklist">
                                        {(field.options?.items || []).map((checkItem, cidx) => (
                                            <span key={cidx} className={checklistStates[field.id]?.[checkItem] ? 'checked' : ''}>
                                                <i className={`fas ${checklistStates[field.id]?.[checkItem] ? 'fa-check' : 'fa-times'}`}></i>
                                                {checkItem}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="view-response-value">{responses[field.id] || '-'}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="maintenance-form-view step-mode">
            <div className="step-header">
                <button className="step-close" onClick={onBack}>
                    <i className="fas fa-times"></i>
                </button>
                <div className="step-info">
                    <span className="step-title">{form?.title}</span>
                    <span className="step-due">Due {formatDate(item?.due_date)}</span>
                </div>
                <div className="step-progress">
                    <div className="step-progress-bar">
                        <div className="step-progress-fill" style={{width: `${((currentStep + 1) / totalSteps) * 100}%`}}></div>
                    </div>
                    <span className="step-count">{currentStep + 1} of {totalSteps}</span>
                </div>
                <div className="step-nav-buttons">
                    <button
                        className="step-nav-btn prev"
                        onClick={handlePrevious}
                        disabled={isFirstStep}
                    >
                        <i className="fas fa-arrow-left"></i>
                        Prev
                    </button>
                    {isLastStep ? (
                        <button
                            className="step-nav-btn submit"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                </>
                            ) : (
                                <>
                                    {isEditing ? 'Update' : 'Submit'}
                                    <i className="fas fa-check"></i>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            className="step-nav-btn next"
                            onClick={handleNext}
                        >
                            Next
                            <i className="fas fa-arrow-right"></i>
                        </button>
                    )}
                </div>
            </div>

            {currentField && (
                <div className="step-content">
                    <div className="step-field-container">
                        <div className="step-question">
                            <div className="step-question-icon">
                                <i className={`fas ${getFieldIcon(currentField.field_type)}`}></i>
                            </div>
                            <h2 className="step-question-text">
                                {currentField.label}
                                {currentField.is_required && <span className="required">*</span>}
                            </h2>
                            {currentField.description && (
                                <p className="step-question-desc">{currentField.description}</p>
                            )}
                        </div>

                        <div className="step-answer">
                            {renderField(currentField)}
                            {errors[currentField.id] && (
                                <div className="step-error">
                                    <i className="fas fa-exclamation-circle"></i>
                                    {errors[currentField.id]}
                                </div>
                            )}
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="step-submit-error">
                            <i className="fas fa-exclamation-triangle"></i>
                            {errors.submit}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
