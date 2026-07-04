/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { PlantService } from '../../../services/PlantService'
import PlantManagersEditor from './PlantManagersEditor'

/**
 * Modal sheet that lets the user attach / remove managers for a single
 * plant directly from `PlantsView` without opening the full detail surface.
 * Owns the draft list locally and persists via `PlantService.updatePlantManagers`
 * on confirm. The parent passes `onSaved(persistedIds)` to update its
 * local plant list once the write lands.
 */
export default function PlantManagersQuickEditModal({ plant, onClose, onSaved }) {
    const plantCode = plant?.plant_code || plant?.plantCode || ''
    const plantName = plant?.plant_name || plant?.plantName || plantCode
    const initialIds = Array.isArray(plant?.manager_user_ids)
        ? plant.manager_user_ids
        : Array.isArray(plant?.managerUserIds)
          ? plant.managerUserIds
          : []
    const [managerIds, setManagerIds] = useState(initialIds)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    /* Lock body scroll while the modal is open so the underlying list
     * doesn't shift behind the overlay. */
    useEffect(() => {
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [])

    useEffect(() => {
        const handleKey = (event) => {
            if (event.key === 'Escape' && !isSaving) onClose?.()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isSaving, onClose])

    const handleSave = async () => {
        if (!plantCode) return
        setIsSaving(true)
        setError('')
        try {
            const persisted = await PlantService.updatePlantManagers(plantCode, managerIds)
            onSaved?.(persisted)
            onClose?.()
        } catch (err) {
            setError(err?.message || 'Failed to save managers')
        } finally {
            setIsSaving(false)
        }
    }

    if (typeof document === 'undefined' || !document.body) return null

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-text-primary/60 px-4 backdrop-blur-sm animate-fade-in-fast motion-reduce:animate-none"
            onClick={() => {
                if (!isSaving) onClose?.()
            }}
        >
            <div
                className="w-full max-w-lg overflow-hidden rounded-modal border border-border-light bg-bg-primary shadow-modal animate-pop-in motion-reduce:animate-none"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="plant-managers-modal-title"
            >
                <div className="flex items-center justify-between gap-3 border-b border-border-light px-5 py-4">
                    <div className="min-w-0">
                        <div
                            id="plant-managers-modal-title"
                            className="truncate font-heading text-base font-semibold text-text-primary"
                        >
                            Managers · {plantName}
                        </div>
                        <div className="truncate text-[12px] text-text-tertiary">{plantCode}</div>
                    </div>
                    <button type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.92] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none"
                        aria-label="Close"
                    >
                        <i className="fas fa-times text-[12px]" aria-hidden="true" />
                    </button>
                </div>
                <div className="px-5 py-4">
                    <PlantManagersEditor managerIds={managerIds} onChange={setManagerIds} disabled={isSaving} />
                    {error && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mt-3 flex items-center gap-2 rounded-card border border-status-danger/35 bg-status-danger/10 px-3 py-2 text-[12px] text-text-primary"
                        >
                            <i className="fas fa-exclamation-circle text-status-danger" aria-hidden="true" />
                            {error}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 border-t border-border-light bg-bg-secondary px-5 py-3">
                    <button type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-md border border-border-light bg-bg-primary px-4 py-2 text-sm font-semibold text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none"
                    >
                        Cancel
                    </button>
                    <button type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-accent-hover hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none"
                    >
                        {isSaving && <i className="fas fa-spinner fa-spin text-[12px]" aria-hidden="true" />}
                        {isSaving ? 'Saving…' : 'Save Managers'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
