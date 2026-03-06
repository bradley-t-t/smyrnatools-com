import React from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { RegionService } from '../../../services/RegionService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { filterMaintenanceItemsByPlant, useAllowedPlantCodes } from './shared'

const WEEKDAYS = [
    { icon: 'fa-calendar-day', key: 'monday', label: 'Monday' },
    { icon: 'fa-calendar-day', key: 'tuesday', label: 'Tuesday' },
    { icon: 'fa-calendar-day', key: 'wednesday', label: 'Wednesday' },
    { icon: 'fa-calendar-day', key: 'thursday', label: 'Thursday' },
    { icon: 'fa-calendar-day', key: 'friday', label: 'Friday' },
    { icon: 'fa-calendar-week', key: 'saturday', label: 'Saturday' }
]

function DailyRecapSection({ form, handleChange, readOnly }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="mb-5">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                    <i className="fas fa-clipboard-list"></i>
                    Daily Activity Recaps
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-0">
                    Document key activities, accomplishments, and notes for each day of the week
                </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                {WEEKDAYS.map((day) => (
                    <div key={day.key} className="rounded-lg border border-gray-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <i className={`fas ${day.icon} text-sm text-accent`}></i>
                            <span className="font-semibold text-slate-800">{day.label}</span>
                            <span className="text-red-500">*</span>
                        </div>
                        <textarea
                            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-[0.9375rem] text-slate-800 resize-y min-h-[100px] box-border disabled:bg-slate-50 disabled:text-slate-500"
                            value={form[day.key] ?? ''}
                            onChange={(e) => handleChange(e, day.key)}
                            placeholder={`Enter ${day.label.toLowerCase()} activities, meetings, issues, accomplishments...`}
                            required
                            disabled={readOnly}
                            rows={6}
                        />
                        <div className="text-xs text-slate-400 text-right mt-1">
                            {(form[day.key] ?? '').length} characters
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function MaintenanceItemsStats({ completedCount, overdueCount }) {
    return (
        <div className="flex gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-3">
                <div className="text-xl text-emerald-600">
                    <i className="fas fa-check-circle"></i>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Completed</div>
                    <div className="text-xl font-bold text-slate-800">{completedCount}</div>
                </div>
            </div>
            {overdueCount > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-100 px-4 py-3">
                    <div className="text-xl text-red-600">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">Were Overdue</div>
                        <div className="text-xl font-bold text-slate-800">{overdueCount}</div>
                    </div>
                </div>
            )}
        </div>
    )
}

const ITEM_ICON_CLASSES = {
    completed: { className: 'text-emerald-600', icon: 'fa-check-circle' },
    overdue: { className: 'text-red-600', icon: 'fa-exclamation-triangle' },
    pending: { className: 'text-amber-500', icon: 'fa-clock' }
}

function getItemIcon(item) {
    if (item.completed) return ITEM_ICON_CLASSES.completed
    if (item.isOverdue) return ITEM_ICON_CLASSES.overdue
    return ITEM_ICON_CLASSES.pending
}

function truncateText(text, maxLength) {
    if (!text) return ''
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
}

function MaintenanceItemsTable({ items, plants }) {
    const getPlantName = (plantCode) => {
        const plant = plants?.find((p) => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || ''
    }

    if (items.length === 0) {
        return (
            <div className="py-12 px-8 text-center text-slate-500">
                <i className="fas fa-clipboard-check text-5xl text-slate-300 mb-4 block"></i>
                <p className="text-base m-0">No maintenance items were completed this week</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            {['Description', 'Plant', 'Deadline', 'Completed'].map((header) => (
                                <th
                                    key={header}
                                    className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-gray-200"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const { icon, className } = getItemIcon(item)
                            return (
                                <tr key={item.id} className={`hover:bg-slate-50 ${item.isOverdue ? 'bg-red-50' : ''}`}>
                                    <td className="px-4 py-3 text-[0.9375rem] text-slate-800 border-b border-slate-100 last:border-b-0">
                                        <div className="flex items-center gap-3">
                                            <i className={`fas ${icon} text-base ${className}`} />
                                            <span title={item.description}>{truncateText(item.description, 80)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[0.9375rem] text-slate-800 border-b border-slate-100 last:border-b-0">
                                        <span
                                            className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-[0.8125rem] font-medium text-blue-800"
                                            title={getPlantName(item.plant_code)}
                                        >
                                            {truncateText(getPlantName(item.plant_code), 25)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[0.9375rem] text-slate-800 border-b border-slate-100 last:border-b-0">
                                        {item.deadline ? ReportUtility.formatDate(item.deadline) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-[0.9375rem] text-slate-800 border-b border-slate-100 last:border-b-0">
                                        <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[0.8125rem] font-medium text-emerald-600">
                                            {item.completed_at ? ReportUtility.formatDate(item.completed_at) : '—'}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function DistrictManagerPlugin({ maintenanceItems, plants, form, setForm, readOnly }) {
    const { preferences } = usePreferences()
    const regionCode = preferences?.selectedRegion?.code || ''
    const allowedCodes = useAllowedPlantCodes(regionCode, RegionService)
    const filteredItems = filterMaintenanceItemsByPlant(maintenanceItems, plants, allowedCodes)
    const completedCount = filteredItems.length
    const overdueCount = filteredItems.filter((item) => item.isOverdue).length

    const handleChange = (e, name) => {
        if (setForm) setForm((prev) => ({ ...prev, [name]: e.target.value }))
    }

    return (
        <div>
            <DailyRecapSection form={form} handleChange={handleChange} readOnly={readOnly} />
            <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
                <h3 className="text-lg font-semibold text-slate-800 m-0">Weekly Completed Maintenance Items</h3>
                <MaintenanceItemsStats completedCount={completedCount} overdueCount={overdueCount} />
            </div>
            <MaintenanceItemsTable items={filteredItems} plants={plants} />
        </div>
    )
}

/** Submit-mode wrapper for the District Manager report plugin. */
export function DistrictManagerSubmitPlugin(props) {
    return <DistrictManagerPlugin {...props} />
}

/** Review-mode wrapper for the District Manager report plugin (read-only). */
export function DistrictManagerReviewPlugin({ maintenanceItems, plants, form }) {
    return <DistrictManagerPlugin maintenanceItems={maintenanceItems} plants={plants} form={form} readOnly />
}
