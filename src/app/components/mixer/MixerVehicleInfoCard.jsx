import React from 'react'

import DetailViewSection from '../sections/DetailViewSection'

/** VIN/Make/Model/Year inputs. VIN strips I/O/Q and uppercases on input. */
export default function MixerVehicleInfoCard({
    canEditMixer,
    make,
    model,
    setMake,
    setModel,
    setVin,
    setYear,
    vin,
    year
}) {
    return (
        <DetailViewSection.Card title="Vehicle Information" icon="fas fa-car">
            <div className="form-group">
                <label>VIN</label>
                <input
                    type="text"
                    value={vin}
                    placeholder="VIN (no I, O, Q)"
                    onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                    className="form-control"
                    readOnly={!canEditMixer}
                />
            </div>
            <div className="form-row-2">
                <div className="form-group">
                    <label>Make</label>
                    <input
                        type="text"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        className="form-control"
                        readOnly={!canEditMixer}
                    />
                </div>
                <div className="form-group">
                    <label>Model</label>
                    <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="form-control"
                        readOnly={!canEditMixer}
                    />
                </div>
            </div>
            <div className="form-group">
                <label>Year</label>
                <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="form-control"
                    readOnly={!canEditMixer}
                />
            </div>
        </DetailViewSection.Card>
    )
}
