import { useCallback, useEffect, useRef, useState } from 'react'

import { MaintenanceService } from '../../services/MaintenanceService'
import { buildResponseData } from '../../utils/MaintenanceUtility'

/**
 * Manages maintenance form draft auto-saving to both localStorage and the database.
 * Saves drafts every 30 seconds while in progress and restores on remount.
 */
export function useMaintenanceDraft({
    checklistComments,
    checklistStates,
    currentStep,
    fieldImages,
    fields,
    formId,
    dueDate,
    plantCode,
    isReadOnly,
    responses
}) {
    const [draftSubmissionId, setDraftSubmissionId] = useState(null)
    const autoSaveTimerRef = useRef(null)
    const pendingSaveRef = useRef(false)
    const savingRef = useRef(false)

    const storageKey = formId && dueDate ? `maintenance_draft_${formId}_${dueDate}_${plantCode || 'default'}` : null

    const saveDraftToStorage = useCallback(() => {
        if (!storageKey || isReadOnly) return

        const savedImages = {}
        Object.entries(fieldImages).forEach(([fieldId, imgData]) => {
            if (imgData?.uploadedUrl) {
                savedImages[fieldId] = { uploaded: true, uploadedUrl: imgData.uploadedUrl }
            }
        })

        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    checklistComments,
                    checklistStates,
                    currentStep,
                    fieldImages: savedImages,
                    responses,
                    savedAt: new Date().toISOString()
                })
            )
        } catch (_) {}
    }, [storageKey, isReadOnly, fieldImages, checklistComments, checklistStates, currentStep, responses])

    const loadDraft = useCallback(() => {
        if (!storageKey) return null
        try {
            const saved = localStorage.getItem(storageKey)
            return saved ? JSON.parse(saved) : null
        } catch (_) {
            return null
        }
    }, [storageKey])

    const clearDraft = useCallback(() => {
        if (!storageKey) return
        try {
            localStorage.removeItem(storageKey)
        } catch (_) {}
    }, [storageKey])

    const saveToDatabase = useCallback(async () => {
        if (!formId || !dueDate || isReadOnly || fields.length === 0) return

        pendingSaveRef.current = false
        savingRef.current = true

        try {
            const responseData = buildResponseData(fields, responses, checklistStates, checklistComments, fieldImages)
            const newId = await MaintenanceService.saveDraftProgress(
                formId,
                dueDate,
                responseData,
                plantCode,
                draftSubmissionId
            )
            if (newId && newId !== draftSubmissionId) setDraftSubmissionId(newId)
        } catch (_) {
        } finally {
            savingRef.current = false
            if (pendingSaveRef.current) {
                pendingSaveRef.current = false
                saveToDatabase()
            }
        }
    }, [
        formId,
        dueDate,
        plantCode,
        isReadOnly,
        fields,
        responses,
        checklistStates,
        checklistComments,
        fieldImages,
        draftSubmissionId
    ])

    const triggerAutoSave = useCallback(() => {
        if (isReadOnly) return

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

        if (savingRef.current) {
            pendingSaveRef.current = true
            return
        }

        autoSaveTimerRef.current = setTimeout(() => saveToDatabase(), 1000)
    }, [isReadOnly, saveToDatabase])

    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        }
    }, [])

    return {
        clearDraft,
        draftSubmissionId,
        loadDraft,
        saveDraftToStorage,
        setDraftSubmissionId,
        triggerAutoSave
    }
}
