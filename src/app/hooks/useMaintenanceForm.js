import { useCallback, useEffect, useMemo, useState } from 'react'

import { MaintenanceService } from '../../services/MaintenanceService'
import { UserService } from '../../services/UserService'
import {
    buildResponseData,
    initializeFormResponses,
    parseSubmissionResponsesWithImages,
    validateAllFieldErrors,
    validateFieldErrors
} from '../../utils/MaintenanceUtility'
import { useMaintenanceDraft } from './useMaintenanceDraft'
import { useMaintenanceImages } from './useMaintenanceImages'

/**
 * Orchestrates the full maintenance form lifecycle: initialization from due items or submissions,
 * field validation, wizard step navigation, submission/review workflows, and draft management.
 */
export function useMaintenanceForm({ item, onSubmitted }) {
    const [submitting, setSubmitting] = useState(false)
    const [responses, setResponses] = useState({})
    const [checklistStates, setChecklistStates] = useState({})
    const [checklistComments, setChecklistComments] = useState({})
    const [errors, setErrors] = useState({})
    const [reviewNotes, setReviewNotes] = useState('')
    const [submitterName, setSubmitterName] = useState('')
    const [currentStep, setCurrentStep] = useState(0)
    const [formData, setFormData] = useState(null)
    const [loading, setLoading] = useState(false)

    const isReview = item?.isReview
    const isViewOnly = item?.isViewOnly
    const isEditing = item?.isEditing
    const isReadOnly = isReview || isViewOnly
    const existingResponses = useMemo(
        () => item?.maintenance_submission_responses || [],
        [item?.maintenance_submission_responses]
    )
    const submissionId = item?.submission_id || item?.id

    const formObj = formData || item?.form || item?.maintenance_forms || null

    const fields = useMemo(() => {
        const formFields = formObj?.maintenance_form_fields
        if (!formFields?.length) return []
        return [...formFields].sort((a, b) => (a.field_order || 0) - (b.field_order || 0))
    }, [formObj])

    const totalSteps = fields.length
    const currentField = fields[currentStep]
    const isLastStep = currentStep === totalSteps - 1
    const isFirstStep = currentStep === 0

    const imageHook = useMaintenanceImages({ formId: formObj?.id, setErrors })
    const { fieldImages, setFieldImages } = imageHook

    const draftHook = useMaintenanceDraft({
        checklistComments,
        checklistStates,
        currentStep,
        dueDate: item?.due_date,
        fieldImages,
        fields,
        formId: formObj?.id,
        isReadOnly: isReadOnly || loading,
        plantCode: item?.plant_code,
        responses
    })

    const applyParsedResponses = useCallback(
        ({ responses: r, checklists, comments, images }) => {
            setResponses(r)
            setChecklistStates(checklists)
            setChecklistComments(comments)
            setFieldImages(images)
        },
        [setFieldImages]
    )

    const initializeResponses = useCallback(() => {
        const draft = draftHook.loadDraft()
        if (draft?.responses) {
            setResponses(draft.responses)
            setChecklistStates(draft.checklistStates || {})
            setChecklistComments(draft.checklistComments || {})
            setFieldImages(draft.fieldImages || {})
            setCurrentStep(draft.currentStep || 0)
            return
        }

        const { responses: initialResponses, checklists } = initializeFormResponses(fields)

        if (existingResponses.length > 0) {
            existingResponses.forEach((resp) => {
                if (resp.checklist_values) {
                    checklists[resp.field_id] = resp.checklist_values
                } else {
                    initialResponses[resp.field_id] = resp.response_value || ''
                }
            })
        }

        setResponses(initialResponses)
        setChecklistStates(checklists)
    }, [draftHook, fields, existingResponses, setFieldImages])

    const loadSubmissionDetails = useCallback(async () => {
        setLoading(true)
        try {
            let data = null
            const subId = submissionId || item?.id
            if (subId) data = await MaintenanceService.fetchSubmissionById(subId)
            if (!data && item?.maintenance_submission_responses?.length > 0) data = item

            if (!data) {
                initializeResponses()
                setLoading(false)
                return
            }

            if (data?.maintenance_forms) setFormData(data.maintenance_forms)

            if (data?.submitted_by) {
                const name = await UserService.getUserDisplayName(data.submitted_by)
                setSubmitterName(name)
            }

            if (data?.maintenance_submission_responses?.length > 0) {
                applyParsedResponses(parseSubmissionResponsesWithImages(data.maintenance_submission_responses))
            } else {
                initializeResponses()
            }

            if (data?.review_notes) setReviewNotes(data.review_notes)
        } catch (_) {
            initializeResponses()
        } finally {
            setLoading(false)
        }
    }, [submissionId, item, initializeResponses, applyParsedResponses])

    useEffect(() => {
        const loadFormData = async () => {
            if (isReview || isViewOnly || isEditing || existingResponses.length > 0) {
                setLoading(true)
                try {
                    await loadSubmissionDetails()
                } catch (_) {
                    initializeResponses()
                } finally {
                    setLoading(false)
                }
                return
            }

            const existingForm = item?.form || item?.maintenance_forms
            const hasFields = existingForm?.maintenance_form_fields?.length > 0
            const formId = existingForm?.id || item?.form_id

            if (hasFields) {
                setFormData(existingForm)
            } else if (formId) {
                setLoading(true)
                try {
                    const fetchedForm = await MaintenanceService.fetchFormById(formId)
                    if (fetchedForm) setFormData(fetchedForm)
                } catch (_) {
                } finally {
                    setLoading(false)
                }
            }

            if (formId && item?.due_date) {
                setLoading(true)
                try {
                    const dbDraft = await MaintenanceService.fetchDraft(formId, item.due_date, item.plant_code)
                    if (dbDraft?.maintenance_submission_responses?.length > 0) {
                        draftHook.setDraftSubmissionId(dbDraft.id)
                        applyParsedResponses(
                            parseSubmissionResponsesWithImages(dbDraft.maintenance_submission_responses)
                        )
                        setLoading(false)
                        return
                    }
                } catch (_) {}
                setLoading(false)
            }

            initializeResponses()
        }
        loadFormData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item])

    useEffect(() => {
        if (!loading && !isReadOnly && !isEditing && fields.length > 0) {
            draftHook.saveDraftToStorage()
            draftHook.triggerAutoSave()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        responses,
        checklistStates,
        checklistComments,
        fieldImages,
        currentStep,
        loading,
        isReadOnly,
        isEditing,
        draftHook.saveDraftToStorage,
        draftHook.triggerAutoSave,
        fields.length
    ])

    const handleResponseChange = useCallback(
        (fieldId, value) => {
            setResponses((prev) => ({ ...prev, [fieldId]: value }))
            if (errors[fieldId]) setErrors((prev) => ({ ...prev, [fieldId]: null }))
        },
        [errors]
    )

    const handleChecklistChange = useCallback(
        (fieldId, checkItem, checked) => {
            setChecklistStates((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], [checkItem]: checked } }))
            if (errors[fieldId]) setErrors((prev) => ({ ...prev, [fieldId]: null }))
        },
        [errors]
    )

    const handleChecklistComment = useCallback(
        (fieldId, checkItem, comment) => {
            setChecklistComments((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], [checkItem]: comment } }))
            if (errors[fieldId]) setErrors((prev) => ({ ...prev, [fieldId]: null }))
        },
        [errors]
    )

    const validateCurrentField = useCallback(() => {
        if (!currentField) return true
        const fieldErrors = validateFieldErrors(
            currentField,
            responses,
            checklistStates,
            checklistComments,
            fieldImages
        )
        setErrors(fieldErrors)
        return Object.keys(fieldErrors).length === 0
    }, [currentField, responses, checklistStates, checklistComments, fieldImages])

    const handleNext = useCallback(() => {
        if (validateCurrentField() && currentStep < totalSteps - 1) setCurrentStep((p) => p + 1)
    }, [validateCurrentField, currentStep, totalSteps])

    const handlePrevious = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((p) => p - 1)
            setErrors({})
        }
    }, [currentStep])

    const handleSubmit = useCallback(async () => {
        const allErrors = validateAllFieldErrors(fields, responses, checklistStates, checklistComments, fieldImages)
        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors)
            const firstErrorIdx = fields.findIndex((f) => allErrors[f.id] || allErrors[`${f.id}_image`])
            if (firstErrorIdx >= 0) setCurrentStep(firstErrorIdx)
            return
        }

        setSubmitting(true)
        try {
            const responseData = buildResponseData(fields, responses, checklistStates, checklistComments, fieldImages)
            if (isEditing && submissionId) {
                await MaintenanceService.updateSubmission(submissionId, responseData)
            } else {
                await MaintenanceService.submitForm(formObj.id, item.due_date, responseData, item.plant_code)
            }
            draftHook.clearDraft()
            onSubmitted()
        } catch (error) {
            setErrors({ submit: error.message })
        } finally {
            setSubmitting(false)
        }
    }, [
        fields,
        responses,
        checklistStates,
        checklistComments,
        fieldImages,
        isEditing,
        submissionId,
        formObj,
        item,
        draftHook,
        onSubmitted
    ])

    const handleReview = useCallback(
        async (status) => {
            setSubmitting(true)
            try {
                await MaintenanceService.reviewSubmission(item.id, status, reviewNotes)
                onSubmitted()
            } catch (error) {
                setErrors({ submit: error.message })
            } finally {
                setSubmitting(false)
            }
        },
        [item?.id, reviewNotes, onSubmitted]
    )

    return {
        checklistComments,
        checklistStates,
        currentField,
        currentStep,
        errors,
        fields,
        formObj,
        handleChecklistChange,
        handleChecklistComment,
        handleNext,
        handlePrevious,
        handleResponseChange,
        handleReview,
        handleSubmit,
        imageHook,
        isEditing,
        isFirstStep,
        isLastStep,
        isReview,
        isViewOnly,
        loading,
        responses,
        reviewNotes,
        setReviewNotes,
        submitterName,
        submitting,
        totalSteps
    }
}
