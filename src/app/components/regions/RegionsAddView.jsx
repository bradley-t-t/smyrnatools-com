import React, { useState } from 'react'

import { PlantService } from '../../../services/PlantService'
import AddViewSection from '../sections/AddViewSection'

// Theme-aware native <select> styling. `appearance-none` strips the browser
// chevron so the inline-SVG (uses `currentColor`, so it follows --text-primary
// across dark/light/grayed themes) renders consistently. Matches the input
// height ladder and focus treatment used elsewhere in the add-view forms.
const SELECT_CLS =
    'h-11 w-full cursor-pointer rounded-xl bg-bg-secondary border border-border-light text-text-primary text-sm px-4 pr-10 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem_1rem] bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2024%2024%27%20stroke%3D%27currentColor%27%3E%3Cpath%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27M19%209l-7%207-7-7%27%2F%3E%3C%2Fsvg%3E")] hover:border-border-medium focus:outline-none focus-visible:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 [color-scheme:light] dark:[color-scheme:dark]'

/**
 * Modal form for creating a new region with code, name, and type fields.
 * Validates required fields and handles duplicate key errors gracefully.
 * @param {Object} props
 * @param {Function} props.onClose - Closes the add view.
 * @param {Function} props.onRegionAdded - Called with the new region after successful creation.
 */
function RegionsAddView({ onClose, onRegionAdded }) {
    const [regionCode, setRegionCode] = useState('')
    const [regionName, setRegionName] = useState('')
    const [regionType, setRegionType] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!regionCode) return setError('Region code is required')
        if (!regionName) return setError('Region name is required')
        if (!regionType) return setError('Region type is required')
        setIsSaving(true)
        try {
            await PlantService.createRegion(regionCode, regionName, regionType)
            const allRegions = await PlantService.fetchRegions()
            const newRegion = allRegions.find((r) => (r.region_code || r.regionCode) === regionCode.trim())
            if (newRegion) {
                onRegionAdded(newRegion)
            } else {
                onRegionAdded({
                    region_code: regionCode.trim(),
                    region_name: regionName.trim(),
                    type: regionType
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
                    'A region with this code already exists, or there was a database error. Please check for leading/trailing spaces or try a different code.'
                )
            } else {
                setError(`Failed to add region: ${err.message || 'Unknown error'}`)
            }
        } finally {
            setIsSaving(false)
        }
    }
    return (
        <AddViewSection title="Add New Region" onClose={onClose} error={error}>
            <form onSubmit={handleSubmit} autoComplete="off">
                <div className="form-section">
                    <div className="form-section-title">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>Region Information</span>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="regionCode">Region Code*</label>
                            <input
                                id="regionCode"
                                type="text"
                                value={regionCode}
                                onChange={(e) => setRegionCode(e.target.value)}
                                placeholder="Enter region code"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="regionName">Region Name*</label>
                            <input
                                id="regionName"
                                type="text"
                                value={regionName}
                                onChange={(e) => setRegionName(e.target.value)}
                                placeholder="Enter region name"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="regionType">Type*</label>
                            <select
                                id="regionType"
                                value={regionType}
                                onChange={(e) => setRegionType(e.target.value)}
                                required
                                className={SELECT_CLS}
                            >
                                <option value="" disabled>
                                    Select type
                                </option>
                                <option value="Concrete">Concrete</option>
                                <option value="Aggregate">Aggregate</option>
                                <option value="Office">Office</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                    <button type="submit" disabled={isSaving}>
                        {isSaving ? 'Adding...' : 'Add Region'}
                    </button>
                </div>
            </form>
        </AddViewSection>
    )
}
export default RegionsAddView
