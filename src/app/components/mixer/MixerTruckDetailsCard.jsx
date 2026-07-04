import React from 'react'

import {
    MIXER_SHOP_STATUS_NOTES,
    MIXER_SHOP_STATUS_OPTIONS,
    MIXER_STATUS_OPTIONS
} from '../../constants/mixerDetailConstants'
import DetailViewSection from '../sections/DetailViewSection'

// Canonical chevron-bearing select treatment for the mixer truck-details card.
// Mirrors the surrounding `form-control` size while using a `currentColor`
// chevron so the affordance follows `text-text-primary` across themes.
const SELECT_CLS =
    "w-full appearance-none cursor-pointer rounded border border-border-light bg-bg-secondary text-text-primary text-[0.8125rem] px-2.5 py-[0.4375rem] pr-9 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem_1rem] transition-colors duration-150 hover:border-border-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:light] dark:[color-scheme:dark] bg-[url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20fill='none'%20viewBox='0%200%2024%2024'%20stroke='currentColor'%3E%3Cpath%20stroke-linecap='round'%20stroke-linejoin='round'%20stroke-width='2'%20d='M19%209l-7%207-7-7'%3E%3C/path%3E%3C/svg%3E\")]"

/**
 * Truck Number, Status, and (when In Shop) Shop Status sub-selector. Status
 * change is async because moving away from Active while an operator is
 * assigned triggers an immediate save + unassign elsewhere.
 */
export default function MixerTruckDetailsCard({
    canEditMixer,
    isCleanlinessBlocking,
    onStatusChange,
    onTruckNumberChange,
    setShopStatus,
    shopStatus,
    status,
    truckNumber
}) {
    const shopStatusNote = MIXER_SHOP_STATUS_NOTES[shopStatus] || MIXER_SHOP_STATUS_NOTES.in_shop
    const readOnlySelectClasses = !canEditMixer ? 'opacity-80 cursor-not-allowed' : ''

    return (
        <DetailViewSection.Card title="Truck Details" icon="fas fa-info-circle">
            <div className="form-group">
                <label>Truck Number</label>
                <input
                    type="text"
                    value={truckNumber}
                    onChange={(e) => onTruckNumberChange(e.target.value)}
                    className="form-control"
                    readOnly={!canEditMixer}
                />
            </div>
            <div className="form-group">
                <label>Status</label>
                <select
                    value={status}
                    onChange={(e) => {
                        const newStatus = e.target.value
                        if (isCleanlinessBlocking && newStatus === 'Active') return
                        onStatusChange(newStatus)
                    }}
                    disabled={!canEditMixer}
                    className={SELECT_CLS}
                >
                    <option value="">Select Status</option>
                    {MIXER_STATUS_OPTIONS.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.value === 'Active' && isCleanlinessBlocking}
                        >
                            {option.label}
                            {option.value === 'Active' && isCleanlinessBlocking ? ' (Requires 3+ stars)' : ''}
                        </option>
                    ))}
                </select>
                {isCleanlinessBlocking && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-bg-hover rounded-md text-text-secondary text-[0.8125rem]">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>Cleanliness must be 3+ stars to set Active status</span>
                    </div>
                )}
            </div>
            {status === 'Spare' && (
                <div className="spare-status-note">
                    If this truck is not runnable, it needs to be set as &quot;In Shop&quot; with the appropriate shop
                    status selected
                </div>
            )}
            {status === 'In Shop' && (
                <div className="down-in-yard-container">
                    <div className="form-group mb-2">
                        <label>Shop Status</label>
                        <select
                            className={`${SELECT_CLS} ${readOnlySelectClasses}`}
                            value={shopStatus || 'in_shop'}
                            onChange={(e) => canEditMixer && setShopStatus(e.target.value)}
                            disabled={!canEditMixer}
                        >
                            {MIXER_SHOP_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="down-in-yard-note text-text-secondary text-xs mt-1">{shopStatusNote}</div>
                </div>
            )}
        </DetailViewSection.Card>
    )
}
