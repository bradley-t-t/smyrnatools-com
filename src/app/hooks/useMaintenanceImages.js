import { useCallback, useRef, useState } from 'react'

import { MaintenanceService } from '../../services/MaintenanceService'
import { IMAGE_VALIDATION_MESSAGES, MAX_IMAGE_SIZE_BYTES, VALID_IMAGE_TYPES } from '../constants/maintenanceConstants'
/** Resolves the composite storage key for a checklist item's image. */
function resolveImageKey(fieldId, checklistItem) {
    return checklistItem ? `${fieldId}_${checklistItem}` : fieldId
}
/** Resolves the composite error key for a checklist item's image validation. */
function resolveErrorKey(fieldId, checklistItem) {
    return checklistItem ? `${fieldId}_${checklistItem}_image` : `${fieldId}_image`
}
/** Converts a stored image path to a displayable URL (handles blob, http, and storage paths). */
export function getImageDisplayUrl(url) {
    if (!url || typeof url !== 'string') return null
    const trimmedUrl = url.trim()
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('blob:')) {
        return trimmedUrl
    }
    return MaintenanceService.getImageUrl(trimmedUrl)
}
/**
 * Manages image capture, upload, preview, and deletion for maintenance form fields.
 * Supports both camera and file input, validates size/type, and uploads via MaintenanceService.
 */
export function useMaintenanceImages({ formId, setErrors }) {
    const [fieldImages, setFieldImages] = useState({})
    const [uploadingImage, setUploadingImage] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [activeImageFieldId, setActiveImageFieldId] = useState(null)
    const fileInputRef = useRef(null)
    const cameraInputRef = useRef(null)
    const handleImageUpload = useCallback(
        async (fieldId, file, checklistItem = null) => {
            if (!file) return
            const errorKey = resolveErrorKey(fieldId, checklistItem)
            if (!VALID_IMAGE_TYPES.includes(file.type)) {
                setErrors((prev) => ({ ...prev, [errorKey]: IMAGE_VALIDATION_MESSAGES.INVALID_TYPE }))
                return
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                setErrors((prev) => ({ ...prev, [errorKey]: IMAGE_VALIDATION_MESSAGES.TOO_LARGE }))
                return
            }
            const imageKey = resolveImageKey(fieldId, checklistItem)
            setUploadingImage(imageKey)
            setErrors((prev) => ({ ...prev, [errorKey]: null }))
            try {
                const previewUrl = URL.createObjectURL(file)
                setFieldImages((prev) => ({
                    ...prev,
                    [imageKey]: { file, previewUrl, uploaded: false }
                }))
                const uploadedUrl = await MaintenanceService.uploadImage(file, formId, imageKey)
                setFieldImages((prev) => ({
                    ...prev,
                    [imageKey]: { ...prev[imageKey], uploaded: true, uploadedUrl }
                }))
            } catch (error) {
                setErrors((prev) => ({ ...prev, [errorKey]: error.message }))
                setFieldImages((prev) => {
                    const next = { ...prev }
                    if (next[imageKey]?.previewUrl) URL.revokeObjectURL(next[imageKey].previewUrl)
                    delete next[imageKey]
                    return next
                })
            } finally {
                setUploadingImage(null)
            }
        },
        [formId, setErrors]
    )
    const handleRemoveImage = useCallback((fieldId, checklistItem = null) => {
        const imageKey = resolveImageKey(fieldId, checklistItem)
        setFieldImages((prev) => {
            const next = { ...prev }
            if (next[imageKey]?.previewUrl) URL.revokeObjectURL(next[imageKey].previewUrl)
            delete next[imageKey]
            return next
        })
    }, [])
    const triggerImageUpload = useCallback((fieldId, checklistItem = null) => {
        setActiveImageFieldId(resolveImageKey(fieldId, checklistItem))
        setTimeout(() => fileInputRef.current?.click(), 0)
    }, [])
    const triggerCameraCapture = useCallback((fieldId, checklistItem = null) => {
        setActiveImageFieldId(resolveImageKey(fieldId, checklistItem))
        setTimeout(() => cameraInputRef.current?.click(), 0)
    }, [])
    const onFileInputChange = useCallback(
        (e) => {
            const file = e.target.files?.[0]
            if (file && activeImageFieldId) {
                const underscoreIndex = activeImageFieldId.indexOf('_')
                if (underscoreIndex > -1) {
                    const fieldId = activeImageFieldId.slice(0, underscoreIndex)
                    const checklistItem = activeImageFieldId.slice(underscoreIndex + 1)
                    handleImageUpload(fieldId, file, checklistItem)
                } else {
                    handleImageUpload(activeImageFieldId, file)
                }
            }
            e.target.value = ''
        },
        [activeImageFieldId, handleImageUpload]
    )
    const openImagePreview = useCallback((url) => setImagePreview(url), [])
    const closeImagePreview = useCallback(() => setImagePreview(null), [])
    return {
        cameraInputRef,
        closeImagePreview,
        fieldImages,
        fileInputRef,
        handleImageUpload,
        handleRemoveImage,
        imagePreview,
        onFileInputChange,
        openImagePreview,
        setFieldImages,
        triggerCameraCapture,
        triggerImageUpload,
        uploadingImage
    }
}
