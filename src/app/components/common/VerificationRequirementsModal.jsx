import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import { Database } from '../../../services/DatabaseService'
import { UserService } from '../../../services/UserService'
import DateUtility from '../../../utils/DateUtility'
import GrammarUtility from '../../../utils/GrammarUtility'
import { ValidationUtility } from '../../../utils/ValidationUtility'
import { useAccentColor } from '../../hooks/useAccentColor'
import ConfirmDialog from './ConfirmDialog'
import LoadingScreen from './LoadingScreen'
/**
 * Multi-section verification checklist modal for asset verification workflows.
 * Collects and validates required fields (VIN, make, model, year, service dates),
 * operator information (phone, rating), displays open maintenance issues and comments,
 * and enforces business rules before allowing verification.
 *
 * Sections animate open sequentially based on which requirements need attention.
 * Rendered as a portal overlay.
 *
 * @param {Object} props
 * @param {boolean} props.open - Controls modal visibility.
 * @param {Function} props.onClose - Callback to close the modal.
 * @param {Function} props.onSaveAndVerify - Callback invoked when all requirements are met and user clicks verify.
 * @param {string[]} [props.missingFields] - Field names that still need values (e.g. 'VIN', 'Make').
 * @param {string} [props.vin] - Current VIN value.
 * @param {string} [props.make] - Current make value.
 * @param {string} [props.model] - Current model value.
 * @param {string} [props.year] - Current year value.
 * @param {string|Date} [props.lastServiceDate] - Last service date.
 * @param {string|Date} [props.lastChipDate] - Last chip date (mixer-specific).
 * @param {Function} [props.setVin] - Setter for VIN.
 * @param {Function} [props.setMake] - Setter for make.
 * @param {Function} [props.setModel] - Setter for model.
 * @param {Function} [props.setYear] - Setter for year.
 * @param {Function} [props.setLastServiceDate] - Setter for last service date.
 * @param {Function} [props.setLastChipDate] - Setter for last chip date.
 * @param {Function} [props.isServiceOverdue] - Predicate that checks if a service date is overdue.
 * @param {string} [props.assignedOperator] - Employee ID of the assigned operator.
 * @param {string} [props.itemType] - Asset type label (e.g. 'Mixer', 'Tractor').
 * @param {string} [props.itemId] - Primary key of the asset being verified.
 * @param {Object} [props.service] - Asset service instance with fetchIssues/fetchComments/completeIssue/deleteIssue/deleteComment.
 * @param {string} [props.status] - Current asset status (used for "In Shop" mixer rule).
 */
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
    const accentColor = useAccentColor()
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
    const [pendingDeleteIssueId, setPendingDeleteIssueId] = useState(null)
    const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState(null)
    const [sectionsReady, setSectionsReady] = useState({
        checklist: false,
        comments: false,
        issues: false,
        operator: false
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
    const fetchOperatorData = useCallback(async () => {
        setIsLoadingOperator(true)
        try {
            const { data, error } = await Database.from('operators')
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
    }, [assignedOperator])
    const fetchIssues = useCallback(async () => {
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
    }, [service, itemId])
    const fetchComments = useCallback(async () => {
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
    }, [service, itemId])
    useEffect(() => {
        if (!open) {
            setSectionsReady({
                checklist: false,
                comments: false,
                issues: false,
                operator: false
            })
            setExpandedSection([])
            return
        }
        const timers = []
        const delay = (fn, ms) => {
            const id = setTimeout(fn, ms)
            timers.push(id)
        }
        delay(() => {
            setSectionsReady((prev) => ({ ...prev, checklist: true }))
        }, 50)
        if (assignedOperator) {
            fetchOperatorData().then(() => {
                delay(() => {
                    setSectionsReady((prev) => ({ ...prev, operator: true }))
                }, 150)
            })
        } else {
            delay(() => {
                setSectionsReady((prev) => ({ ...prev, operator: true }))
            }, 150)
        }
        if (itemId && service) {
            fetchIssues().then(() => {
                delay(() => {
                    setSectionsReady((prev) => ({ ...prev, issues: true }))
                }, 250)
            })
            fetchComments().then(() => {
                delay(() => {
                    setSectionsReady((prev) => ({ ...prev, comments: true }))
                }, 350)
            })
        } else {
            delay(() => {
                setSectionsReady((prev) => ({ ...prev, comments: true, issues: true }))
            }, 250)
        }
        return () => timers.forEach(clearTimeout)
    }, [open, assignedOperator, itemId, fetchOperatorData, fetchIssues, fetchComments, service])
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
    const handleSaveOperatorPhone = async () => {
        if (!operatorPhone || !assignedOperator) return
        setIsSavingPhone(true)
        try {
            const formatted = GrammarUtility.formatPhone(operatorPhone)
            const { error } = await Database.from('operators')
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
            const { error } = await Database.from('operators')
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
    const handleDeleteIssue = (issueId) => {
        setPendingDeleteIssueId(issueId)
    }
    const confirmDeleteIssue = async () => {
        const issueId = pendingDeleteIssueId
        setPendingDeleteIssueId(null)
        try {
            await service.deleteIssue(issueId)
            await fetchIssues()
        } catch (error) {
            console.error('Failed to delete issue:', error)
        }
    }
    const handleDeleteComment = (commentId) => {
        setPendingDeleteCommentId(commentId)
    }
    const confirmDeleteComment = async () => {
        const commentId = pendingDeleteCommentId
        setPendingDeleteCommentId(null)
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
    const vinInfo = useMemo(() => ValidationUtility.explainVIN(vin || ''), [vin])
    if (!open) return null
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
    const getSeverityClasses = (severityLevel) => {
        switch (severityLevel) {
            case 'High':
                return 'bg-[#fef2f2] text-[#991b1b]'
            case 'Medium':
                return 'bg-[#fef3c7] text-[#92400e]'
            case 'Low':
                return 'bg-[#dbeafe] text-[#1e40af]'
            default:
                return ''
        }
    }
    return (
        <>
            {ReactDOM.createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-5"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-[90vh]">
                        <div
                            className="flex items-center justify-between rounded-t-2xl text-white px-6 py-5"
                            style={{ backgroundColor: accentColor }}
                        >
                            <div className="flex items-center gap-[14px]">
                                <i className="fas fa-clipboard-check text-2xl"></i>
                                <div>
                                    <h3 className="m-0 text-lg font-semibold text-white">Verification Checklist</h3>
                                    <p className="mt-1 mb-0 text-[13px] text-white/80">
                                        Review all requirements before verifying this {itemType?.toLowerCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-white/20 text-white text-base cursor-pointer"
                                onClick={onClose}
                                title="Close"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white p-4">
                            {sectionsReady.checklist && (
                                <div className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <button
                                        className="flex w-full cursor-pointer items-center justify-between border-none bg-[#f8fafc] px-4 py-[14px] text-left"
                                        onClick={() => toggleSection('checklist')}
                                    >
                                        <div
                                            className="flex items-center gap-[10px] text-sm font-semibold"
                                            style={{ color: accentColor }}
                                        >
                                            <i className="fas fa-tasks"></i>
                                            <span className="text-[#374151]">Required Information</span>
                                            {serviceOverdue && (
                                                <span className="inline-flex items-center rounded-xl bg-[#fef3c7] px-[10px] py-1 text-[11px] font-semibold text-[#92400e]">
                                                    Service Overdue
                                                </span>
                                            )}
                                            {!serviceOverdue && !requiredFieldsOk && (
                                                <span className="inline-flex items-center rounded-xl bg-[#fef2f2] px-[10px] py-1 text-[11px] font-semibold text-[#991b1b]">
                                                    Incomplete
                                                </span>
                                            )}
                                            {!serviceOverdue && requiredFieldsOk && (
                                                <span className="inline-flex items-center rounded-xl bg-[#dcfce7] px-[10px] py-1 text-[11px] font-semibold text-[#166534]">
                                                    Complete
                                                </span>
                                            )}
                                        </div>
                                        <i
                                            className={`fas fa-chevron-${isSectionExpanded('checklist') ? 'up' : 'down'} text-[#64748b]`}
                                        ></i>
                                    </button>
                                    {isSectionExpanded('checklist') && (
                                        <div className="border-t border-gray-200 bg-white p-4">
                                            <div>
                                                {needsVin && (
                                                    <div className="mb-4">
                                                        <label className="mb-[6px] block text-[13px] font-semibold text-[#374151]">
                                                            VIN{' '}
                                                            {!vinOk && (
                                                                <span className="ml-[6px] text-[11px] text-[#dc2626]">
                                                                    Required
                                                                </span>
                                                            )}
                                                        </label>
                                                        <input
                                                            className={`box-border w-full rounded-lg border bg-white px-[14px] py-[10px] text-sm text-[#374151] ${vin && !vinOk ? 'border-[#dc2626]' : 'border-gray-200'}`}
                                                            type="text"
                                                            placeholder="17 characters (no I, O, Q)"
                                                            value={vin}
                                                            onChange={(e) =>
                                                                setVin(
                                                                    e.target.value.toUpperCase().replace(/[IOQ]/g, '')
                                                                )
                                                            }
                                                        />
                                                        <div className="mt-[6px] text-xs text-[#64748b]">
                                                            17 characters. Letters I, O, and Q are not used.
                                                        </div>
                                                        {vin && !vinOk && (
                                                            <div>
                                                                {vinInfo.reasons.map((r) => (
                                                                    <div
                                                                        key={r}
                                                                        className="mt-1 text-xs text-[#dc2626]"
                                                                    >
                                                                        {r}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {needsMake && (
                                                    <div className="mb-4">
                                                        <label className="mb-[6px] block text-[13px] font-semibold text-[#374151]">
                                                            Make{' '}
                                                            {!makeOk && (
                                                                <span className="ml-[6px] text-[11px] text-[#dc2626]">
                                                                    Required
                                                                </span>
                                                            )}
                                                        </label>
                                                        <input
                                                            className="box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm text-[#374151]"
                                                            type="text"
                                                            placeholder="Make"
                                                            value={make}
                                                            onChange={(e) => setMake(e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                                {needsModel && (
                                                    <div className="mb-4">
                                                        <label className="mb-[6px] block text-[13px] font-semibold text-[#374151]">
                                                            Model{' '}
                                                            {!modelOk && (
                                                                <span className="ml-[6px] text-[11px] text-[#dc2626]">
                                                                    Required
                                                                </span>
                                                            )}
                                                        </label>
                                                        <input
                                                            className="box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm text-[#374151]"
                                                            type="text"
                                                            placeholder="Model"
                                                            value={model}
                                                            onChange={(e) => setModel(e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                                {needsYear && (
                                                    <div className="mb-4">
                                                        <label className="mb-[6px] block text-[13px] font-semibold text-[#374151]">
                                                            Year{' '}
                                                            {!yearOk && (
                                                                <span className="ml-[6px] text-[11px] text-[#dc2626]">
                                                                    Required
                                                                </span>
                                                            )}
                                                        </label>
                                                        <input
                                                            className="box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm text-[#374151]"
                                                            type="text"
                                                            placeholder="Year"
                                                            value={year}
                                                            onChange={(e) => setYear(e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                                {(!lastServiceDate || serviceOverdue) && (
                                                    <div className="mb-4">
                                                        <label className="mb-[6px] block text-[13px] font-semibold text-[#374151]">
                                                            Last Service Date
                                                        </label>
                                                        <input
                                                            className="box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm text-[#374151]"
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
                                                            <div className="mb-3 flex items-start gap-[10px] rounded-[10px] border-2 border-[#f59e0b] bg-[#fef3c7] px-4 py-[14px] text-sm font-medium text-[#92400e]">
                                                                <i className="fas fa-exclamation-triangle text-[#92400e]"></i>
                                                                <span className="text-[#92400e]">
                                                                    Service is overdue. You can still verify but service
                                                                    is recommended.
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="mt-1 text-[11px] leading-[1.4] text-[#64748b]">
                                                            Service will show as overdue if it has been more than 6
                                                            months since last serviced. Service is determined by hours
                                                            on the asset - check hours of service.
                                                        </div>
                                                    </div>
                                                )}
                                                {typeof lastChipDate !== 'undefined' && !lastChipDate && (
                                                    <div className="mb-4">
                                                        <label className="mb-[6px] block text-[13px] font-semibold text-[#374151]">
                                                            Last Chip Date
                                                        </label>
                                                        <input
                                                            className="box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm text-[#374151]"
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
                                <div className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <button
                                        className="flex w-full cursor-pointer items-center justify-between border-none bg-[#f8fafc] px-4 py-[14px] text-left"
                                        onClick={() => toggleSection('operator')}
                                    >
                                        <div
                                            className="flex items-center gap-[10px] text-sm font-semibold"
                                            style={{ color: accentColor }}
                                        >
                                            <i className="fas fa-user"></i>
                                            <span className="text-[#374151]">Operator Information</span>
                                            {!operatorOk && !phoneOk && !ratingOk && (
                                                <span className="inline-flex items-center rounded-xl bg-[#fef2f2] px-[10px] py-1 text-[11px] font-semibold text-[#991b1b]">
                                                    Phone & Rating Required
                                                </span>
                                            )}
                                            {!operatorOk && !phoneOk && ratingOk && (
                                                <span className="inline-flex items-center rounded-xl bg-[#fef2f2] px-[10px] py-1 text-[11px] font-semibold text-[#991b1b]">
                                                    Phone Required
                                                </span>
                                            )}
                                            {!operatorOk && phoneOk && !ratingOk && (
                                                <span className="inline-flex items-center rounded-xl bg-[#fef2f2] px-[10px] py-1 text-[11px] font-semibold text-[#991b1b]">
                                                    Rating Required
                                                </span>
                                            )}
                                            {operatorOk && (
                                                <span className="inline-flex items-center rounded-xl bg-[#dcfce7] px-[10px] py-1 text-[11px] font-semibold text-[#166534]">
                                                    Complete
                                                </span>
                                            )}
                                        </div>
                                        <i
                                            className={`fas fa-chevron-${isSectionExpanded('operator') ? 'up' : 'down'} text-[#64748b]`}
                                        ></i>
                                    </button>
                                    {isSectionExpanded('operator') && (
                                        <div className="border-t border-gray-200 bg-white p-4">
                                            {isLoadingOperator ? (
                                                <LoadingScreen message="Loading operator data..." inline={true} />
                                            ) : operatorData ? (
                                                <table className="w-full border-collapse bg-white">
                                                    <tbody>
                                                        <tr>
                                                            <td
                                                                className="w-[35%] border-b border-gray-200 bg-[#f8fafc] px-3 py-[10px] text-[13px] font-semibold"
                                                                style={{ color: accentColor }}
                                                            >
                                                                Name
                                                            </td>
                                                            <td className="border-b border-gray-200 bg-white px-3 py-[10px] text-sm text-[#374151]">
                                                                {operatorData.name || 'N/A'}
                                                            </td>
                                                        </tr>
                                                        {operatorData.position && (
                                                            <tr>
                                                                <td
                                                                    className="w-[35%] border-b border-gray-200 bg-[#f8fafc] px-3 py-[10px] text-[13px] font-semibold"
                                                                    style={{ color: accentColor }}
                                                                >
                                                                    Position
                                                                </td>
                                                                <td className="border-b border-gray-200 bg-white px-3 py-[10px] text-sm text-[#374151]">
                                                                    {operatorData.position}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {operatorData.smyrna_id && (
                                                            <tr>
                                                                <td
                                                                    className="w-[35%] border-b border-gray-200 bg-[#f8fafc] px-3 py-[10px] text-[13px] font-semibold"
                                                                    style={{ color: accentColor }}
                                                                >
                                                                    Employee ID
                                                                </td>
                                                                <td className="border-b border-gray-200 bg-white px-3 py-[10px] text-sm text-[#374151]">
                                                                    {operatorData.smyrna_id}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr className={!ratingOk ? 'bg-[#fff7ed]' : ''}>
                                                            <td
                                                                className="w-[35%] border-b border-gray-200 bg-[#f8fafc] px-3 py-[10px] text-[13px] font-semibold"
                                                                style={{ color: accentColor }}
                                                            >
                                                                Performance Rating
                                                                {!ratingOk && (
                                                                    <span className="ml-2 inline-block rounded bg-[#dc2626] px-2 py-[2px] text-[10px] font-semibold text-white">
                                                                        Required
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="border-b border-gray-200 bg-white px-3 py-[10px] text-sm text-[#374151]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex gap-1">
                                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                                            <i
                                                                                key={star}
                                                                                className={`fas fa-star cursor-pointer text-lg ${star <= operatorRating ? 'text-[#f59e0b]' : 'text-gray-200'}`}
                                                                                onClick={() =>
                                                                                    handleSaveOperatorRating(star)
                                                                                }
                                                                            ></i>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-[13px] text-[#374151]">
                                                                        {operatorRating > 0
                                                                            ? `${operatorRating}/5 - ${ratingLabels[operatorRating]}`
                                                                            : 'Not Yet Rated'}
                                                                    </span>
                                                                </div>
                                                                {!ratingOk && (
                                                                    <div className="mt-[6px] flex items-center gap-[6px] text-xs text-[#dc2626]">
                                                                        <i className="fas fa-exclamation-circle"></i>
                                                                        Rating required for verification
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        <tr className={!phoneOk ? 'bg-[#fff7ed]' : ''}>
                                                            <td
                                                                className="w-[35%] border-b border-gray-200 bg-[#f8fafc] px-3 py-[10px] text-[13px] font-semibold"
                                                                style={{ color: accentColor }}
                                                            >
                                                                Phone Number
                                                                {!phoneOk && (
                                                                    <span className="ml-2 inline-block rounded bg-[#dc2626] px-2 py-[2px] text-[10px] font-semibold text-white">
                                                                        Required
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="border-b border-gray-200 bg-white px-3 py-[10px] text-sm text-[#374151]">
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="tel"
                                                                        className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-[#374151] ${!phoneOk ? 'border-[#dc2626]' : 'border-gray-200'}`}
                                                                        placeholder="(555) 555-5555"
                                                                        value={operatorPhone}
                                                                        onChange={(e) =>
                                                                            setOperatorPhone(e.target.value)
                                                                        }
                                                                    />
                                                                    <button
                                                                        className={`cursor-pointer rounded-lg border-none px-3 py-2 text-white ${isSavingPhone || !operatorPhone.trim() ? 'opacity-50' : 'opacity-100'}`}
                                                                        style={{ backgroundColor: accentColor }}
                                                                        onClick={handleSaveOperatorPhone}
                                                                        disabled={
                                                                            isSavingPhone || !operatorPhone.trim()
                                                                        }
                                                                    >
                                                                        {isSavingPhone ? (
                                                                            <i className="fas fa-spinner fa-spin"></i>
                                                                        ) : (
                                                                            <i className="fas fa-save"></i>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                {!phoneOk && (
                                                                    <div className="mt-[6px] flex items-center gap-[6px] text-xs text-[#dc2626]">
                                                                        <i className="fas fa-exclamation-circle"></i>
                                                                        Phone required for verification
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-6 text-center text-[#374151]">
                                                    <i className="fas fa-exclamation-triangle mb-3 text-[32px] text-[#64748b]"></i>
                                                    <p className="m-0 mb-2 text-[#374151]">
                                                        Unable to load operator information
                                                    </p>
                                                    <p className="m-0 text-[13px]">
                                                        The operator may have been removed or there was a connection
                                                        issue
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            {itemId && service && sectionsReady.issues && (
                                <div className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <button
                                        className="flex w-full cursor-pointer items-center justify-between border-none bg-[#f8fafc] px-4 py-[14px] text-left"
                                        onClick={() => toggleSection('issues')}
                                    >
                                        <div
                                            className="flex items-center gap-[10px] text-sm font-semibold"
                                            style={{ color: accentColor }}
                                        >
                                            <i className="fas fa-wrench"></i>
                                            <span className="text-[#374151]">Maintenance Issues</span>
                                            {openIssues.length === 0 && (
                                                <span className="inline-flex items-center rounded-xl bg-[#dcfce7] px-[10px] py-1 text-[11px] font-semibold text-[#166534]">
                                                    Complete
                                                </span>
                                            )}
                                            {openIssues.length > 0 && (
                                                <span className="inline-flex items-center rounded-xl bg-[#dbeafe] px-[10px] py-1 text-[11px] font-semibold text-[#1e40af]">
                                                    {openIssues.length} Open
                                                </span>
                                            )}
                                        </div>
                                        <i
                                            className={`fas fa-chevron-${isSectionExpanded('issues') ? 'up' : 'down'} text-[#64748b]`}
                                        ></i>
                                    </button>
                                    {isSectionExpanded('issues') && (
                                        <div className="border-t border-gray-200 bg-white p-4">
                                            <div className="mb-3 flex items-start gap-[10px] rounded-[10px] border-2 border-[#f59e0b] bg-[#fef3c7] px-4 py-[14px] text-sm font-medium text-[#92400e]">
                                                <i className="fas fa-info-circle text-[#92400e]"></i>
                                                <span className="text-[#92400e]">
                                                    Issues are shown for awareness only. You can mark them as resolved
                                                    if completed, but this is not required to verify the asset.
                                                </span>
                                            </div>
                                            {isLoadingIssues ? (
                                                <LoadingScreen message="Loading issues..." inline={true} />
                                            ) : openIssues.length === 0 ? (
                                                <div className="p-6 text-center text-[#166534]">
                                                    <i className="fas fa-check-circle mb-3 text-[32px] text-[#22c55e]"></i>
                                                    <p className="m-0">No open maintenance issues</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {hasHighSeverityIssues && (
                                                        <div className="mb-3 flex items-start gap-[10px] rounded-[10px] border-2 border-[#dc2626] bg-[#fef2f2] px-4 py-[14px] text-sm font-medium text-[#92400e]">
                                                            <i className="fas fa-exclamation-triangle text-[#991b1b]"></i>
                                                            <span className="text-[#991b1b]">
                                                                High severity issues detected. Consider resolving before
                                                                verification, but not required.
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        {openIssues.map((issue) => (
                                                            <div
                                                                key={issue.id}
                                                                className="mb-[10px] rounded-[10px] border border-gray-200 bg-[#f8fafc] p-[14px]"
                                                            >
                                                                <div className="mb-[10px] flex flex-wrap items-center gap-3">
                                                                    <span
                                                                        className={`rounded-md px-[10px] py-1 text-[11px] font-semibold ${getSeverityClasses(issue.severity)}`}
                                                                    >
                                                                        {issue.severity}
                                                                    </span>
                                                                    <span className="flex items-center gap-[6px] text-xs text-[#374151]">
                                                                        <i className="fas fa-user"></i>{' '}
                                                                        {userNames[issue.created_by] || 'Unknown'}
                                                                    </span>
                                                                    <span className="text-xs text-[#64748b]">
                                                                        {formatDate(issue.time_created)}
                                                                    </span>
                                                                    <div className="ml-auto flex gap-[6px]">
                                                                        <button
                                                                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-[#dcfce7] text-[#166534]"
                                                                            onClick={() =>
                                                                                handleCompleteIssue(issue.id)
                                                                            }
                                                                            title="Mark as resolved"
                                                                        >
                                                                            <i className="fas fa-check"></i>
                                                                        </button>
                                                                        {canDelete && (
                                                                            <button
                                                                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-[#fef2f2] text-[#991b1b]"
                                                                                onClick={() =>
                                                                                    handleDeleteIssue(issue.id)
                                                                                }
                                                                                title="Delete issue"
                                                                            >
                                                                                <i className="fas fa-trash"></i>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-sm leading-normal text-[#374151]">
                                                                    {issue.issue}
                                                                </div>
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
                                <div className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <button
                                        className="flex w-full cursor-pointer items-center justify-between border-none bg-[#f8fafc] px-4 py-[14px] text-left"
                                        onClick={() => toggleSection('comments')}
                                    >
                                        <div
                                            className="flex items-center gap-[10px] text-sm font-semibold"
                                            style={{ color: accentColor }}
                                        >
                                            <i className="fas fa-comments"></i>
                                            <span className="text-[#374151]">Comments</span>
                                            {comments.length === 0 && (
                                                <span className="inline-flex items-center rounded-xl bg-[#dcfce7] px-[10px] py-1 text-[11px] font-semibold text-[#166534]">
                                                    Complete
                                                </span>
                                            )}
                                            {comments.length > 0 && (
                                                <span className="inline-flex items-center rounded-xl bg-[#dbeafe] px-[10px] py-1 text-[11px] font-semibold text-[#1e40af]">
                                                    {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <i
                                            className={`fas fa-chevron-${isSectionExpanded('comments') ? 'up' : 'down'} text-[#64748b]`}
                                        ></i>
                                    </button>
                                    {isSectionExpanded('comments') && (
                                        <div className="border-t border-gray-200 bg-white p-4">
                                            <div className="mb-3 flex items-start gap-[10px] rounded-[10px] border-2 border-[#f59e0b] bg-[#fef3c7] px-4 py-[14px] text-sm font-medium text-[#92400e]">
                                                <i className="fas fa-info-circle text-[#92400e]"></i>
                                                <span className="text-[#92400e]">
                                                    Comments are shown for awareness only. You can delete them if no
                                                    longer applicable, but this is not required to verify the asset.
                                                </span>
                                            </div>
                                            {isLoadingComments ? (
                                                <LoadingScreen message="Loading comments..." inline={true} />
                                            ) : comments.length === 0 ? (
                                                <div className="p-6 text-center text-[#374151]">
                                                    <i className="fas fa-info-circle mb-3 text-[32px] text-[#64748b]"></i>
                                                    <p className="m-0">No comments</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    {comments.map((comment) => (
                                                        <div
                                                            key={comment.id}
                                                            className="mb-[10px] rounded-[10px] border border-gray-200 bg-[#f8fafc] p-[14px]"
                                                        >
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <span className="text-xs text-[#64748b]">
                                                                    {formatDate(comment.createdAt)}
                                                                </span>
                                                                <button
                                                                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-[#fef2f2] text-[#991b1b]"
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    title="Delete comment"
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </div>
                                                            <div className="text-sm leading-normal text-[#374151]">
                                                                {comment.text}
                                                            </div>
                                                            {comment.author && userNames[comment.author] && (
                                                                <div className="mt-2 flex items-center gap-[6px] text-xs text-[#374151]">
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
                            <div className="mx-4 mb-4 flex items-start gap-[10px] rounded-[10px] border-2 border-[#dc2626] bg-[#fef2f2] px-4 py-[14px] text-sm font-medium text-[#92400e]">
                                <i className="fas fa-exclamation-triangle text-[#991b1b]"></i>
                                <span className="text-[#991b1b]">
                                    Mixers in &quot;In Shop&quot; status must have at least one active issue before they
                                    can be verified. Please add an issue describing why this mixer is in the shop.
                                </span>
                            </div>
                        )}
                        <div className="flex gap-3 border-t border-gray-200 bg-[#f8fafc] px-6 py-4">
                            <button
                                className="flex-1 cursor-pointer rounded-[10px] border-none bg-[#f1f5f9] px-5 py-3 text-sm font-semibold text-[#374151]"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                className={`flex flex-[2] cursor-pointer items-center justify-center gap-2 rounded-[10px] border-none px-5 py-3 text-sm font-semibold text-white ${!canVerify ? 'cursor-not-allowed opacity-50' : ''}`}
                                style={{ backgroundColor: accentColor }}
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
            )}
            <ConfirmDialog
                isOpen={pendingDeleteIssueId !== null}
                onConfirm={confirmDeleteIssue}
                onCancel={() => setPendingDeleteIssueId(null)}
                title="Delete Issue"
                message="Are you sure you want to delete this issue?"
                confirmLabel="Delete"
                variant="danger"
            />
            <ConfirmDialog
                isOpen={pendingDeleteCommentId !== null}
                onConfirm={confirmDeleteComment}
                onCancel={() => setPendingDeleteCommentId(null)}
                title="Delete Comment"
                message="Are you sure you want to delete this comment?"
                confirmLabel="Delete"
                variant="danger"
            />
        </>
    )
}
