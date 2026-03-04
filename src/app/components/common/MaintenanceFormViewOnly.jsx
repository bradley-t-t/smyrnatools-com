import React from 'react'

import { formatMaintenanceDateShort } from '../../../utils/MaintenanceUtility'
import { getImageDisplayUrl } from '../../hooks/useMaintenanceImages'
import ImagePreviewModal from '../ui/ImagePreviewModal'

/** Status badge configuration mapping submission status to display props. */
const STATUS_CONFIG = {
    approved: { className: 'bg-green-100 text-green-700', icon: 'fa-check-circle', label: 'Approved' },
    rejected: { className: 'bg-red-100 text-red-700', icon: 'fa-times-circle', label: 'Rejected' },
    submitted: { className: 'bg-blue-100 text-blue-700', icon: 'fa-clock', label: 'Pending Review' }
}

/**
 * Read-only view of a submitted maintenance form.
 * Displays the submission status badge, optional reviewer notes,
 * all field responses (text and checklist with images), and an image preview modal.
 * @param {Object} props
 * @param {Object} props.checklistStates - Per-field, per-item boolean map for checklist fields.
 * @param {Object} props.fieldImages - Map of field IDs to uploaded image data.
 * @param {Array} props.fields - Ordered array of form field definitions.
 * @param {Object} props.formObj - Form metadata (title, etc.).
 * @param {string|null} props.imagePreview - URL of the currently previewed image, or null.
 * @param {Object} props.item - Submitted form record with metadata like `due_date` and `status`.
 * @param {Function} props.onBack - Navigates back from the view-only screen.
 * @param {Function} props.onClosePreview - Closes the image preview modal.
 * @param {Function} props.onOpenPreview - Opens the image preview modal for a given URL.
 * @param {Object} props.responses - Map of field IDs to submitted text responses.
 * @param {string} [props.reviewNotes] - Notes left by the reviewer, if any.
 */
export default function MaintenanceFormViewOnly({
    checklistStates,
    fieldImages,
    fields,
    formObj,
    imagePreview,
    item,
    onBack,
    onClosePreview,
    onOpenPreview,
    responses,
    reviewNotes
}) {
    const statusInfo = STATUS_CONFIG[item?.status]

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50">
            <div className="sticky top-0 z-40 flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4">
                <button
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    onClick={onBack}
                    type="button"
                >
                    <i className="fas fa-arrow-left" />
                </button>
                <div>
                    <h1 className="m-0 text-xl font-bold text-slate-800">{formObj?.title}</h1>
                    <p className="m-0 text-sm text-slate-500">Due: {formatMaintenanceDateShort(item?.due_date)}</p>
                </div>
            </div>

            <div className="mx-auto w-full max-w-3xl p-6">
                {statusInfo && (
                    <div
                        className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${statusInfo.className}`}
                    >
                        <i className={`fas ${statusInfo.icon}`} />
                        {statusInfo.label}
                    </div>
                )}

                {reviewNotes && (
                    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Reviewer Notes
                        </label>
                        <p className="m-0 text-sm text-slate-800">{reviewNotes}</p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {fields.map((field) => {
                        const imageData = fieldImages[field.id]
                        const imageUrl = imageData?.uploadedUrl
                        return (
                            <div key={field.id} className="rounded-xl border border-gray-200 bg-white p-5">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {field.label}
                                </span>
                                {field.field_type === 'checklist' ? (
                                    <div className="mt-2 flex flex-col gap-1.5">
                                        {(field.options?.items || []).map((checkItem, cidx) => {
                                            const isChecked = checklistStates[field.id]?.[checkItem]
                                            const itemImageKey = `${field.id}_${checkItem.trim()}`
                                            const itemImageUrl = fieldImages[itemImageKey]?.uploadedUrl
                                            return (
                                                <div key={cidx} className="flex flex-col">
                                                    <span
                                                        className={`flex items-center gap-2 text-sm ${isChecked ? 'text-green-600' : 'text-red-500'}`}
                                                    >
                                                        <i className={`fas ${isChecked ? 'fa-check' : 'fa-times'}`} />
                                                        {checkItem}
                                                    </span>
                                                    {itemImageUrl && (
                                                        <img
                                                            src={getImageDisplayUrl(itemImageUrl)}
                                                            alt="Attached"
                                                            className="ml-6 mt-1 max-w-[200px] cursor-pointer rounded-lg border border-gray-200"
                                                            onClick={() =>
                                                                onOpenPreview(getImageDisplayUrl(itemImageUrl))
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-800">{responses[field.id] || '-'}</span>
                                )}
                                {imageUrl && field.field_type !== 'checklist' && (
                                    <img
                                        src={getImageDisplayUrl(imageUrl)}
                                        alt="Attached"
                                        className="mt-2 max-w-[200px] cursor-pointer rounded-lg border border-gray-200"
                                        onClick={() => onOpenPreview(getImageDisplayUrl(imageUrl))}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <ImagePreviewModal imageUrl={imagePreview} onClose={onClosePreview} />
        </div>
    )
}
