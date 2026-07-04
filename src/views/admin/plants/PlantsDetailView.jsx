import React, { useEffect, useMemo, useState } from 'react'

import PlantColocationEditor from '../../../app/components/plants/PlantColocationEditor'
import PlantManagersEditor from '../../../app/components/plants/PlantManagersEditor'
import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { PlantService } from '../../../services/PlantService'

const getInitialManagerIds = (plant) => {
    const raw = plant?.manager_user_ids ?? plant?.managerUserIds
    return Array.isArray(raw) ? raw : []
}

const formatCoordinate = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
    return String(value)
}

/** Detail/edit view for a single plant — name, street address, latitude,
 *  longitude, and the list of attached managers. Save persists every
 *  editable field in one round trip so the dispatcher only sees one
 *  "Saved" flash regardless of which fields changed. */
function PlantsDetailView({ plant, onClose, onDelete }) {
    const plantCode = plant.plant_code || plant.plantCode || ''
    const [plantName, setPlantName] = useState(plant.plant_name || plant.plantName || '')
    const [plantAddress, setPlantAddress] = useState(plant.plant_address || plant.plantAddress || '')
    const [latitudeInput, setLatitudeInput] = useState(formatCoordinate(plant.latitude))
    const [longitudeInput, setLongitudeInput] = useState(formatCoordinate(plant.longitude))
    const [managerIds, setManagerIds] = useState(() => getInitialManagerIds(plant))
    /* Co-location sibling codes the dispatcher has selected. The
     * backend writes a shared `location_group_id` to this plant plus
     * every sibling in one round trip on save. */
    const [siblingPlantCodes, setSiblingPlantCodes] = useState([])
    const [allPlants, setAllPlants] = useState([])
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

    /* Load the full plant list once so the co-location editor can list
     * sibling candidates. Initialize the selected sibling set from BOTH
     * sources of co-location data on this plant:
     *   • Other plant rows sharing the same `location_group_id`
     *   • Phantom alias codes stored on `colocated_alias_codes`
     * The editor treats them as one unified list — the save handler
     * splits them back apart server-side based on whether each code
     * matches an existing plant row.
     *
     * Critically: pull the current plant's state from the FRESH list,
     * not the `plant` prop. The parent (`PlantsView`) caches its own
     * plants array in React state and doesn't refetch when the detail
     * view saves, so the prop can be stale on the next open — which
     * would silently drop any newly-added alias codes from the
     * editor's initial render. */
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const list = await PlantService.fetchAllPlants()
                if (cancelled) return
                setAllPlants(list || [])
                const freshPlant = (list || []).find((p) => (p?.plantCode || p?.plant_code) === plantCode) || plant
                const groupId = freshPlant?.locationGroupId ?? freshPlant?.location_group_id ?? null
                const realSiblings = groupId
                    ? (list || [])
                          .filter((p) => p?.locationGroupId === groupId || p?.location_group_id === groupId)
                          .map((p) => p?.plantCode || p?.plant_code)
                          .filter((code) => code && code !== plantCode)
                    : []
                const aliasCodes = Array.isArray(freshPlant?.colocatedAliasCodes)
                    ? freshPlant.colocatedAliasCodes
                    : Array.isArray(freshPlant?.colocated_alias_codes)
                      ? freshPlant.colocated_alias_codes
                      : []
                const merged = Array.from(new Set([...realSiblings, ...aliasCodes].filter(Boolean)))
                setSiblingPlantCodes(merged)
            } catch {
                if (!cancelled) setAllPlants([])
            }
        })()
        return () => {
            cancelled = true
        }
    }, [plantCode, plant])

    const candidateSiblings = useMemo(
        () =>
            (allPlants || [])
                .filter((p) => (p?.plantCode || p?.plant_code) && (p?.plantCode || p?.plant_code) !== plantCode)
                .map((p) => ({
                    plantCode: p?.plantCode || p?.plant_code,
                    plantName: p?.plantName || p?.plant_name || ''
                }))
                .sort((a, b) => a.plantCode.localeCompare(b.plantCode)),
        [allPlants, plantCode]
    )

    const parseCoordinateInput = (raw) => {
        const trimmed = String(raw ?? '').trim()
        if (trimmed === '') return null
        const num = parseFloat(trimmed)
        if (!Number.isFinite(num)) return undefined
        return num
    }

    async function handleSave() {
        setIsSaving(true)
        setMessage('')
        const latitude = parseCoordinateInput(latitudeInput)
        const longitude = parseCoordinateInput(longitudeInput)
        if (latitude === undefined) {
            setMessage('Latitude must be a number between -90 and 90 (or blank).')
            setIsSaving(false)
            setTimeout(() => setMessage(''), 2500)
            return
        }
        if (longitude === undefined) {
            setMessage('Longitude must be a number between -180 and 180 (or blank).')
            setIsSaving(false)
            setTimeout(() => setMessage(''), 2500)
            return
        }
        if (latitude !== null && (latitude < -90 || latitude > 90)) {
            setMessage('Latitude must be between -90 and 90.')
            setIsSaving(false)
            setTimeout(() => setMessage(''), 2500)
            return
        }
        if (longitude !== null && (longitude < -180 || longitude > 180)) {
            setMessage('Longitude must be between -180 and 180.')
            setIsSaving(false)
            setTimeout(() => setMessage(''), 2500)
            return
        }
        try {
            await PlantService.updatePlant(plantCode, plantName, {
                latitude,
                longitude,
                plantAddress: plantAddress.trim()
            })
            const persisted = await PlantService.updatePlantManagers(plantCode, managerIds)
            setManagerIds(persisted)
            await PlantService.updatePlantColocation(plantCode, siblingPlantCodes)
            setMessage('Changes saved')
            setTimeout(() => setMessage(''), 2000)
        } catch (error) {
            setMessage(error?.message || 'Error saving changes')
            setTimeout(() => setMessage(''), 2500)
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
                    <button type="button"
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <i className="fas fa-save"></i>
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button type="button"
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
                <DetailViewSection.Card title="Address & Location" icon="fas fa-location-dot">
                    <div className="flex flex-col gap-1.5">
                        <label>Street Address</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            placeholder="123 Industry Blvd, Houston, TX 77001"
                            value={plantAddress}
                            onChange={(e) => setPlantAddress(e.target.value)}
                        />
                        <p className="text-[11.5px] text-text-tertiary">
                            Drives the Schedule tab&apos;s map and seeds driving-time estimates. Leave blank to clear.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label>Latitude</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm font-mono text-text-primary outline-none transition-colors focus:border-accent"
                                placeholder="29.7604"
                                value={latitudeInput}
                                onChange={(e) => setLatitudeInput(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label>Longitude</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm font-mono text-text-primary outline-none transition-colors focus:border-accent"
                                placeholder="-95.3698"
                                value={longitudeInput}
                                onChange={(e) => setLongitudeInput(e.target.value)}
                            />
                        </div>
                    </div>
                    <p className="text-[11.5px] text-text-tertiary">
                        Optional. Provide explicit coordinates to skip geocoding, or leave blank to let the system
                        resolve from the address.
                    </p>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            <DetailViewSection.Section id="managers" title="Managers" icon="fas fa-user-tie">
                <DetailViewSection.Card title="Attached Managers" icon="fas fa-users">
                    <div className="text-[12px] text-text-secondary mb-3">
                        Attach one or more users from the Managers list to this plant. Saved on the next{' '}
                        <span className="font-semibold text-text-primary">Save</span>.
                    </div>
                    <PlantManagersEditor managerIds={managerIds} onChange={setManagerIds} disabled={isSaving} />
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            <DetailViewSection.Section id="colocation" title="Co-location" icon="fas fa-link">
                <DetailViewSection.Card title="Same Physical Location" icon="fas fa-link">
                    <div className="text-[12px] text-text-secondary mb-3">
                        Check every plant code that shares this physical site. Statistics that compare plant-vs-plant
                        flow (Help &amp; Cross-Loading, etc.) treat co-located plants as one location instead of
                        counting same-site loads as cross-plant help. Saved on the next{' '}
                        <span className="font-semibold text-text-primary">Save</span>.
                    </div>
                    <PlantColocationEditor
                        candidates={candidateSiblings}
                        disabled={isSaving}
                        onChange={setSiblingPlantCodes}
                        selectedCodes={siblingPlantCodes}
                    />
                </DetailViewSection.Card>
            </DetailViewSection.Section>
        </DetailViewSection>
    )
}
export default PlantsDetailView
