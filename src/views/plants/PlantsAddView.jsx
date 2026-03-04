import React, { useState } from 'react'

import AddViewSection from '../../app/components/sections/AddViewSection'
import { PlantService } from '../../services/PlantService'

/** Slide-in form for creating a new plant record with a unique plant code and name. */
function PlantsAddView({ onClose, onPlantAdded }) {
    const [plantCode, setPlantCode] = useState('')
    const [plantName, setPlantName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!plantCode) return setError('Plant code is required')
        if (!plantName) return setError('Plant name is required')
        setIsSaving(true)
        try {
            await PlantService.createPlant(plantCode, plantName)
            const allPlants = await PlantService.fetchPlants()
            const newPlant = allPlants.find((p) => (p.plant_code || p.plantCode) === plantCode.trim())
            if (newPlant) {
                onPlantAdded(newPlant)
            } else {
                onPlantAdded({
                    plant_code: plantCode.trim(),
                    plant_name: plantName.trim()
                })
            }
            onClose()
        } catch (err) {
            if (
                err?.message &&
                (err.message.includes('duplicate key value') ||
                    (err.details && err.details.includes('duplicate key value')))
            ) {
                setError(
                    'A plant with this code already exists, or there was a database error. Please check for leading/trailing spaces or try a different code.'
                )
            } else {
                setError(`Failed to add plant: ${err.message || 'Unknown error'}`)
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AddViewSection title="Add New Plant" onClose={onClose} error={error}>
            <form onSubmit={handleSubmit} autoComplete="off">
                <div className="form-section">
                    <div className="form-section-title">
                        <i className="fas fa-building"></i>
                        <span>Plant Information</span>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="plantCode">Plant Code*</label>
                            <input
                                id="plantCode"
                                type="text"
                                value={plantCode}
                                onChange={(e) => setPlantCode(e.target.value)}
                                placeholder="Enter plant code"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="plantName">Plant Name*</label>
                            <input
                                id="plantName"
                                type="text"
                                value={plantName}
                                onChange={(e) => setPlantName(e.target.value)}
                                placeholder="Enter plant name"
                                required
                            />
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                    <button type="submit" disabled={isSaving}>
                        {isSaving ? 'Adding...' : 'Add Plant'}
                    </button>
                </div>
            </form>
        </AddViewSection>
    )
}

export default PlantsAddView
