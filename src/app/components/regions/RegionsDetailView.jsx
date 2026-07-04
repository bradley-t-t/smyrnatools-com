/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useState } from 'react'

import { PlantService } from '../../../services/PlantService'
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
    const [plantDistricts, setPlantDistricts] = useState({})
    const [allPlants, setAllPlants] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [plantQuery, setPlantQuery] = useState('')
    const [newDistrictName, setNewDistrictName] = useState('')
    const [districtNames, setDistrictNames] = useState([])
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
                regionPlants = await PlantService.fetchRegionPlants(regionCode)
            } catch {
                regionPlants = []
            }
            setAllPlants(normalizedAll)
            const validPlants = Array.isArray(regionPlants) ? regionPlants : []
            setPlantCodes(
                validPlants
                    .map((p) => p.plant_code || p.plantCode)
                    .filter((code) => !!code && normalizedAll.some((ap) => ap.plant_code === code))
            )
            const districts = {}
            validPlants.forEach((p) => {
                const code = p.plant_code || p.plantCode
                if (code && Array.isArray(p.districts) && p.districts.length) districts[code] = p.districts
            })
            setPlantDistricts(districts)
            setDistrictNames([...new Set(Object.values(districts).flat())])
            setPlantQuery('')
            setLoading(false)
        }
        fetchPlants()
    }, [region, regionCode])
    const handleSave = async () => {
        setSaving(true)
        setMessage('')
        try {
            await PlantService.updateRegion(regionCode, regionName, plantCodes, regionType, plantDistricts)
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
            await PlantService.deleteRegion(regionCode)
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
    const clearAllSelected = () => {
        setPlantCodes([])
        setPlantDistricts({})
        setDistrictNames([])
    }
    const removeChip = (code) => {
        setPlantCodes((prev) => prev.filter((c) => c !== code))
        setPlantDistricts((prev) => {
            const next = { ...prev }
            delete next[code]
            return next
        })
    }
    const allDistrictNames = [...new Set([...districtNames, ...Object.values(plantDistricts).flat()])]
    const addDistrictToPlant = (plantCode, districtName) => {
        if (!districtName?.trim()) return
        setPlantDistricts((prev) => {
            const current = prev[plantCode] || []
            if (current.includes(districtName.trim())) return prev
            return { ...prev, [plantCode]: [...current, districtName.trim()] }
        })
    }
    const removeDistrictFromPlant = (plantCode, districtName) => {
        setPlantDistricts((prev) => {
            const current = (prev[plantCode] || []).filter((d) => d !== districtName)
            if (!current.length) {
                const next = { ...prev }
                delete next[plantCode]
                return next
            }
            return { ...prev, [plantCode]: current }
        })
    }
    const addNewDistrict = () => {
        const name = newDistrictName.trim()
        if (!name || allDistrictNames.includes(name)) return
        setDistrictNames((prev) => [...prev, name])
        setNewDistrictName('')
    }
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
                    <button type="button"
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover active:scale-[0.97] disabled:active:scale-100"
                        onClick={handleSave}
                        disabled={saving || loading}
                    >
                        <i className="fas fa-save"></i>
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button type="button"
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover active:scale-[0.97] disabled:active:scale-100"
                        onClick={() => setShowDeleteConfirmation(true)}
                        disabled={saving || loading}
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
                    <div className="flex flex-col gap-1.5">
                        <label>Region Code</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                            value={regionCode}
                            disabled
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Region Name</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                            value={regionName}
                            onChange={(e) => setRegionName(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Type</label>
                        <div className="relative">
                            <select
                                className="w-full appearance-none cursor-pointer rounded-xl border border-border-light bg-bg-secondary pl-4 pr-10 py-3 text-sm text-text-primary outline-none transition-colors hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
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
                            <i
                                aria-hidden="true"
                                className="fas fa-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary"
                            />
                        </div>
                    </div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            <DetailViewSection.Section id="plants" title="Assigned Plants" icon="fas fa-industry">
                <DetailViewSection.Card title={`Plants (${plantCodes.length} selected)`} icon="fas fa-sitemap">
                    {noPlantsAvailable ? (
                        <div className="text-text-secondary text-sm py-4 text-center">
                            No plants available. Please add plants to the system.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {plantCodes.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {plantCodes.map((code) => {
                                        const p = visiblePlants.find((pl) => pl.plant_code === code)
                                        return (
                                            <span
                                                key={code}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]"
                                            >
                                                <span className="font-bold">{code}</span>
                                                {p?.plant_name && <span className="opacity-80">{p.plant_name}</span>}
                                                <button type="button"
                                                    className="ml-0.5 cursor-pointer bg-transparent border-none text-sm leading-none opacity-70 hover:opacity-100 active:scale-[0.97] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                                                    onClick={() => removeChip(code)}
                                                    aria-label={`Remove ${code}`}
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        )
                                    })}
                                    <button type="button"
                                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border border-border-light bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                        onClick={clearAllSelected}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <i
                                        aria-hidden="true"
                                        className="fas fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary"
                                    />
                                    <input
                                        type="search"
                                        className="w-full rounded-xl border border-border-light bg-bg-secondary pl-10 pr-10 py-3 text-sm text-text-primary outline-none transition-colors hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 [&::-webkit-search-cancel-button]:hidden"
                                        placeholder="Search by code or name"
                                        value={plantQuery}
                                        onChange={(e) => setPlantQuery(e.target.value)}
                                        aria-label="Search plants"
                                    />
                                    {plantQuery && (
                                        <button type="button"
                                            aria-label="Clear plant search"
                                            onClick={() => setPlantQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
                                        >
                                            <i className="fas fa-times text-[10px]" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-text-secondary whitespace-nowrap">
                                    {filteredPlants.length} results
                                </span>
                                <button type="button"
                                    className="flex items-center gap-2 rounded-xl border border-border-light bg-bg-primary px-3 py-2 text-[13px] font-semibold text-text-primary whitespace-nowrap transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover active:scale-[0.97] disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={selectAllFiltered}
                                    disabled={!filteredPlants.length}
                                >
                                    Select All
                                </button>
                            </div>
                            <div
                                className="border border-border-light rounded-[10px] max-h-[280px] overflow-y-auto bg-bg-primary"
                                role="listbox"
                                aria-label="All plants"
                                aria-multiselectable="true"
                            >
                                {filteredPlants.map((p) => {
                                    const isSelected = plantCodes.includes(p.plant_code)
                                    return (
                                        <label
                                            key={p.plant_code}
                                            role="option"
                                            aria-selected={isSelected}
                                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-150 border-b border-border-light hover:bg-bg-tertiary ${isSelected ? 'bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)]' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => togglePlant(p.plant_code)}
                                                className="size-4 rounded border-border-medium"
                                                aria-label={`Toggle ${p.plant_code}`}
                                            />
                                            <span className="font-bold text-sm text-text-primary">{p.plant_code}</span>
                                            <span className="text-sm text-text-secondary">{p.plant_name}</span>
                                        </label>
                                    )
                                })}
                                {!filteredPlants.length && (
                                    <div className="text-text-secondary text-sm py-4 text-center">No matches</div>
                                )}
                            </div>
                        </div>
                    )}
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            {plantCodes.length > 0 && (
                <DetailViewSection.Section id="districts" title="Districts" icon="fas fa-layer-group">
                    <DetailViewSection.Card title={`Districts (${allDistrictNames.length})`} icon="fas fa-object-group">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    className="flex-1 w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                                    placeholder="New district name..."
                                    value={newDistrictName}
                                    onChange={(e) => setNewDistrictName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addNewDistrict()
                                        }
                                    }}
                                />
                                <button type="button"
                                    className="flex items-center gap-1 rounded-xl border border-border-light bg-bg-primary px-3 py-2 text-[13px] font-semibold text-text-primary whitespace-nowrap transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover active:scale-[0.97] disabled:active:scale-100"
                                    onClick={addNewDistrict}
                                    disabled={
                                        !newDistrictName.trim() || allDistrictNames.includes(newDistrictName.trim())
                                    }
                                >
                                    <i className="fas fa-plus mr-1" />
                                    Add District
                                </button>
                            </div>
                            {allDistrictNames.length === 0 ? (
                                <div className="text-text-secondary text-sm py-4 text-center">
                                    No districts defined. Add a district to group plants.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {allDistrictNames.sort().map((districtName) => {
                                        const districtPlantCodes = plantCodes.filter((code) =>
                                            plantDistricts[code]?.includes(districtName)
                                        )
                                        const unassignedPlants = plantCodes.filter(
                                            (code) => !plantDistricts[code]?.includes(districtName)
                                        )
                                        return (
                                            <div
                                                key={districtName}
                                                className="border border-border-light rounded-[10px] overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between px-4 py-3 bg-bg-tertiary border-b border-border-light">
                                                    <span className="text-sm font-semibold text-text-primary">
                                                        <i className="fas fa-layer-group mr-2 text-xs text-text-secondary" />
                                                        {districtName}
                                                    </span>
                                                    <span className="text-xs text-text-secondary">
                                                        {districtPlantCodes.length} plant
                                                        {districtPlantCodes.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-2 px-4 py-3">
                                                    {districtPlantCodes.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {districtPlantCodes.map((code) => {
                                                                const p = visiblePlants.find(
                                                                    (pl) => pl.plant_code === code
                                                                )
                                                                return (
                                                                    <span
                                                                        key={code}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]"
                                                                    >
                                                                        <span className="font-bold">{code}</span>
                                                                        {p?.plant_name && (
                                                                            <span className="opacity-80">
                                                                                {p.plant_name}
                                                                            </span>
                                                                        )}
                                                                        <button type="button"
                                                                            className="ml-0.5 cursor-pointer bg-transparent border-none text-sm leading-none opacity-70 hover:opacity-100 active:scale-[0.97] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                                                                            onClick={() =>
                                                                                removeDistrictFromPlant(
                                                                                    code,
                                                                                    districtName
                                                                                )
                                                                            }
                                                                            aria-label={`Remove ${code} from ${districtName}`}
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                    {unassignedPlants.length > 0 && (
                                                        <div className="relative">
                                                            <select
                                                                className="w-full appearance-none cursor-pointer rounded-xl border border-border-light bg-bg-secondary pl-4 pr-10 py-3 text-[13px] text-text-primary outline-none transition-colors hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                                                                value=""
                                                                onChange={(e) => {
                                                                    if (e.target.value)
                                                                        addDistrictToPlant(e.target.value, districtName)
                                                                }}
                                                            >
                                                                <option value="">Add plant to {districtName}...</option>
                                                                {unassignedPlants.map((code) => {
                                                                    const p = visiblePlants.find(
                                                                        (pl) => pl.plant_code === code
                                                                    )
                                                                    return (
                                                                        <option key={code} value={code}>
                                                                            ({code}) {p?.plant_name || ''}
                                                                        </option>
                                                                    )
                                                                })}
                                                            </select>
                                                            <i
                                                                aria-hidden="true"
                                                                className="fas fa-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
            )}
        </DetailViewSection>
    )
}
export default RegionsDetailView
