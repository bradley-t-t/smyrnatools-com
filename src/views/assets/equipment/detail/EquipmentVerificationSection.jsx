import React from 'react'

import DetailViewSection from '../../../../app/components/sections/DetailViewSection'
import VerificationCardSection from '../../../../app/components/sections/VerificationCardSection'
import { Equipment } from '../../../../app/models/equipment/Equipment'

/**
 * Maps the equipment record to the color tokens used by the verification card
 * to indicate "verified", "outdated due to recent edits", and "outdated due
 * to a new week".
 *
 * @param {object} equipment - Equipment record.
 * @returns {string} CSS variable for the active state color.
 */
function getVerificationColor(equipment) {
    if (!equipment.updatedLast) return 'var(--error)'
    if (Equipment.ensureInstance(equipment).isVerified()) return 'var(--success)'
    return new Date(equipment.updatedAt) > new Date(equipment.updatedLast) ? 'var(--error)' : 'var(--warning)'
}

/**
 * Builds the human-readable "verified at" label, including a hint when the
 * equipment is no longer verified because of edits or a new week.
 */
function getVerificationLabel(equipment) {
    if (!equipment.updatedLast) return 'Never verified'
    const baseTime = new Date(equipment.updatedLast).toLocaleString()
    if (Equipment.ensureInstance(equipment).isVerified()) return baseTime
    const suffix =
        new Date(equipment.updatedAt) > new Date(equipment.updatedLast)
            ? ' (Changes have been made)'
            : ' (It is a new week)'
    return `${baseTime}${suffix}`
}

/**
 * Verification card wrapper that builds the two-row "Verified" / "Verified By"
 * status block at the bottom of the equipment detail view.
 */
export default function EquipmentVerificationSection({
    canEditEquipment,
    equipment,
    equipmentId,
    handleVerifyEquipment,
    updatedByEmail
}) {
    const verificationColor = getVerificationColor(equipment)
    const verifiedByColor = equipment.updatedBy ? 'inherit' : 'var(--error)'
    const verifiedByIconColor = equipment.updatedBy ? 'var(--success)' : 'var(--error)'
    const verificationValueColor = Equipment.ensureInstance(equipment).isVerified() ? 'inherit' : verificationColor

    return (
        <DetailViewSection.Section id="verification" title="Verification" icon="fas fa-clipboard-check">
            <DetailViewSection.Card>
                <VerificationCardSection
                    isVerified={Equipment.ensureInstance(equipment).isVerified()}
                    verificationLabel={
                        !equipment.updatedLast || !equipment.updatedBy ? 'Needs Verification' : 'Verification Outdated'
                    }
                    verificationItems={[
                        {
                            icon: 'fas fa-calendar-check',
                            iconStyle: { color: verificationColor },
                            label: 'Verified',
                            style: { color: verificationColor },
                            value: getVerificationLabel(equipment),
                            valueStyle: { color: verificationValueColor }
                        },
                        {
                            icon: 'fas fa-user-check',
                            iconStyle: { color: verifiedByIconColor },
                            label: 'Verified By',
                            title: `Last Updated: ${new Date(equipment.updatedAt).toLocaleString()}`,
                            value: equipment.updatedBy ? updatedByEmail || 'Unknown User' : 'No verification record',
                            valueStyle: { color: verifiedByColor }
                        }
                    ]}
                    onVerify={handleVerifyEquipment}
                    canEdit={canEditEquipment}
                    lastVerifiedDate={equipment.updatedLast}
                    lastChangedDate={equipment.updatedAt}
                    assetId={equipmentId}
                    assetType="equipment"
                />
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}
