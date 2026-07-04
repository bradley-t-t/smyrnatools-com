import React, { useEffect, useState } from 'react'

import PlantPickerField from '../../../app/components/common/PlantPickerField'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import usePlantPicker from '../../../app/hooks/usePlantPicker'
import Trailer from '../../../app/models/trailers/Trailer'
import { getSessionUserId } from '../../../services/SessionService'
import { TrailerService } from '../../../services/TrailerService'
import DateUtility from '../../../utils/DateUtility'

// Theme-aware native <select> styling. `appearance-none` strips the browser
// chevron so the inline-SVG (uses `currentColor`, so it follows --text-primary
// across dark/light/grayed themes) renders consistently. Matches the input
// height ladder and focus treatment used elsewhere in the add-view forms.
const SELECT_CLS =
    'h-11 w-full cursor-pointer rounded-xl bg-bg-secondary border border-border-light text-text-primary text-sm px-4 pr-10 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem_1rem] bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2024%2024%27%20stroke%3D%27currentColor%27%3E%3Cpath%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27M19%209l-7%207-7-7%27%2F%3E%3C%2Fsvg%3E")] hover:border-border-medium focus:outline-none focus-visible:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 [color-scheme:light] dark:[color-scheme:dark]'

/**
 * Slide-in form for creating a new trailer record. Requires trailer number
 * and plant assignment. Supports type selection (Cement/End Dump) and an
 * initial cleanliness rating.
 */
function TrailerAddView({ plants, onClose, onTrailerAdded }) {
    const [trailerNumber, setTrailerNumber] = useState('')
    const [trailerType, setTrailerType] = useState('Cement')
    const [cleanlinessRating, setCleanlinessRating] = useState(1)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const picker = usePlantPicker({ plants })

    useEffect(() => {
        TrailerService.fetchTrailers().catch((e) => console.error('Failed to prefetch trailers:', e))
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!trailerNumber) return setError('Trailer number is required')
        if (!picker.assignedPlant) return setError('Plant is required')
        setIsSaving(true)
        try {
            const userId = getSessionUserId()
            if (!userId) throw new Error('User ID not available. Please log in again.')
            const now = DateUtility.formatDateForDb(new Date())
            const newTrailer = new Trailer({
                assigned_plant: picker.assignedPlant,
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
        } catch (err) {
            setError(`Failed to add trailer: ${err.message || 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AddViewSection title="Add New Trailer" onClose={onClose} error={error}>
            <form onSubmit={handleSubmit} autoComplete="off">
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-trailer"></i>
                        <span>Basic Information</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
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
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-building"></i>
                        <span>Assignment & Type</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PlantPickerField {...picker} />
                        <div className="flex flex-col gap-1">
                            <label htmlFor="trailerType">Trailer Type</label>
                            <select
                                id="trailerType"
                                value={trailerType}
                                onChange={(e) => setTrailerType(e.target.value)}
                                className={SELECT_CLS}
                            >
                                <option value="Cement">Cement</option>
                                <option value="End Dump">End Dump</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="text-lg font-semibold">
                        <i className="fas fa-star"></i>
                        <span>Condition</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="cleanlinessRating">Cleanliness Rating</label>
                            <select
                                id="cleanlinessRating"
                                value={cleanlinessRating}
                                onChange={(e) => setCleanlinessRating(Number(e.target.value))}
                                className={SELECT_CLS}
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
                <div className="flex justify-end gap-3 pt-4">
                    <button type="submit" disabled={isSaving}>
                        {isSaving ? 'Adding...' : 'Add Trailer'}
                    </button>
                </div>
            </form>
        </AddViewSection>
    )
}

export default TrailerAddView
