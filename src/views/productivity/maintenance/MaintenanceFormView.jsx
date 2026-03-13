import React from 'react'

import LoadingScreen from '../../../app/components/common/LoadingScreen'
import MaintenanceFormReview from '../../../app/components/common/MaintenanceFormReview'
import MaintenanceFormViewOnly from '../../../app/components/common/MaintenanceFormViewOnly'
import ImageAttachment from '../../../app/components/ui/ImageAttachment'
import ImagePreviewModal from '../../../app/components/ui/ImagePreviewModal'
import { useMaintenanceForm } from '../../../app/hooks/useMaintenanceForm'
import { formatMaintenanceDateShort, getFieldTypeIcon } from '../../../utils/MaintenanceUtility'
const INPUT_BASE_CLASSES =
    'w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-accent focus:ring-[3px] focus:ring-accent/10'
const INPUT_ERROR_CLASSES = 'border-red-500'
/** Reusable single-line text input for short-answer and fallback field types. */
function FormInput({ field, value, disabled, hasError, onChange, placeholder = 'Type your answer...' }) {
    return (
        <input
            type="text"
            className={`${INPUT_BASE_CLASSES} ${hasError ? INPUT_ERROR_CLASSES : ''}`}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus
        />
    )
}
function FormTextarea({ field, value, disabled, hasError, onChange, placeholder = 'Type your answer...', rows = 5 }) {
    return (
        <textarea
            className={`${INPUT_BASE_CLASSES} min-h-[120px] resize-y ${hasError ? INPUT_ERROR_CLASSES : ''}`}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            autoFocus
        />
    )
}
/**
 * Renders a checklist with per-item check state, optional image attachments,
 * and a "why incomplete?" comment field for unchecked required items.
 */
function ChecklistField({
    field,
    checklistStates,
    checklistComments,
    fieldImages,
    uploadingImage,
    errors,
    disabled,
    onCheckChange,
    onCommentChange,
    imageActions
}) {
    const checkItems = field.options?.items || []
    const comments = checklistComments[field.id] || {}
    return (
        <div className="flex flex-col gap-4">
            {checkItems.map((checkItem, idx) => {
                const isChecked = checklistStates[field.id]?.[checkItem] || false
                const imageKey = `${field.id}_${checkItem.trim()}`
                const imageData = fieldImages[imageKey]
                const isUploadingThis = uploadingImage === imageKey
                const imageError = errors[`${field.id}_${checkItem.trim()}_image`]
                const showImageSection =
                    (isChecked && field.image_required) || imageData?.previewUrl || imageData?.uploadedUrl
                return (
                    <div key={idx} className="flex flex-col gap-3">
                        <label
                            className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                                isChecked ? 'border-accent bg-blue-50' : 'border-gray-200 bg-slate-50'
                            } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            <input
                                type="checkbox"
                                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer"
                                checked={isChecked}
                                onChange={(e) => onCheckChange(field.id, checkItem, e.target.checked)}
                                disabled={disabled}
                            />
                            <span className="text-sm font-semibold text-slate-800">{checkItem}</span>
                        </label>
                        {!isChecked && field.is_required && (
                            <input
                                type="text"
                                className={`${INPUT_BASE_CLASSES} text-sm`}
                                value={comments[checkItem] || ''}
                                onChange={(e) => onCommentChange(field.id, checkItem, e.target.value)}
                                placeholder="Why is this incomplete?"
                                disabled={disabled}
                            />
                        )}
                        {showImageSection && (
                            <ImageAttachment
                                fieldId={field.id}
                                checklistItem={checkItem}
                                imageData={imageData}
                                isUploading={isUploadingThis}
                                disabled={disabled}
                                error={imageError}
                                onCamera={imageActions.triggerCameraCapture}
                                onUpload={imageActions.triggerImageUpload}
                                onRemove={imageActions.handleRemoveImage}
                                onPreview={imageActions.openImagePreview}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
/** Dispatches to the correct input component based on the field's type (short_answer, long_answer, checklist, notes). */
function FieldRenderer({ field, form, imageHook, errors, disabled }) {
    const {
        responses,
        handleResponseChange,
        checklistStates,
        checklistComments,
        handleChecklistChange,
        handleChecklistComment
    } = form
    const hasError = !!errors[field.id]
    const value = responses[field.id] || ''
    switch (field.field_type) {
        case 'short_answer':
            return (
                <FormInput
                    field={field}
                    value={value}
                    disabled={disabled}
                    hasError={hasError}
                    onChange={handleResponseChange}
                />
            )
        case 'long_answer':
            return (
                <FormTextarea
                    field={field}
                    value={value}
                    disabled={disabled}
                    hasError={hasError}
                    onChange={handleResponseChange}
                />
            )
        case 'checklist':
            return (
                <ChecklistField
                    field={field}
                    checklistStates={checklistStates}
                    checklistComments={checklistComments}
                    fieldImages={imageHook.fieldImages}
                    uploadingImage={imageHook.uploadingImage}
                    errors={errors}
                    disabled={disabled}
                    onCheckChange={handleChecklistChange}
                    onCommentChange={handleChecklistComment}
                    imageActions={imageHook}
                />
            )
        case 'notes':
            return (
                <FormTextarea
                    field={field}
                    value={value}
                    disabled={disabled}
                    hasError={hasError}
                    onChange={handleResponseChange}
                    placeholder="Add any notes..."
                    rows={4}
                />
            )
        default:
            return (
                <FormInput
                    field={field}
                    value={value}
                    disabled={disabled}
                    hasError={hasError}
                    onChange={handleResponseChange}
                />
            )
    }
}
function FieldImageSection({ field, imageHook, errors, disabled }) {
    if (field.field_type === 'checklist') return null
    return (
        <div className="mt-4">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
                <i className="fas fa-camera mr-1" /> Photo Attachment{' '}
                {field.image_required && <span className="text-red-500">*</span>}
            </label>
            <ImageAttachment
                fieldId={field.id}
                imageData={imageHook.fieldImages[field.id]}
                isUploading={imageHook.uploadingImage === field.id}
                disabled={disabled}
                error={errors[`${field.id}_image`]}
                onCamera={imageHook.triggerCameraCapture}
                onUpload={imageHook.triggerImageUpload}
                onRemove={imageHook.handleRemoveImage}
                onPreview={imageHook.openImagePreview}
            />
        </div>
    )
}
/** Sticky wizard header with progress bar, step counter, and prev/next/submit navigation. */
function StepperHeader({
    formTitle,
    dueDate,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    submitting,
    isEditing,
    onBack,
    onPrevious,
    onNext,
    onSubmit
}) {
    return (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-8 sm:py-4">
            <button
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 text-lg hover:bg-slate-200 transition-colors"
                onClick={onBack}
                type="button"
            >
                <i className="fas fa-times" />
            </button>
            <div className="ml-4 flex flex-1 flex-col gap-1">
                <span className="text-base font-bold text-slate-800 sm:text-lg">{formTitle}</span>
                <span className="text-xs text-slate-500 sm:text-sm">Due {dueDate}</span>
            </div>
            <div className="mr-4 flex min-w-[120px] flex-col gap-2 sm:min-w-[150px]">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                        className="h-full bg-accent transition-[width] duration-300"
                        style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                </div>
                <span className="text-center text-xs font-semibold text-slate-500">
                    {currentStep + 1} of {totalSteps}
                </span>
            </div>
            <div className="flex shrink-0 gap-2">
                <button
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-accent text-white hover:bg-accent-hover"
                    onClick={onPrevious}
                    disabled={isFirstStep}
                    type="button"
                >
                    <i className="fas fa-arrow-left" />
                    <span>Prev</span>
                </button>
                {isLastStep ? (
                    <button
                        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600"
                        onClick={onSubmit}
                        disabled={submitting}
                        type="button"
                    >
                        {submitting ? (
                            <i className="fas fa-spinner fa-spin" />
                        ) : (
                            <>
                                <span>{isEditing ? 'Update' : 'Submit'}</span>
                                <i className="fas fa-check" />
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white whitespace-nowrap hover:bg-accent-hover transition-colors"
                        onClick={onNext}
                        type="button"
                    >
                        <span>Next</span>
                        <i className="fas fa-arrow-right" />
                    </button>
                )}
            </div>
        </div>
    )
}
function FieldCard({ field }) {
    const fieldTypeName = field.field_type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    return (
        <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-accent">
                <i className={`fas ${getFieldTypeIcon(field.field_type)}`} />
            </div>
            <div className="flex-1">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    {field.label}
                    {field.is_required && <span className="text-sm text-red-500">*</span>}
                </h2>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-blue-500 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-accent">
                    <i className={`fas ${getFieldTypeIcon(field.field_type)}`} />
                    {fieldTypeName}
                </div>
            </div>
        </div>
    )
}
function LoadingState({ formTitle, onBack }) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50">
            <div className="sticky top-0 z-50 flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
                <button
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 text-lg hover:bg-slate-200 transition-colors"
                    onClick={onBack}
                    type="button"
                >
                    <i className="fas fa-times" />
                </button>
                <span className="text-lg font-bold text-slate-800">{formTitle || 'Loading...'}</span>
            </div>
            <div className="flex flex-1 items-center justify-center p-8">
                <LoadingScreen inline message="Loading form..." />
            </div>
        </div>
    )
}
function EmptyFieldsState({ formTitle, onBack }) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50">
            <div className="sticky top-0 z-50 flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
                <button
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 text-lg hover:bg-slate-200 transition-colors"
                    onClick={onBack}
                    type="button"
                >
                    <i className="fas fa-times" />
                </button>
                <span className="text-lg font-bold text-slate-800">{formTitle || 'Form'}</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-slate-500">
                <i className="fas fa-exclamation-circle text-4xl" />
                <h3 className="text-lg font-semibold text-slate-700">No Fields</h3>
                <p className="text-sm">This form has no fields configured.</p>
            </div>
        </div>
    )
}
/**
 * Stepper-based form filler for maintenance tasks. Renders one field per
 * step with image attachments, then submits responses. Also handles
 * review mode (managers approve/reject) and read-only view for
 * previously submitted/reviewed forms, delegating to dedicated components.
 *
 * @param {Object} item - The maintenance task or submission record.
 * @param {Function} onBack - Callback to return to the list.
 * @param {Function} onSubmitted - Callback after successful submission.
 */
export default function MaintenanceFormView({ item, onBack, onSubmitted }) {
    const form = useMaintenanceForm({ item, onSubmitted })
    const { imageHook } = form
    const isDisabled = form.isReview || (form.isViewOnly && !form.isEditing)
    if (form.isReview) {
        if (form.loading) return <LoadingState formTitle={form.formObj?.title} onBack={onBack} />
        return (
            <MaintenanceFormReview
                checklistComments={form.checklistComments}
                checklistStates={form.checklistStates}
                errors={form.errors}
                fieldImages={imageHook.fieldImages}
                fields={form.fields}
                formObj={form.formObj}
                imagePreview={imageHook.imagePreview}
                item={item}
                onBack={onBack}
                onClosePreview={imageHook.closeImagePreview}
                onOpenPreview={imageHook.openImagePreview}
                onReview={form.handleReview}
                responses={form.responses}
                reviewNotes={form.reviewNotes}
                setReviewNotes={form.setReviewNotes}
                submitterName={form.submitterName}
                submitting={form.submitting}
            />
        )
    }
    if (form.isViewOnly && !form.isEditing) {
        return (
            <MaintenanceFormViewOnly
                checklistStates={form.checklistStates}
                fieldImages={imageHook.fieldImages}
                fields={form.fields}
                formObj={form.formObj}
                imagePreview={imageHook.imagePreview}
                item={item}
                onBack={onBack}
                onClosePreview={imageHook.closeImagePreview}
                onOpenPreview={imageHook.openImagePreview}
                responses={form.responses}
                reviewNotes={form.reviewNotes}
            />
        )
    }
    if (form.loading || (!form.formObj && !item)) {
        return <LoadingState formTitle={form.formObj?.title} onBack={onBack} />
    }
    if (form.fields.length === 0) {
        return <EmptyFieldsState formTitle={form.formObj?.title} onBack={onBack} />
    }
    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50">
            <StepperHeader
                formTitle={form.formObj?.title}
                dueDate={formatMaintenanceDateShort(item?.due_date)}
                currentStep={form.currentStep}
                totalSteps={form.totalSteps}
                isFirstStep={form.isFirstStep}
                isLastStep={form.isLastStep}
                submitting={form.submitting}
                isEditing={form.isEditing}
                onBack={onBack}
                onPrevious={form.handlePrevious}
                onNext={form.handleNext}
                onSubmit={form.handleSubmit}
            />
            {form.currentField && (
                <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6 sm:p-8">
                    <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
                        <div className="mb-6">
                            <FieldCard field={form.currentField} />
                            {form.currentField.description && (
                                <p className="mt-2 text-sm text-slate-500">{form.currentField.description}</p>
                            )}
                        </div>
                        <div>
                            <FieldRenderer
                                field={form.currentField}
                                form={form}
                                imageHook={imageHook}
                                errors={form.errors}
                                disabled={isDisabled}
                            />
                            {form.errors[form.currentField.id] && (
                                <div className="mt-2 rounded-lg border border-red-500 bg-red-100 px-4 py-3 text-sm font-medium text-red-600">
                                    <i className="fas fa-exclamation-circle" /> {form.errors[form.currentField.id]}
                                </div>
                            )}
                            {form.currentField.image_required && (
                                <FieldImageSection
                                    field={form.currentField}
                                    imageHook={imageHook}
                                    errors={form.errors}
                                    disabled={isDisabled}
                                />
                            )}
                        </div>
                    </div>
                    {form.errors.submit && (
                        <div className="mt-4 rounded-lg border border-red-500 bg-red-100 px-4 py-3 text-sm font-medium text-red-600">
                            <i className="fas fa-exclamation-triangle" /> {form.errors.submit}
                        </div>
                    )}
                </div>
            )}
            <input
                ref={imageHook.fileInputRef}
                type="file"
                accept="image/*"
                onChange={imageHook.onFileInputChange}
                className="hidden"
            />
            <input
                ref={imageHook.cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={imageHook.onFileInputChange}
                className="hidden"
            />
            <ImagePreviewModal imageUrl={imageHook.imagePreview} onClose={imageHook.closeImagePreview} />
        </div>
    )
}
