import React, { useState } from 'react'

import DetailViewSection from '../../app/components/sections/DetailViewSection'
import { PlantService } from '../../services/PlantService'
/** Detail/edit view for a single plant record. Supports renaming, saving, and deletion. */
function PlantsDetailView({ plant, onClose, onDelete }) {
    const [plantName, setPlantName] = useState(plant.plant_name || plant.plantName || '')
    const plantCode = plant.plant_code || plant.plantCode || ''
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    async function handleSave() {
        setIsSaving(true)
        setMessage('')
        try {
            await PlantService.updatePlant(plantCode, plantName)
            setMessage('Changes saved')
            setTimeout(() => setMessage(''), 2000)
        } catch {
            setMessage('Error saving changes')
            setTimeout(() => setMessage(''), 2000)
        } finally {
            setIsSaving(false)
        }
    }
    async function handleDelete() {
        try {
            await PlantService.deletePlant(plantCode)
            if (onDelete) {
                onDelete(plantCode)
            } else {
                onClose()
            }
        } catch {
            setMessage('Failed to delete plant')
            setTimeout(() => setMessage(''), 2000)
        }
    }
    return (
        <DetailViewSection
            title={plantName || 'Plant Details'}
            subtitle={plantCode}
            icon="fas fa-industry"
            onClose={onClose}
            onBack={onClose}
            isSaving={isSaving}
            message={message}
            footerActions={
                <>
                    <button
                        className="global-button-secondary"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        <i className="fas fa-save"></i>
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                        className="global-button-secondary"
                        onClick={() => setShowDeleteConfirmation(true)}
                        disabled={isSaving}
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        <i className="fas fa-trash-alt"></i>
                        <span>Delete</span>
                    </button>
                </>
            }
            showDeleteConfirmation={showDeleteConfirmation}
            onDeleteConfirm={handleDelete}
            onDeleteCancel={() => setShowDeleteConfirmation(false)}
            deleteTitle="Delete Plant"
            deleteMessage={`Are you sure you want to delete plant ${plantCode}? This action cannot be undone.`}
        >
            <DetailViewSection.Section id="info" title="Plant Information" icon="fas fa-industry">
                <DetailViewSection.Card title="Basic Information" icon="fas fa-id-card">
                    <div className="form-group">
                        <label>Plant Code</label>
                        <input type="text" className="form-control" value={plantCode} disabled />
                    </div>
                    <div className="form-group">
                        <label>Plant Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={plantName}
                            onChange={(e) => setPlantName(e.target.value)}
                        />
                    </div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
        </DetailViewSection>
    )
}
export default PlantsDetailView
