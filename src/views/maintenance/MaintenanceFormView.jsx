import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import LoadingScreen from '../../app/components/common/LoadingScreen'
import { MaintenanceService } from '../../services/MaintenanceService'
import { UserService } from '../../services/UserService'
import { formatMaintenanceDateShort, getFieldTypeIcon } from '../../utils/MaintenanceUtility'

export default function MaintenanceFormView({ item, onBack, onSubmitted }) {
    const [submitting, setSubmitting] = useState(false)
    const [responses, setResponses] = useState({})
    const [checklistStates, setChecklistStates] = useState({})
    const [checklistComments, setChecklistComments] = useState({})
    const [fieldImages, setFieldImages] = useState({})
    const [uploadingImage, setUploadingImage] = useState(null)
    const [errors, setErrors] = useState({})
    const [reviewNotes, setReviewNotes] = useState('')
    const [submitterName, setSubmitterName] = useState('')
    const [currentStep, setCurrentStep] = useState(0)
    const [formData, setFormData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState(null)
    const [activeImageFieldId, setActiveImageFieldId] = useState(null)
    const [draftSubmissionId, setDraftSubmissionId] = useState(null)
    const fileInputRef = useRef(null)
    const cameraInputRef = useRef(null)
    const autoSaveTimerRef = useRef(null)
    const pendingSaveRef = useRef(false)
    const savingRef = useRef(false)

    const formObj = formData || item?.form || item?.maintenance_forms || null

    const fields = useMemo(() => {
        if (!formObj) return []
        const formFields = formObj.maintenance_form_fields
        if (!formFields || !Array.isArray(formFields) || formFields.length === 0) return []
        return [...formFields].sort((a, b) => (a.field_order || 0) - (b.field_order || 0))
    }, [formObj])

    const isReview = item?.isReview
    const isViewOnly = item?.isViewOnly
    const isEditing = item?.isEditing
    const existingResponses = item?.maintenance_submission_responses || []
    const submissionId = item?.submission_id || item?.id

    const totalSteps = fields.length
    const currentField = fields[currentStep]
    const isLastStep = currentStep === totalSteps - 1
    const isFirstStep = currentStep === 0

    const getImageDisplayUrl = (url) => {
        if (!url) return null
        if (typeof url !== 'string') return null
        const trimmedUrl = url.trim()
        if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('blob:')) {
            return trimmedUrl
        }
        return MaintenanceService.getImageUrl(trimmedUrl)
    }

    const getStorageKey = useCallback(() => {
        if (!formObj?.id || !item?.due_date) return null
        return `maintenance_draft_${formObj.id}_${item.due_date}_${item.plant_code || 'default'}`
    }, [formObj?.id, item?.due_date, item?.plant_code])

    const saveDraft = useCallback(() => {
        const key = getStorageKey()
        if (!key || isReview || isViewOnly) return

        const savedImages = {}
        Object.entries(fieldImages).forEach(([fieldId, imgData]) => {
            if (imgData?.uploadedUrl) {
                savedImages[fieldId] = { uploaded: true, uploadedUrl: imgData.uploadedUrl }
            }
        })

        const draft = {
            checklistComments,
            checklistStates,
            currentStep,
            fieldImages: savedImages,
            responses,
            savedAt: new Date().toISOString()
        }
        try {
            localStorage.setItem(key, JSON.stringify(draft))
        } catch (e) {}
    }, [getStorageKey, responses, checklistStates, checklistComments, fieldImages, currentStep, isReview, isViewOnly])

    const buildResponseData = useCallback(() => {
        return fields.map((field) => {
            if (field.field_type === 'checklist') {
                const checklistImages = {}
                const checkItems = field.options?.items || []
                checkItems.forEach((checkItem) => {
                    const imageKey = `${field.id}_${checkItem}`
                    const imgData = fieldImages[imageKey]
                    if (imgData?.uploadedUrl) {
                        checklistImages[checkItem] = imgData.uploadedUrl
                    }
                })
                return {
                    checklist_comments: checklistComments[field.id] || {},
                    checklist_images: Object.keys(checklistImages).length > 0 ? checklistImages : null,
                    checklist_values: checklistStates[field.id] || {},
                    field_id: field.id
                }
            }

            const imageData = fieldImages[field.id]
            const imageUrl = imageData?.uploadedUrl || null
            return {
                field_id: field.id,
                image_url: imageUrl,
                response_value: responses[field.id] || ''
            }
        })
    }, [fields, responses, checklistStates, checklistComments, fieldImages])

    const saveToDatabase = useCallback(async () => {
        if (!formObj?.id || !item?.due_date || isReview || isViewOnly) return

        if (fields.length === 0) return

        pendingSaveRef.current = false
        savingRef.current = true

        try {
            const responseData = buildResponseData()
            const newSubmissionId = await MaintenanceService.saveDraftProgress(
                formObj.id,
                item.due_date,
                responseData,
                item.plant_code,
                draftSubmissionId
            )
            if (newSubmissionId && newSubmissionId !== draftSubmissionId) {
                setDraftSubmissionId(newSubmissionId)
            }
        } catch (error) {
        } finally {
            savingRef.current = false
            if (pendingSaveRef.current) {
                pendingSaveRef.current = false
                saveToDatabase()
            }
        }
    }, [
        formObj?.id,
        item?.due_date,
        item?.plant_code,
        isReview,
        isViewOnly,
        fields,
        buildResponseData,
        draftSubmissionId
    ])

    const triggerAutoSave = useCallback(() => {
        if (isReview || isViewOnly || loading) return

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }

        if (savingRef.current) {
            pendingSaveRef.current = true
            return
        }

        autoSaveTimerRef.current = setTimeout(() => {
            saveToDatabase()
        }, 1000)
    }, [isReview, isViewOnly, loading, saveToDatabase])

    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [])

    const loadDraft = useCallback(() => {
        const key = getStorageKey()
        if (!key) return null

        try {
            const saved = localStorage.getItem(key)
            if (saved) {
                return JSON.parse(saved)
            }
        } catch (e) {}
        return null
    }, [getStorageKey])

    const clearDraft = useCallback(() => {
        const key = getStorageKey()
        if (key) {
            try {
                localStorage.removeItem(key)
            } catch (e) {}
        }
    }, [getStorageKey])

    useEffect(() => {
        if (!loading && !isReview && !isViewOnly && !isEditing && fields.length > 0) {
            saveDraft()
            triggerAutoSave()
        }
    }, [
        responses,
        checklistStates,
        checklistComments,
        fieldImages,
        currentStep,
        loading,
        isReview,
        isViewOnly,
        isEditing,
        saveDraft,
        triggerAutoSave,
        fields.length
    ])

    useEffect(() => {
        const loadFormData = async () => {
            if (isReview || isViewOnly || isEditing || existingResponses.length > 0) {
                setLoading(true)
                try {
                    await loadSubmissionDetails()
                } catch (error) {
                    initializeResponses()
                } finally {
                    setLoading(false)
                }
                return
            }

            const existingForm = item?.form || item?.maintenance_forms
            const hasFields =
                existingForm?.maintenance_form_fields &&
                Array.isArray(existingForm.maintenance_form_fields) &&
                existingForm.maintenance_form_fields.length > 0

            const formId = existingForm?.id || item?.form_id

            if (hasFields) {
                setFormData(existingForm)
            } else if (formId) {
                setLoading(true)
                try {
                    const fetchedForm = await MaintenanceService.fetchFormById(formId)
                    if (fetchedForm) {
                        setFormData(fetchedForm)
                    }
                } catch (error) {
                } finally {
                    setLoading(false)
                }
            }

            if (formId && item?.due_date) {
                setLoading(true)
                try {
                    const dbDraft = await MaintenanceService.fetchDraft(formId, item.due_date, item.plant_code)
                    if (dbDraft && dbDraft.maintenance_submission_responses?.length > 0) {
                        setDraftSubmissionId(dbDraft.id)
                        const respMap = {}
                        const checkMap = {}
                        const commentMap = {}
                        const imageMap = {}
                        dbDraft.maintenance_submission_responses.forEach((resp) => {
                            const fieldId = String(resp.field_id)
                            if (resp.checklist_values) {
                                checkMap[fieldId] =
                                    typeof resp.checklist_values === 'string'
                                        ? JSON.parse(resp.checklist_values)
                                        : resp.checklist_values
                            } else {
                                respMap[fieldId] = resp.response_value || ''
                            }
                            if (resp.checklist_comments) {
                                const comments =
                                    typeof resp.checklist_comments === 'string'
                                        ? JSON.parse(resp.checklist_comments)
                                        : resp.checklist_comments
                                commentMap[fieldId] = comments
                            }
                            if (resp.image_url) {
                                imageMap[fieldId] = { uploaded: true, uploadedUrl: resp.image_url }
                            }
                            if (resp.checklist_images) {
                                const checkImages =
                                    typeof resp.checklist_images === 'string'
                                        ? JSON.parse(resp.checklist_images)
                                        : resp.checklist_images
                                if (checkImages && typeof checkImages === 'object') {
                                    Object.entries(checkImages).forEach(([checkItem, imgUrl]) => {
                                        const imageKey = `${fieldId}_${checkItem.trim()}`
                                        imageMap[imageKey] = { uploaded: true, uploadedUrl: imgUrl }
                                    })
                                }
                            }
                        })
                        setResponses(respMap)
                        setChecklistStates(checkMap)
                        setChecklistComments(commentMap)
                        setFieldImages(imageMap)
                        setLoading(false)
                        return
                    }
                } catch (error) {}
                setLoading(false)
            }

            initializeResponses()
        }
        loadFormData()
    }, [item])

    const loadSubmissionDetails = async () => {
        setLoading(true)
        try {
            let data = null

            const subId = submissionId || item?.id
            if (subId) {
                data = await MaintenanceService.fetchSubmissionById(subId)
            }

            if (!data && item?.maintenance_submission_responses?.length > 0) {
                data = item
            }

            if (!data) {
                initializeResponses()
                setLoading(false)
                return
            }

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
                const imageMap = {}
                data.maintenance_submission_responses.forEach((resp) => {
                    const fieldId = String(resp.field_id)
                    if (resp.checklist_values) {
                        checkMap[fieldId] =
                            typeof resp.checklist_values === 'string'
                                ? JSON.parse(resp.checklist_values)
                                : resp.checklist_values
                    } else {
                        respMap[fieldId] = resp.response_value || ''
                    }
                    if (resp.checklist_comments) {
                        const comments =
                            typeof resp.checklist_comments === 'string'
                                ? JSON.parse(resp.checklist_comments)
                                : resp.checklist_comments
                        commentMap[fieldId] = comments
                    }
                    if (resp.image_url) {
                        imageMap[fieldId] = { uploaded: true, uploadedUrl: resp.image_url }
                    }
                    if (resp.checklist_images) {
                        const checkImages =
                            typeof resp.checklist_images === 'string'
                                ? JSON.parse(resp.checklist_images)
                                : resp.checklist_images
                        if (checkImages && typeof checkImages === 'object') {
                            Object.entries(checkImages).forEach(([checkItem, imgUrl]) => {
                                const imageKey = `${fieldId}_${checkItem.trim()}`
                                imageMap[imageKey] = { uploaded: true, uploadedUrl: imgUrl }
                            })
                        }
                    }
                })
                setResponses(respMap)
                setChecklistStates(checkMap)
                setChecklistComments(commentMap)
                setFieldImages(imageMap)
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
        const draft = loadDraft()

        if (draft && draft.responses) {
            setResponses(draft.responses)
            setChecklistStates(draft.checklistStates || {})
            setChecklistComments(draft.checklistComments || {})
            setFieldImages(draft.fieldImages || {})
            setCurrentStep(draft.currentStep || 0)
            return
        }

        const initialResponses = {}
        const initialChecklists = {}

        fields.forEach((field) => {
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
            existingResponses.forEach((resp) => {
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
        setResponses((prev) => ({ ...prev, [fieldId]: value }))
        if (errors[fieldId]) {
            setErrors((prev) => ({ ...prev, [fieldId]: null }))
        }
    }

    const handleChecklistChange = (fieldId, checkItem, checked) => {
        setChecklistStates((prev) => ({
            ...prev,
            [fieldId]: {
                ...prev[fieldId],
                [checkItem]: checked
            }
        }))
        if (errors[fieldId]) {
            setErrors((prev) => ({ ...prev, [fieldId]: null }))
        }
    }

    const handleChecklistComment = (fieldId, checkItem, comment) => {
        setChecklistComments((prev) => ({
            ...prev,
            [fieldId]: {
                ...prev[fieldId],
                [checkItem]: comment
            }
        }))
        if (errors[fieldId]) {
            setErrors((prev) => ({ ...prev, [fieldId]: null }))
        }
    }

    const handleImageUpload = async (fieldId, file, checklistItem = null) => {
        if (!file) return

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(file.type)) {
            const errorKey = checklistItem ? `${fieldId}_${checklistItem}_image` : `${fieldId}_image`
            setErrors((prev) => ({ ...prev, [errorKey]: 'Please upload a valid image (JPEG, PNG, GIF, or WebP)' }))
            return
        }

        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            const errorKey = checklistItem ? `${fieldId}_${checklistItem}_image` : `${fieldId}_image`
            setErrors((prev) => ({ ...prev, [errorKey]: 'Image must be less than 10MB' }))
            return
        }

        const imageKey = checklistItem ? `${fieldId}_${checklistItem}` : fieldId
        setUploadingImage(imageKey)
        const errorKey = checklistItem ? `${fieldId}_${checklistItem}_image` : `${fieldId}_image`
        setErrors((prev) => ({ ...prev, [errorKey]: null }))

        try {
            const previewUrl = URL.createObjectURL(file)
            setFieldImages((prev) => ({
                ...prev,
                [imageKey]: {
                    file,
                    previewUrl,
                    uploaded: false
                }
            }))

            const uploadedUrl = await MaintenanceService.uploadImage(file, formObj.id, imageKey)

            setFieldImages((prev) => ({
                ...prev,
                [imageKey]: {
                    ...prev[imageKey],
                    uploaded: true,
                    uploadedUrl
                }
            }))
        } catch (error) {
            setErrors((prev) => ({ ...prev, [errorKey]: error.message }))
            setFieldImages((prev) => {
                const newState = { ...prev }
                delete newState[imageKey]
                return newState
            })
        } finally {
            setUploadingImage(null)
        }
    }

    const handleRemoveImage = (fieldId, checklistItem = null) => {
        const imageKey = checklistItem ? `${fieldId}_${checklistItem}` : fieldId
        setFieldImages((prev) => {
            const newState = { ...prev }
            if (newState[imageKey]?.previewUrl) {
                URL.revokeObjectURL(newState[imageKey].previewUrl)
            }
            delete newState[imageKey]
            return newState
        })
    }

    const triggerImageUpload = (fieldId, checklistItem = null) => {
        const imageKey = checklistItem ? `${fieldId}_${checklistItem}` : fieldId
        setActiveImageFieldId(imageKey)
        setTimeout(() => {
            fileInputRef.current?.click()
        }, 0)
    }

    const triggerCameraCapture = (fieldId, checklistItem = null) => {
        const imageKey = checklistItem ? `${fieldId}_${checklistItem}` : fieldId
        setActiveImageFieldId(imageKey)
        setTimeout(() => {
            cameraInputRef.current?.click()
        }, 0)
    }

    const onFileInputChange = (e) => {
        const file = e.target.files?.[0]
        if (file && activeImageFieldId) {
            if (activeImageFieldId.includes('_')) {
                const parts = activeImageFieldId.split('_')
                const fieldId = parts[0]
                const checklistItem = parts.slice(1).join('_')
                handleImageUpload(fieldId, file, checklistItem)
            } else {
                handleImageUpload(activeImageFieldId, file)
            }
        }
        e.target.value = ''
    }

    const openImagePreview = (url) => {
        setImagePreview(url)
    }

    const closeImagePreview = () => {
        setImagePreview(null)
    }

    const validateCurrentField = () => {
        if (!currentField) return true
        const newErrors = {}

        if (currentField.is_required) {
            if (currentField.field_type === 'checklist') {
                const checkState = checklistStates[currentField.id] || {}
                const comments = checklistComments[currentField.id] || {}
                const checkItems = currentField.options?.items || []
                const allValid = checkItems.every((item) => {
                    const isChecked = checkState[item] === true
                    const hasComment = comments[item] && comments[item].trim() !== ''
                    return isChecked || hasComment
                })
                if (!allValid) {
                    newErrors[currentField.id] = 'Please complete all items or provide a comment for unchecked items'
                }
            } else {
                const value = responses[currentField.id]
                if (!value || value.trim() === '') {
                    newErrors[currentField.id] = 'This field is required'
                }
            }
        }

        if (currentField.image_required) {
            if (currentField.field_type === 'checklist') {
                const checkState = checklistStates[currentField.id] || {}
                const checkItems = currentField.options?.items || []
                checkItems.forEach((item) => {
                    if (checkState[item] === true) {
                        const imageKey = `${currentField.id}_${item}`
                        const hasImage = fieldImages[imageKey]?.uploaded || fieldImages[imageKey]?.uploadedUrl
                        if (!hasImage) {
                            newErrors[`${currentField.id}_${item}_image`] = `Photo required for "${item}"`
                        }
                    }
                })
            } else {
                const hasImage = fieldImages[currentField.id]?.uploaded || fieldImages[currentField.id]?.uploadedUrl
                if (!hasImage) {
                    newErrors[`${currentField.id}_image`] = 'An image is required for this field'
                }
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const validateAllFields = () => {
        const newErrors = {}

        fields.forEach((field) => {
            if (field.is_required) {
                if (field.field_type === 'checklist') {
                    const checkState = checklistStates[field.id] || {}
                    const comments = checklistComments[field.id] || {}
                    const checkItems = field.options?.items || []
                    const allValid = checkItems.every((item) => {
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

            if (field.image_required) {
                if (field.field_type === 'checklist') {
                    const checkState = checklistStates[field.id] || {}
                    const checkItems = field.options?.items || []
                    checkItems.forEach((item) => {
                        if (checkState[item] === true) {
                            const imageKey = `${field.id}_${item}`
                            const hasImage = fieldImages[imageKey]?.uploaded || fieldImages[imageKey]?.uploadedUrl
                            if (!hasImage) {
                                newErrors[`${field.id}_${item}_image`] = `Photo required for "${item}"`
                            }
                        }
                    })
                } else {
                    const hasImage = fieldImages[field.id]?.uploaded || fieldImages[field.id]?.uploadedUrl
                    if (!hasImage) {
                        newErrors[`${field.id}_image`] = 'An image is required for this field'
                    }
                }
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = () => {
        if (validateCurrentField() && currentStep < totalSteps - 1) {
            setCurrentStep((prev) => prev + 1)
        }
    }

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1)
            setErrors({})
        }
    }

    const handleSubmit = async () => {
        if (!validateAllFields()) {
            const firstErrorFieldIdx = fields.findIndex((f) => errors[f.id] || errors[`${f.id}_image`])
            if (firstErrorFieldIdx >= 0) {
                setCurrentStep(firstErrorFieldIdx)
            }
            return
        }

        setSubmitting(true)
        try {
            const responseData = fields.map((field) => {
                if (field.field_type === 'checklist') {
                    const checklistImages = {}
                    const checkItems = field.options?.items || []
                    checkItems.forEach((checkItem) => {
                        const imageKey = `${field.id}_${checkItem}`
                        const imgData = fieldImages[imageKey]
                        if (imgData?.uploadedUrl) {
                            checklistImages[checkItem] = imgData.uploadedUrl
                        }
                    })
                    return {
                        checklist_comments: checklistComments[field.id] || {},
                        checklist_images: Object.keys(checklistImages).length > 0 ? checklistImages : null,
                        checklist_values: checklistStates[field.id] || {},
                        field_id: field.id
                    }
                }

                const imageData = fieldImages[field.id]
                const imageUrl = imageData?.uploadedUrl || null
                return {
                    field_id: field.id,
                    image_url: imageUrl,
                    response_value: responses[field.id] || ''
                }
            })

            if (isEditing && submissionId) {
                await MaintenanceService.updateSubmission(submissionId, responseData)
            } else {
                await MaintenanceService.submitForm(formObj.id, item.due_date, responseData, item.plant_code)
            }
            clearDraft()
            onSubmitted()
        } catch (error) {
            setErrors({ submit: error.message })
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
            setErrors({ submit: error.message })
        } finally {
            setSubmitting(false)
        }
    }

    const renderField = (field) => {
        const isDisabled = isReview || (isViewOnly && !isEditing)

        switch (field.field_type) {
            case 'short_answer':
                return (
                    <input
                        type="text"
                        style={{
                            ...styles.input,
                            ...(errors[field.id] ? { borderColor: '#ef4444' } : {})
                        }}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        placeholder="Type your answer..."
                        disabled={isDisabled}
                        autoFocus
                        onFocus={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#1e3a5f'
                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                            }
                        }}
                        onBlur={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#e5e7eb'
                                e.target.style.boxShadow = 'none'
                            }
                        }}
                    />
                )

            case 'long_answer':
                return (
                    <textarea
                        style={{
                            ...styles.textarea,
                            ...(errors[field.id] ? { borderColor: '#ef4444' } : {})
                        }}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        placeholder="Type your answer..."
                        rows={5}
                        disabled={isDisabled}
                        autoFocus
                        onFocus={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#1e3a5f'
                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                            }
                        }}
                        onBlur={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#e5e7eb'
                                e.target.style.boxShadow = 'none'
                            }
                        }}
                    />
                )

            case 'checklist': {
                const checkItems = field.options?.items || []
                const comments = checklistComments[field.id] || {}
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {checkItems.map((checkItem, idx) => {
                            const isChecked = checklistStates[field.id]?.[checkItem] || false
                            const hasComment = comments[checkItem] && comments[checkItem].trim() !== ''
                            const imageKey = `${field.id}_${checkItem.trim()}`
                            const imageData = fieldImages[imageKey]
                            const imageUrl = imageData?.previewUrl || imageData?.uploadedUrl
                            const isUploadingThis = uploadingImage === imageKey
                            const imageError = errors[`${field.id}_${checkItem.trim()}_image`]

                            return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label
                                        style={{
                                            ...styles.checklistItem,
                                            ...(isChecked ? { background: '#f0f7ff', borderColor: '#1e3a5f' } : {}),
                                            cursor: isDisabled ? 'default' : 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            style={styles.checkbox}
                                            checked={isChecked}
                                            onChange={(e) =>
                                                handleChecklistChange(field.id, checkItem, e.target.checked)
                                            }
                                            disabled={isDisabled}
                                        />
                                        <div style={styles.checklistContent}>
                                            <span style={styles.checklistLabel}>{checkItem}</span>
                                        </div>
                                    </label>
                                    {!isChecked && field.is_required && (
                                        <input
                                            type="text"
                                            style={styles.checklistComment}
                                            value={comments[checkItem] || ''}
                                            onChange={(e) =>
                                                handleChecklistComment(field.id, checkItem, e.target.value)
                                            }
                                            placeholder="Why is this incomplete?"
                                            disabled={isDisabled}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#1e3a5f'
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb'
                                                e.target.style.boxShadow = 'none'
                                            }}
                                        />
                                    )}
                                    {(isChecked && field.image_required) || imageUrl ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {imageUrl ? (
                                                <div style={styles.imagePreview}>
                                                    <img
                                                        src={imageData?.previewUrl || getImageDisplayUrl(imageUrl)}
                                                        alt="Attached"
                                                        style={styles.previewImage}
                                                        onClick={() =>
                                                            openImagePreview(
                                                                imageData?.previewUrl || getImageDisplayUrl(imageUrl)
                                                            )
                                                        }
                                                    />
                                                    {!isDisabled && (
                                                        <button
                                                            style={styles.removeImageBtn}
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                handleRemoveImage(field.id, checkItem)
                                                            }}
                                                            type="button"
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.background = '#dc2626')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.background = '#ef4444')
                                                            }
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    )}
                                                    {isUploadingThis && (
                                                        <div style={styles.uploadingOverlay}>
                                                            <i
                                                                className="fas fa-spinner fa-spin"
                                                                style={{ color: 'white', fontSize: '1.5rem' }}
                                                            ></i>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : isChecked && field.image_required ? (
                                                <div style={styles.imageButtons}>
                                                    {isUploadingThis ? (
                                                        <div
                                                            style={{
                                                                alignItems: 'center',
                                                                color: '#64748b',
                                                                display: 'flex',
                                                                gap: '0.5rem',
                                                                padding: '0.75rem'
                                                            }}
                                                        >
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                            <span>Uploading...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                style={styles.imageBtn}
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    !isDisabled &&
                                                                        triggerCameraCapture(field.id, checkItem)
                                                                }}
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onMouseEnter={(e) => {
                                                                    if (!isDisabled) {
                                                                        e.currentTarget.style.borderColor = '#1e3a5f'
                                                                        e.currentTarget.style.background = '#f0f7ff'
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isDisabled) {
                                                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                                                        e.currentTarget.style.background = 'white'
                                                                    }
                                                                }}
                                                            >
                                                                <i className="fas fa-camera"></i>
                                                                <span>Take Photo</span>
                                                            </button>
                                                            <button
                                                                style={styles.imageBtn}
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    !isDisabled &&
                                                                        triggerImageUpload(field.id, checkItem)
                                                                }}
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onMouseEnter={(e) => {
                                                                    if (!isDisabled) {
                                                                        e.currentTarget.style.borderColor = '#1e3a5f'
                                                                        e.currentTarget.style.background = '#f0f7ff'
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isDisabled) {
                                                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                                                        e.currentTarget.style.background = 'white'
                                                                    }
                                                                }}
                                                            >
                                                                <i className="fas fa-images"></i>
                                                                <span>Upload</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : null}
                                            {imageError && (
                                                <div style={styles.error}>
                                                    <i className="fas fa-exclamation-circle"></i> {imageError}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>
                )
            }

            case 'notes':
                return (
                    <textarea
                        style={{
                            ...styles.textarea,
                            ...(errors[field.id] ? { borderColor: '#ef4444' } : {})
                        }}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        placeholder="Add any notes..."
                        rows={4}
                        disabled={isDisabled}
                        autoFocus
                        onFocus={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#1e3a5f'
                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                            }
                        }}
                        onBlur={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#e5e7eb'
                                e.target.style.boxShadow = 'none'
                            }
                        }}
                    />
                )

            default:
                return (
                    <input
                        type="text"
                        style={{
                            ...styles.input,
                            ...(errors[field.id] ? { borderColor: '#ef4444' } : {})
                        }}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        disabled={isDisabled}
                        autoFocus
                        onFocus={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#1e3a5f'
                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                            }
                        }}
                        onBlur={(e) => {
                            if (!errors[field.id]) {
                                e.target.style.borderColor = '#e5e7eb'
                                e.target.style.boxShadow = 'none'
                            }
                        }}
                    />
                )
        }
    }

    const renderImageAttachment = (field) => {
        if (field.field_type === 'checklist') return null

        const isDisabled = isReview || (isViewOnly && !isEditing)
        const imageData = fieldImages[field.id]
        const displayUrl = imageData?.previewUrl || imageData?.uploadedUrl
        const isUploading = uploadingImage === field.id
        const hasError = errors[`${field.id}_image`]

        return (
            <div style={styles.imageSection}>
                <label style={styles.imageLabel}>
                    <i className="fas fa-camera"></i> Photo Attachment{' '}
                    {field.image_required && <span style={styles.required}>*</span>}
                </label>

                {displayUrl ? (
                    <div style={styles.imagePreview}>
                        <img
                            src={imageData?.previewUrl || getImageDisplayUrl(displayUrl)}
                            alt="Attached"
                            style={styles.previewImage}
                            onClick={() => openImagePreview(imageData?.previewUrl || getImageDisplayUrl(displayUrl))}
                        />
                        {!isDisabled && (
                            <button
                                style={styles.removeImageBtn}
                                onClick={() => handleRemoveImage(field.id)}
                                type="button"
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                        {isUploading && (
                            <div style={styles.uploadingOverlay}>
                                <i
                                    className="fas fa-spinner fa-spin"
                                    style={{ color: 'white', fontSize: '1.5rem' }}
                                ></i>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={styles.imageButtons}>
                        {isUploading ? (
                            <div
                                style={{
                                    alignItems: 'center',
                                    color: '#64748b',
                                    display: 'flex',
                                    gap: '0.5rem',
                                    padding: '0.75rem'
                                }}
                            >
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>Uploading...</span>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    style={styles.imageBtn}
                                    onClick={() => !isDisabled && triggerCameraCapture(field.id)}
                                    disabled={isDisabled}
                                    onMouseEnter={(e) => {
                                        if (!isDisabled) {
                                            e.currentTarget.style.borderColor = '#1e3a5f'
                                            e.currentTarget.style.background = '#f0f7ff'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isDisabled) {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.background = 'white'
                                        }
                                    }}
                                >
                                    <i className="fas fa-camera"></i>
                                    <span>Take Photo</span>
                                </button>
                                <button
                                    type="button"
                                    style={styles.imageBtn}
                                    onClick={() => !isDisabled && triggerImageUpload(field.id)}
                                    disabled={isDisabled}
                                    onMouseEnter={(e) => {
                                        if (!isDisabled) {
                                            e.currentTarget.style.borderColor = '#1e3a5f'
                                            e.currentTarget.style.background = '#f0f7ff'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isDisabled) {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.background = 'white'
                                        }
                                    }}
                                >
                                    <i className="fas fa-images"></i>
                                    <span>Upload</span>
                                </button>
                            </>
                        )}
                    </div>
                )}

                {hasError && (
                    <div style={styles.error}>
                        <i className="fas fa-exclamation-circle"></i> {hasError}
                    </div>
                )}
            </div>
        )
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
                        <h1>{formObj?.title}</h1>
                        <p className="header-subtitle">
                            Submitted by {submitterName || 'Unknown'} on{' '}
                            {formatMaintenanceDateShort(item?.submitted_at)}
                        </p>
                    </div>
                </div>

                <div className="review-content">
                    <div className="review-responses">
                        {fields.length === 0 ? (
                            <p>No form fields found.</p>
                        ) : (
                            fields.map((field, idx) => {
                                const imageData = fieldImages[field.id]
                                const imageUrl = imageData?.uploadedUrl
                                return (
                                    <div key={field.id} className="review-response-item">
                                        <div className="review-response-number">{idx + 1}</div>
                                        <div className="review-response-content">
                                            <h4>{field.label}</h4>
                                            {field.field_type === 'checklist' ? (
                                                <div className="review-checklist">
                                                    {(field.options?.items || []).map((checkItem, cidx) => {
                                                        const isChecked = checklistStates[field.id]?.[checkItem]
                                                        const comment = checklistComments[field.id]?.[checkItem]
                                                        const itemImageKey = `${field.id}_${checkItem.trim()}`
                                                        const itemImageData = fieldImages[itemImageKey]
                                                        const itemImageUrl = itemImageData?.uploadedUrl
                                                        return (
                                                            <div key={cidx} className="review-check-row">
                                                                <span
                                                                    className={`review-check-item ${isChecked ? 'checked' : ''} ${comment && !isChecked ? 'has-comment' : ''}`}
                                                                >
                                                                    <i
                                                                        className={`fas ${isChecked ? 'fa-check-square' : 'fa-square'}`}
                                                                    ></i>
                                                                    {checkItem}
                                                                </span>
                                                                {comment && !isChecked && (
                                                                    <span className="review-check-comment">
                                                                        {comment}
                                                                    </span>
                                                                )}
                                                                {itemImageUrl && (
                                                                    <div className="review-image-attachment">
                                                                        <img
                                                                            src={itemImageUrl}
                                                                            alt="Attached"
                                                                            onClick={() =>
                                                                                openImagePreview(itemImageUrl)
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="review-response-text">
                                                    {responses[field.id] || <span className="empty">No response</span>}
                                                </p>
                                            )}
                                            {imageUrl && field.field_type !== 'checklist' && (
                                                <div className="review-image-attachment">
                                                    <img
                                                        src={getImageDisplayUrl(imageUrl)}
                                                        alt="Attached"
                                                        onClick={() => openImagePreview(getImageDisplayUrl(imageUrl))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
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

                {imagePreview && (
                    <div className="image-preview-modal" onClick={closeImagePreview}>
                        <div className="image-preview-modal-content" onClick={(e) => e.stopPropagation()}>
                            <button className="close-preview-btn" onClick={closeImagePreview}>
                                <i className="fas fa-times"></i>
                            </button>
                            <img src={imagePreview} alt="Full preview" />
                        </div>
                    </div>
                )}
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
                        <h1>{formObj?.title}</h1>
                        <p className="header-subtitle">Due: {formatMaintenanceDateShort(item?.due_date)}</p>
                    </div>
                </div>

                <div className="view-content">
                    <div className={`view-status-banner ${item?.status}`}>
                        {item?.status === 'approved' && (
                            <>
                                <i className="fas fa-check-circle"></i> Approved
                            </>
                        )}
                        {item?.status === 'rejected' && (
                            <>
                                <i className="fas fa-times-circle"></i> Rejected
                            </>
                        )}
                        {item?.status === 'submitted' && (
                            <>
                                <i className="fas fa-clock"></i> Pending Review
                            </>
                        )}
                    </div>

                    {reviewNotes && (
                        <div className="view-review-notes">
                            <label>Reviewer Notes</label>
                            <p>{reviewNotes}</p>
                        </div>
                    )}

                    <div className="view-responses">
                        {fields.map((field) => {
                            const imageData = fieldImages[field.id]
                            const imageUrl = imageData?.uploadedUrl
                            return (
                                <div key={field.id} className="view-response-item">
                                    <span className="view-response-label">{field.label}</span>
                                    {field.field_type === 'checklist' ? (
                                        <div className="view-checklist">
                                            {(field.options?.items || []).map((checkItem, cidx) => {
                                                const itemImageKey = `${field.id}_${checkItem.trim()}`
                                                const itemImageData = fieldImages[itemImageKey]
                                                const itemImageUrl = itemImageData?.uploadedUrl
                                                return (
                                                    <div key={cidx} className="view-check-row">
                                                        <span
                                                            className={
                                                                checklistStates[field.id]?.[checkItem] ? 'checked' : ''
                                                            }
                                                        >
                                                            <i
                                                                className={`fas ${checklistStates[field.id]?.[checkItem] ? 'fa-check' : 'fa-times'}`}
                                                            ></i>
                                                            {checkItem}
                                                        </span>
                                                        {itemImageUrl && (
                                                            <div className="review-image-attachment">
                                                                <img
                                                                    src={getImageDisplayUrl(itemImageUrl)}
                                                                    alt="Attached"
                                                                    onClick={() =>
                                                                        openImagePreview(
                                                                            getImageDisplayUrl(itemImageUrl)
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <span className="view-response-value">{responses[field.id] || '-'}</span>
                                    )}
                                    {imageUrl && field.field_type !== 'checklist' && (
                                        <div className="review-image-attachment">
                                            <img
                                                src={getImageDisplayUrl(imageUrl)}
                                                alt="Attached"
                                                onClick={() => openImagePreview(getImageDisplayUrl(imageUrl))}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {imagePreview && (
                    <div className="image-preview-modal" onClick={closeImagePreview}>
                        <div className="image-preview-modal-content" onClick={(e) => e.stopPropagation()}>
                            <button className="close-preview-btn" onClick={closeImagePreview}>
                                <i className="fas fa-times"></i>
                            </button>
                            <img src={imagePreview} alt="Full preview" />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (loading || (!formObj && !item)) {
        return (
            <div className="maintenance-form-view step-mode">
                <div className="step-header">
                    <button className="step-close" onClick={onBack}>
                        <i className="fas fa-times"></i>
                    </button>
                    <div className="step-info">
                        <span className="step-title">{formObj?.title || 'Loading...'}</span>
                    </div>
                </div>
                <div className="step-content">
                    <LoadingScreen inline message="Loading form..." />
                </div>
            </div>
        )
    }

    if (fields.length === 0) {
        return (
            <div className="maintenance-form-view step-mode">
                <div className="step-header">
                    <button className="step-close" onClick={onBack}>
                        <i className="fas fa-times"></i>
                    </button>
                    <div className="step-info">
                        <span className="step-title">{formObj?.title || 'Form'}</span>
                    </div>
                </div>
                <div className="step-content">
                    <div className="maintenance-empty">
                        <i className="fas fa-exclamation-circle"></i>
                        <h3>No Fields</h3>
                        <p>This form has no fields configured.</p>
                    </div>
                </div>
            </div>
        )
    }

    const styles = {
        actionButtons: {
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            marginTop: '2rem',
            paddingTop: '2rem'
        },
        approveBtn: {
            alignItems: 'center',
            background: '#10b981',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            transition: 'all 0.2s'
        },
        checkbox: {
            cursor: 'pointer',
            flexShrink: 0,
            height: '20px',
            marginTop: '0.125rem',
            width: '20px'
        },
        checklistComment: {
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            color: '#1e293b',
            fontSize: '0.875rem',
            outline: 'none',
            padding: '0.5rem 0.75rem',
            transition: 'all 0.2s',
            width: '100%'
        },
        checklistContent: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            gap: '0.5rem'
        },
        checklistItem: {
            alignItems: 'flex-start',
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            padding: '1rem'
        },
        checklistLabel: {
            color: '#1e293b',
            fontSize: '0.9375rem',
            fontWeight: 600
        },
        closeBtn: {
            alignItems: 'center',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '1.125rem',
            height: '40px',
            justifyContent: 'center',
            transition: 'all 0.2s',
            width: '40px'
        },
        container: {
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            width: '100%'
        },
        content: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            margin: '0 auto',
            maxWidth: '800px',
            padding: '2rem',
            width: '100%'
        },
        dueDate: {
            color: '#64748b',
            fontSize: '0.875rem'
        },
        error: {
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#dc2626',
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginTop: '0.5rem',
            padding: '0.75rem 1rem'
        },
        fieldCard: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem',
            padding: '2rem'
        },
        fieldDescription: {
            color: '#64748b',
            fontSize: '0.875rem',
            marginTop: '0.5rem'
        },
        fieldHeader: {
            marginBottom: '1.5rem'
        },
        fieldLabel: {
            alignItems: 'center',
            color: '#1e293b',
            display: 'flex',
            fontSize: '1.125rem',
            fontWeight: 700,
            gap: '0.5rem',
            marginBottom: '0.5rem'
        },
        fieldType: {
            alignItems: 'center',
            background: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            color: '#1e3a5f',
            display: 'inline-flex',
            fontSize: '0.75rem',
            fontWeight: 600,
            gap: '0.375rem',
            marginTop: '0.5rem',
            padding: '0.25rem 0.625rem'
        },
        formTitle: {
            color: '#1e293b',
            fontSize: '1.125rem',
            fontWeight: 700
        },
        header: {
            alignItems: 'center',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1rem 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 50
        },
        headerInfo: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            gap: '0.25rem',
            marginLeft: '1rem'
        },
        imageBtn: {
            alignItems: 'center',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e3a5f',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            transition: 'all 0.2s'
        },
        imageButtons: {
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem'
        },
        imageLabel: {
            color: '#374151',
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.75rem'
        },
        imagePreview: {
            marginTop: '1rem',
            maxWidth: '400px',
            position: 'relative',
            width: '100%'
        },
        imageSection: {
            marginTop: '1rem'
        },
        input: {
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '0.9375rem',
            outline: 'none',
            padding: '0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        },
        navBtn: (disabled) => ({
            alignItems: 'center',
            background: disabled ? '#f1f5f9' : '#1e3a5f',
            border: 'none',
            borderRadius: '8px',
            color: disabled ? '#cbd5e1' : 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.375rem',
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            padding: '0.625rem 1rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
        }),
        navButtons: {
            display: 'flex',
            flexShrink: 0,
            gap: '0.5rem'
        },
        previewImage: {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '100%'
        },
        progressBar: {
            background: '#e5e7eb',
            borderRadius: '3px',
            height: '6px',
            overflow: 'hidden',
            width: '100%'
        },
        progressContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginRight: '1rem',
            minWidth: '150px'
        },
        progressFill: {
            background: '#1e3a5f',
            height: '100%',
            transition: 'width 0.3s ease'
        },
        progressText: {
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 600,
            textAlign: 'center'
        },
        rejectBtn: {
            alignItems: 'center',
            background: '#ef4444',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            transition: 'all 0.2s'
        },
        removeImageBtn: {
            alignItems: 'center',
            background: '#ef4444',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            height: '32px',
            justifyContent: 'center',
            position: 'absolute',
            right: '0.5rem',
            top: '0.5rem',
            transition: 'all 0.2s',
            width: '32px'
        },
        required: {
            color: '#ef4444',
            fontSize: '0.875rem'
        },
        reviewButtons: {
            display: 'flex',
            gap: '1rem'
        },
        reviewNotes: {
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '0.9375rem',
            marginBottom: '1rem',
            minHeight: '100px',
            outline: 'none',
            padding: '0.75rem 1rem',
            resize: 'vertical',
            transition: 'all 0.2s',
            width: '100%'
        },
        reviewSection: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginTop: '2rem',
            padding: '2rem'
        },
        reviewTitle: {
            color: '#1e293b',
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '1rem'
        },
        submitBtn: (disabled) => ({
            alignItems: 'center',
            background: disabled ? '#cbd5e1' : '#10b981',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            transition: 'all 0.2s'
        }),
        textarea: {
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '0.9375rem',
            minHeight: '120px',
            outline: 'none',
            padding: '0.75rem 1rem',
            resize: 'vertical',
            transition: 'all 0.2s',
            width: '100%'
        },
        uploadingOverlay: {
            alignItems: 'center',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '8px',
            display: 'flex',
            inset: 0,
            justifyContent: 'center',
            position: 'absolute'
        },
        uploadingText: {
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 600
        },
        viewOnlyBadge: {
            alignItems: 'center',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            color: '#d97706',
            display: 'inline-flex',
            fontSize: '0.8125rem',
            fontWeight: 600,
            gap: '0.375rem',
            padding: '0.375rem 0.75rem'
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button
                    style={styles.closeBtn}
                    onClick={onBack}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                >
                    <i className="fas fa-times"></i>
                </button>
                <div style={styles.headerInfo}>
                    <span style={styles.formTitle}>{formObj?.title}</span>
                    <span style={styles.dueDate}>Due {formatMaintenanceDateShort(item?.due_date)}</span>
                </div>
                <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                        <div
                            style={{ ...styles.progressFill, width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        ></div>
                    </div>
                    <span style={styles.progressText}>
                        {currentStep + 1} of {totalSteps}
                    </span>
                </div>
                <div style={styles.navButtons}>
                    <button
                        style={styles.navBtn(isFirstStep)}
                        onClick={handlePrevious}
                        disabled={isFirstStep}
                        onMouseEnter={(e) => {
                            if (!isFirstStep) e.currentTarget.style.background = '#162d4a'
                        }}
                        onMouseLeave={(e) => {
                            if (!isFirstStep) e.currentTarget.style.background = '#1e3a5f'
                        }}
                    >
                        <i className="fas fa-arrow-left"></i>
                        <span>Prev</span>
                    </button>
                    {isLastStep ? (
                        <button
                            style={{ ...styles.submitBtn(submitting), padding: '0.625rem 1.25rem' }}
                            onClick={handleSubmit}
                            disabled={submitting}
                            onMouseEnter={(e) => {
                                if (!submitting) e.currentTarget.style.background = '#059669'
                            }}
                            onMouseLeave={(e) => {
                                if (!submitting) e.currentTarget.style.background = '#10b981'
                            }}
                        >
                            {submitting ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <>
                                    <span>{isEditing ? 'Update' : 'Submit'}</span>
                                    <i className="fas fa-check"></i>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            style={styles.navBtn(false)}
                            onClick={handleNext}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#162d4a')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#1e3a5f')}
                        >
                            <span>Next</span>
                            <i className="fas fa-arrow-right"></i>
                        </button>
                    )}
                </div>
            </div>

            {currentField && (
                <div style={styles.content}>
                    <div style={styles.fieldCard}>
                        <div style={styles.fieldHeader}>
                            <div
                                style={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    gap: '0.75rem',
                                    marginBottom: '0.75rem'
                                }}
                            >
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: '#eff6ff',
                                        borderRadius: '12px',
                                        color: '#1e3a5f',
                                        display: 'flex',
                                        fontSize: '1.25rem',
                                        height: '48px',
                                        justifyContent: 'center',
                                        width: '48px'
                                    }}
                                >
                                    <i className={`fas ${getFieldTypeIcon(currentField.field_type)}`}></i>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={styles.fieldLabel}>
                                        {currentField.label}
                                        {currentField.is_required && <span style={styles.required}>*</span>}
                                    </h2>
                                    <div style={styles.fieldType}>
                                        <i className={`fas ${getFieldTypeIcon(currentField.field_type)}`}></i>
                                        {currentField.field_type
                                            .replace('_', ' ')
                                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </div>
                                </div>
                            </div>
                            {currentField.description && (
                                <p style={styles.fieldDescription}>{currentField.description}</p>
                            )}
                        </div>

                        <div>
                            {renderField(currentField)}
                            {errors[currentField.id] && (
                                <div style={styles.error}>
                                    <i className="fas fa-exclamation-circle"></i> {errors[currentField.id]}
                                </div>
                            )}
                            {currentField.image_required && renderImageAttachment(currentField)}
                        </div>
                    </div>

                    {errors.submit && (
                        <div style={styles.error}>
                            <i className="fas fa-exclamation-triangle"></i> {errors.submit}
                        </div>
                    )}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileInputChange}
                style={{ display: 'none' }}
            />

            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFileInputChange}
                style={{ display: 'none' }}
            />

            {imagePreview && (
                <div
                    style={{
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        inset: 0,
                        justifyContent: 'center',
                        padding: '1rem',
                        position: 'fixed',
                        zIndex: 9999
                    }}
                    onClick={closeImagePreview}
                >
                    <div
                        style={{ maxHeight: '90vh', maxWidth: '90vw', position: 'relative' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            style={{
                                alignItems: 'center',
                                background: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                color: '#1e293b',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '1.125rem',
                                height: '40px',
                                justifyContent: 'center',
                                position: 'absolute',
                                right: '0',
                                top: '-3rem',
                                transition: 'all 0.2s',
                                width: '40px'
                            }}
                            onClick={closeImagePreview}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <img
                            src={imagePreview}
                            alt="Full preview"
                            style={{ borderRadius: '8px', maxHeight: '90vh', maxWidth: '100%' }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
