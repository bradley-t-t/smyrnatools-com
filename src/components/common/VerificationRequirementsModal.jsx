import React, {useEffect, useMemo, useState} from 'react'
import {ValidationUtility} from '../../utils/ValidationUtility'
import {UserService} from '../../services/UserService'
import GrammarUtility from '../../utils/GrammarUtility'
import LoadingScreen from './LoadingScreen'
import {supabase} from '../../services/DatabaseService'
import './styles/VerificationRequirementsModal.css'

export default function VerificationRequirementsModal({
                                                          open,
                                                          onClose,
                                                          onSaveAndVerify,
                                                          missingFields = [],
                                                          vin,
                                                          make,
                                                          model,
                                                          year,
                                                          lastServiceDate,
                                                          lastChipDate,
                                                          setVin,
                                                          setMake,
                                                          setModel,
                                                          setYear,
                                                          setLastServiceDate,
                                                          setLastChipDate,
                                                          isServiceOverdue,
                                                          assignedOperator,
                                                          itemType,
                                                          itemId,
                                                          service
                                                      }) {
    const [operatorData, setOperatorData] = useState(null)
    const [operatorPhone, setOperatorPhone] = useState('')
    const [operatorRating, setOperatorRating] = useState(0)
    const [issues, setIssues] = useState([])
    const [isLoadingOperator, setIsLoadingOperator] = useState(false)
    const [isLoadingIssues, setIsLoadingIssues] = useState(false)
    const [isSavingPhone, setIsSavingPhone] = useState(false)
    const [userNames, setUserNames] = useState({})
    const [expandedSection, setExpandedSection] = useState('checklist')
    const [comments, setComments] = useState([])
    const [isLoadingComments, setIsLoadingComments] = useState(false)

    const openIssues = issues.filter(issue => !issue.time_completed)
    const phoneOk = assignedOperator ? (operatorPhone && operatorPhone.trim().length > 0) : true

    useEffect(() => {
        if (open && assignedOperator) {
            fetchOperatorData()
        }
        if (open && itemId && service) {
            fetchIssues()
            fetchComments()
        }
    }, [open, assignedOperator, itemId])

    useEffect(() => {
        if (open) {
            if (!phoneOk || openIssues.length > 0) {
                if (!phoneOk) {
                    setExpandedSection('operator')
                } else if (openIssues.length > 0) {
                    setExpandedSection('issues')
                }
            }
        }
    }, [open, phoneOk, openIssues.length])

    const fetchOperatorData = async () => {
        setIsLoadingOperator(true)
        try {
            const {data, error} = await supabase
                .from('operators')
                .select('*')
                .eq('employee_id', assignedOperator)
                .single()
            if (error) {
                console.error('Failed to fetch operator:', error)
                setOperatorData(null)
            } else if (data) {
                setOperatorData(data)
                setOperatorPhone(data.phone || '')
                setOperatorRating(typeof data.rating === 'number' ? data.rating : Number(data.rating) || 0)
            }
        } catch (error) {
            console.error('Failed to fetch operator:', error)
            setOperatorData(null)
        } finally {
            setIsLoadingOperator(false)
        }
    }

    const fetchIssues = async () => {
        setIsLoadingIssues(true)
        try {
            const fetchedIssues = await service.fetchIssues(itemId)
            setIssues(Array.isArray(fetchedIssues) ? fetchedIssues : [])

            const userIds = new Set()
            fetchedIssues.forEach(issue => {
                if (issue.created_by) {
                    userIds.add(issue.created_by)
                }
            })

            const names = {}
            for (const userId of userIds) {
                try {
                    const displayName = await UserService.getUserDisplayName(userId)
                    names[userId] = displayName || 'Unknown'
                } catch {
                    names[userId] = 'Unknown'
                }
            }
            setUserNames(prevNames => ({...prevNames, ...names}))
        } catch (error) {
            console.error('Failed to fetch issues:', error)
            setIssues([])
        } finally {
            setIsLoadingIssues(false)
        }
    }

    const fetchComments = async () => {
        setIsLoadingComments(true)
        try {
            const fetchedComments = await service.fetchComments(itemId)
            setComments(Array.isArray(fetchedComments) ? fetchedComments : [])

            const userIds = new Set()
            fetchedComments.forEach(comment => {
                if (comment.author) {
                    userIds.add(comment.author)
                }
            })

            const names = {}
            for (const userId of userIds) {
                try {
                    const displayName = await UserService.getUserDisplayName(userId)
                    names[userId] = displayName || 'Unknown'
                } catch {
                    names[userId] = 'Unknown'
                }
            }
            setUserNames(prevNames => ({...prevNames, ...names}))
        } catch (error) {
            console.error('Failed to fetch comments:', error)
            setComments([])
        } finally {
            setIsLoadingComments(false)
        }
    }

    const handleSaveOperatorPhone = async () => {
        if (!operatorPhone || !assignedOperator) return
        setIsSavingPhone(true)
        try {
            const formatted = GrammarUtility.formatPhone(operatorPhone)
            const {error} = await supabase
                .from('operators')
                .update({phone: formatted})
                .eq('employee_id', assignedOperator)
            if (error) {
                console.error('Failed to save phone:', error)
            } else {
                setOperatorPhone(formatted)
                await fetchOperatorData()
            }
        } catch (error) {
            console.error('Failed to save phone:', error)
        } finally {
            setIsSavingPhone(false)
        }
    }

    const handleSaveOperatorRating = async (rating) => {
        if (!assignedOperator) return
        try {
            const {error} = await supabase
                .from('operators')
                .update({rating: rating})
                .eq('employee_id', assignedOperator)
            if (error) {
                console.error('Failed to save rating:', error)
            } else {
                setOperatorRating(rating)
            }
        } catch (error) {
            console.error('Failed to save rating:', error)
        }
    }

    const handleCompleteIssue = async (issueId) => {
        try {
            await service.completeIssue(issueId)
            await fetchIssues()
        } catch (error) {
            console.error('Failed to complete issue:', error)
        }
    }

    const handleDeleteIssue = async (issueId) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) {
            return
        }
        try {
            await service.deleteIssue(issueId)
            await fetchIssues()
        } catch (error) {
            console.error('Failed to delete issue:', error)
        }
    }

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return
        }
        try {
            await service.deleteComment(commentId)
            await fetchComments()
        } catch (error) {
            console.error('Failed to delete comment:', error)
        }
    }

    if (!open) return null

    const vinInfo = useMemo(() => ValidationUtility.explainVIN(vin || ''), [vin])
    const needsVin = missingFields.includes('VIN')
    const needsMake = missingFields.includes('Make')
    const needsModel = missingFields.includes('Model')
    const needsYear = missingFields.includes('Year')
    const vinOk = needsVin ? vinInfo.valid : true
    const makeOk = needsMake ? !!String(make).trim() : true
    const modelOk = needsModel ? !!String(model).trim() : true
    const yearOk = needsYear ? !!String(year).trim() : true
    const requiredFieldsOk = vinOk && makeOk && modelOk && yearOk
    const serviceOverdue = lastServiceDate && typeof isServiceOverdue === 'function' ? isServiceOverdue(lastServiceDate) : false

    const hasHighSeverityIssues = openIssues.some(issue => issue.severity === 'High')
    const canVerify = requiredFieldsOk && phoneOk

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    const getSeverityClass = (severityLevel) => {
        switch (severityLevel) {
            case 'High':
                return 'severity-high'
            case 'Medium':
                return 'severity-medium'
            case 'Low':
                return 'severity-low'
            default:
                return ''
        }
    }

    const ratingLabels = [null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-content verification-modal enhanced-verification">
                <div className="verification-modal-header">
                    <div className="header-content">
                        <i className="fas fa-clipboard-check"></i>
                        <div>
                            <h3>Verification Checklist</h3>
                            <p>Review all requirements before verifying this {itemType?.toLowerCase()}</p>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose} title="Close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="verification-content">
                    <div className="verification-section">
                        <button
                            className={`section-header ${expandedSection === 'checklist' ? 'expanded' : ''}`}
                            onClick={() => setExpandedSection(expandedSection === 'checklist' ? null : 'checklist')}
                        >
                            <div className="section-title">
                                <i className="fas fa-tasks"></i>
                                <span>Required Information</span>
                            </div>
                            <i className={`fas fa-chevron-${expandedSection === 'checklist' ? 'up' : 'down'}`}></i>
                        </button>
                        {expandedSection === 'checklist' && (
                            <div className="section-content">
                                <div className="verification-fields">
                                    {needsVin && (
                                        <div className="form-group">
                                            <label htmlFor="verify-vin">VIN {!vinOk &&
                                                <span className="required-indicator">Required</span>}</label>
                                            <input
                                                id="verify-vin"
                                                className={`form-control ${vin && !vinOk ? 'error' : ''}`}
                                                type="text"
                                                placeholder="17 characters (no I, O, Q)"
                                                value={vin}
                                                onChange={e => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                            />
                                            <div className="vin-hint">17 characters. Letters I, O, and Q are not used.
                                            </div>
                                            {vin && !vinOk && (
                                                <div className="vin-errors">
                                                    {vinInfo.reasons.map(r => <div key={r}
                                                                                   className="warning-text">{r}</div>)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {needsMake && (
                                        <div className="form-group">
                                            <label htmlFor="verify-make">Make {!makeOk &&
                                                <span className="required-indicator">Required</span>}</label>
                                            <input
                                                id="verify-make"
                                                className="form-control"
                                                type="text"
                                                placeholder="Make"
                                                value={make}
                                                onChange={e => setMake(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    {needsModel && (
                                        <div className="form-group">
                                            <label htmlFor="verify-model">Model {!modelOk &&
                                                <span className="required-indicator">Required</span>}</label>
                                            <input
                                                id="verify-model"
                                                className="form-control"
                                                type="text"
                                                placeholder="Model"
                                                value={model}
                                                onChange={e => setModel(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    {needsYear && (
                                        <div className="form-group">
                                            <label htmlFor="verify-year">Year {!yearOk &&
                                                <span className="required-indicator">Required</span>}</label>
                                            <input
                                                id="verify-year"
                                                className="form-control"
                                                type="text"
                                                placeholder="Year"
                                                value={year}
                                                onChange={e => setYear(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    {(!lastServiceDate || serviceOverdue) && (
                                        <div className="form-group">
                                            <label htmlFor="verify-last-service">Last Service Date</label>
                                            <input
                                                id="verify-last-service"
                                                className="form-control"
                                                type="date"
                                                value={lastServiceDate ? (lastServiceDate instanceof Date ? lastServiceDate.toISOString().split('T')[0] : String(lastServiceDate).split('T')[0]) : ''}
                                                onChange={e => setLastServiceDate(e.target.value ? new Date(e.target.value) : null)}
                                            />
                                            {lastServiceDate && serviceOverdue && (
                                                <div className="modal-note warning">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    <span>Service is overdue. You can still verify but service is recommended.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {typeof lastChipDate !== 'undefined' && !lastChipDate && (
                                        <div className="form-group">
                                            <label htmlFor="verify-last-chip">Last Chip Date</label>
                                            <input
                                                id="verify-last-chip"
                                                className="form-control"
                                                type="date"
                                                value={lastChipDate ? (lastChipDate instanceof Date ? lastChipDate.toISOString().split('T')[0] : String(lastChipDate).split('T')[0]) : ''}
                                                onChange={e => setLastChipDate(e.target.value ? new Date(e.target.value) : null)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {assignedOperator && (
                        <div className="verification-section">
                            <button
                                className={`section-header ${expandedSection === 'operator' ? 'expanded' : ''}`}
                                onClick={() => setExpandedSection(expandedSection === 'operator' ? null : 'operator')}
                            >
                                <div className="section-title">
                                    <i className="fas fa-user"></i>
                                    <span>Operator Information</span>
                                </div>
                                <i className={`fas fa-chevron-${expandedSection === 'operator' ? 'up' : 'down'}`}></i>
                            </button>
                            {expandedSection === 'operator' && (
                                <div className="section-content">
                                    {isLoadingOperator ? (
                                        <div className="loading-container">
                                            <LoadingScreen message="Loading operator data..." inline={true}/>
                                        </div>
                                    ) : operatorData ? (
                                        <div className="operator-info">
                                            <div className="operator-card">
                                                <div className="operator-header">
                                                    <div className="operator-avatar">
                                                        <i className="fas fa-user-circle"></i>
                                                    </div>
                                                    <div className="operator-details">
                                                        <h4 className="operator-name">{operatorData.name || 'N/A'}</h4>
                                                        <div className="operator-meta">
                                                            {operatorData.position && (
                                                                <span className="operator-position">
                                                                    <i className="fas fa-briefcase"></i>
                                                                    {operatorData.position}
                                                                </span>
                                                            )}
                                                            {operatorData.smyrna_id && (
                                                                <span className="operator-id">
                                                                    <i className="fas fa-id-badge"></i>
                                                                    ID: {operatorData.smyrna_id}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="operator-rating-section">
                                                    <label className="section-label">
                                                        <i className="fas fa-star-half-alt"></i>
                                                        Performance Rating
                                                    </label>
                                                    <div className="rating-display-enhanced">
                                                        <div className="star-group">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <i
                                                                    key={star}
                                                                    className={`fas fa-star ${star <= operatorRating ? 'filled' : ''}`}
                                                                    onClick={() => handleSaveOperatorRating(star)}
                                                                    style={{cursor: 'pointer'}}
                                                                ></i>
                                                            ))}
                                                        </div>
                                                        <div className="rating-text">
                                                            {operatorRating > 0 ? (
                                                                <>
                                                                    <span
                                                                        className="rating-score">{operatorRating}/5</span>
                                                                    <span
                                                                        className="rating-label-text">{ratingLabels[operatorRating]}</span>
                                                                </>
                                                            ) : (
                                                                <span className="rating-label-text no-rating">Not Yet Rated</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="operator-phone-section">
                                                    <label className="section-label">
                                                        <i className="fas fa-phone"></i>
                                                        Contact Number
                                                        {!phoneOk && <span className="required-badge">Required</span>}
                                                    </label>
                                                    <div className="phone-control">
                                                        <div className="phone-input-wrapper">
                                                            <i className="fas fa-mobile-alt phone-icon"></i>
                                                            <input
                                                                type="tel"
                                                                className={`phone-input-enhanced ${!phoneOk ? 'error' : ''}`}
                                                                placeholder="(555) 555-5555"
                                                                value={operatorPhone}
                                                                onChange={e => setOperatorPhone(e.target.value)}
                                                            />
                                                        </div>
                                                        <button
                                                            className="save-phone-button-enhanced"
                                                            onClick={handleSaveOperatorPhone}
                                                            disabled={isSavingPhone || !operatorPhone.trim()}
                                                        >
                                                            {isSavingPhone ? (
                                                                <>
                                                                    <i className="fas fa-spinner fa-spin"></i>
                                                                    Saving...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-save"></i>
                                                                    Save Phone
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    {!phoneOk && (
                                                        <div className="validation-message error">
                                                            <i className="fas fa-exclamation-circle"></i>
                                                            Phone number must be added before verification
                                                        </div>
                                                    )}
                                                    {phoneOk && (
                                                        <div className="validation-message success">
                                                            <i className="fas fa-check-circle"></i>
                                                            Contact information verified
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="no-data">
                                            <i className="fas fa-exclamation-triangle"></i>
                                            <p>Unable to load operator information</p>
                                            <p className="no-data-hint">The operator may have been removed or there was
                                                a connection issue</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {itemId && service && (
                        <div className="verification-section">
                            <button
                                className={`section-header ${expandedSection === 'issues' ? 'expanded' : ''}`}
                                onClick={() => setExpandedSection(expandedSection === 'issues' ? null : 'issues')}
                            >
                                <div className="section-title">
                                    <i className="fas fa-wrench"></i>
                                    <span>Maintenance Issues</span>
                                </div>
                                <i className={`fas fa-chevron-${expandedSection === 'issues' ? 'up' : 'down'}`}></i>
                            </button>
                            {expandedSection === 'issues' && (
                                <div className="section-content">
                                    {isLoadingIssues ? (
                                        <div className="loading-container">
                                            <LoadingScreen message="Loading issues..." inline={true}/>
                                        </div>
                                    ) : openIssues.length === 0 ? (
                                        <div className="no-issues">
                                            <i className="fas fa-check-circle"></i>
                                            <p>No open maintenance issues</p>
                                        </div>
                                    ) : (
                                        <>
                                            {hasHighSeverityIssues && (
                                                <div className="modal-note warning high-severity-warning">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    <span>High severity issues detected. Consider resolving before verification.</span>
                                                </div>
                                            )}
                                            <div className="issues-list">
                                                {openIssues.map(issue => (
                                                    <div key={issue.id} className="issue-item">
                                                        <div className="issue-header">
                                                            <span
                                                                className={`issue-severity ${getSeverityClass(issue.severity)}`}>
                                                                {issue.severity}
                                                            </span>
                                                            <span
                                                                className="issue-date">{formatDate(issue.time_created)}</span>
                                                            <div className="issue-actions">
                                                                <button
                                                                    className="complete-button"
                                                                    onClick={() => handleCompleteIssue(issue.id)}
                                                                    title="Mark as resolved"
                                                                >
                                                                    <i className="fas fa-check"></i>
                                                                </button>
                                                                <button
                                                                    className="delete-button"
                                                                    onClick={() => handleDeleteIssue(issue.id)}
                                                                    title="Delete issue"
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="issue-text">{issue.issue}</div>
                                                        {issue.created_by && userNames[issue.created_by] && (
                                                            <div className="issue-creator">
                                                                <i className="fas fa-user"></i>
                                                                {userNames[issue.created_by]}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {itemId && service && (
                        <div className="verification-section">
                            <button
                                className={`section-header ${expandedSection === 'comments' ? 'expanded' : ''}`}
                                onClick={() => setExpandedSection(expandedSection === 'comments' ? null : 'comments')}
                            >
                                <div className="section-title">
                                    <i className="fas fa-comments"></i>
                                    <span>Comments</span>
                                </div>
                                <i className={`fas fa-chevron-${expandedSection === 'comments' ? 'up' : 'down'}`}></i>
                            </button>
                            {expandedSection === 'comments' && (
                                <div className="section-content">
                                    {isLoadingComments ? (
                                        <div className="loading-container">
                                            <LoadingScreen message="Loading comments..." inline={true}/>
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div className="no-issues">
                                            <i className="fas fa-info-circle"></i>
                                            <p>No comments</p>
                                        </div>
                                    ) : (
                                        <div className="issues-list">
                                            {comments.map(comment => (
                                                <div key={comment.id} className="issue-item comment-item">
                                                    <div className="comment-header">
                                                        <span
                                                            className="issue-date">{formatDate(comment.createdAt)}</span>
                                                        <button
                                                            className="delete-button"
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            title="Delete comment"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                    <div className="issue-text">{comment.text}</div>
                                                    {comment.author && userNames[comment.author] && (
                                                        <div className="issue-creator">
                                                            <i className="fas fa-user"></i>
                                                            {userNames[comment.author]}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button type="button" className="cancel-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="primary-button"
                        disabled={!canVerify}
                        onClick={onSaveAndVerify}
                    >
                        <i className="fas fa-check-circle"></i>
                        {canVerify ? 'Save & Verify' : 'Complete Requirements to Verify'}
                    </button>
                </div>
            </div>
        </div>
    )
}
