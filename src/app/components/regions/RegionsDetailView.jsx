import React, { useEffect, useState } from 'react'

import { PlantService } from '../../../services/PlantService'
import { RegionService } from '../../../services/RegionService'
import DetailViewSection from '../sections/DetailViewSection'
/**
 * Detail/edit view for a single region.
 * Allows editing the region name, type, and associated plants via a searchable plant picker.
 * Supports save, cancel, and delete actions.
 * @param {Object} props
 * @param {Object} props.region - Region object with region_code, region_name, and type.
 * @param {Function} props.onClose - Navigates back to the region list.
 * @param {Function} [props.onDelete] - Called with the region code after deletion.
 * @param {Function} [props.onUpdate] - Called with region code and updated name after save.
 */
function RegionsDetailView({ region, onClose, onDelete, onUpdate }) {
    const [regionName, setRegionName] = useState(region.region_name || region.regionName || '')
    const [regionType, setRegionType] = useState(region.type || region.region_type || '')
    const [plantCodes, setPlantCodes] = useState([])
    const [allPlants, setAllPlants] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [plantQuery, setPlantQuery] = useState('')
    const regionCode = region.region_code || region.regionCode
    useEffect(() => {
        setLoading(true)
        async function fetchPlants() {
            let normalizedAll = []
            let regionPlants
            try {
                const rawPlants = await PlantService.fetchAllPlants()
                const arr = Array.isArray(rawPlants) ? rawPlants : []
                const tmp = arr
                    .map((p) => {
                        const code = String(p.plant_code ?? p.plantCode ?? '').trim()
                        const name = String(p.plant_name ?? p.plantName ?? '').trim()
                        return code && name ? { plant_code: code, plant_name: name } : null
                    })
                    .filter(Boolean)
                const seen = new Set()
                normalizedAll = tmp.filter((p) => {
                    if (seen.has(p.plant_code)) return false
                    seen.add(p.plant_code)
                    return true
                })
            } catch {
                normalizedAll = []
            }
            try {
                regionPlants = await RegionService.fetchRegionPlants(regionCode)
            } catch {
                regionPlants = []
            }
            setAllPlants(normalizedAll)
            setPlantCodes(
                Array.isArray(regionPlants)
                    ? regionPlants
                          .map((p) => p.plant_code || p.plantCode)
                          .filter((code) => !!code && normalizedAll.some((ap) => ap.plant_code === code))
                    : []
            )
            setPlantQuery('')
            setLoading(false)
        }
        fetchPlants()
    }, [region])
    const handleSave = async () => {
        setSaving(true)
        setMessage('')
        try {
            await RegionService.updateRegion(regionCode, regionName, plantCodes, regionType)
            setMessage('Changes saved')
            if (onUpdate) onUpdate(regionCode, regionName)
            setTimeout(() => setMessage(''), 2000)
        } catch {
            setMessage('Error saving changes')
            setTimeout(() => setMessage(''), 2000)
        } finally {
            setSaving(false)
        }
    }
    const handleDelete = async () => {
        try {
            await RegionService.deleteRegion(regionCode)
            if (onDelete) onDelete(regionCode)
            else onClose()
        } catch {
            setMessage('Failed to delete region')
            setTimeout(() => setMessage(''), 2000)
        }
    }
    const visiblePlants = Array.isArray(allPlants) ? allPlants : []
    const filteredPlants = visiblePlants.filter((p) => {
        const q = plantQuery.trim().toLowerCase()
        if (!q) return true
        return p.plant_code.toLowerCase().includes(q) || (p.plant_name || '').toLowerCase().includes(q)
    })
    const togglePlant = (code) => {
        setPlantCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
    }
    const selectAllFiltered = () => {
        if (!filteredPlants.length) return
        const codes = filteredPlants.map((p) => p.plant_code)
        setPlantCodes((prev) => Array.from(new Set([...prev, ...codes])))
    }
    const clearAllSelected = () => setPlantCodes([])
    const removeChip = (code) => setPlantCodes((prev) => prev.filter((c) => c !== code))
    const noPlantsAvailable = !loading && visiblePlants.length === 0
    return (
        <DetailViewSection
            title={regionName || 'Region Details'}
            subtitle={regionCode}
            icon="fas fa-map-marker-alt"
            onClose={onClose}
            onBack={onClose}
            isSaving={saving}
            message={message}
            isLoading={loading}
            loadingMessage="Loading region details..."
            footerActions={
                <>
                    <button
                        className="global-button-secondary"
                        onClick={handleSave}
                        disabled={saving || loading}
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        <i className="fas fa-save"></i>
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                        className="global-button-secondary"
                        onClick={() => setShowDeleteConfirmation(true)}
                        disabled={saving || loading}
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
            deleteTitle="Delete Region"
            deleteMessage={`Are you sure you want to delete region ${regionCode}? This action cannot be undone.`}
        >
            <DetailViewSection.Section id="info" title="Region Information" icon="fas fa-map-marker-alt">
                <DetailViewSection.Card title="Basic Information" icon="fas fa-id-card">
                    <div className="form-group">
                        <label>Region Code</label>
                        <input type="text" className="form-control" value={regionCode} disabled />
                    </div>
                    <div className="form-group">
                        <label>Region Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={regionName}
                            onChange={(e) => setRegionName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select
                            className="form-control"
                            value={regionType}
                            onChange={(e) => setRegionType(e.target.value)}
                        >
                            <option value="" disabled>
                                Select type
                            </option>
                            <option value="Concrete">Concrete</option>
                            <option value="Aggregate">Aggregate</option>
                            <option value="Office">Office</option>
                        </select>
                    </div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            <DetailViewSection.Section id="plants" title="Assigned Plants" icon="fas fa-industry">
                <DetailViewSection.Card title={`Plants (${plantCodes.length} selected)`} icon="fas fa-sitemap">
                    {noPlantsAvailable ? (
                        <div
                            style={{
                                color: 'var(--text-secondary)',
                                fontSize: 14,
                                padding: '16px 0',
                                textAlign: 'center'
                            }}
                        >
                            No plants available. Please add plants to the system.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {plantCodes.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {plantCodes.map((code) => {
                                        const p = visiblePlants.find((pl) => pl.plant_code === code)
                                        return (
                                            <span
                                                key={code}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700"
                                            >
                                                <span className="font-bold">{code}</span>
                                                {p?.plant_name && <span className="text-blue-500">{p.plant_name}</span>}
                                                <button
                                                    type="button"
                                                    className="ml-0.5 text-blue-400 hover:text-blue-600 cursor-pointer bg-transparent border-none text-sm leading-none"
                                                    onClick={() => removeChip(code)}
                                                    aria-label={`Remove ${code}`}
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        )
                                    })}
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 cursor-pointer hover:bg-slate-200"
                                        onClick={clearAllSelected}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by code or name"
                                    value={plantQuery}
                                    onChange={(e) => setPlantQuery(e.target.value)}
                                    aria-label="Search plants"
                                    style={{ flex: 1 }}
                                />
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                    {filteredPlants.length} results
                                </span>
                                <button
                                    type="button"
                                    className="global-button-secondary"
                                    onClick={selectAllFiltered}
                                    disabled={!filteredPlants.length}
                                    style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '8px 12px' }}
                                >
                                    Select All
                                </button>
                            </div>
                            <div
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 10,
                                    maxHeight: 280,
                                    overflowY: 'auto'
                                }}
                                role="listbox"
                                aria-label="All plants"
                            >
                                {filteredPlants.map((p) => {
                                    const isSelected = plantCodes.includes(p.plant_code)
                                    return (
                                        <label
                                            key={p.plant_code}
                                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => togglePlant(p.plant_code)}
                                                className="size-4 rounded border-slate-300"
                                                aria-label={`Toggle ${p.plant_code}`}
                                            />
                                            <span className="font-bold text-sm text-slate-700">{p.plant_code}</span>
                                            <span className="text-sm text-slate-500">{p.plant_name}</span>
                                        </label>
                                    )
                                })}
                                {!filteredPlants.length && (
                                    <div
                                        style={{
                                            color: 'var(--text-secondary)',
                                            fontSize: 14,
                                            padding: '16px 0',
                                            textAlign: 'center'
                                        }}
                                    >
                                        No matches
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DetailViewSection.Card>
            </DetailViewSection.Section>
        </DetailViewSection>
    )
}
export default RegionsDetailView
