import React, { useEffect, useMemo, useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { supabase } from '../../../services/DatabaseService'
import { MixerService } from '../../../services/MixerService'
import { OperatorService } from '../../../services/OperatorService'
import { UserService } from '../../../services/UserService'
function getCurrentWeekBounds() {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    monday.setHours(12, 0, 0, 0)
    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)
    return { monday: monday.toISOString(), saturday: saturday.toISOString() }
}
const REASONS = ['Plant Manager Error', 'Operator Error', 'Plant Issue', 'Truck Issues', 'Other']
/** Modal form for submitting a new lost load report. Plant is auto-populated from the user's assigned plant. */
function LostLoadReportModal({ onClose, onSubmitted, plants, user }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [plant, setPlant] = useState('')
    const [yardage, setYardage] = useState('')
    const [truckNumber, setTruckNumber] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [ticketNumber, setTicketNumber] = useState('')
    const [reason, setReason] = useState('')
    const [explanation, setExplanation] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [mixers, setMixers] = useState([])
    const [operators, setOperators] = useState([])
    const [truckPickerOpen, setTruckPickerOpen] = useState(false)
    const [truckSearch, setTruckSearch] = useState('')
    useEffect(() => {
        if (!user?.id) return
        UserService.getUserPlant(user.id)
            .then((code) => {
                if (code) setPlant(code)
            })
            .catch(() => {})
    }, [user?.id])
    useEffect(() => {
        MixerService.getAllMixers()
            .then(setMixers)
            .catch(() => {})
    }, [])
    useEffect(() => {
        if (!plants?.length) return
        Promise.all(plants.map((p) => OperatorService.fetchOperatorsByPlant(p.plant_code)))
            .then((results) => setOperators(results.flat()))
            .catch(() => {})
    }, [plants])
    const operatorMap = useMemo(() => {
        const map = {}
        operators.forEach((op) => {
            map[op.employeeId] = op.name
        })
        return map
    }, [operators])
    const regionalMixers = useMemo(() => {
        const plantCodes = new Set((plants || []).map((p) => String(p.plant_code).toUpperCase()))
        let filtered = mixers.filter(
            (m) => plantCodes.has(String(m.assignedPlant).toUpperCase()) && String(m.status).toLowerCase() !== 'retired'
        )
        if (truckSearch.trim()) {
            const q = truckSearch.toLowerCase()
            filtered = filtered.filter((m) => {
                const num = String(m.truckNumber || '').toLowerCase()
                const opName = (operatorMap[m.assignedOperator] || '').toLowerCase()
                const plantCode = String(m.assignedPlant || '').toLowerCase()
                return num.includes(q) || opName.includes(q) || plantCode.includes(q)
            })
        }
        return filtered.sort((a, b) => {
            const aHasOp = operatorMap[a.assignedOperator] ? 0 : 1
            const bHasOp = operatorMap[b.assignedOperator] ? 0 : 1
            if (aHasOp !== bHasOp) return aHasOp - bHasOp
            return String(a.truckNumber).localeCompare(String(b.truckNumber), undefined, { numeric: true })
        })
    }, [mixers, plants, operatorMap, truckSearch])
    const handleSubmit = async () => {
        if (!plant || !yardage || !truckNumber.trim() || !reason) {
            setError('Please fill out all fields.')
            return
        }
        if (!explanation.trim()) {
            setError('Please explain what happened and what will be done to prevent this in the future.')
            return
        }
        if (isNaN(Number(yardage)) || Number(yardage) <= 0) {
            setError('Yardage must be a positive number.')
            return
        }
        setSubmitting(true)
        setError('')
        try {
            const { monday, saturday } = getCurrentWeekBounds()
            const fullReason = reason === 'Other' ? `Other: ${explanation.trim()}` : `${reason}: ${explanation.trim()}`
            const { data, error: dbError } = await supabase
                .from('reports')
                .insert({
                    completed: true,
                    data: {
                        customer_name: customerName.trim() || null,
                        plant,
                        reason: fullReason,
                        ticket_number: ticketNumber.trim() || null,
                        truck_number: truckNumber.trim(),
                        yardage: Number(yardage)
                    },
                    report_date_range_end: saturday,
                    report_date_range_start: monday,
                    report_name: 'lost_load',
                    submitted_at: new Date().toISOString(),
                    user_id: user.id,
                    week: monday
                })
                .select()
                .single()
            if (dbError) throw dbError
            onSubmitted?.(data)
            onClose()
        } catch (err) {
            setError(err.message || 'Error submitting report.')
        } finally {
            setSubmitting(false)
        }
    }
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
                style={{ maxHeight: '90vh' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center w-9 h-9 rounded-lg"
                            style={{ backgroundColor: `${accentColor}15` }}
                        >
                            <i className="fas fa-exclamation-triangle text-sm" style={{ color: accentColor }} />
                        </div>
                        <h2 className="text-base font-semibold text-slate-800 m-0">Lost Load Report</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        type="button"
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <i className="fas fa-exclamation-circle shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plant</label>
                        <select
                            value={plant}
                            onChange={(e) => {
                                setPlant(e.target.value)
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
                        >
                            <option value="">Select plant...</option>
                            {plants.map((p) => (
                                <option key={p.plant_code} value={p.plant_code}>
                                    ({p.plant_code}) {p.plant_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yardage</label>
                        <input
                            type="number"
                            value={yardage}
                            onChange={(e) => setYardage(e.target.value)}
                            placeholder="Enter yardage..."
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
                            min="0"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Truck Number
                        </label>
                        <button
                            type="button"
                            onClick={() => setTruckPickerOpen((v) => !v)}
                            className="flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-left transition-colors hover:border-slate-300"
                        >
                            {truckNumber ? (
                                <span className="flex items-center gap-2 text-slate-800">
                                    <span
                                        className="px-2 py-0.5 rounded-md text-xs font-bold text-white"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        #{truckNumber}
                                    </span>
                                    <span className="text-slate-600">
                                        {operatorMap[
                                            regionalMixers.find((m) => m.truckNumber === truckNumber)?.assignedOperator
                                        ] || 'Unassigned'}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-slate-400">Select truck...</span>
                            )}
                            <i className={`fas fa-chevron-${truckPickerOpen ? 'up' : 'down'} text-xs text-slate-400`} />
                        </button>
                        {truckPickerOpen && (
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-md">
                                <div className="p-2 border-b border-slate-100">
                                    <input
                                        type="text"
                                        value={truckSearch}
                                        onChange={(e) => setTruckSearch(e.target.value)}
                                        placeholder="Search truck #, operator, or plant..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                                        autoFocus
                                    />
                                </div>
                                {regionalMixers.length === 0 ? (
                                    <div className="px-4 py-5 text-center text-sm text-slate-400">
                                        <i className="fas fa-truck mb-2 text-lg block" />
                                        No mixers found
                                    </div>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                                        {regionalMixers.map((m) => {
                                            const opName = operatorMap[m.assignedOperator] || null
                                            const isSelected = truckNumber === m.truckNumber
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setTruckNumber(m.truckNumber)
                                                        setTruckPickerOpen(false)
                                                        setTruckSearch('')
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                                                    style={isSelected ? { backgroundColor: `${accentColor}08` } : {}}
                                                >
                                                    <span
                                                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white flex-shrink-0"
                                                        style={{
                                                            backgroundColor: isSelected ? accentColor : '#94a3b8'
                                                        }}
                                                    >
                                                        #{m.truckNumber}
                                                    </span>
                                                    <span className="flex-1 min-w-0">
                                                        {opName ? (
                                                            <span className="text-sm font-medium text-slate-700 truncate block">
                                                                {opName}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-400 italic">
                                                                Unassigned
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                                                        {m.assignedPlant || '-'}
                                                    </span>
                                                    {isSelected && (
                                                        <i
                                                            className="fas fa-check text-xs flex-shrink-0"
                                                            style={{ color: accentColor }}
                                                        />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Customer Name
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter customer name..."
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Ticket Number
                        </label>
                        <input
                            type="text"
                            value={ticketNumber}
                            onChange={(e) => setTicketNumber(e.target.value)}
                            placeholder="Enter ticket number..."
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</label>
                        <div className="grid grid-cols-1 gap-2">
                            {REASONS.map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => {
                                        setReason(r)
                                        setExplanation('')
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors"
                                    style={
                                        reason === r
                                            ? {
                                                  backgroundColor: `${accentColor}10`,
                                                  borderColor: accentColor,
                                                  color: accentColor
                                              }
                                            : { borderColor: '#e2e8f0', color: '#475569' }
                                    }
                                >
                                    <div
                                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                        style={reason === r ? { borderColor: accentColor } : { borderColor: '#cbd5e1' }}
                                    >
                                        {reason === r && (
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: accentColor }}
                                            />
                                        )}
                                    </div>
                                    <span className="font-medium">{r}</span>
                                </button>
                            ))}
                        </div>
                        {reason && (
                            <textarea
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                placeholder="Explain what happened and what will be done to prevent this..."
                                rows={3}
                                autoFocus
                                className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 resize-none focus:outline-none mt-1"
                            />
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                        style={{ background: accentColor, opacity: submitting ? 0.7 : 1 }}
                        type="button"
                    >
                        {submitting ? (
                            <>
                                <i className="fas fa-circle-notch fa-spin mr-2" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Report'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
export default LostLoadReportModal
