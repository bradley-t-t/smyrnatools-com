import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'
import { ValidationUtility } from '../../utils/ValidationUtility'
import { UserService } from '../../services/UserService'
import GrammarUtility from '../../utils/GrammarUtility'
import DateUtility from '../../utils/DateUtility'
import LoadingScreen from './LoadingScreen'
import { supabase } from '../../services/DatabaseService'

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
    service,
    status
}) {
    const [operatorData, setOperatorData] = useState(null)
    const [operatorPhone, setOperatorPhone] = useState('')
    const [operatorRating, setOperatorRating] = useState(0)
    const [issues, setIssues] = useState([])
    const [isLoadingOperator, setIsLoadingOperator] = useState(false)
    const [isLoadingIssues, setIsLoadingIssues] = useState(false)
    const [isSavingPhone, setIsSavingPhone] = useState(false)
    const [userNames, setUserNames] = useState({})
    const [expandedSection, setExpandedSection] = useState([])
    const [comments, setComments] = useState([])
    const [isLoadingComments, setIsLoadingComments] = useState(false)
    const [canDelete, setCanDelete] = useState(false)
    const [sectionsReady, setSectionsReady] = useState({
        checklist: false,
        operator: false,
        issues: false,
        comments: false
    })

    const openIssues = issues.filter((issue) => !issue.time_completed)
    const phoneOk = assignedOperator ? operatorPhone && operatorPhone.trim().length > 0 : true
    const ratingOk = assignedOperator ? operatorRating > 0 : true
    const operatorOk = phoneOk && ratingOk
    const serviceOverdue =
        lastServiceDate && typeof isServiceOverdue === 'function' ? isServiceOverdue(lastServiceDate) : false

    useEffect(() => {
        async function checkDeletePermission() {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || null
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.bypass.plantrestriction')
                    setCanDelete(hasPermission)
                }
            } catch {
                setCanDelete(false)
            }
        }

        checkDeletePermission()
    }, [])

    useEffect(() => {
        if (!open) {
            setSectionsReady({
                checklist: false,
                operator: false,
                issues: false,
                comments: false
            })
            setExpandedSection([])
            return
        }

        setTimeout(() => {
            setSectionsReady((prev) => ({ ...prev, checklist: true }))
        }, 50)

        if (assignedOperator) {
            fetchOperatorData().then(() => {
                setTimeout(() => {
                    setSectionsReady((prev) => ({ ...prev, operator: true }))
                }, 150)
            })
        } else {
            setTimeout(() => {
                setSectionsReady((prev) => ({ ...prev, operator: true }))
            }, 150)
        }

        if (itemId && service) {
            fetchIssues().then(() => {
                setTimeout(() => {
                    setSectionsReady((prev) => ({ ...prev, issues: true }))
                }, 250)
            })
            fetchComments().then(() => {
                setTimeout(() => {
                    setSectionsReady((prev) => ({ ...prev, comments: true }))
                }, 350)
            })
        } else {
            setTimeout(() => {
                setSectionsReady((prev) => ({ ...prev, issues: true, comments: true }))
            }, 250)
        }
    }, [open, assignedOperator, itemId])

    useEffect(() => {
        if (!open) return

        const allSectionsReady = Object.values(sectionsReady).every((ready) => ready)
        if (!allSectionsReady) return

        const sectionsToExpand = []

        if (missingFields.length > 0 || serviceOverdue) {
            sectionsToExpand.push('checklist')
        }

        if (!operatorOk) {
            sectionsToExpand.push('operator')
        }

        if (openIssues.length > 0) {
            sectionsToExpand.push('issues')
        }

        if (comments.length > 0) {
            sectionsToExpand.push('comments')
        }

        sectionsToExpand.forEach((section, index) => {
            setTimeout(
                () => {
                    setExpandedSection((prev) => {
                        const currentExpanded = Array.isArray(prev) ? prev : []
                        return [...currentExpanded, section]
                    })
                },
                800 + index * 400
            )
        })
    }, [
        open,
        sectionsReady,
        operatorOk,
        openIssues.length,
        missingFields.length,
        itemId,
        service,
        serviceOverdue,
        comments.length
    ])

    const fetchOperatorData = async () => {
        setIsLoadingOperator(true)
        try {
            const { data, error } = await supabase
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
            fetchedIssues.forEach((issue) => {
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
            setUserNames((prevNames) => ({ ...prevNames, ...names }))
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
            fetchedComments.forEach((comment) => {
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
            setUserNames((prevNames) => ({ ...prevNames, ...names }))
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
            const { error } = await supabase
                .from('operators')
                .update({ phone: formatted })
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
            const { error } = await supabase
                .from('operators')
                .update({ rating: rating })
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

    const handleSaveAndVerify = async () => {
        if (assignedOperator && operatorPhone && operatorPhone.trim().length > 0) {
            await handleSaveOperatorPhone()
        }
        onSaveAndVerify()
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

    const hasHighSeverityIssues = openIssues.some((issue) => issue.severity === 'High')
    const isMixerInShopWithoutIssues =
        itemType?.toLowerCase() === 'mixer' && status === 'In Shop' && openIssues.length === 0
    const canVerify = requiredFieldsOk && operatorOk && !isMixerInShopWithoutIssues

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    const ratingLabels = [null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

    const toggleSection = (sectionName) => {
        setExpandedSection((prev) => {
            const isArray = Array.isArray(prev)
            const currentExpanded = isArray ? prev : [prev]

            if (currentExpanded.includes(sectionName)) {
                return currentExpanded.filter((s) => s !== sectionName)
            } else {
                return [...currentExpanded, sectionName]
            }
        })
    }

    const isSectionExpanded = (sectionName) => {
        return Array.isArray(expandedSection) ? expandedSection.includes(sectionName) : expandedSection === sectionName
    }

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            backgroundColor: '#1e3a5f',
            color: 'white',
            borderRadius: '16px 16px 0 0'
        },
        headerContent: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
        },
        headerIcon: {
            fontSize: '24px'
        },
        headerTitle: {
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: 'white'
        },
        headerSubtitle: {
            margin: '4px 0 0',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)'
        },
        closeButton: {
            width: '36px',
            height: '36px',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
        },
        content: {
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: 'white'
        },
        section: {
            marginBottom: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'white'
        },
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            backgroundColor: '#f8fafc',
            border: 'none',
            width: '100%',
            cursor: 'pointer',
            textAlign: 'left'
        },
        sectionTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#1e3a5f'
        },
        sectionContent: {
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: 'white'
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600
        },
        badgeComplete: {
            backgroundColor: '#dcfce7',
            color: '#166534'
        },
        badgeIncomplete: {
            backgroundColor: '#fef2f2',
            color: '#991b1b'
        },
        badgeWarning: {
            backgroundColor: '#fef3c7',
            color: '#92400e'
        },
        badgeInfo: {
            backgroundColor: '#dbeafe',
            color: '#1e40af'
        },
        formGroup: {
            marginBottom: '16px'
        },
        label: {
            display: 'block',
            marginBottom: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151'
        },
        requiredIndicator: {
            color: '#dc2626',
            fontSize: '11px',
            marginLeft: '6px'
        },
        input: {
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#374151',
            backgroundColor: 'white',
            boxSizing: 'border-box'
        },
        inputError: {
            borderColor: '#dc2626'
        },
        hint: {
            marginTop: '6px',
            fontSize: '12px',
            color: '#64748b'
        },
        warningText: {
            fontSize: '12px',
            color: '#dc2626',
            marginTop: '4px'
        },
        note: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '14px 16px',
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#92400e',
            marginBottom: '12px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white'
        },
        tableLabel: {
            padding: '10px 12px',
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            fontSize: '13px',
            color: '#1e3a5f',
            width: '35%',
            borderBottom: '1px solid #e5e7eb'
        },
        tableValue: {
            padding: '10px 12px',
            fontSize: '14px',
            color: '#374151',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: 'white'
        },
        highlightRow: {
            backgroundColor: '#fff7ed'
        },
        requiredBadgeInline: {
            display: 'inline-block',
            marginLeft: '8px',
            padding: '2px 8px',
            backgroundColor: '#dc2626',
            color: 'white',
            fontSize: '10px',
            fontWeight: 600,
            borderRadius: '4px'
        },
        ratingInline: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        starGroup: {
            display: 'flex',
            gap: '4px'
        },
        star: {
            fontSize: '18px',
            color: '#e5e7eb',
            cursor: 'pointer'
        },
        starFilled: {
            color: '#f59e0b'
        },
        ratingText: {
            fontSize: '13px',
            color: '#374151'
        },
        phoneControl: {
            display: 'flex',
            gap: '8px'
        },
        phoneInput: {
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#374151',
            backgroundColor: 'white'
        },
        savePhoneButton: {
            padding: '8px 12px',
            backgroundColor: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
        },
        inlineValidation: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            fontSize: '12px',
            color: '#dc2626'
        },
        noData: {
            textAlign: 'center',
            padding: '24px',
            color: '#374151'
        },
        noDataIcon: {
            fontSize: '32px',
            marginBottom: '12px',
            color: '#64748b'
        },
        issueItem: {
            padding: '14px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            marginBottom: '10px',
            border: '1px solid #e5e7eb'
        },
        issueHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '10px',
            flexWrap: 'wrap'
        },
        issueSeverity: {
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600
        },
        severityHigh: {
            backgroundColor: '#fef2f2',
            color: '#991b1b'
        },
        severityMedium: {
            backgroundColor: '#fef3c7',
            color: '#92400e'
        },
        severityLow: {
            backgroundColor: '#dbeafe',
            color: '#1e40af'
        },
        issueCreator: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#374151'
        },
        issueDate: {
            fontSize: '12px',
            color: '#64748b'
        },
        issueActions: {
            display: 'flex',
            gap: '6px',
            marginLeft: 'auto'
        },
        completeButton: {
            width: '28px',
            height: '28px',
            border: 'none',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        deleteButton: {
            width: '28px',
            height: '28px',
            border: 'none',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        issueText: {
            fontSize: '14px',
            color: '#374151',
            lineHeight: 1.5
        },
        actions: {
            display: 'flex',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc'
        },
        cancelButton: {
            flex: 1,
            padding: '12px 20px',
            backgroundColor: '#f1f5f9',
            color: '#374151',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
        },
        primaryButton: {
            flex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
        },
        primaryButtonDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    }

    const getSeverityStyle = (severityLevel) => {
        switch (severityLevel) {
            case 'High':
                return styles.severityHigh
            case 'Medium':
                return styles.severityMedium
            case 'Low':
                return styles.severityLow
            default:
                return {}
        }
    }

    return ReactDOM.createPortal(
        <div style={styles.overlay} role="dialog" aria-modal="true">
            <div style={styles.modal}>
                <div style={styles.header}>
                    <div style={styles.headerContent}>
                        <i className="fas fa-clipboard-check" style={styles.headerIcon}></i>
                        <div>
                            <h3 style={styles.headerTitle}>Verification Checklist</h3>
                            <p style={styles.headerSubtitle}>
                                Review all requirements before verifying this {itemType?.toLowerCase()}
                            </p>
                        </div>
                    </div>
                    <button style={styles.closeButton} onClick={onClose} title="Close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div style={styles.content}>
                    {sectionsReady.checklist && (
                        <div style={styles.section}>
                            <button style={styles.sectionHeader} onClick={() => toggleSection('checklist')}>
                                <div style={styles.sectionTitle}>
                                    <i className="fas fa-tasks"></i>
                                    <span style={{ color: '#374151' }}>Required Information</span>
                                    {serviceOverdue && (
                                        <span style={{ ...styles.badge, ...styles.badgeWarning }}>Service Overdue</span>
                                    )}
                                    {!serviceOverdue && !requiredFieldsOk && (
                                        <span style={{ ...styles.badge, ...styles.badgeIncomplete }}>Incomplete</span>
                                    )}
                                    {!serviceOverdue && requiredFieldsOk && (
                                        <span style={{ ...styles.badge, ...styles.badgeComplete }}>Complete</span>
                                    )}
                                </div>
                                <i
                                    className={`fas fa-chevron-${isSectionExpanded('checklist') ? 'up' : 'down'}`}
                                    style={{ color: '#64748b' }}
                                ></i>
                            </button>
                            {isSectionExpanded('checklist') && (
                                <div style={styles.sectionContent}>
                                    <div>
                                        {needsVin && (
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>
                                                    VIN{' '}
                                                    {!vinOk && <span style={styles.requiredIndicator}>Required</span>}
                                                </label>
                                                <input
                                                    style={{
                                                        ...styles.input,
                                                        ...(vin && !vinOk ? styles.inputError : {})
                                                    }}
                                                    type="text"
                                                    placeholder="17 characters (no I, O, Q)"
                                                    value={vin}
                                                    onChange={(e) =>
                                                        setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))
                                                    }
                                                />
                                                <div style={styles.hint}>
                                                    17 characters. Letters I, O, and Q are not used.
                                                </div>
                                                {vin && !vinOk && (
                                                    <div>
                                                        {vinInfo.reasons.map((r) => (
                                                            <div key={r} style={styles.warningText}>
                                                                {r}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {needsMake && (
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>
                                                    Make{' '}
                                                    {!makeOk && <span style={styles.requiredIndicator}>Required</span>}
                                                </label>
                                                <input
                                                    style={styles.input}
                                                    type="text"
                                                    placeholder="Make"
                                                    value={make}
                                                    onChange={(e) => setMake(e.target.value)}
                                                />
                                            </div>
                                        )}
                                        {needsModel && (
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>
                                                    Model{' '}
                                                    {!modelOk && <span style={styles.requiredIndicator}>Required</span>}
                                                </label>
                                                <input
                                                    style={styles.input}
                                                    type="text"
                                                    placeholder="Model"
                                                    value={model}
                                                    onChange={(e) => setModel(e.target.value)}
                                                />
                                            </div>
                                        )}
                                        {needsYear && (
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>
                                                    Year{' '}
                                                    {!yearOk && <span style={styles.requiredIndicator}>Required</span>}
                                                </label>
                                                <input
                                                    style={styles.input}
                                                    type="text"
                                                    placeholder="Year"
                                                    value={year}
                                                    onChange={(e) => setYear(e.target.value)}
                                                />
                                            </div>
                                        )}
                                        {(!lastServiceDate || serviceOverdue) && (
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>Last Service Date</label>
                                                <input
                                                    style={styles.input}
                                                    type="date"
                                                    value={
                                                        lastServiceDate
                                                            ? lastServiceDate instanceof Date
                                                                ? lastServiceDate.toISOString().split('T')[0]
                                                                : String(lastServiceDate).split('T')[0]
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        setLastServiceDate(
                                                            e.target.value
                                                                ? DateUtility.parseLocalDate(e.target.value)
                                                                : null
                                                        )
                                                    }
                                                />
                                                {lastServiceDate && serviceOverdue && (
                                                    <div style={styles.note}>
                                                        <i
                                                            className="fas fa-exclamation-triangle"
                                                            style={{ color: '#92400e' }}
                                                        ></i>
                                                        <span style={{ color: '#92400e' }}>
                                                            Service is overdue. You can still verify but service is
                                                            recommended.
                                                        </span>
                                                    </div>
                                                )}
                                                <div
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#64748b',
                                                        marginTop: '4px',
                                                        lineHeight: '1.4'
                                                    }}
                                                >
                                                    Service will show as overdue if it has been more than 6 months since
                                                    last serviced. Service is determined by hours on the asset - check
                                                    hours of service.
                                                </div>
                                            </div>
                                        )}
                                        {typeof lastChipDate !== 'undefined' && !lastChipDate && (
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>Last Chip Date</label>
                                                <input
                                                    style={styles.input}
                                                    type="date"
                                                    value={
                                                        lastChipDate
                                                            ? lastChipDate instanceof Date
                                                                ? lastChipDate.toISOString().split('T')[0]
                                                                : String(lastChipDate).split('T')[0]
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        setLastChipDate(
                                                            e.target.value
                                                                ? DateUtility.parseLocalDate(e.target.value)
                                                                : null
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {assignedOperator && sectionsReady.operator && (
                        <div style={styles.section}>
                            <button style={styles.sectionHeader} onClick={() => toggleSection('operator')}>
                                <div style={styles.sectionTitle}>
                                    <i className="fas fa-user"></i>
                                    <span style={{ color: '#374151' }}>Operator Information</span>
                                    {!operatorOk && !phoneOk && !ratingOk && (
                                        <span style={{ ...styles.badge, ...styles.badgeIncomplete }}>
                                            Phone & Rating Required
                                        </span>
                                    )}
                                    {!operatorOk && !phoneOk && ratingOk && (
                                        <span style={{ ...styles.badge, ...styles.badgeIncomplete }}>
                                            Phone Required
                                        </span>
                                    )}
                                    {!operatorOk && phoneOk && !ratingOk && (
                                        <span style={{ ...styles.badge, ...styles.badgeIncomplete }}>
                                            Rating Required
                                        </span>
                                    )}
                                    {operatorOk && (
                                        <span style={{ ...styles.badge, ...styles.badgeComplete }}>Complete</span>
                                    )}
                                </div>
                                <i
                                    className={`fas fa-chevron-${isSectionExpanded('operator') ? 'up' : 'down'}`}
                                    style={{ color: '#64748b' }}
                                ></i>
                            </button>
                            {isSectionExpanded('operator') && (
                                <div style={styles.sectionContent}>
                                    {isLoadingOperator ? (
                                        <LoadingScreen message="Loading operator data..." inline={true} />
                                    ) : operatorData ? (
                                        <table style={styles.table}>
                                            <tbody>
                                                <tr>
                                                    <td style={styles.tableLabel}>Name</td>
                                                    <td style={styles.tableValue}>{operatorData.name || 'N/A'}</td>
                                                </tr>
                                                {operatorData.position && (
                                                    <tr>
                                                        <td style={styles.tableLabel}>Position</td>
                                                        <td style={styles.tableValue}>{operatorData.position}</td>
                                                    </tr>
                                                )}
                                                {operatorData.smyrna_id && (
                                                    <tr>
                                                        <td style={styles.tableLabel}>Employee ID</td>
                                                        <td style={styles.tableValue}>{operatorData.smyrna_id}</td>
                                                    </tr>
                                                )}
                                                <tr style={!ratingOk ? styles.highlightRow : {}}>
                                                    <td style={styles.tableLabel}>
                                                        Performance Rating
                                                        {!ratingOk && (
                                                            <span style={styles.requiredBadgeInline}>Required</span>
                                                        )}
                                                    </td>
                                                    <td style={styles.tableValue}>
                                                        <div style={styles.ratingInline}>
                                                            <div style={styles.starGroup}>
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <i
                                                                        key={star}
                                                                        className="fas fa-star"
                                                                        style={{
                                                                            ...styles.star,
                                                                            ...(star <= operatorRating
                                                                                ? styles.starFilled
                                                                                : {})
                                                                        }}
                                                                        onClick={() => handleSaveOperatorRating(star)}
                                                                    ></i>
                                                                ))}
                                                            </div>
                                                            <span style={styles.ratingText}>
                                                                {operatorRating > 0
                                                                    ? `${operatorRating}/5 - ${ratingLabels[operatorRating]}`
                                                                    : 'Not Yet Rated'}
                                                            </span>
                                                        </div>
                                                        {!ratingOk && (
                                                            <div style={styles.inlineValidation}>
                                                                <i className="fas fa-exclamation-circle"></i>
                                                                Rating required for verification
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr style={!phoneOk ? styles.highlightRow : {}}>
                                                    <td style={styles.tableLabel}>
                                                        Phone Number
                                                        {!phoneOk && (
                                                            <span style={styles.requiredBadgeInline}>Required</span>
                                                        )}
                                                    </td>
                                                    <td style={styles.tableValue}>
                                                        <div style={styles.phoneControl}>
                                                            <input
                                                                type="tel"
                                                                style={{
                                                                    ...styles.phoneInput,
                                                                    ...(!phoneOk ? styles.inputError : {})
                                                                }}
                                                                placeholder="(555) 555-5555"
                                                                value={operatorPhone}
                                                                onChange={(e) => setOperatorPhone(e.target.value)}
                                                            />
                                                            <button
                                                                style={{
                                                                    ...styles.savePhoneButton,
                                                                    opacity:
                                                                        isSavingPhone || !operatorPhone.trim() ? 0.5 : 1
                                                                }}
                                                                onClick={handleSaveOperatorPhone}
                                                                disabled={isSavingPhone || !operatorPhone.trim()}
                                                            >
                                                                {isSavingPhone ? (
                                                                    <i className="fas fa-spinner fa-spin"></i>
                                                                ) : (
                                                                    <i className="fas fa-save"></i>
                                                                )}
                                                            </button>
                                                        </div>
                                                        {!phoneOk && (
                                                            <div style={styles.inlineValidation}>
                                                                <i className="fas fa-exclamation-circle"></i>
                                                                Phone required for verification
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div style={styles.noData}>
                                            <i className="fas fa-exclamation-triangle" style={styles.noDataIcon}></i>
                                            <p style={{ margin: '0 0 8px', color: '#374151' }}>
                                                Unable to load operator information
                                            </p>
                                            <p style={{ margin: 0, fontSize: '13px' }}>
                                                The operator may have been removed or there was a connection issue
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {itemId && service && sectionsReady.issues && (
                        <div style={styles.section}>
                            <button style={styles.sectionHeader} onClick={() => toggleSection('issues')}>
                                <div style={styles.sectionTitle}>
                                    <i className="fas fa-wrench"></i>
                                    <span style={{ color: '#374151' }}>Maintenance Issues</span>
                                    {openIssues.length === 0 && (
                                        <span style={{ ...styles.badge, ...styles.badgeComplete }}>Complete</span>
                                    )}
                                    {openIssues.length > 0 && (
                                        <span style={{ ...styles.badge, ...styles.badgeInfo }}>
                                            {openIssues.length} Open
                                        </span>
                                    )}
                                </div>
                                <i
                                    className={`fas fa-chevron-${isSectionExpanded('issues') ? 'up' : 'down'}`}
                                    style={{ color: '#64748b' }}
                                ></i>
                            </button>
                            {isSectionExpanded('issues') && (
                                <div style={styles.sectionContent}>
                                    <div style={styles.note}>
                                        <i className="fas fa-info-circle" style={{ color: '#92400e' }}></i>
                                        <span style={{ color: '#92400e' }}>
                                            Issues are shown for awareness only. You can mark them as resolved if
                                            completed, but this is not required to verify the asset.
                                        </span>
                                    </div>
                                    {isLoadingIssues ? (
                                        <LoadingScreen message="Loading issues..." inline={true} />
                                    ) : openIssues.length === 0 ? (
                                        <div style={{ ...styles.noData, color: '#166534' }}>
                                            <i
                                                className="fas fa-check-circle"
                                                style={{ ...styles.noDataIcon, color: '#22c55e' }}
                                            ></i>
                                            <p style={{ margin: 0 }}>No open maintenance issues</p>
                                        </div>
                                    ) : (
                                        <>
                                            {hasHighSeverityIssues && (
                                                <div
                                                    style={{
                                                        ...styles.note,
                                                        backgroundColor: '#fef2f2',
                                                        borderColor: '#dc2626'
                                                    }}
                                                >
                                                    <i
                                                        className="fas fa-exclamation-triangle"
                                                        style={{ color: '#991b1b' }}
                                                    ></i>
                                                    <span style={{ color: '#991b1b' }}>
                                                        High severity issues detected. Consider resolving before
                                                        verification, but not required.
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                {openIssues.map((issue) => (
                                                    <div key={issue.id} style={styles.issueItem}>
                                                        <div style={styles.issueHeader}>
                                                            <span
                                                                style={{
                                                                    ...styles.issueSeverity,
                                                                    ...getSeverityStyle(issue.severity)
                                                                }}
                                                            >
                                                                {issue.severity}
                                                            </span>
                                                            <span style={styles.issueCreator}>
                                                                <i className="fas fa-user"></i>{' '}
                                                                {userNames[issue.created_by] || 'Unknown'}
                                                            </span>
                                                            <span style={styles.issueDate}>
                                                                {formatDate(issue.time_created)}
                                                            </span>
                                                            <div style={styles.issueActions}>
                                                                <button
                                                                    style={styles.completeButton}
                                                                    onClick={() => handleCompleteIssue(issue.id)}
                                                                    title="Mark as resolved"
                                                                >
                                                                    <i className="fas fa-check"></i>
                                                                </button>
                                                                {canDelete && (
                                                                    <button
                                                                        style={styles.deleteButton}
                                                                        onClick={() => handleDeleteIssue(issue.id)}
                                                                        title="Delete issue"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={styles.issueText}>{issue.issue}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {itemId && service && sectionsReady.comments && (
                        <div style={styles.section}>
                            <button style={styles.sectionHeader} onClick={() => toggleSection('comments')}>
                                <div style={styles.sectionTitle}>
                                    <i className="fas fa-comments"></i>
                                    <span style={{ color: '#374151' }}>Comments</span>
                                    {comments.length === 0 && (
                                        <span style={{ ...styles.badge, ...styles.badgeComplete }}>Complete</span>
                                    )}
                                    {comments.length > 0 && (
                                        <span style={{ ...styles.badge, ...styles.badgeInfo }}>
                                            {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <i
                                    className={`fas fa-chevron-${isSectionExpanded('comments') ? 'up' : 'down'}`}
                                    style={{ color: '#64748b' }}
                                ></i>
                            </button>
                            {isSectionExpanded('comments') && (
                                <div style={styles.sectionContent}>
                                    <div style={styles.note}>
                                        <i className="fas fa-info-circle" style={{ color: '#92400e' }}></i>
                                        <span style={{ color: '#92400e' }}>
                                            Comments are shown for awareness only. You can delete them if no longer
                                            applicable, but this is not required to verify the asset.
                                        </span>
                                    </div>
                                    {isLoadingComments ? (
                                        <LoadingScreen message="Loading comments..." inline={true} />
                                    ) : comments.length === 0 ? (
                                        <div style={styles.noData}>
                                            <i className="fas fa-info-circle" style={styles.noDataIcon}></i>
                                            <p style={{ margin: 0 }}>No comments</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {comments.map((comment) => (
                                                <div key={comment.id} style={styles.issueItem}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: '8px'
                                                        }}
                                                    >
                                                        <span style={styles.issueDate}>
                                                            {formatDate(comment.createdAt)}
                                                        </span>
                                                        <button
                                                            style={styles.deleteButton}
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            title="Delete comment"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                    <div style={styles.issueText}>{comment.text}</div>
                                                    {comment.author && userNames[comment.author] && (
                                                        <div style={{ ...styles.issueCreator, marginTop: '8px' }}>
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

                {isMixerInShopWithoutIssues && (
                    <div
                        style={{
                            ...styles.note,
                            margin: '0 16px 16px',
                            backgroundColor: '#fef2f2',
                            borderColor: '#dc2626'
                        }}
                    >
                        <i className="fas fa-exclamation-triangle" style={{ color: '#991b1b' }}></i>
                        <span style={{ color: '#991b1b' }}>
                            Mixers in &quot;In Shop&quot; status must have at least one active issue before they can be
                            verified. Please add an issue describing why this mixer is in the shop.
                        </span>
                    </div>
                )}

                <div style={styles.actions}>
                    <button style={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        style={{ ...styles.primaryButton, ...(!canVerify ? styles.primaryButtonDisabled : {}) }}
                        disabled={!canVerify}
                        onClick={handleSaveAndVerify}
                    >
                        <i className="fas fa-check-circle"></i>
                        {canVerify ? 'Save & Verify' : 'Complete Requirements to Verify'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
