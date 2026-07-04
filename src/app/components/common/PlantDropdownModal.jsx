/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'

const plantCodeOf = (plant) => plant.plantCode || plant.plant_code || ''
const plantNameOf = (plant) => plant.plantName || plant.plant_name || ''
const numericRank = (code) => parseInt(String(code).replace(/\D/g, '') || '0', 10)

const sortPlantsByCode = (list) =>
    [...list].sort((a, b) => {
        const codeA = plantCodeOf(a)
        const codeB = plantCodeOf(b)
        if (codeA === 'OTHER_REGION') return 1
        if (codeB === 'OTHER_REGION') return -1
        return numericRank(codeA) - numericRank(codeB)
    })

/** Compute the district groupings from a flat plants list. Each plant can
 *  contribute to multiple districts via its `.districts` array. */
const computeDistrictGroups = (plants) => {
    const map = {}
    plants.forEach((plant) => {
        const code = plantCodeOf(plant)
        const districts = plant.districts || []
        districts.forEach((district) => {
            const name = typeof district === 'string' ? district : district?.name
            if (!name) return
            if (!map[name]) map[name] = []
            map[name].push(code)
        })
    })
    return Object.entries(map)
        .map(([name, plantCodes]) => ({ name, plantCodes }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Portal modal for selecting one or more plants from a searchable list.
 * Supports single-select (auto-closes on pick) and multi-select (checkbox) modes.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Array<Object>} [props.plants]
 * @param {Function} props.onSelect
 * @param {string} [props.searchPlaceholder]
 * @param {boolean} [props.showAllPlants=false]
 * @param {boolean} [props.showMyPlants=false]
 * @param {boolean} [props.allowMultiple=false]
 * @param {string[]} [props.selectedPlantCodes]
 * @param {string} [props.userPlantCode]
 * @param {Array<Object>} [props.regionGroups]
 */
function PlantDropdownModal({
    isOpen,
    onClose,
    plants = [],
    onSelect,
    searchPlaceholder = 'Search plants…',
    showAllPlants = false,
    showMyPlants = false,
    allowMultiple = false,
    selectedPlantCodes = [],
    userPlantCode = '',
    regionGroups = []
}) {
    const [search, setSearch] = useState('')
    const [localSelectedCodes, setLocalSelectedCodes] = useState(selectedPlantCodes || [])
    const [expandedRegions, setExpandedRegions] = useState({})
    const accentColor = useAccentColor()

    useEffect(() => {
        if (isOpen) setLocalSelectedCodes(selectedPlantCodes || [])
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    useEffect(() => {
        if (isOpen) setExpandedRegions({})
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return undefined
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose?.()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [isOpen, onClose])

    const districtGroups = useMemo(() => computeDistrictGroups(plants), [plants])
    const userDistrict = useMemo(
        () => (userPlantCode ? districtGroups.find((d) => d.plantCodes.includes(userPlantCode)) : null),
        [districtGroups, userPlantCode]
    )

    const filteredPlants = useMemo(() => {
        const term = search.toLowerCase()
        if (!term) return plants
        return plants.filter((plant) => {
            const code = plantCodeOf(plant).toLowerCase()
            const name = plantNameOf(plant).toLowerCase()
            return code.includes(term) || name.includes(term)
        })
    }, [plants, search])

    const sortedPlants = useMemo(() => sortPlantsByCode(filteredPlants), [filteredPlants])

    const handlePlantClick = (code) => {
        if (allowMultiple) {
            setLocalSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
            onSelect(code)
        } else {
            onSelect(code)
            onClose()
        }
    }

    /** Multi-select district click — when every plant in the district is
     *  already selected, deselect them all; otherwise add the missing
     *  ones. We surface the diff through `onSelect(code)` calls so the
     *  parent's reducer sees the same per-code add/remove signals it gets
     *  from the per-plant rows (no special-casing required upstream). */
    const handleDistrictClickMulti = (district) => {
        const codes = district.plantCodes || []
        if (!codes.length) return
        const currentlyAllSelected = codes.every((code) => localSelectedCodes.includes(code))
        setLocalSelectedCodes((prev) => {
            const set = new Set(prev)
            codes.forEach((code) => {
                if (currentlyAllSelected) set.delete(code)
                else set.add(code)
            })
            return [...set]
        })
        codes.forEach((code) => {
            const already = localSelectedCodes.includes(code)
            if (currentlyAllSelected && already) onSelect(code)
            else if (!currentlyAllSelected && !already) onSelect(code)
        })
    }

    if (!isOpen || typeof document === 'undefined' || !document.body) return null

    const hasRegions = regionGroups && regionGroups.length > 0
    const searchActive = search.trim().length > 0

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in-fast motion-reduce:animate-none"
            onClick={allowMultiple ? undefined : onClose}
            role="dialog"
            aria-modal="true"
            aria-label={allowMultiple ? 'Select Plants' : 'Select Plant'}
        >
            <div
                className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-modal bg-bg-secondary border border-border-light shadow-modal animate-pop-in motion-reduce:animate-none"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between rounded-t-modal border-b border-border-light bg-bg-tertiary/40 px-5 py-4">
                    <h2 className="m-0 font-heading text-lg font-semibold" style={{ color: accentColor }}>
                        {allowMultiple ? 'Select Plants' : 'Select Plant'}
                    </h2>
                    <button type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-base text-text-secondary transition-colors duration-150 hover:bg-bg-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                </div>

                <div className="relative border-b border-border-light px-4 py-3">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full rounded-md border border-border-light bg-bg-primary text-text-primary py-2.5 pl-10 pr-9 text-sm outline-none transition-colors duration-150 placeholder:text-text-tertiary hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                    />
                    <i
                        className="fas fa-search absolute left-7 top-1/2 -translate-y-1/2 text-sm text-text-tertiary"
                        aria-hidden="true"
                    />
                    {search && (
                        <button type="button"
                            onClick={() => setSearch('')}
                            aria-label="Clear search"
                            className="absolute right-6 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary transition-colors duration-150 hover:bg-bg-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        >
                            <i className="fas fa-times text-xs" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto bg-bg-secondary p-2" role="listbox">
                    {showAllPlants && !allowMultiple && (
                        <PickerRow
                            icon="fa-globe"
                            accentColor={accentColor}
                            onClick={() => {
                                onSelect('All')
                                onClose()
                            }}
                        >
                            All Plants
                        </PickerRow>
                    )}
                    {showMyPlants && !allowMultiple && (
                        <PickerRow
                            icon="fa-user-circle"
                            accentColor={accentColor}
                            onClick={() => {
                                onSelect('MY_PLANTS')
                                onClose()
                            }}
                        >
                            My Plants
                        </PickerRow>
                    )}

                    {!allowMultiple && hasRegions && !searchActive && (
                        <>
                            <Divider />
                            <SectionLabel>Regions</SectionLabel>
                            {regionGroups.map((region) => {
                                const isExpanded = !!expandedRegions[region.code]
                                const districts = region.districts || []
                                const regionPlants = sortPlantsByCode(region.plants || [])
                                return (
                                    <div key={region.code} className="mb-1">
                                        <div className="flex items-center gap-1 rounded-card hover:bg-bg-hover transition-colors duration-150">
                                            <button type="button"
                                                onClick={() =>
                                                    setExpandedRegions((prev) => ({
                                                        ...prev,
                                                        [region.code]: !prev[region.code]
                                                    }))
                                                }
                                                aria-label={isExpanded ? 'Collapse region' : 'Expand region'}
                                                aria-expanded={isExpanded}
                                                className="ml-2 flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                                            >
                                                <i
                                                    className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-[11px]`}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            <button type="button"
                                                role="option"
                                                aria-selected={false}
                                                onClick={() => {
                                                    onSelect(`REGION:${region.code}`)
                                                    onClose()
                                                }}
                                                className="flex flex-1 cursor-pointer items-center gap-3 rounded-card px-2 py-3 text-sm font-medium text-text-primary border-0 bg-transparent text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                            >
                                                <i
                                                    className="fas fa-globe"
                                                    style={{ color: accentColor }}
                                                    aria-hidden="true"
                                                />
                                                <span className="flex-1">{region.name}</span>
                                                <span className="text-xs text-text-tertiary tabular-nums">
                                                    {region.plantCodes?.length || 0}
                                                </span>
                                            </button>
                                        </div>
                                        {isExpanded && (
                                            <div className="ml-6 mt-1 mb-2 border-l border-border-light pl-2">
                                                {districts.length > 0 && (
                                                    <>
                                                        <NestedLabel>Districts</NestedLabel>
                                                        {districts.map((district) => (
                                                            <NestedRow
                                                                key={`${region.code}:${district.name}`}
                                                                icon="fa-layer-group"
                                                                accentColor={accentColor}
                                                                count={district.plantCodes.length}
                                                                onClick={() => {
                                                                    onSelect(`DISTRICT:${district.name}`)
                                                                    onClose()
                                                                }}
                                                            >
                                                                {district.name}
                                                            </NestedRow>
                                                        ))}
                                                    </>
                                                )}
                                                {regionPlants.length > 0 && (
                                                    <>
                                                        <NestedLabel className="mt-1">Plants</NestedLabel>
                                                        {regionPlants.map((plant) => {
                                                            const code = plantCodeOf(plant)
                                                            return (
                                                                <NestedRow
                                                                    key={`${region.code}:${code}`}
                                                                    onClick={() => {
                                                                        onSelect(code)
                                                                        onClose()
                                                                    }}
                                                                >
                                                                    ({code}) {plantNameOf(plant)}
                                                                </NestedRow>
                                                            )
                                                        })}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            <Divider />
                        </>
                    )}

                    {!allowMultiple && hasRegions && searchActive && <SectionLabel>Plants</SectionLabel>}

                    {!allowMultiple && !hasRegions && districtGroups.length > 0 && (
                        <>
                            <Divider />
                            {userDistrict && (
                                <PickerRow
                                    icon="fa-user-circle"
                                    accentColor={accentColor}
                                    onClick={() => {
                                        onSelect(`DISTRICT:${userDistrict.name}`)
                                        onClose()
                                    }}
                                    count={userDistrict.plantCodes.length}
                                >
                                    My District
                                </PickerRow>
                            )}
                            {districtGroups.map((district) => (
                                <PickerRow
                                    key={district.name}
                                    icon="fa-layer-group"
                                    accentColor={accentColor}
                                    onClick={() => {
                                        onSelect(`DISTRICT:${district.name}`)
                                        onClose()
                                    }}
                                    count={district.plantCodes.length}
                                >
                                    {district.name}
                                </PickerRow>
                            ))}
                            <Divider />
                        </>
                    )}

                    {allowMultiple && districtGroups.length > 0 && (
                        <>
                            <SectionLabel>Districts — tap to toggle every plant</SectionLabel>
                            {districtGroups.map((district) => {
                                const codes = district.plantCodes
                                const selectedInDistrict = codes.filter((code) =>
                                    localSelectedCodes.includes(code)
                                ).length
                                const allSelected = codes.length > 0 && selectedInDistrict === codes.length
                                const partial = selectedInDistrict > 0 && !allSelected
                                return (
                                    <button type="button"
                                        key={district.name}
                                        role="option"
                                        aria-selected={allSelected}
                                        onClick={() => handleDistrictClickMulti(district)}
                                        className={`mb-1 w-full flex items-center gap-3 rounded-card px-4 py-2.5 text-sm border-0 text-left cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${allSelected ? 'bg-accent/10 font-semibold text-text-primary' : 'text-text-primary hover:bg-bg-hover'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = partial
                                            }}
                                            onChange={() => {}}
                                            className="h-[18px] w-[18px] accent-accent"
                                            tabIndex={-1}
                                        />
                                        <i
                                            className="fas fa-layer-group"
                                            style={{ color: accentColor }}
                                            aria-hidden="true"
                                        />
                                        <span className="flex-1">{district.name}</span>
                                        <span className="text-xs text-text-tertiary tabular-nums">
                                            {selectedInDistrict}/{codes.length}
                                        </span>
                                    </button>
                                )
                            })}
                            <Divider className="my-2" />
                            <SectionLabel>Plants</SectionLabel>
                        </>
                    )}

                    {/* The hierarchical region accordion already renders
                        every plant nested under its region in office-mode
                        single-select view. Suppressing the flat list while
                        no search is active avoids a duplicate flat dump. */}
                    {!allowMultiple && hasRegions && !searchActive
                        ? null
                        : sortedPlants.map((plant) => {
                              const code = plantCodeOf(plant)
                              const isSelected = allowMultiple && localSelectedCodes.includes(code)
                              return (
                                  <button type="button"
                                      key={code}
                                      onClick={() => handlePlantClick(code)}
                                      role="option"
                                      aria-selected={isSelected}
                                      className={`w-full flex items-center gap-3 rounded-card px-4 py-3 text-sm border-0 text-left cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isSelected ? 'bg-accent/10 font-semibold text-text-primary' : 'text-text-primary hover:bg-bg-hover'}`}
                                  >
                                      {allowMultiple && (
                                          <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => {}}
                                              className="h-[18px] w-[18px] accent-accent"
                                              tabIndex={-1}
                                          />
                                      )}
                                      <span className="text-text-primary">
                                          ({code}) {plantNameOf(plant)}
                                      </span>
                                      {isSelected && (
                                          <i className="fas fa-check ml-auto text-accent" aria-hidden="true" />
                                      )}
                                  </button>
                              )
                          })}

                    {sortedPlants.length === 0 && searchActive && (
                        <div className="px-4 py-8 text-center text-sm text-text-tertiary">
                            No plants match “{search}”.
                        </div>
                    )}
                </div>

                {allowMultiple && (
                    <div className="border-t border-border-light bg-bg-tertiary/40 px-4 py-3 flex items-center gap-2">
                        <button type="button"
                            onClick={() => {
                                // Emit a toggle for every currently selected
                                // code so the parent's per-event reducer
                                // shrinks back to nothing.
                                localSelectedCodes.forEach((code) => onSelect(code))
                                setLocalSelectedCodes([])
                            }}
                            disabled={localSelectedCodes.length === 0}
                            className="rounded-md border border-border-light bg-bg-primary text-text-primary px-3 py-2 text-xs font-semibold transition-colors duration-150 hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none"
                        >
                            Clear
                        </button>
                        <button type="button"
                            onClick={onClose}
                            className="flex-1 rounded-md border-0 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none"
                            style={{ backgroundColor: accentColor }}
                        >
                            Done ({localSelectedCodes.length} selected)
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

/** Top-level picker row used for All Plants / My Plants / district groups. */
function PickerRow({ icon, accentColor, onClick, children, count }) {
    return (
        <button type="button"
            role="option"
            aria-selected={false}
            onClick={onClick}
            className="mb-1 w-full flex items-center gap-3 rounded-card px-4 py-3 text-sm font-medium text-text-primary border-0 bg-transparent text-left cursor-pointer transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
            {icon && <i className={`fas ${icon}`} style={{ color: accentColor }} aria-hidden="true" />}
            <span className="flex-1">{children}</span>
            {count != null && <span className="text-xs text-text-tertiary tabular-nums">{count}</span>}
        </button>
    )
}

/** Nested picker row used inside an expanded region accordion. */
function NestedRow({ icon, accentColor, onClick, children, count }) {
    return (
        <button type="button"
            role="option"
            aria-selected={false}
            onClick={onClick}
            className="mb-0.5 w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-primary border-0 bg-transparent text-left cursor-pointer transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
            {icon && <i className={`fas ${icon}`} style={{ color: accentColor }} aria-hidden="true" />}
            <span className="flex-1">{children}</span>
            {count != null && <span className="text-xs text-text-tertiary tabular-nums">{count}</span>}
        </button>
    )
}

function SectionLabel({ children }) {
    return <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{children}</div>
}

function NestedLabel({ children, className = '' }) {
    return (
        <div className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-text-tertiary ${className}`}>
            {children}
        </div>
    )
}

function Divider({ className = '' }) {
    return <div className={`mx-4 my-1 border-t border-border-light ${className}`} />
}

export default PlantDropdownModal
