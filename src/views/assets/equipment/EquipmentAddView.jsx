import React, { useState } from 'react'

import PlantPickerField from '../../../app/components/common/PlantPickerField'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import usePlantPicker from '../../../app/hooks/usePlantPicker'
import { EquipmentService } from '../../../services/EquipmentService'
import { getSessionUserId } from '../../../services/SessionService'

// Theme-aware native <select> styling. `appearance-none` strips the browser
// chevron so the inline-SVG (uses `currentColor`, so it follows --text-primary
// across dark/light/grayed themes) renders consistently. Matches the input
// height ladder and focus treatment used elsewhere in the add-view forms.
const SELECT_CLS =
    'h-11 w-full cursor-pointer rounded-xl bg-bg-secondary border border-border-light text-text-primary text-sm px-4 pr-10 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem_1rem] bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2024%2024%27%20stroke%3D%27currentColor%27%3E%3Cpath%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27M19%209l-7%207-7-7%27%2F%3E%3C%2Fsvg%3E")] hover:border-border-medium focus:outline-none focus-visible:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 [color-scheme:light] dark:[color-scheme:dark]'

const EQUIPMENT_TYPES = [
    'Front-End Loader',
    'Excavator',
    'Mini-Excavator',
    'Backhoe',
    'Skid Steer',
    'Forklift',
    'Manlift',
    'Dozer',
    'Off-Road Dump Truck',
    'Water/Trash Pump',
    'Water Truck',
    'Trailer',
    'Portable Compressor',
    'Portable Conveyor',
    'Crusher',
    'Ice Conveyor',
    'Rotary Mixer',
    'Road Reclaimer',
    'Roller',
    'Maintainer',
    'Sweeper',
    'Other',
    'Unknown'
]

/**
 * Slide-in form for creating a new heavy equipment record. Requires
 * identifying number, assigned plant, and equipment type. Detects duplicate
 * identifying numbers from API errors and surfaces a friendlier message.
 */
function EquipmentAddView({ plants, onClose, onEquipmentAdded }) {
    const [identifyingNumber, setIdentifyingNumber] = useState('')
    const [equipmentType, setEquipmentType] = useState('')
    const [status, setStatus] = useState('Active')
    const [hours, setHours] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const picker = usePlantPicker({ plants })

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!identifyingNumber) return setError('Identifying number is required')
        if (!picker.assignedPlant) return setError('Plant is required')
        if (!equipmentType) return setError('Equipment type is required')
        setIsSaving(true)
        try {
            const userId = getSessionUserId()
            if (!userId) throw new Error('User ID not available. Please log in again.')
            const parsedHours =
                hours === '' || hours == null
                    ? null
                    : (() => {
                          const n = Number(hours)
                          return Number.isFinite(n) && n >= 0 ? n : null
                      })()
            const newEquipment = {
                assigned_plant: picker.assignedPlant,
                equipment_type: equipmentType,
                hours: parsedHours,
                identifying_number: identifyingNumber,
                status
            }
            const savedEquipment = await EquipmentService.createEquipment(newEquipment, userId)
            if (!savedEquipment) throw new Error('Failed to add equipment - no data returned from server')
            onEquipmentAdded(savedEquipment)
            onClose()
        } catch (err) {
            const errorMessage = err.message || 'Unknown error'
            const lower = errorMessage.toLowerCase()
            if (
                lower.includes('duplicate') ||
                lower.includes('unique constraint') ||
                lower.includes('already exists')
            ) {
                setError('This identifying number is already in use. Please use a different identifying number.')
            } else {
                setError(`Failed to add equipment: ${errorMessage}`)
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AddViewSection title="Add New Equipment" onClose={onClose} error={error}>
            <form onSubmit={handleSubmit} autoComplete="off">
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-tools"></i>
                        <span> Basic Information</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="identifyingNumber">Identifying Number*</label>
                            <input
                                id="identifyingNumber"
                                type="text"
                                value={identifyingNumber}
                                onChange={(e) => setIdentifyingNumber(e.target.value)}
                                placeholder="Enter identifying number"
                                required
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-building"></i>
                        <span> Assignment & Classification</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PlantPickerField {...picker} />
                        <div className="flex flex-col gap-1">
                            <label htmlFor="equipmentType">Equipment Type*</label>
                            <select
                                id="equipmentType"
                                value={equipmentType}
                                onChange={(e) => setEquipmentType(e.target.value)}
                                required
                                className={SELECT_CLS}
                            >
                                <option value="">Select Type</option>
                                {EQUIPMENT_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="status">Status</label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className={SELECT_CLS}
                            >
                                <option value="Active">Active</option>
                                <option value="Spare">Spare</option>
                                <option value="In Shop">In Shop</option>
                                <option value="Retired">Retired</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="hours">Hours</label>
                            <input
                                id="hours"
                                type="number"
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                placeholder="Enter hours"
                                min="0"
                                step="any"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="submit" disabled={isSaving}>
                        {isSaving ? 'Adding...' : 'Add Equipment'}
                    </button>
                </div>
            </form>
        </AddViewSection>
    )
}

export default EquipmentAddView
