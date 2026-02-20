import React, { useState } from 'react'

import { RegionService } from '../../../services/RegionService'
import AddViewSection from '../sections/AddViewSection'

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
            await RegionService.createRegion(regionCode, regionName, regionType)
            const allRegions = await RegionService.fetchRegions()
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
