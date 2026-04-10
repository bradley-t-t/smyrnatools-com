import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import TopSection from '../../../app/components/sections/TopSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { NRMCAService } from '../../../services/NRMCAService'
import { PlantService } from '../../../services/PlantService'

// ─── Constants ────────────────────────────────────────────────────────────────

const RENEWAL_WARN_DAYS = 90
const CALIBRATION_WARN_DAYS = 30

const SCALE_TYPES = ['batch', 'aggregate', 'truck', 'water', 'admixture', 'cement', 'other']

const STATUS_BADGE = {
    valid: { label: 'Valid', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-500' },
    expiring: { label: 'Expiring Soon', cls: 'bg-amber-100 text-amber-700 border border-amber-500' },
    expired: { label: 'Expired', cls: 'bg-red-100 text-red-700 border border-red-500' },
    ok: { label: 'OK', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-500' },
    due_soon: { label: 'Due Soon', cls: 'bg-amber-100 text-amber-700 border border-amber-500' },
    overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700 border border-red-500' },
    unknown: { label: 'Not Set', cls: 'bg-slate-100 text-slate-500 border border-slate-300' }
}

const SCALE_ICON_BY_STATUS = {
    ok: 'bg-emerald-100 text-emerald-500',
    due_soon: 'bg-amber-100 text-amber-500',
    overdue: 'bg-red-100 text-red-500',
    unknown: 'bg-slate-100 text-slate-400'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d) =>
    d
        ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : null

const daysFromNow = (d) => (d ? Math.ceil((new Date(d + 'T12:00:00') - Date.now()) / 86400000) : null)

function getRenewalStatus(expiresAt) {
    const days = daysFromNow(expiresAt)
    if (days === null) return 'unknown'
    if (days < 0) return 'expired'
    if (days <= RENEWAL_WARN_DAYS) return 'expiring'
    return 'valid'
}

function getCalibrationStatus(calibratedAt, intervalDays) {
    if (!calibratedAt) return 'unknown'
    const nextDueDate = new Date(new Date(calibratedAt + 'T12:00:00').getTime() + intervalDays * 86400000)
        .toISOString()
        .slice(0, 10)
    const days = daysFromNow(nextDueDate)
    if (days < 0) return 'overdue'
    if (days <= CALIBRATION_WARN_DAYS) return 'due_soon'
    return 'ok'
}

function getNextCalibrationDueDate(calibratedAt, intervalDays) {
    if (!calibratedAt) return null
    return new Date(new Date(calibratedAt + 'T12:00:00').getTime() + intervalDays * 86400000).toISOString().slice(0, 10)
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.unknown
    return (
        <span className={`inline-block rounded-md text-xs font-bold uppercase tracking-wide px-2.5 py-1 ${cfg.cls}`}>
            {cfg.label}
        </span>
    )
}

function Field({ label, children }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
            {children}
        </div>
    )
}

const INPUT_CLS =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
const SELECT_CLS =
    'w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 cursor-pointer'

function Modal({ title, onClose, onSubmit, submitting, children }) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl z-10">
                    <h2 className="text-base font-bold text-slate-800">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        onSubmit()
                    }}
                    className="px-6 py-5 flex flex-col gap-4"
                >
                    {children}
                </form>
                <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function IconBtn({ icon, onClick, danger }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                danger
                    ? 'border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            aria-label={danger ? 'Delete' : 'Edit'}
        >
            <i className={`fas ${icon} text-[11px]`} />
        </button>
    )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function LogRenewalModal({ plant, onClose, onSaved }) {
    const today = new Date().toISOString().slice(0, 10)
    const threeYearsOut = new Date(Date.now() + 3 * 365 * 86400000).toISOString().slice(0, 10)
    const [renewedAt, setRenewedAt] = useState(today)
    const [expiresAt, setExpiresAt] = useState(threeYearsOut)
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        try {
            await NRMCAService.logRenewal({
                nrmca_plant_id: plant.id,
                renewed_at: renewedAt,
                renewal_expires_at: expiresAt || null,
                notes: notes || null
            })
            onSaved()
        } catch (err) {
            alert(err?.message || 'Failed to log renewal')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={`Log Renewal — ${plant.plant_label}`} onClose={onClose} onSubmit={handleSave} submitting={saving}>
            <Field label="Renewal Date">
                <input
                    type="date"
                    className={INPUT_CLS}
                    value={renewedAt}
                    onChange={(e) => setRenewedAt(e.target.value)}
                    required
                />
            </Field>
            <Field label="Expiration Date">
                <input
                    type="date"
                    className={INPUT_CLS}
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                />
            </Field>
            <Field label="Notes (optional)">
                <textarea className={INPUT_CLS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
        </Modal>
    )
}

function LogCalibrationModal({ scale, onClose, onSaved }) {
    const today = new Date().toISOString().slice(0, 10)
    const [calibratedAt, setCalibratedAt] = useState(today)
    const [calibratedBy, setCalibratedBy] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        try {
            await NRMCAService.logCalibration({
                scale_id: scale.id,
                calibrated_at: calibratedAt,
                calibrated_by: calibratedBy || null,
                notes: notes || null
            })
            onSaved()
        } catch (err) {
            alert(err?.message || 'Failed to log calibration')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            title={`Log Calibration — ${scale.scale_name}`}
            onClose={onClose}
            onSubmit={handleSave}
            submitting={saving}
        >
            <Field label="Calibration Date">
                <input
                    type="date"
                    className={INPUT_CLS}
                    value={calibratedAt}
                    onChange={(e) => setCalibratedAt(e.target.value)}
                    required
                />
            </Field>
            <Field label="Calibrated By (optional)">
                <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Company or technician name"
                    value={calibratedBy}
                    onChange={(e) => setCalibratedBy(e.target.value)}
                />
            </Field>
            <Field label="Notes (optional)">
                <textarea className={INPUT_CLS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
        </Modal>
    )
}

function PlantFormModal({ plant, regionPlants, onClose, onSaved }) {
    const [plantCode, setPlantCode] = useState(plant?.plant_code ?? '')
    const [plantLabel, setPlantLabel] = useState(plant?.plant_label ?? '')
    const [notes, setNotes] = useState(plant?.notes ?? '')
    const [saving, setSaving] = useState(false)
    const [showPlantPicker, setShowPlantPicker] = useState(false)

    const selectedPlantName = useMemo(() => {
        if (!plantCode) return null
        const match = regionPlants.find((p) => (p.plantCode || p.plant_code) === plantCode)
        return match ? match.plantName || match.plant_name : null
    }, [plantCode, regionPlants])

    async function handleSave() {
        if (!plantCode || !plantLabel) return
        setSaving(true)
        try {
            await NRMCAService.upsertPlant({
                id: plant?.id,
                plant_code: plantCode,
                plant_label: plantLabel,
                notes: notes || null
            })
            onSaved()
        } catch (err) {
            alert(err?.message || 'Failed to save plant')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={plant ? 'Edit Plant' : 'Add Plant'} onClose={onClose} onSubmit={handleSave} submitting={saving}>
            <Field label="Plant">
                <button
                    type="button"
                    onClick={() => setShowPlantPicker(true)}
                    className={SELECT_CLS + ' text-left text-slate-900'}
                >
                    {plantCode ? (
                        `(${plantCode}) ${selectedPlantName ?? ''}`
                    ) : (
                        <span className="text-slate-400">Select plant…</span>
                    )}
                </button>
                <PlantDropdownModal
                    isOpen={showPlantPicker}
                    onClose={() => setShowPlantPicker(false)}
                    plants={regionPlants}
                    onSelect={(code) => setPlantCode(code)}
                />
            </Field>
            <Field label="Plant Label">
                <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="e.g. Main Batch Plant, Plant 1-A"
                    value={plantLabel}
                    onChange={(e) => setPlantLabel(e.target.value)}
                    required
                />
                <p className="text-[11px] text-slate-400">
                    Use labels to distinguish multiple batch plants at the same location.
                </p>
            </Field>
            <Field label="Notes (optional)">
                <textarea className={INPUT_CLS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
        </Modal>
    )
}

function ScaleFormModal({ scale, nrmcaPlants, defaultPlantId, onClose, onSaved }) {
    const [nrmcaPlantId, setNrmcaPlantId] = useState(scale?.nrmca_plant_id ?? defaultPlantId ?? '')
    const [scaleName, setScaleName] = useState(scale?.scale_name ?? '')
    const [scaleType, setScaleType] = useState(scale?.scale_type ?? 'batch')
    const [intervalDays, setIntervalDays] = useState(String(scale?.calibration_interval_days ?? 365))
    const [notes, setNotes] = useState(scale?.notes ?? '')
    const [saving, setSaving] = useState(false)

    const selectedPlant = nrmcaPlants.find((p) => p.id === nrmcaPlantId)

    async function handleSave() {
        if (!nrmcaPlantId || !scaleName) return
        setSaving(true)
        try {
            await NRMCAService.upsertScale({
                id: scale?.id,
                nrmca_plant_id: nrmcaPlantId,
                plant_code: selectedPlant?.plant_code ?? null,
                scale_name: scaleName,
                scale_type: scaleType,
                calibration_interval_days: parseInt(intervalDays) || 365,
                notes: notes || null
            })
            onSaved()
        } catch (err) {
            alert(err?.message || 'Failed to save scale')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={scale ? 'Edit Scale' : 'Add Scale'} onClose={onClose} onSubmit={handleSave} submitting={saving}>
            <Field label="Plant">
                <select
                    className={SELECT_CLS}
                    value={nrmcaPlantId}
                    onChange={(e) => setNrmcaPlantId(e.target.value)}
                    required
                >
                    <option value="">Select plant…</option>
                    {nrmcaPlants.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.plant_code} — {p.plant_label}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Scale Name">
                <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="e.g. Batch Scale 1"
                    value={scaleName}
                    onChange={(e) => setScaleName(e.target.value)}
                    required
                />
            </Field>
            <Field label="Scale Type">
                <select className={SELECT_CLS} value={scaleType} onChange={(e) => setScaleType(e.target.value)}>
                    {SCALE_TYPES.map((t) => (
                        <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Calibration Interval (days)">
                <input
                    type="number"
                    className={INPUT_CLS}
                    min="1"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                />
                <p className="text-[11px] text-slate-400">365 = annual · 180 = semi-annual</p>
            </Field>
            <Field label="Notes (optional)">
                <textarea className={INPUT_CLS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
        </Modal>
    )
}

// ─── Scale Row ────────────────────────────────────────────────────────────────

function ScaleRow({ scale, allPlants, onReload }) {
    const [calibModal, setCalibModal] = useState(false)
    const [editModal, setEditModal] = useState(false)

    const status = getCalibrationStatus(scale.calibrated_at, scale.calibration_interval_days)
    const nextDue = getNextCalibrationDueDate(scale.calibrated_at, scale.calibration_interval_days)
    const days = nextDue ? daysFromNow(nextDue) : null
    const iconBg = SCALE_ICON_BY_STATUS[status] ?? SCALE_ICON_BY_STATUS.unknown

    function confirmDelete() {
        if (!window.confirm(`Delete scale "${scale.scale_name}"?`)) return
        NRMCAService.deleteScale(scale.id)
            .then(onReload)
            .catch((e) => alert(e?.message))
    }

    return (
        <>
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                <div className="w-4 shrink-0" /> {/* indent under plant */}
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-[10px] shrink-0 ${iconBg}`}>
                    <i className="fas fa-balance-scale" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{scale.scale_name}</span>
                        <span className="text-[11px] text-slate-400 capitalize">{scale.scale_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[12px] text-[var(--text-secondary)] flex-wrap">
                        <span>
                            {scale.calibrated_at ? `Calibrated ${fmt(scale.calibrated_at)}` : 'Never calibrated'}
                            {scale.calibrated_by ? ` · ${scale.calibrated_by}` : ''}
                        </span>
                        {nextDue && (
                            <span>
                                Due {fmt(nextDue)}
                                {days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})`}
                            </span>
                        )}
                    </div>
                </div>
                <StatusBadge status={status} />
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setCalibModal(true)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                        Log Calibration
                    </button>
                    <IconBtn icon="fa-pencil-alt" onClick={() => setEditModal(true)} />
                    <IconBtn icon="fa-trash-alt" onClick={confirmDelete} danger />
                </div>
            </div>

            {calibModal && (
                <LogCalibrationModal
                    scale={scale}
                    onClose={() => setCalibModal(false)}
                    onSaved={() => {
                        setCalibModal(false)
                        onReload()
                    }}
                />
            )}
            {editModal && (
                <ScaleFormModal
                    scale={scale}
                    nrmcaPlants={allPlants}
                    onClose={() => setEditModal(false)}
                    onSaved={() => {
                        setEditModal(false)
                        onReload()
                    }}
                />
            )}
        </>
    )
}

// ─── Plant Group ──────────────────────────────────────────────────────────────

function PlantGroup({ plant, scales, allPlants, regionPlants, onReload }) {
    const [renewModal, setRenewModal] = useState(false)
    const [editModal, setEditModal] = useState(false)
    const [addScaleModal, setAddScaleModal] = useState(false)

    const renewalStatus = getRenewalStatus(plant.renewal_expires_at)
    const plantScales = scales.filter((s) => s.nrmca_plant_id === plant.id)

    function confirmDeletePlant() {
        if (!window.confirm(`Delete "${plant.plant_label}"? This will also remove all associated scales and history.`))
            return
        NRMCAService.deletePlant(plant.id)
            .then(onReload)
            .catch((e) => alert(e?.message))
    }

    return (
        <>
            {/* Plant header */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg text-[10px] bg-blue-100 text-blue-500 shrink-0">
                    <i className="fas fa-certificate" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{plant.plant_label}</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {plant.plant_code}
                        </span>
                        <span className="text-[11px] text-slate-400">NRMCA Certification</span>
                        <StatusBadge status={renewalStatus} />
                    </div>
                    {(plant.renewed_at || plant.renewal_expires_at) && (
                        <div className="flex items-center gap-3 mt-0.5 text-[12px] text-[var(--text-secondary)] flex-wrap">
                            {plant.renewed_at && <span>Cert. renewed {fmt(plant.renewed_at)}</span>}
                            {plant.renewal_expires_at && <span>Expires {fmt(plant.renewal_expires_at)}</span>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setRenewModal(true)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                        Log Renewal
                    </button>
                    <IconBtn icon="fa-pencil-alt" onClick={() => setEditModal(true)} />
                    <IconBtn icon="fa-trash-alt" onClick={confirmDeletePlant} danger />
                </div>
            </div>

            {/* Scale rows */}
            {plantScales.map((scale) => (
                <ScaleRow key={scale.id} scale={scale} allPlants={allPlants} onReload={onReload} />
            ))}

            {/* Add scale */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-white">
                <div className="w-4 shrink-0" />
                <div className="w-7 shrink-0" />
                <button
                    type="button"
                    onClick={() => setAddScaleModal(true)}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-blue-600 transition-colors"
                >
                    <i className="fas fa-plus text-[10px]" />
                    Add scale
                </button>
            </div>

            {renewModal && (
                <LogRenewalModal
                    plant={plant}
                    onClose={() => setRenewModal(false)}
                    onSaved={() => {
                        setRenewModal(false)
                        onReload()
                    }}
                />
            )}
            {editModal && (
                <PlantFormModal
                    plant={plant}
                    regionPlants={regionPlants}
                    onClose={() => setEditModal(false)}
                    onSaved={() => {
                        setEditModal(false)
                        onReload()
                    }}
                />
            )}
            {addScaleModal && (
                <ScaleFormModal
                    defaultPlantId={plant.id}
                    nrmcaPlants={allPlants}
                    onClose={() => setAddScaleModal(false)}
                    onSaved={() => {
                        setAddScaleModal(false)
                        onReload()
                    }}
                />
            )}
        </>
    )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NRMCASkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {[1, 2, 3].map((g) => (
                <React.Fragment key={g}>
                    <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="h-4 w-40 rounded bg-slate-200 animate-pulse mb-1.5" />
                            <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
                        </div>
                        <div className="h-6 w-16 rounded-md bg-slate-200 animate-pulse" />
                        <div className="h-7 w-24 rounded-lg bg-slate-200 animate-pulse" />
                    </div>
                    {[1, 2].map((r) => (
                        <div key={r} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
                            <div className="w-4 shrink-0" />
                            <div className="w-7 h-7 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="h-3.5 w-36 rounded bg-slate-200 animate-pulse mb-1.5" />
                                <div className="h-3 w-48 rounded bg-slate-100 animate-pulse" />
                            </div>
                            <div className="h-6 w-14 rounded-md bg-slate-200 animate-pulse" />
                            <div className="h-7 w-28 rounded-lg bg-slate-200 animate-pulse" />
                        </div>
                    ))}
                </React.Fragment>
            ))}
        </div>
    )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function NRMCAView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const headerRef = useRef(null)

    const [plants, setPlants] = useState([])
    const [scales, setScales] = useState([])
    const [loading, setLoading] = useState(true)
    const [regionPlants, setRegionPlants] = useState([])
    const [addPlantModal, setAddPlantModal] = useState(false)

    const regionCode = preferences.selectedRegion?.code

    const regionPlantCodes = useMemo(() => {
        if (!regionCode || !regionPlants.length) return null
        return new Set(
            regionPlants
                .map((p) =>
                    String(p.plantCode ?? p.plant_code ?? '')
                        .trim()
                        .toUpperCase()
                )
                .filter(Boolean)
        )
    }, [regionCode, regionPlants])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [fetchedPlants, fetchedScales] = await Promise.all([
                NRMCAService.fetchPlants(regionPlantCodes),
                NRMCAService.fetchScales(regionPlantCodes)
            ])
            setPlants(fetchedPlants)
            setScales(fetchedScales)
        } catch {
            // stays empty; UI shows empty state
        } finally {
            setLoading(false)
        }
    }, [regionPlantCodes])

    useEffect(() => {
        if (regionCode) {
            PlantService.fetchRegionPlants(regionCode)
                .then(setRegionPlants)
                .catch(() => setRegionPlants([]))
        } else {
            setRegionPlants([])
        }
    }, [regionCode])

    useEffect(() => {
        loadData()
    }, [loadData])

    const badge = useMemo(() => {
        if (loading || !plants.length) return null
        const expired = plants.filter((p) => getRenewalStatus(p.renewal_expires_at) === 'expired').length
        const overdue = scales.filter(
            (s) => getCalibrationStatus(s.calibrated_at, s.calibration_interval_days) === 'overdue'
        ).length
        const parts = [`${plants.length} Plants`, `${scales.length} Scales`]
        if (expired > 0) parts.push(`${expired} Expired`)
        if (overdue > 0) parts.push(`${overdue} Overdue`)
        return parts.join(' · ')
    }, [loading, plants, scales])

    return (
        <div className="min-h-screen w-full" style={{ background: 'var(--bg-secondary)' }}>
            <TopSection
                title="Calibrations & Certifications"
                forwardedRef={headerRef}
                sticky
                isLoading={loading}
                badge={badge}
                hidePlantFilter
                hideViewModeToggle
                hideSearchBar
            />

            <div className="p-5 flex flex-col gap-4">
                {loading ? (
                    <NRMCASkeleton />
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200">
                            <span className="text-sm font-semibold text-slate-700">
                                {plants.length} {plants.length === 1 ? 'plant' : 'plants'} · {scales.length}{' '}
                                {scales.length === 1 ? 'scale' : 'scales'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setAddPlantModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
                                style={{ backgroundColor: accentColor }}
                            >
                                <i className="fas fa-plus" /> Add Plant
                            </button>
                        </div>

                        {plants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                                <i className="fas fa-certificate text-[4rem] mb-4 text-[var(--border-medium)]" />
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                                    No plants defined yet
                                </h3>
                                <p className="text-[0.9375rem] text-[var(--text-secondary)] mb-6">
                                    Add a plant to start tracking certifications and scale calibrations.
                                </p>
                            </div>
                        ) : (
                            plants.map((plant) => (
                                <PlantGroup
                                    key={plant.id}
                                    plant={plant}
                                    scales={scales}
                                    allPlants={plants}
                                    regionPlants={regionPlants}
                                    onReload={loadData}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {addPlantModal && (
                <PlantFormModal
                    regionPlants={regionPlants}
                    onClose={() => setAddPlantModal(false)}
                    onSaved={() => {
                        setAddPlantModal(false)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
