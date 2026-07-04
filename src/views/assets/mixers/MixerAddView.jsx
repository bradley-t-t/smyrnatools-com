import React, { useEffect, useState } from 'react'

import PlantPickerField from '../../../app/components/common/PlantPickerField'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import usePlantPicker from '../../../app/hooks/usePlantPicker'
import { Mixer } from '../../../app/models/mixers/Mixer'
import { MixerService } from '../../../services/MixerService'
import { getSessionUserId } from '../../../services/SessionService'
import DateUtility from '../../../utils/DateUtility'

/**
 * Slide-in form for creating a new mixer (concrete truck) record. Requires
 * truck number and assigned plant. Defaults cleanliness to 5 and operator
 * to unassigned ("0"). Region-scoped plant list driven by user preferences.
 */
function MixerAddView({ plants, onClose, onMixerAdded }) {
    const { preferences } = usePreferences()
    const [truckNumber, setTruckNumber] = useState('')
    const [status, setStatus] = useState('')
    const [hours, setHours] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const picker = usePlantPicker({
        plants,
        regionCode: preferences.selectedRegion?.code || '',
        regionFilter: true
    })

    useEffect(() => {
        // Warm the mixer cache so the post-add UI is responsive.
        MixerService.fetchMixers().catch((e) => console.error('Failed to prefetch mixers:', e))
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!truckNumber) return setError('Truck number is required')
        if (!picker.assignedPlant) return setError('Plant is required')
        setIsSaving(true)
        try {
            const userId = getSessionUserId()
            if (!userId) throw new Error('User ID not available. Please log in again.')
            const now = DateUtility.formatDateForDb(new Date())
            const parsedHours =
                hours === '' || hours == null
                    ? null
                    : (() => {
                          const n = Number(hours)
                          return Number.isFinite(n) && n >= 0 ? n : null
                      })()
            const newMixer = new Mixer({
                assigned_operator: '0',
                assigned_plant: picker.assignedPlant,
                cleanliness_rating: 5,
                created_at: now,
                hours: parsedHours,
                status,
                truck_number: truckNumber,
                updated_at: now,
                updated_by: userId,
                updated_last: now
            })
            const savedMixer = await MixerService.createMixer(newMixer, userId)
            if (!savedMixer) throw new Error('Failed to add mixer - no data returned from server')
            onMixerAdded(savedMixer)
            onClose()
        } catch (err) {
            setError(`Failed to add mixer: ${err.message || 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AddViewSection title="Add New Mixer" onClose={onClose} error={error}>
            <form onSubmit={handleSubmit} autoComplete="off">
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-truck"></i>
                        <span> Basic Information</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="truckNumber">Truck Number*</label>
                            <input
                                id="truckNumber"
                                type="text"
                                value={truckNumber}
                                onChange={(e) => setTruckNumber(e.target.value)}
                                placeholder="Enter truck number"
                                required
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-building"></i>
                        <span> Assignment & Status</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PlantPickerField {...picker} />
                        <div className="flex flex-col gap-1">
                            <label htmlFor="status">Status</label>
                            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="">Select status</option>
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
                        {isSaving ? 'Adding...' : 'Add Mixer'}
                    </button>
                </div>
            </form>
        </AddViewSection>
    )
}

export default MixerAddView
