import React, { useEffect, useState } from 'react'

import { DistrictManagerService } from '../../../services/DistrictManagerService'
import { RegionService } from '../../../services/RegionService'
import DetailViewSection from '../sections/DetailViewSection'
/**
 * Plant-responsibility picker for eligible roles (District Manager, etc.).
 * Shows only plants within the user's region and lets admins assign/unassign them.
 * Renders as a DetailViewSection.Section to embed inside ManagerDetailView.
 *
 * @param {string} userId - The manager being edited.
 * @param {string} userPlantCode - The manager's assigned plant (used to resolve region).
 * @param {boolean} readOnly - Whether editing is disabled.
 * @param {Function} onMessage - Callback to surface save/error messages to parent.
 */
function DistrictManagerPlantsSection({ userId, userPlantCode, readOnly, onMessage }) {
    const [assignedCodes, setAssignedCodes] = useState([])
    const [regionPlants, setRegionPlants] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [plantQuery, setPlantQuery] = useState('')
    const [hasChanges, setHasChanges] = useState(false)
    const [originalCodes, setOriginalCodes] = useState([])
    useEffect(() => {
        if (!userId) return
        let cancelled = false
        async function loadData() {
            setLoading(true)
            try {
                const [userPlants, resolvedPlants] = await Promise.all([
                    DistrictManagerService.fetchUserPlants(userId),
                    resolveRegionPlants(userPlantCode)
                ])
                if (cancelled) return
                const codes = userPlants.map((p) => p.plant_code)
                setAssignedCodes(codes)
                setOriginalCodes(codes)
                setRegionPlants(resolvedPlants)
            } catch {
                if (!cancelled) setRegionPlants([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        loadData()
        return () => {
            cancelled = true
        }
    }, [userId, userPlantCode])
    useEffect(() => {
        const sorted = (arr) => [...arr].sort().join(',')
        setHasChanges(sorted(assignedCodes) !== sorted(originalCodes))
    }, [assignedCodes, originalCodes])
    async function resolveRegionPlants(plantCode) {
        if (!plantCode) return []
        try {
            const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
            if (!regions?.length) return []
            const regionCode = regions[0].regionCode || regions[0].region_code
            if (!regionCode) return []
            return await RegionService.fetchRegionPlants(regionCode)
        } catch {
            return []
        }
    }
    const handleSave = async () => {
        setSaving(true)
        try {
            await DistrictManagerService.updateUserPlants(userId, assignedCodes)
            setOriginalCodes(assignedCodes)
            setHasChanges(false)
            onMessage?.('Responsible plants saved')
        } catch {
            onMessage?.('Failed to save responsible plants')
        } finally {
            setSaving(false)
        }
    }
    const togglePlant = (code) => {
        setAssignedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
    }
    const filteredPlants = regionPlants.filter((p) => {
        const q = plantQuery.trim().toLowerCase()
        if (!q) return true
        const code = (p.plantCode || p.plant_code || '').toLowerCase()
        const name = (p.plantName || p.plant_name || '').toLowerCase()
        return code.includes(q) || name.includes(q)
    })
    const selectAllFiltered = () => {
        const codes = filteredPlants.map((p) => p.plantCode || p.plant_code)
        setAssignedCodes((prev) => Array.from(new Set([...prev, ...codes])))
    }
    const clearAll = () => setAssignedCodes([])
    const removeChip = (code) => setAssignedCodes((prev) => prev.filter((c) => c !== code))
    if (loading) {
        return (
            <DetailViewSection.Section id="responsible-plants" title="Responsible Plants" icon="fas fa-clipboard-list">
                <DetailViewSection.Card title="Loading..." icon="fas fa-spinner">
                    <div className="text-sm text-slate-500 py-4 text-center">Loading plant assignments...</div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
        )
    }
    const noRegionPlants = regionPlants.length === 0
    return (
        <DetailViewSection.Section id="responsible-plants" title="Responsible Plants" icon="fas fa-clipboard-list">
            <DetailViewSection.Card
                title={`Responsible Plants (${assignedCodes.length} selected)`}
                icon="fas fa-industry"
            >
                {noRegionPlants ? (
                    <div className="text-sm text-slate-500 py-4 text-center">
                        No plants found in this user&apos;s region. Assign the user to a plant within a region first.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {/* Selected chips */}
                        {assignedCodes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {assignedCodes.map((code) => {
                                    const plant = regionPlants.find((p) => (p.plantCode || p.plant_code) === code)
                                    const name = plant?.plantName || plant?.plant_name || ''
                                    return (
                                        <span
                                            key={code}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700"
                                        >
                                            <span className="font-bold">{code}</span>
                                            {name && <span className="text-emerald-500">{name}</span>}
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    className="ml-0.5 text-emerald-400 hover:text-emerald-600 cursor-pointer bg-transparent border-none text-sm leading-none"
                                                    onClick={() => removeChip(code)}
                                                    aria-label={`Remove ${code}`}
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </span>
                                    )
                                })}
                                {!readOnly && (
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 cursor-pointer hover:bg-slate-200"
                                        onClick={clearAll}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        )}
                        {/* Search + select all */}
                        {!readOnly && (
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    className="form-control flex-1"
                                    placeholder="Search by code or name"
                                    value={plantQuery}
                                    onChange={(e) => setPlantQuery(e.target.value)}
                                    aria-label="Search plants"
                                />
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                    {filteredPlants.length} results
                                </span>
                                <button
                                    type="button"
                                    className="global-button-secondary whitespace-nowrap text-[13px] px-3 py-2"
                                    onClick={selectAllFiltered}
                                    disabled={!filteredPlants.length}
                                >
                                    Select All
                                </button>
                            </div>
                        )}
                        {/* Plant checklist */}
                        <div
                            className="border border-slate-200 rounded-[10px] max-h-[280px] overflow-y-auto"
                            role="listbox"
                            aria-label="Region plants"
                        >
                            {filteredPlants.map((p) => {
                                const code = p.plantCode || p.plant_code
                                const name = p.plantName || p.plant_name || ''
                                const isSelected = assignedCodes.includes(code)
                                return (
                                    <label
                                        key={code}
                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                                            isSelected ? 'bg-emerald-50/50' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => !readOnly && togglePlant(code)}
                                            disabled={readOnly}
                                            className="size-4 rounded border-slate-300"
                                            aria-label={`Toggle ${code}`}
                                        />
                                        <span className="font-bold text-sm text-slate-700">{code}</span>
                                        <span className="text-sm text-slate-500">{name}</span>
                                    </label>
                                )
                            })}
                            {!filteredPlants.length && (
                                <div className="text-sm text-slate-400 py-4 text-center">No matches</div>
                            )}
                        </div>
                        {/* Save button */}
                        {!readOnly && hasChanges && (
                            <button
                                type="button"
                                className="global-button-secondary self-start"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                                <span>{saving ? 'Saving...' : 'Save Responsible Plants'}</span>
                            </button>
                        )}
                    </div>
                )}
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}
export default DistrictManagerPlantsSection
