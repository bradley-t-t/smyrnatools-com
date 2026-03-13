import React, { useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { PickupTruckService } from '../../../services/PickupTruckService'
import { PlantService } from '../../../services/PlantService'
/**
 * Slide-in form for creating a new pickup truck record. Supports VIN
 * (with I/O/Q letter stripping), make, model, year, assigned person,
 * mileage, comments, region-scoped plant assignment, and status selection.
 *
 * @param {Function} onClose - Callback to dismiss the add view.
 * @param {Function} [onAdded] - Callback with the newly created pickup record.
 */
function PickupTrucksAddView({ onClose, onAdded }) {
    const { preferences } = usePreferences()
    const [vin, setVin] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [assigned, setAssigned] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('Active')
    const [mileage, setMileage] = useState('')
    const [comments, setComments] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [plants, setPlants] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    useEffect(() => {
        let cancelled = false
        async function loadPlants() {
            try {
                const data = await PlantService.fetchPlants()
                if (!cancelled) setPlants(Array.isArray(data) ? data : [])
            } catch {
                if (!cancelled) setPlants([])
            }
        }
        loadPlants()
        return () => {
            cancelled = true
        }
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
                const regionPlants = await PlantService.fetchRegionPlants(code)
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
    const sortedFilteredPlants = useMemo(() => {
        const list = plants
        const filtered =
            !preferences.selectedRegion?.code || !regionPlantCodes
                ? list
                : list.filter((p) =>
                      regionPlantCodes.has(
                          String(p.plantCode || p.plant_code || '')
                              .trim()
                              .toUpperCase()
                      )
                  )
        return filtered
            .slice()
            .sort(
                (a, b) =>
                    parseInt(String(a.plantCode || a.plant_code || '').replace(/\D/g, '') || '0') -
                    parseInt(String(b.plantCode || b.plant_code || '').replace(/\D/g, '') || '0')
            )
    }, [plants, regionPlantCodes, preferences.selectedRegion?.code])
    const selectedPlantObj = sortedFilteredPlants.find((p) => (p.plantCode || p.plant_code) === assignedPlant)
    const plantDisplayText = assignedPlant
        ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name}`
        : 'Select Plant'
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!assignedPlant) {
            setError('Assigned plant is required')
            return
        }
        setIsSaving(true)
        try {
            const userId = sessionStorage.getItem('userId')
            if (!userId) throw new Error('User ID not available. Please log in again.')
            const payload = {
                assigned: assigned || null,
                assignedPlant: assignedPlant || null,
                assigned_plant: assignedPlant || null,
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
        <>
            <AddViewSection title="Add Pickup Truck" onClose={onClose} error={error}>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="space-y-4">
                        <div className="text-lg font-semibold">
                            <i className="fas fa-building"></i>
                            <span>Assignment & Status</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label>Plant*</label>
                                <button
                                    type="button"
                                    onClick={() => setIsPlantModalOpen(true)}
                                    aria-label="Select plant"
                                >
                                    {plantDisplayText}
                                </button>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label>Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
                                <span className="text-xs text-gray-500">Letters I, O, and Q are not used.</span>
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
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    onSelect={(code) => {
                        setAssignedPlant(code)
                        setIsPlantModalOpen(false)
                    }}
                    plants={sortedFilteredPlants}
                />
            )}
        </>
    )
}
export default PickupTrucksAddView
