import React from 'react'

import DetailViewSection from '../../../../app/components/sections/DetailViewSection'

/**
 * "Vehicle Information" card containing VIN, make, model, year, and comments.
 * Pure presentational — all state lives in the parent.
 */
export default function PickupVehicleInfoCard({
    vin,
    onVinChange,
    make,
    onMakeChange,
    model,
    onModelChange,
    year,
    onYearChange,
    comments,
    onCommentsChange,
    canEditPickup
}) {
    return (
        <DetailViewSection.Card title="Vehicle Information" icon="fas fa-car">
            <div className="form-group">
                <label>VIN</label>
                <input
                    type="text"
                    value={vin}
                    onChange={(e) => onVinChange(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                    maxLength="17"
                    className="form-control"
                    disabled={!canEditPickup}
                />
            </div>
            <div className="form-row-2">
                <div className="form-group">
                    <label>Make</label>
                    <input
                        type="text"
                        value={make}
                        onChange={(e) => onMakeChange(e.target.value)}
                        className="form-control"
                        disabled={!canEditPickup}
                    />
                </div>
                <div className="form-group">
                    <label>Model</label>
                    <input
                        type="text"
                        value={model}
                        onChange={(e) => onModelChange(e.target.value)}
                        className="form-control"
                        disabled={!canEditPickup}
                    />
                </div>
            </div>
            <div className="form-group">
                <label>Year</label>
                <input
                    type="text"
                    value={year}
                    onChange={(e) => onYearChange(e.target.value)}
                    className="form-control"
                    disabled={!canEditPickup}
                />
            </div>
            <div className="form-group">
                <label>Comments</label>
                <textarea
                    value={comments}
                    onChange={(e) => onCommentsChange(e.target.value)}
                    className="form-control"
                    rows={3}
                    disabled={!canEditPickup}
                />
            </div>
        </DetailViewSection.Card>
    )
}
