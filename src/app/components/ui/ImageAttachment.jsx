import React from 'react'

import { getImageDisplayUrl } from '../../hooks/useMaintenanceImages'
/** Spinner indicator shown while an image is being uploaded. */
function UploadingSpinner() {
    return (
        <div className="flex items-center gap-2 p-3 text-slate-500">
            <i className="fas fa-spinner fa-spin" />
            <span>Uploading...</span>
        </div>
    )
}
/** Take Photo and Upload buttons for attaching images. */
function ImageButtons({ disabled, onCamera, onUpload }) {
    const baseClasses =
        'flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-accent transition-colors'
    const enabledClasses = disabled ? '' : 'hover:border-accent hover:bg-blue-50 cursor-pointer'
    return (
        <div className="flex gap-3 mb-4">
            <button
                type="button"
                className={`${baseClasses} ${enabledClasses}`}
                onClick={(e) => {
                    e.preventDefault()
                    if (!disabled) onCamera()
                }}
                disabled={disabled}
            >
                <i className="fas fa-camera" />
                <span>Take Photo</span>
            </button>
            <button
                type="button"
                className={`${baseClasses} ${enabledClasses}`}
                onClick={(e) => {
                    e.preventDefault()
                    if (!disabled) onUpload()
                }}
                disabled={disabled}
            >
                <i className="fas fa-images" />
                <span>Upload</span>
            </button>
        </div>
    )
}
/** Thumbnail preview of an attached image with remove and uploading overlay. */
function ImagePreview({ displayUrl, isUploading, disabled, onRemove, onPreview }) {
    return (
        <div className="relative mt-4 w-full max-w-[400px]">
            <img
                src={displayUrl}
                alt="Attached"
                className="w-full cursor-pointer rounded-lg border border-gray-200"
                onClick={() => onPreview(displayUrl)}
            />
            {!disabled && (
                <button
                    type="button"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                    onClick={(e) => {
                        e.preventDefault()
                        onRemove()
                    }}
                >
                    <i className="fas fa-times" />
                </button>
            )}
            {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                    <i className="fas fa-spinner fa-spin text-white text-2xl" />
                </div>
            )}
        </div>
    )
}
/** Image attachment field with camera/upload buttons, preview, and error display. */
export default function ImageAttachment({
    fieldId,
    checklistItem = null,
    imageData,
    isUploading,
    disabled,
    error,
    onCamera,
    onUpload,
    onRemove,
    onPreview
}) {
    const rawUrl = imageData?.previewUrl || imageData?.uploadedUrl
    const displayUrl = imageData?.previewUrl || getImageDisplayUrl(rawUrl)
    const showButtons = !rawUrl && !isUploading
    return (
        <div className="mt-4">
            {rawUrl ? (
                <ImagePreview
                    displayUrl={displayUrl}
                    isUploading={isUploading}
                    disabled={disabled}
                    onRemove={() => onRemove(fieldId, checklistItem)}
                    onPreview={onPreview}
                />
            ) : isUploading ? (
                <UploadingSpinner />
            ) : showButtons ? (
                <ImageButtons
                    disabled={disabled}
                    onCamera={() => onCamera(fieldId, checklistItem)}
                    onUpload={() => onUpload(fieldId, checklistItem)}
                />
            ) : null}
            {error && (
                <div className="mt-2 rounded-lg border border-red-500 bg-red-100 px-4 py-3 text-sm font-medium text-red-600">
                    <i className="fas fa-exclamation-circle" /> {error}
                </div>
            )}
        </div>
    )
}
