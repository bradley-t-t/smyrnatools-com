import React from 'react'

import StarRating from '../../../../app/components/common/StarRating'
import DetailViewSection from '../../../../app/components/sections/DetailViewSection'
import AssetStatsUtility from '../../../../utils/AssetStatsUtility'
import DateUtility from '../../../../utils/DateUtility'
import { RATING_LABELS } from './equipmentTypeOptions'

/** Shared cleanliness + condition picker. Renders the centralized StarRating
 *  plus an optional textual label readout. */
function StarRatingInput({ canEditEquipment, label, onChange, value }) {
    return (
        <div className="form-group">
            <label>{label}</label>
            <div className="flex flex-col gap-2">
                <StarRating value={value} onChange={canEditEquipment ? onChange : undefined} size="lg" tone="warning" />
                {value > 0 && (
                    <span className="text-[13px] font-semibold text-text-primary">{RATING_LABELS[value]}</span>
                )}
            </div>
        </div>
    )
}

const formatDate = (date) => {
    if (!date) return ''
    return date instanceof Date ? date.toISOString().split('T')[0] : date
}

/**
 * Service-information card + cleanliness/condition rating card for the
 * equipment detail view.
 */
export default function EquipmentMaintenanceSection({
    canEditEquipment,
    cleanlinessRating,
    conditionRating,
    hours,
    hoursMileage,
    lastServiceDate,
    setCleanlinessRating,
    setConditionRating,
    setHours,
    setHoursMileage,
    setLastServiceDate
}) {
    return (
        <DetailViewSection.Section id="maintenance" title="Maintenance" icon="fas fa-wrench">
            <DetailViewSection.Card title="Service Information" icon="fas fa-calendar-alt">
                <div className="form-group">
                    <label>Last Service Date</label>
                    <input
                        type="date"
                        value={lastServiceDate ? formatDate(lastServiceDate) : ''}
                        onChange={(e) =>
                            setLastServiceDate(e.target.value ? DateUtility.parseLocalDate(e.target.value) : null)
                        }
                        className="form-control [color-scheme:light] dark:[color-scheme:dark]"
                        readOnly={!canEditEquipment}
                    />
                    {lastServiceDate && AssetStatsUtility.isServiceOverdue(lastServiceDate) && (
                        <div className="warning-text">Service overdue</div>
                    )}
                    <div className="text-text-secondary text-[11px] leading-snug mt-1">
                        Service will show as overdue if it has been more than 6 months since last serviced. Service is
                        determined by hours on the asset - check hours of service.
                    </div>
                </div>
                <div className="form-group">
                    <label>Mileage</label>
                    <input
                        type="number"
                        value={hoursMileage}
                        onChange={(e) => setHoursMileage(e.target.value)}
                        className="form-control"
                        readOnly={!canEditEquipment}
                        min="0"
                    />
                </div>
                <div className="form-group">
                    <label>Hours</label>
                    <input
                        type="number"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className="form-control"
                        readOnly={!canEditEquipment}
                        min="0"
                        step="any"
                        placeholder="Enter hours"
                    />
                </div>
            </DetailViewSection.Card>
            <DetailViewSection.Card title="Ratings" icon="fas fa-star">
                <StarRatingInput
                    canEditEquipment={canEditEquipment}
                    label="Cleanliness Rating"
                    onChange={setCleanlinessRating}
                    value={cleanlinessRating}
                />
                <StarRatingInput
                    canEditEquipment={canEditEquipment}
                    label="Condition Rating"
                    onChange={setConditionRating}
                    value={conditionRating}
                />
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}
