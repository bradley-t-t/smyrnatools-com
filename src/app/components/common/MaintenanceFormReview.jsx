import React from 'react'

import { formatMaintenanceDateShort } from '../../../utils/MaintenanceUtility'
import { getImageDisplayUrl } from '../../hooks/useMaintenanceImages'
import ImagePreviewModal from '../ui/ImagePreviewModal'

export default function MaintenanceFormReview({
    checklistComments,
    checklistStates,
    errors,
    fieldImages,
    fields,
    formObj,
    imagePreview,
    item,
    onBack,
    onClosePreview,
    onOpenPreview,
    onReview,
    responses,
    reviewNotes,
    setReviewNotes,
    submitterName,
    submitting
}) {
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
                    <p className="m-0 text-sm text-slate-500">
                        Submitted by {submitterName || 'Unknown'} on {formatMaintenanceDateShort(item?.submitted_at)}
                    </p>
                </div>
            </div>

            <div className="mx-auto w-full max-w-3xl p-6">
                {fields.length === 0 ? (
                    <p className="text-slate-500">No form fields found.</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {fields.map((field, idx) => {
                            const imageData = fieldImages[field.id]
                            const imageUrl = imageData?.uploadedUrl
                            return (
                                <div
                                    key={field.id}
                                    className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="mb-2 text-base font-semibold text-slate-800">{field.label}</h4>
                                        {field.field_type === 'checklist' ? (
                                            <div className="flex flex-col gap-2">
                                                {(field.options?.items || []).map((checkItem, cidx) => {
                                                    const isChecked = checklistStates[field.id]?.[checkItem]
                                                    const comment = checklistComments[field.id]?.[checkItem]
                                                    const itemImageKey = `${field.id}_${checkItem.trim()}`
                                                    const itemImageUrl = fieldImages[itemImageKey]?.uploadedUrl
                                                    return (
                                                        <div key={cidx} className="flex flex-col gap-1">
                                                            <span
                                                                className={`flex items-center gap-2 text-sm ${isChecked ? 'text-green-600' : comment ? 'text-amber-600' : 'text-slate-500'}`}
                                                            >
                                                                <i
                                                                    className={`fas ${isChecked ? 'fa-check-square' : 'fa-square'}`}
                                                                />
                                                                {checkItem}
                                                            </span>
                                                            {comment && !isChecked && (
                                                                <span className="ml-6 text-xs text-slate-500 italic">
                                                                    {comment}
                                                                </span>
                                                            )}
                                                            {itemImageUrl && (
                                                                <img
                                                                    src={itemImageUrl}
                                                                    alt="Attached"
                                                                    className="ml-6 mt-1 max-w-[200px] cursor-pointer rounded-lg border border-gray-200"
                                                                    onClick={() => onOpenPreview(itemImageUrl)}
                                                                />
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-600">
                                                {responses[field.id] || (
                                                    <span className="text-slate-400 italic">No response</span>
                                                )}
                                            </p>
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
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-bold text-slate-800">Review Decision</h3>
                    <textarea
                        className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm text-slate-800 outline-none resize-y min-h-[100px] focus:border-[#1e3a5f] focus:ring-[3px] focus:ring-[#1e3a5f]/10 transition-colors"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add notes (optional)..."
                        rows={3}
                    />
                    {errors?.submit && (
                        <div className="mt-2 rounded-lg border border-red-500 bg-red-100 px-4 py-3 text-sm font-medium text-red-600">
                            <i className="fas fa-exclamation-circle" /> {errors.submit}
                        </div>
                    )}
                    <div className="mt-4 flex gap-4">
                        <button
                            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            onClick={() => onReview('approved')}
                            disabled={submitting}
                            type="button"
                        >
                            <i className="fas fa-check" /> Approve
                        </button>
                        <button
                            className="flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            onClick={() => onReview('rejected')}
                            disabled={submitting}
                            type="button"
                        >
                            <i className="fas fa-times" /> Reject
                        </button>
                    </div>
                </div>
            </div>

            <ImagePreviewModal imageUrl={imagePreview} onClose={onClosePreview} />
        </div>
    )
}
