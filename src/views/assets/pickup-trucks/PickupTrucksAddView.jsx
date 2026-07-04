import React, { useState } from 'react'

import PlantPickerField from '../../../app/components/common/PlantPickerField'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import usePlantPicker from '../../../app/hooks/usePlantPicker'
import { PickupTruckService } from '../../../services/PickupTruckService'
import { getSessionUserId } from '../../../services/SessionService'

// Theme-aware native <select> styling. `appearance-none` strips the browser
// chevron so the inline-SVG (uses `currentColor`, so it follows --text-primary
// across dark/light/grayed themes) renders consistently. Matches the input
// height ladder and focus treatment used elsewhere in the add-view forms.
const SELECT_CLS =
    'h-11 w-full cursor-pointer rounded-xl bg-bg-secondary border border-border-light text-text-primary text-sm px-4 pr-10 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem_1rem] bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2024%2024%27%20stroke%3D%27currentColor%27%3E%3Cpath%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27M19%209l-7%207-7-7%27%2F%3E%3C%2Fsvg%3E")] hover:border-border-medium focus:outline-none focus-visible:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 [color-scheme:light] dark:[color-scheme:dark]'

/**
 * Slide-in form for creating a new pickup truck record. Supports VIN
 * (with I/O/Q letter stripping), make/model/year, assignee, mileage,
 * comments, region-scoped plant assignment, and status selection.
 */
function PickupTrucksAddView({ onClose, onAdded }) {
    const { preferences } = usePreferences()
    const [vin, setVin] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [assigned, setAssigned] = useState('')
    const [status, setStatus] = useState('Active')
    const [mileage, setMileage] = useState('')
    const [comments, setComments] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const picker = usePlantPicker({
        loadAllPlants: true,
        regionCode: preferences.selectedRegion?.code || '',
        regionFilter: true
    })

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!picker.assignedPlant) {
            setError('Assigned plant is required')
            return
        }
        setIsSaving(true)
        try {
            const userId = getSessionUserId()
            if (!userId) throw new Error('User ID not available. Please log in again.')
            const payload = {
                assigned: assigned || null,
                assignedPlant: picker.assignedPlant || null,
                assigned_plant: picker.assignedPlant || null,
                comments: comments || null,
                make: make || null,
                mileage: mileage === '' ? null : Number(mileage),
                model: model || null,
                status: status || null,
                vin: vin || null,
                year: year || null
            }
            const saved = await PickupTruckService.create(payload, userId)
            onAdded?.(saved)
            onClose?.()
        } catch (err) {
            setError(err?.message || 'Failed to add pickup truck')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AddViewSection title="Add Pickup Truck" onClose={onClose} error={error}>
            <form onSubmit={handleSubmit} autoComplete="off">
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-building"></i>
                        <span>Assignment & Status</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PlantPickerField {...picker} label="Plant*" />
                        <div className="flex flex-col gap-1">
                            <label>Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLS}>
                                <option value="Active">Active</option>
                                <option value="Stationary">Stationary</option>
                                <option value="Spare">Spare</option>
                                <option value="In Shop">In Shop</option>
                                <option value="Retired">Retired</option>
                                <option value="Sold">Sold</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-car"></i>
                        <span>Vehicle Information</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label>VIN</label>
                            <input
                                type="text"
                                value={vin}
                                onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                placeholder="Enter VIN (no I, O, Q)"
                            />
                            <span className="text-xs text-text-secondary">Letters I, O, and Q are not used.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label>Year</label>
                            <input
                                type="text"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="Enter year"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label>Make</label>
                            <input
                                type="text"
                                value={make}
                                onChange={(e) => setMake(e.target.value)}
                                placeholder="Enter make"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label>Model</label>
                            <input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="Enter model"
                            />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-user"></i>
                        <span>Usage Details</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label>Assigned</label>
                            <input
                                type="text"
                                value={assigned}
                                onChange={(e) => setAssigned(e.target.value)}
                                placeholder="Enter name"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label>Mileage</label>
                            <input
                                type="number"
                                value={mileage}
                                onChange={(e) => setMileage(e.target.value)}
                                placeholder="Enter mileage"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 col-span-full">
                            <label>Comments</label>
                            <textarea
                                rows={3}
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Notes"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="submit" disabled={isSaving}>
                        {isSaving ? 'Adding...' : 'Add Pickup'}
                    </button>
                </div>
            </form>
        </AddViewSection>
    )
}

export default PickupTrucksAddView
