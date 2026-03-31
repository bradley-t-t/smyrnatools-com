import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { Database } from '../../../services/DatabaseService'
import { UserService } from '../../../services/UserService'
import { oneOffReportTypeMap } from '../../types/ReportTypes'

const REPORT_DEF = oneOffReportTypeMap.qc_strength
const TABLE = 'reports'

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

/** Fetches users assigned to a role, filtered to the current user's region. */
async function fetchUsersForRole(roleName, currentUserId) {
    try {
        // Get the role
        const role = await UserService.getRoleByName(roleName)
        if (!role?.id) return []

        // Get all users with this role
        const { data: perms } = await Database.from('users_permissions').select('user_id').eq('role_id', role.id)
        if (!perms?.length) return []
        const userIds = perms.map((p) => p.user_id)

        // Get current user's plant to resolve region
        const { data: currentProfile } = await Database.from('users_profiles')
            .select('plant_code')
            .eq('id', currentUserId)
            .maybeSingle()

        let regionUserIds = userIds
        if (currentProfile?.plant_code) {
            // Find region for current user's plant
            const { data: regionLink } = await Database.from('regions_plants')
                .select('region_id')
                .eq('plant_code', currentProfile.plant_code)
                .limit(1)
                .maybeSingle()

            if (regionLink?.region_id) {
                // Get all plants in this region
                const { data: regionPlants } = await Database.from('regions_plants')
                    .select('plant_code')
                    .eq('region_id', regionLink.region_id)
                const regionPlantCodes = new Set((regionPlants || []).map((p) => p.plant_code))

                // Filter users to those whose plant is in the region
                const { data: profiles } = await Database.from('users_profiles')
                    .select('id, plant_code')
                    .in('id', userIds)
                regionUserIds = (profiles || [])
                    .filter((p) => p.plant_code && regionPlantCodes.has(p.plant_code))
                    .map((p) => p.id)
            }
        }

        if (regionUserIds.length === 0) return []

        // Get names
        const { data: profiles } = await Database.from('users_profiles')
            .select('id, first_name, last_name')
            .in('id', regionUserIds)

        return (profiles || [])
            .map((p) => ({
                id: p.id,
                name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
    } catch {
        return []
    }
}

/** Modal form for submitting a QC Strength Report. */
function QCStrengthReportModal({ onClose, onSubmitted, user }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [roleUsers, setRoleUsers] = useState({})

    // Fetch users for any role_select fields on mount
    useEffect(() => {
        if (!user?.id) return
        const roleFields = REPORT_DEF.fields.filter((f) => f.type === 'role_select' && f.roleName)
        roleFields.forEach(async (field) => {
            const users = await fetchUsersForRole(field.roleName, user.id)
            setRoleUsers((prev) => ({ ...prev, [field.name]: users }))
        })
    }, [user?.id])

    const updateField = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async () => {
        setError('')
        setSubmitting(true)
        try {
            const { monday, saturday } = getCurrentWeekBounds()
            const row = {
                user_id: user?.id,
                report_name: 'qc_strength',
                week: monday.toISOString(),
                report_date_range_start: monday.toISOString(),
                report_date_range_end: saturday.toISOString(),
                data: { ...formData },
                completed: true,
                submitted_at: new Date().toISOString()
            }
            const { data, error: dbError } = await Database.from(TABLE).insert(row).select().single()
            if (dbError) throw new Error(dbError.message)
            onSubmitted?.(data)
            onClose()
        } catch (e) {
            setError(e.message || 'Failed to submit report')
        } finally {
            setSubmitting(false)
        }
    }

    const renderField = (field) => {
        if (field.type === 'role_select') {
            const users = roleUsers[field.name] || []
            const isLoading = !(field.name in roleUsers)
            return (
                <div className="relative">
                    <select
                        value={formData[field.name] || ''}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        disabled={isLoading}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center',
                            backgroundSize: '16px'
                        }}
                    >
                        <option value="">
                            {isLoading
                                ? 'Loading...'
                                : users.length === 0
                                  ? `No ${field.label}s found`
                                  : `Select ${field.label}...`}
                        </option>
                        <option value="No Technician">No Technician</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.name}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>
            )
        }
        if (field.type === 'select') {
            return (
                <div className="relative">
                    <select
                        value={formData[field.name] || ''}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors cursor-pointer"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center',
                            backgroundSize: '16px'
                        }}
                    >
                        <option value="">Select {field.label}...</option>
                        {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </div>
            )
        }
        if (field.type === 'textarea') {
            return (
                <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors resize-none"
                    placeholder={field.label}
                />
            )
        }
        return (
            <input
                type={
                    field.type === 'number'
                        ? 'number'
                        : field.type === 'date'
                          ? 'date'
                          : field.type === 'time'
                            ? 'time'
                            : 'text'
                }
                value={formData[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors"
                placeholder={field.label}
            />
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start sm:justify-center bg-black/40 backdrop-blur-sm overflow-y-auto sm:p-4">
            <div
                className="bg-white rounded-none sm:rounded-2xl shadow-xl border-0 sm:border border-slate-200 w-full sm:max-w-2xl min-h-screen sm:min-h-0 sm:my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center">
                            <i className="fas fa-flask text-white text-sm" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Quality Control Strength Report</h2>
                            <p className="text-xs text-slate-400">Concrete cylinder strength testing</p>
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
                        {REPORT_DEF.fields.map((field) => (
                            <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                    {field.label}
                                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                                </label>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
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
export default QCStrengthReportModal
