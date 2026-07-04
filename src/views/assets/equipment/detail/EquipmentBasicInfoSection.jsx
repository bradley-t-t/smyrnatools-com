import React from 'react'

import DetailViewSection from '../../../../app/components/sections/DetailViewSection'
import { DETAIL_SELECT_CLS } from '../../../../app/constants/detailFormClasses'
import { EQUIPMENT_TYPE_OPTIONS, STATUS_OPTIONS } from './equipmentTypeOptions'

/**
 * Renders the Identifying Number / Status / Plant / Type card plus the
 * Make / Model / Year specifications card on the equipment detail view.
 *
 * The plant-selector button mirrors `form-control` chrome — surface-aware
 * Tailwind tokens handle the disabled visuals so the look stays consistent
 * across dark/light/gray themes.
 */
export default function EquipmentBasicInfoSection({
    canEditEquipment,
    equipmentType,
    identifyingNumber,
    make,
    model,
    plantDisplayText,
    setEquipmentType,
    setIdentifyingNumber,
    setMake,
    setModel,
    setShowPlantModal,
    setStatus,
    setYear,
    status,
    year
}) {
    return (
        <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-cog">
            <DetailViewSection.Card title="Equipment Details" icon="fas fa-info-circle">
                <div className="form-group">
                    <label>Identifying Number</label>
                    <input
                        type="text"
                        value={identifyingNumber}
                        onChange={(e) => setIdentifyingNumber(e.target.value)}
                        className="form-control"
                        readOnly={!canEditEquipment}
                    />
                </div>
                <div className="form-group">
                    <label>Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={!canEditEquipment}
                        className={DETAIL_SELECT_CLS}
                    >
                        <option value="">Select Status</option>
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Assigned Plant</label>
                    <button type="button"
                        className={`operator-select-button form-control text-left ${!canEditEquipment ? 'bg-bg-secondary opacity-80 cursor-not-allowed' : ''}`}
                        onClick={() => canEditEquipment && setShowPlantModal(true)}
                        disabled={!canEditEquipment}
                    >
                        <span className="block truncate">{plantDisplayText}</span>
                    </button>
                </div>
                <div className="form-group">
                    <label>Equipment Type</label>
                    <select
                        value={equipmentType}
                        onChange={(e) => setEquipmentType(e.target.value)}
                        disabled={!canEditEquipment}
                        className={DETAIL_SELECT_CLS}
                    >
                        <option value="">Select Type</option>
                        {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </DetailViewSection.Card>
            <DetailViewSection.Card title="Equipment Specifications" icon="fas fa-clipboard-list">
                <div className="form-row-2">
                    <div className="form-group">
                        <label>Make</label>
                        <input
                            type="text"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                            className="form-control"
                            readOnly={!canEditEquipment}
                        />
                    </div>
                    <div className="form-group">
                        <label>Model</label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="form-control"
                            readOnly={!canEditEquipment}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Year</label>
                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="form-control"
                        readOnly={!canEditEquipment}
                        min="1900"
                        max={new Date().getFullYear()}
                    />
                </div>
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}
