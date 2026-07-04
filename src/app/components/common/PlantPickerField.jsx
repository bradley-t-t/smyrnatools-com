import React from 'react'

import PlantDropdownModal from './PlantDropdownModal'

/**
 * Standard plant-picker field used by every asset Add view: an inline label +
 * trigger button that opens a `PlantDropdownModal`. Bundles the picker UI with its
 * modal so each consumer just wires in the state from `usePlantPicker`. Surface-aware
 * via the `surface` prop: `'primary'` (inside a card) or `'secondary'` (inside a modal).
 *
 * Renders nothing visible for the modal portion when it is closed.
 */
function PlantPickerField({
    closePicker,
    htmlFor = 'assignedPlant',
    isPlantModalOpen,
    label = 'Assigned Plant*',
    openPicker,
    plantDisplayText,
    plants,
    selectPlant,
    surface = 'primary'
}) {
    const surfaceClass = surface === 'secondary' ? 'bg-bg-secondary' : 'bg-bg-primary'
    const accessibleLabel = `Select ${label.replace('*', '').trim().toLowerCase()}`
    return (
        <>
            <div className="flex flex-col gap-1.5">
                <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    {label}
                </label>
                <button type="button"
                    id={htmlFor}
                    onClick={openPicker}
                    aria-label={accessibleLabel}
                    aria-haspopup="dialog"
                    aria-expanded={!!isPlantModalOpen}
                    className={`flex items-center justify-between gap-2 rounded-md ${surfaceClass} border border-border-light px-3 py-2.5 text-sm text-text-primary text-left transition-colors duration-150 hover:border-border-medium hover:bg-bg-hover focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 active:scale-[0.99] motion-reduce:transition-none`}
                >
                    <span className="truncate">{plantDisplayText}</span>
                    <i className="fas fa-chevron-down text-[10px] text-text-tertiary shrink-0" aria-hidden="true" />
                </button>
            </div>
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={closePicker}
                    onSelect={selectPlant}
                    plants={plants}
                />
            )}
        </>
    )
}

export default PlantPickerField
