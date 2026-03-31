import React, { useRef, useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { Database } from '../../../services/DatabaseService'

const TABLE = 'reports'
const STORAGE_BUCKET = 'smyrna'
const STORAGE_PREFIX = 'lab-reports'
const MAX_FILE_SIZE_MB = 25
const ACCEPTED_TYPES = 'image/*,video/*'

function getCurrentWeekBounds() {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    monday.setHours(12, 0, 0, 0)
    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)
    saturday.setHours(23, 59, 59, 0)
    return { monday, saturday }
}

async function uploadFile(file, userId) {
    const ext = file.name.split('.').pop() || 'bin'
    const fileName = `${STORAGE_PREFIX}/${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await Database.storage.from(STORAGE_BUCKET).upload(fileName, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
    })
    if (error) throw new Error(`Upload failed: ${error.message}`)
    const { data: urlData } = Database.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
    return {
        name: file.name,
        size: file.size,
        type: file.type,
        url: urlData?.publicUrl || fileName
    }
}

function ThirdPartyLabReportModal({ onClose, onSubmitted, user }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const fileInputRef = useRef(null)
    const [labCompanyName, setLabCompanyName] = useState('')
    const [customer, setCustomer] = useState('')
    const [orderNo, setOrderNo] = useState('')
    const [reportDate, setReportDate] = useState('')
    const [labIssue, setLabIssue] = useState('')
    const [files, setFiles] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [uploadProgress, setUploadProgress] = useState('')

    const handleFilesSelected = (e) => {
        const selected = Array.from(e.target.files || [])
        const oversized = selected.filter((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
        if (oversized.length > 0) {
            setError(`Files over ${MAX_FILE_SIZE_MB}MB: ${oversized.map((f) => f.name).join(', ')}`)
            return
        }
        setFiles((prev) => [...prev, ...selected])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        setError('')
        if (!labCompanyName.trim()) return setError('Lab Company Name is required')
        if (!customer.trim()) return setError('Customer is required')
        if (!orderNo.trim()) return setError('Order No. is required')
        if (!reportDate) return setError('Date is required')
        if (!labIssue.trim()) return setError('Please describe what the lab did wrong')

        setSubmitting(true)
        try {
            // Upload files
            let uploadedFiles = []
            if (files.length > 0) {
                setUploadProgress(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`)
                uploadedFiles = await Promise.all(files.map((f) => uploadFile(f, user.id)))
            }

            const { monday, saturday } = getCurrentWeekBounds()
            const row = {
                user_id: user?.id,
                report_name: 'third_party_lab',
                week: monday.toISOString(),
                report_date_range_start: monday.toISOString(),
                report_date_range_end: saturday.toISOString(),
                data: {
                    lab_company_name: labCompanyName.trim(),
                    customer: customer.trim(),
                    order_no: orderNo.trim(),
                    report_date: reportDate,
                    lab_issue: labIssue.trim(),
                    attachments: uploadedFiles
                },
                completed: true,
                submitted_at: new Date().toISOString()
            }
            setUploadProgress('')
            const { data, error: dbError } = await Database.from(TABLE).insert(row).select().single()
            if (dbError) throw new Error(dbError.message)
            onSubmitted?.(data)
            onClose()
        } catch (e) {
            setError(e.message || 'Failed to submit report')
            setUploadProgress('')
        } finally {
            setSubmitting(false)
        }
    }

    const isVideo = (file) => file.type?.startsWith('video/')

    return (
        <div className="fixed inset-0 z-[100] flex items-start sm:justify-center bg-black/40 backdrop-blur-sm overflow-y-auto sm:p-4">
            <div
                className="bg-white rounded-none sm:rounded-2xl shadow-xl border-0 sm:border border-slate-200 w-full sm:max-w-2xl min-h-screen sm:min-h-0 sm:my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center">
                            <i className="fas fa-vial text-white text-sm" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Third Party Lab Report</h2>
                            <p className="text-xs text-slate-400">Report issues with lab results</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 sm:flex-none sm:max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <i className="fas fa-exclamation-circle shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Lab Company Name */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                Lab Company Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={labCompanyName}
                                onChange={(e) => setLabCompanyName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors"
                                placeholder="Lab company name"
                            />
                        </div>
                        {/* Customer */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                Customer <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={customer}
                                onChange={(e) => setCustomer(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors"
                                placeholder="Customer name"
                            />
                        </div>
                        {/* Order No */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                Order No. <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={orderNo}
                                onChange={(e) => setOrderNo(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors"
                                placeholder="Order number"
                            />
                        </div>
                        {/* Date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                Date <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors"
                            />
                        </div>
                        {/* Lab Issue */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                What did the lab do wrong? <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={labIssue}
                                onChange={(e) => setLabIssue(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors resize-none"
                                placeholder="Describe the issue in detail..."
                            />
                        </div>
                        {/* File Upload */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                Attachments
                            </label>
                            <div
                                className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <i className="fas fa-cloud-upload-alt text-slate-400 text-xl mb-2 block" />
                                <p className="text-sm text-slate-500">Click to upload images or videos</p>
                                <p className="text-xs text-slate-400 mt-0.5">Max {MAX_FILE_SIZE_MB}MB per file</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_TYPES}
                                multiple
                                onChange={handleFilesSelected}
                                className="hidden"
                            />
                            {files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {files.map((file, i) => (
                                        <div
                                            key={`${file.name}-${i}`}
                                            className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                                        >
                                            <i
                                                className={`fas ${isVideo(file) ? 'fa-video text-blue-500' : 'fa-image text-emerald-500'} text-sm shrink-0`}
                                            />
                                            <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
                                            <span className="text-xs text-slate-400 shrink-0">
                                                {(file.size / 1024 / 1024).toFixed(1)}MB
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(i)}
                                                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent shrink-0"
                                            >
                                                <i className="fas fa-times text-[10px]" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                    {uploadProgress && (
                        <span className="text-xs text-slate-400 flex items-center gap-2 mr-auto">
                            <i className="fas fa-spinner fa-spin" />
                            {uploadProgress}
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 border-none cursor-pointer hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-50"
                        style={{ background: accentColor }}
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <i className="fas fa-spinner fa-spin" /> Submitting...
                            </span>
                        ) : (
                            'Submit Report'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
export default ThirdPartyLabReportModal
