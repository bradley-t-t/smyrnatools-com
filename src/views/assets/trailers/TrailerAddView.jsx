import React, { useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import Trailer from '../../../models/trailers/Trailer'
import { TrailerService } from '../../../services/TrailerService'
/**
 * Slide-in form for creating a new trailer record. Requires trailer number
 * and plant assignment. Supports trailer type selection (Cement/Aggregate/Flat Bed)
 * and initial cleanliness rating.
 */
function TrailerAddView({ plants, onClose, onTrailerAdded }) {
    const [trailerNumber, setTrailerNumber] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [trailerType, setTrailerType] = useState('Cement')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [cleanlinessRating, setCleanlinessRating] = useState(1)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    useEffect(() => {
        async function loadTrailers() {
            try {
                await TrailerService.fetchTrailers()
            } catch (error) {}
        }
        loadTrailers()
    }, [])
    const visiblePlants = useMemo(() => {
        const list = Array.isArray(plants) ? plants : []
        return list
            .slice()
            .sort(
                (a, b) =>
                    parseInt(a.plantCode?.replace(/\D/g, '') || '0') - parseInt(b.plantCode?.replace(/\D/g, '') || '0')
            )
    }, [plants])
    const selectedPlantObj = visiblePlants.find((p) => p.plantCode === assignedPlant)
    const plantDisplayText = assignedPlant
        ? `(${selectedPlantObj?.plantCode}) ${selectedPlantObj?.plantName}`
        : 'Select Plant'
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!trailerNumber) return setError('Trailer number is required')
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
            const newTrailer = new Trailer({
                assigned_plant: assignedPlant,
                assigned_tractor: null,
                cleanliness_rating: cleanlinessRating,
                created_at: now,
                trailer_number: trailerNumber,
                trailer_type: trailerType,
                updated_at: now,
                updated_by: userId,
                updated_last: now
            })
            const savedTrailer = await TrailerService.createTrailer(newTrailer, userId)
            if (!savedTrailer) throw new Error('Failed to add trailer - no data returned from server')
            onTrailerAdded(savedTrailer)
            onClose()
        } catch (error) {
            setError(`Failed to add trailer: ${error.message || 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }
    return (
        <>
            <AddViewSection title="Add New Trailer" onClose={onClose} error={error}>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-trailer"></i>
                            <span>Basic Information</span>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="trailerNumber">Trailer Number*</label>
                                <input
                                    id="trailerNumber"
                                    type="text"
                                    value={trailerNumber}
                                    onChange={(e) => setTrailerNumber(e.target.value)}
                                    placeholder="Enter trailer number"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-building"></i>
                            <span>Assignment & Type</span>
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
                                <label htmlFor="trailerType">Trailer Type</label>
                                <select
                                    id="trailerType"
                                    value={trailerType}
                                    onChange={(e) => setTrailerType(e.target.value)}
                                >
                                    <option value="Cement">Cement</option>
                                    <option value="End Dump">End Dump</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-star"></i>
                            <span>Condition</span>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="cleanlinessRating">Cleanliness Rating</label>
                                <select
                                    id="cleanlinessRating"
                                    value={cleanlinessRating}
                                    onChange={(e) => setCleanlinessRating(Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <option key={rating} value={rating}>
                                            {rating} Star{rating > 1 ? 's' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Trailer'}
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
export default TrailerAddView
