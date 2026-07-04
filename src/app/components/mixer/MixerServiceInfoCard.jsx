import React from 'react'

import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import { DateUtility } from '../../../utils/DateUtility'
import { MIXER_CHIP_OVERDUE_DAYS } from '../../constants/mixerDetailConstants'
import DetailViewSection from '../sections/DetailViewSection'

const formatDate = (date) => (date ? DateUtility.toLocalDateString(date) : '')

/** Service Date + Hours + Chip Date. Hidden help text matches the original. */
export default function MixerServiceInfoCard({
    canEditMixer,
    hours,
    lastChipDate,
    lastServiceDate,
    setHours,
    setLastChipDate,
    setLastServiceDate
}) {
    return (
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
                    readOnly={!canEditMixer}
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
                <label>Hours</label>
                <input
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="form-control"
                    readOnly={!canEditMixer}
                    min="0"
                    step="any"
                    placeholder="Enter hours"
                />
            </div>
            <div className="form-group">
                <label>Last Chip Date</label>
                <input
                    type="date"
                    value={lastChipDate ? formatDate(lastChipDate) : ''}
                    onChange={(e) =>
                        setLastChipDate(e.target.value ? DateUtility.parseLocalDate(e.target.value) : null)
                    }
                    className="form-control [color-scheme:light] dark:[color-scheme:dark]"
                    readOnly={!canEditMixer}
                />
                {lastChipDate && AssetStatsUtility.isServiceOverdue(lastChipDate, MIXER_CHIP_OVERDUE_DAYS) && (
                    <div className="warning-text">Chip overdue</div>
                )}
            </div>
        </DetailViewSection.Card>
    )
}
