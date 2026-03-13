import React, { useState } from 'react'

import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { PlantService } from '../../../services/PlantService'
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
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <i className="fas fa-save"></i>
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                        onClick={() => setShowDeleteConfirmation(true)}
                        disabled={isSaving}
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
                    <div className="flex flex-col gap-1.5">
                        <label>Plant Code</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            value={plantCode}
                            disabled
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Plant Name</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
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
