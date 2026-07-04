/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import APIUtility from '../../../utils/APIUtility'
import ErrorReporterUtility from '../../../utils/ErrorReporterUtility'
import GrammarUtility from '../../../utils/GrammarUtility'
import { ValidationUtility } from '../../../utils/ValidationUtility'
import { useAccentColor } from '../../hooks/useAccentColor'
import useVerificationModalData from '../../hooks/useVerificationModalData'
import { Banner } from '../verification/VerificationAtoms'
import VerificationChecklistSection, { parseHoursValue } from '../verification/VerificationChecklistSection'
import VerificationCommentsSection from '../verification/VerificationCommentsSection'
import VerificationIssuesSection from '../verification/VerificationIssuesSection'
import VerificationOperatorSection from '../verification/VerificationOperatorSection'
import ConfirmDialog from './ConfirmDialog'

/**
 * Translates a raw error message from the verify API call into a clear,
 * actionable reason the user can act on. Defaults to the original message
 * when no known signal matches so server-supplied detail still surfaces.
 */
function buildVerifyFailureReason(rawMessage, itemTypeDisplay) {
    const message = String(rawMessage || '').trim()
    const lower = message.toLowerCase()
    const target = (itemTypeDisplay || 'asset').toLowerCase()
    if (
        lower.includes('unauthorized') ||
        lower.includes('session') ||
        lower.includes('401') ||
        lower.includes('user id is required') ||
        lower.includes('no current user')
    ) {
        return `Your session expired before we could save this ${target}. Refresh the page, sign in again, and re-enter the hours.`
    }
    if (lower.includes('forbidden') || lower.includes('permission') || lower.includes('access denied')) {
        return `Your account does not have permission to verify this ${target}. Ask an administrator to grant access for this plant or region.`
    }
    if (
        lower.includes('timed out') ||
        lower.includes('timeout') ||
        lower.includes('network') ||
        lower.includes('fetch')
    ) {
        return `Network problem reached the server but the verification did not save. Check your connection and try again.`
    }
    if (lower.includes('not found')) {
        return `This ${target} could not be found on the server — it may have been retired or removed by another user. Close and reopen the list.`
    }
    if (message) return `We could not save this verification: ${message}`
    return `We could not save this verification. Try again — if it keeps failing, refresh the page or contact support.`
}

function ProgressTrack({ accentColor, blockers, total }) {
    const completed = total - blockers
    const percent = total === 0 ? 100 : Math.round((completed / total) * 100)
    return (
        <div className="mt-3">
            <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11.5px] font-medium text-text-secondary">
                    {blockers === 0 ? 'Ready to verify' : `${completed} of ${total} requirements met`}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-text-tertiary">{percent}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-bg-tertiary">
                <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ background: blockers === 0 ? '#16a34a' : accentColor, width: `${percent}%` }}
                />
            </div>
        </div>
    )
}

/**
 * Multi-section verification checklist modal for asset verification workflows.
 * Collects and validates required fields, operator information, displays open
 * maintenance issues and comments, and enforces business rules before verifying.
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
    hours,
    lastServiceDate,
    lastChipDate,
    setVin,
    setMake,
    setModel,
    setYear,
    setHours,
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
    const [isSavingPhone, setIsSavingPhone] = useState(false)
    const [pendingDeleteIssueId, setPendingDeleteIssueId] = useState(null)
    const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState(null)
    const [expandedSection, setExpandedSection] = useState(null)
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState(null)

    const {
        canDelete,
        comments,
        fetchComments,
        fetchIssues,
        fetchOperatorData,
        isLoadingComments,
        isLoadingIssues,
        isLoadingOperator,
        issues,
        operatorData,
        operatorPhone,
        operatorRating,
        sectionsReady,
        setOperatorPhone,
        setOperatorRating,
        userNames
    } = useVerificationModalData({ assignedOperator, itemId, open, service })

    const openIssues = issues.filter((issue) => !issue.time_completed)
    const phoneOk = assignedOperator ? operatorPhone && operatorPhone.trim().length > 0 : true
    const ratingOk = assignedOperator ? operatorRating > 0 : true
    const operatorOk = phoneOk && ratingOk
    const serviceOverdue =
        lastServiceDate && typeof isServiceOverdue === 'function' ? isServiceOverdue(lastServiceDate) : false

    useEffect(() => {
        if (!open) {
            setExpandedSection(null)
            setVerifyError(null)
            setIsVerifying(false)
            return
        }
        const allSectionsReady = Object.values(sectionsReady).every((ready) => ready)
        if (!allSectionsReady) return
        let priority = null
        const needsHoursAttention = typeof setHours === 'function' && !parseHoursValue(hours).valid
        if (missingFields.length > 0 || serviceOverdue || needsHoursAttention) priority = 'checklist'
        else if (!operatorOk) priority = 'operator'
        else if (openIssues.length > 0) priority = 'issues'
        else if (comments.length > 0) priority = 'comments'
        if (priority) {
            const id = setTimeout(() => setExpandedSection(priority), 400)
            return () => clearTimeout(id)
        }
    }, [
        open,
        sectionsReady,
        operatorOk,
        openIssues.length,
        missingFields.length,
        itemId,
        service,
        serviceOverdue,
        comments.length,
        hours,
        setHours
    ])

    const handleSaveOperatorPhone = async () => {
        if (!operatorPhone || !assignedOperator) return
        setIsSavingPhone(true)
        const formatted = GrammarUtility.formatPhone(operatorPhone)
        const { res } = await APIUtility.post('/operator-service/patch-phone-rating', {
            employeeId: assignedOperator,
            phone: formatted
        })
        if (res.ok) {
            setOperatorPhone(formatted)
            await fetchOperatorData()
        }
        setIsSavingPhone(false)
    }

    const handleSaveOperatorRating = async (rating) => {
        if (!assignedOperator) return
        const { res } = await APIUtility.post('/operator-service/patch-phone-rating', {
            employeeId: assignedOperator,
            rating
        })
        if (res.ok) setOperatorRating(rating)
    }

    const handleCompleteIssue = async (issueId) => {
        try {
            await service.completeIssue(issueId)
            await fetchIssues()
        } catch (error) {
            console.error('Failed to complete issue:', error)
        }
    }

    const handleAddIssue = async ({ severity, text }) => {
        if (!service?.addIssue || !itemId) return
        const trimmed = text.trim()
        if (!trimmed) return
        const currentUser = await UserService.getCurrentUser()
        const userId = currentUser?.id || currentUser || null
        await service.addIssue(itemId, trimmed, severity, userId)
        await fetchIssues()
    }

    const handleAddComment = async (text) => {
        if (!service?.addComment || !itemId) return
        const trimmed = text.trim()
        if (!trimmed) return
        const currentUser = await UserService.getCurrentUser()
        const userId = currentUser?.id || currentUser || null
        await service.addComment(itemId, trimmed, userId)
        await fetchComments()
    }

    const handleDeleteIssue = (issueId) => setPendingDeleteIssueId(issueId)
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
    const handleDeleteComment = (commentId) => setPendingDeleteCommentId(commentId)
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
        if (isVerifying) return
        setVerifyError(null)
        setIsVerifying(true)
        try {
            if (assignedOperator && operatorPhone && operatorPhone.trim().length > 0) {
                await handleSaveOperatorPhone()
            }
            await onSaveAndVerify()
        } catch (error) {
            const normalized = error instanceof Error ? error : new Error(String(error))
            ErrorReporterUtility.reportError(normalized, {
                context: 'VerificationRequirementsModal.handleSaveAndVerify',
                itemId,
                itemType
            })
            setVerifyError(buildVerifyFailureReason(normalized.message, itemTypeDisplay))
        } finally {
            setIsVerifying(false)
        }
    }

    const vinInfo = useMemo(() => ValidationUtility.explainVIN(vin || ''), [vin])
    if (!open) return null
    const needsVin = missingFields.includes('VIN')
    const needsMake = missingFields.includes('Make')
    const needsModel = missingFields.includes('Model')
    const needsYear = missingFields.includes('Year')
    const needsHours = typeof setHours === 'function'
    const vinOk = needsVin ? vinInfo.valid : true
    const makeOk = needsMake ? !!String(make).trim() : true
    const modelOk = needsModel ? !!String(model).trim() : true
    const yearOk = needsYear ? !!String(year).trim() : true
    const hoursOk = needsHours ? parseHoursValue(hours).valid : true
    const requiredFieldsOk = vinOk && makeOk && modelOk && yearOk && hoursOk
    const hasHighSeverityIssues = openIssues.some((issue) => issue.severity === 'High')
    const isMixerInShopWithoutIssues =
        itemType?.toLowerCase() === 'mixer' && status === 'In Shop' && openIssues.length === 0
    const canVerify = requiredFieldsOk && operatorOk && !isMixerInShopWithoutIssues

    const totalRequirements = 2 + (isMixerInShopWithoutIssues ? 1 : 0)
    const blockers = (requiredFieldsOk ? 0 : 1) + (operatorOk ? 0 : 1) + (isMixerInShopWithoutIssues ? 1 : 0)

    const toggleSection = (sectionName) => setExpandedSection((prev) => (prev === sectionName ? null : sectionName))
    const isSectionExpanded = (sectionName) => expandedSection === sectionName

    if (typeof document === 'undefined' || !document.body) return null

    const itemTypeDisplay = itemType ? itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase() : 'Asset'

    return (
        <>
            {ReactDOM.createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[rgba(15,23,42,0.55)] backdrop-blur-sm animate-[fadeIn_200ms_ease-out_both] motion-reduce:animate-none"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="verification-modal-title"
                >
                    <div className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-lg max-h-[90vh] bg-bg-primary border border-border-light shadow-2xl animate-[popIn_220ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none">
                        <div className="px-5 pt-4 pb-3 shrink-0 border-b border-border-light">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2
                                        id="verification-modal-title"
                                        className="text-[16px] font-semibold leading-tight text-text-primary"
                                    >
                                        Verify {itemTypeDisplay}
                                    </h2>
                                    <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">
                                        Review the items below before confirming verification.
                                    </p>
                                </div>
                                <button type="button"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary text-text-secondary active:scale-[0.92]"
                                    onClick={onClose}
                                    title="Close"
                                    aria-label="Close"
                                >
                                    <i className="fas fa-times text-[13px]" />
                                </button>
                            </div>
                            <ProgressTrack accentColor={accentColor} blockers={blockers} total={totalRequirements} />
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 bg-bg-secondary">
                            {sectionsReady.checklist && (
                                <VerificationChecklistSection
                                    expanded={isSectionExpanded('checklist')}
                                    hours={hours}
                                    hoursOk={hoursOk}
                                    lastChipDate={lastChipDate}
                                    lastServiceDate={lastServiceDate}
                                    make={make}
                                    makeOk={makeOk}
                                    model={model}
                                    modelOk={modelOk}
                                    needsHours={needsHours}
                                    needsMake={needsMake}
                                    needsModel={needsModel}
                                    needsVin={needsVin}
                                    needsYear={needsYear}
                                    onToggle={() => toggleSection('checklist')}
                                    requiredFieldsOk={requiredFieldsOk}
                                    serviceOverdue={serviceOverdue}
                                    setHours={setHours}
                                    setLastChipDate={setLastChipDate}
                                    setLastServiceDate={setLastServiceDate}
                                    setMake={setMake}
                                    setModel={setModel}
                                    setVin={setVin}
                                    setYear={setYear}
                                    vin={vin}
                                    vinInfo={vinInfo}
                                    vinOk={vinOk}
                                    year={year}
                                    yearOk={yearOk}
                                />
                            )}

                            {assignedOperator && sectionsReady.operator && (
                                <VerificationOperatorSection
                                    accentColor={accentColor}
                                    expanded={isSectionExpanded('operator')}
                                    isLoadingOperator={isLoadingOperator}
                                    isSavingPhone={isSavingPhone}
                                    onSavePhone={handleSaveOperatorPhone}
                                    onSaveRating={handleSaveOperatorRating}
                                    onToggle={() => toggleSection('operator')}
                                    operatorData={operatorData}
                                    operatorOk={operatorOk}
                                    operatorPhone={operatorPhone}
                                    operatorRating={operatorRating}
                                    phoneOk={phoneOk}
                                    ratingOk={ratingOk}
                                    setOperatorPhone={setOperatorPhone}
                                />
                            )}

                            {itemId && service && sectionsReady.issues && (
                                <VerificationIssuesSection
                                    accentColor={accentColor}
                                    canAddIssue={typeof service?.addIssue === 'function'}
                                    canDelete={canDelete}
                                    expanded={isSectionExpanded('issues')}
                                    hasHighSeverityIssues={hasHighSeverityIssues}
                                    isLoadingIssues={isLoadingIssues}
                                    onAddIssue={handleAddIssue}
                                    onCompleteIssue={handleCompleteIssue}
                                    onDeleteIssue={handleDeleteIssue}
                                    onToggle={() => toggleSection('issues')}
                                    openIssues={openIssues}
                                    userNames={userNames}
                                />
                            )}

                            {itemId && service && sectionsReady.comments && (
                                <VerificationCommentsSection
                                    accentColor={accentColor}
                                    canAddComment={typeof service?.addComment === 'function'}
                                    comments={comments}
                                    expanded={isSectionExpanded('comments')}
                                    isLoadingComments={isLoadingComments}
                                    onAddComment={handleAddComment}
                                    onDeleteComment={handleDeleteComment}
                                    onToggle={() => toggleSection('comments')}
                                    userNames={userNames}
                                />
                            )}

                            {isMixerInShopWithoutIssues && (
                                <Banner tone="danger" icon="fa-exclamation-triangle">
                                    Mixers in &quot;In Shop&quot; status need at least one active issue before they can
                                    be verified. Add an issue describing why this mixer is in the shop.
                                </Banner>
                            )}

                            {verifyError && (
                                <div
                                    role="alert"
                                    aria-live="polite"
                                    className="animate-[fadeIn_200ms_ease-out_both] motion-reduce:animate-none"
                                >
                                    <Banner tone="danger" icon="fa-exclamation-circle">
                                        {verifyError}
                                    </Banner>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 px-4 py-3 shrink-0 bg-bg-primary border-t border-border-light">
                            <button type="button"
                                onClick={onClose}
                                disabled={isVerifying}
                                className="rounded-md px-4 py-2 text-[12.5px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary text-text-secondary active:scale-[0.97] disabled:active:scale-100"
                            >
                                Cancel
                            </button>
                            <button type="button"
                                onClick={handleSaveAndVerify}
                                disabled={!canVerify || isVerifying}
                                aria-busy={isVerifying}
                                className="flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[12.5px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed transition-[filter,transform] duration-150 ease-out motion-reduce:transition-none hover:brightness-105 active:scale-[0.97] disabled:active:scale-100"
                                style={{
                                    background: canVerify ? accentColor : 'var(--text-tertiary)',
                                    opacity: !canVerify || isVerifying ? 0.65 : 1
                                }}
                            >
                                <i className={`fas ${isVerifying ? 'fa-spinner fa-spin' : 'fa-check'} text-[11px]`} />
                                {isVerifying
                                    ? `Verifying ${itemTypeDisplay.toLowerCase()}...`
                                    : canVerify
                                      ? `Verify ${itemTypeDisplay.toLowerCase()}`
                                      : 'Complete required items'}
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
