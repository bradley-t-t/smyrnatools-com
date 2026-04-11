import React from 'react'

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

function QualityControlManagerPlugin({ form, setForm, readOnly }) {
    const handleChange = (e, name) => {
        if (setForm) setForm((prev) => ({ ...prev, [name]: e.target.value }))
    }
    return <DailyRecapSection form={form} handleChange={handleChange} readOnly={readOnly} />
}

/** Submit-mode wrapper for the Quality Control Manager report plugin. */
export function QualityControlManagerSubmitPlugin(props) {
    return <QualityControlManagerPlugin {...props} />
}

/** Review-mode wrapper for the Quality Control Manager report plugin (read-only). */
export function QualityControlManagerReviewPlugin({ form }) {
    return <QualityControlManagerPlugin form={form} readOnly />
}
