import React, { useState } from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'
/**
 * Portal modal for selecting one or more plants from a searchable list.
 * Supports single-select (auto-closes on pick) and multi-select (checkbox) modes.
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls portal visibility.
 * @param {Function} props.onClose - Callback to close the modal.
 * @param {Array<Object>} [props.plants] - Plant objects with plantCode/plant_code and plantName/plant_name.
 * @param {Function} props.onSelect - Called with the selected plant code string.
 * @param {string} [props.searchPlaceholder] - Placeholder text for the search input.
 * @param {boolean} [props.showAllPlants=false] - When true in single-select mode, shows an "All Plants" option.
 * @param {boolean} [props.allowMultiple=false] - Enables multi-select mode with checkboxes.
 * @param {string[]} [props.selectedPlantCodes] - Pre-selected plant codes for multi-select mode.
 */
function PlantDropdownModal({
    isOpen,
    onClose,
    plants = [],
    onSelect,
    searchPlaceholder = 'Search plants...',
    showAllPlants = false,
    allowMultiple = false,
    selectedPlantCodes = []
}) {
    const [search, setSearch] = useState('')
    const [localSelectedCodes, setLocalSelectedCodes] = useState(selectedPlantCodes || [])
    const accentColor = useAccentColor()
    const filteredPlants = plants.filter((plant) => {
        const code = plant.plantCode || plant.plant_code || ''
        const name = plant.plantName || plant.plant_name || ''
        const term = search.toLowerCase()
        return code.toLowerCase().includes(term) || name.toLowerCase().includes(term)
    })
    const sortedPlants = [...filteredPlants].sort((a, b) => {
        const codeA = a.plantCode || a.plant_code || ''
        const codeB = b.plantCode || b.plant_code || ''
        if (codeA === 'OTHER_REGION') return 1
        if (codeB === 'OTHER_REGION') return -1
        return parseInt(codeA.replace(/\D/g, '') || '0') - parseInt(codeB.replace(/\D/g, '') || '0')
    })
    const handlePlantClick = (code) => {
        if (allowMultiple) {
            setLocalSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
            onSelect(code)
        } else {
            onSelect(code)
            onClose()
        }
    }
    if (!isOpen || typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-5"
            onClick={allowMultiple ? undefined : onClose}
        >
            <div
                className="flex max-h-[80vh] w-[90%] max-w-[400px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-slate-50 px-5 py-4">
                    <h2 className="m-0 text-lg font-semibold" style={{ color: accentColor }}>
                        {allowMultiple ? 'Select Plants' : 'Select Plant'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-base text-slate-500 hover:bg-slate-100"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>
                <div className="relative border-b border-gray-200 px-4 py-3">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-[10px] border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
                    />
                    <i className="fas fa-search absolute left-7 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                </div>
                <div className="flex-1 overflow-y-auto bg-white p-2">
                    {showAllPlants && !allowMultiple && (
                        <div
                            className="mb-1 flex cursor-pointer items-center gap-3 rounded-[10px] px-4 py-3 text-sm text-gray-700 hover:bg-slate-100"
                            onClick={() => {
                                onSelect('All')
                                onClose()
                            }}
                        >
                            All Plants
                        </div>
                    )}
                    {sortedPlants.map((plant) => {
                        const code = plant.plantCode || plant.plant_code
                        const isSelected = allowMultiple && localSelectedCodes.includes(code)
                        return (
                            <div
                                key={code}
                                className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-4 py-3 text-sm transition-colors hover:bg-slate-100 ${isSelected ? 'bg-blue-50 font-semibold' : 'text-gray-700'}`}
                                onClick={() => handlePlantClick(code)}
                            >
                                {allowMultiple && (
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="h-[18px] w-[18px]"
                                        style={{ accentColor }}
                                    />
                                )}
                                <span className="text-gray-700">
                                    ({code}) {plant.plantName || plant.plant_name}
                                </span>
                            </div>
                        )
                    })}
                </div>
                {allowMultiple && (
                    <div className="border-t border-gray-200 bg-slate-50 px-4 py-3">
                        <button
                            onClick={onClose}
                            className="w-full rounded-[10px] border-none px-5 py-3 text-sm font-semibold text-white"
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
export default PlantDropdownModal
