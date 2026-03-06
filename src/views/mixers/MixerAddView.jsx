import React, { useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../app/components/common/PlantDropdownModal'
import AddViewSection from '../../app/components/sections/AddViewSection'
import { usePreferences } from '../../app/context/PreferencesContext'
import { Mixer } from '../../models/mixers/Mixer'
import { MixerService } from '../../services/MixerService'
import { RegionService } from '../../services/RegionService'
/**
 * Slide-in form for creating a new mixer (concrete truck) record.
 * Requires truck number and assigned plant. Defaults cleanliness to 5
 * and operator to unassigned ("0").
 *
 * @param {Object[]} plants - Available plant records for the plant picker.
 * @param {Function} onClose - Callback to dismiss the add view.
 * @param {Function} onMixerAdded - Callback with the newly created mixer record.
 */
function MixerAddView({ plants, onClose, onMixerAdded }) {
    const { preferences } = usePreferences()
    const [truckNumber, setTruckNumber] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    useEffect(() => {
        async function loadMixers() {
            try {
                await MixerService.fetchMixers()
            } catch (error) {}
        }
        loadMixers()
    }, [])
    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false
        async function loadRegionPlants() {
            if (!code) {
                setRegionPlantCodes(null)
                return
            }
            try {
                const regionPlants = await RegionService.fetchRegionPlants(code)
                if (cancelled) return
                const codes = new Set(regionPlants.map((p) => p.plantCode))
                setRegionPlantCodes(codes)
                if (assignedPlant && !codes.has(assignedPlant)) setAssignedPlant('')
            } catch {
                setRegionPlantCodes(new Set())
            }
        }
        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, assignedPlant])
    const visiblePlants = useMemo(() => {
        const list = Array.isArray(plants) ? plants : []
        const filtered =
            !preferences.selectedRegion?.code || !regionPlantCodes
                ? list
                : list.filter((p) => regionPlantCodes.has(p.plantCode))
        return filtered
            .slice()
            .sort(
                (a, b) =>
                    parseInt(a.plantCode?.replace(/\D/g, '') || '0') - parseInt(b.plantCode?.replace(/\D/g, '') || '0')
            )
    }, [plants, regionPlantCodes, preferences.selectedRegion?.code])
    const selectedPlantObj = visiblePlants.find((p) => p.plantCode === assignedPlant)
    const plantDisplayText = assignedPlant
        ? `(${selectedPlantObj?.plantCode}) ${selectedPlantObj?.plantName}`
        : 'Select Plant'
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!truckNumber) return setError('Truck number is required')
        if (!assignedPlant) return setError('Plant is required')
        setIsSaving(true)
        try {
            const userId = sessionStorage.getItem('userId')
            if (!userId) throw new Error('User ID not available. Please log in again.')
            const formatDateForDb = (date) => {
                if (!date) return null
                const d = new Date(date)
                if (isNaN(d.getTime())) return null
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}+00`
            }
            const now = formatDateForDb(new Date())
            const newMixer = new Mixer({
                assigned_operator: '0',
                assigned_plant: assignedPlant,
                cleanliness_rating: 5,
                created_at: now,
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
        } catch (error) {
            setError(`Failed to add mixer: ${error.message || 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }
    return (
        <>
            <AddViewSection title="Add New Mixer" onClose={onClose} error={error}>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-truck"></i>
                            <span>Basic Information</span>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
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
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-building"></i>
                            <span>Assignment & Status</span>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="assignedPlant">Assigned Plant*</label>
                                <button
                                    type="button"
                                    onClick={() => setIsPlantModalOpen(true)}
                                    aria-label="Select assigned plant"
                                >
                                    {plantDisplayText}
                                </button>
                            </div>
                            <div className="form-group">
                                <label htmlFor="status">Status</label>
                                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                                    <option value="">Select status</option>
                                    <option value="Spare">Spare</option>
                                    <option value="In Shop">In Shop</option>
                                    <option value="Retired">Retired</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Mixer'}
                        </button>
                    </div>
                </form>
            </AddViewSection>
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    onSelect={(code) => {
                        setAssignedPlant(code)
                        setIsPlantModalOpen(false)
                    }}
                    plants={visiblePlants}
                />
            )}
        </>
    )
}
export default MixerAddView
