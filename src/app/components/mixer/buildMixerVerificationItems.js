import { Mixer } from '../../models/mixers/Mixer'

/**
 * Builds the verification items list for the mixer detail VerificationCardSection.
 * Pulled out of the JSX to keep the orchestrator readable and to centralize the
 * verified/outdated/changed color logic.
 */
export function buildMixerVerificationItems(mixer, updatedByEmail) {
    const instance = Mixer.ensureInstance(mixer)
    const isVerified = instance.isVerified()
    const hasUpdatedLast = Boolean(mixer.updatedLast)
    const changesAfterVerification = hasUpdatedLast && new Date(mixer.updatedAt) > new Date(mixer.updatedLast)

    const verifiedColor = hasUpdatedLast
        ? isVerified
            ? 'var(--success)'
            : changesAfterVerification
              ? 'var(--error)'
              : 'var(--warning)'
        : 'var(--error)'

    const verifiedValueColor = hasUpdatedLast
        ? isVerified
            ? 'inherit'
            : changesAfterVerification
              ? 'var(--error)'
              : 'var(--warning)'
        : 'var(--error)'

    const verifiedSuffix =
        hasUpdatedLast && !isVerified
            ? changesAfterVerification
                ? ' (Changes have been made)'
                : ' (It is a new week)'
            : ''

    return [
        {
            icon: 'fas fa-calendar-check',
            iconStyle: { color: verifiedColor },
            label: 'Verified',
            style: { color: verifiedColor },
            value: hasUpdatedLast
                ? `${new Date(mixer.updatedLast).toLocaleString()}${verifiedSuffix}`
                : 'Never verified',
            valueStyle: { color: verifiedValueColor }
        },
        {
            icon: 'fas fa-user-check',
            iconStyle: { color: mixer.updatedBy ? 'var(--success)' : 'var(--error)' },
            label: 'Verified By',
            title: `Last Updated: ${new Date(mixer.updatedAt).toLocaleString()}`,
            value: mixer.updatedBy ? updatedByEmail || 'Unknown User' : 'No verification record',
            valueStyle: { color: mixer.updatedBy ? 'inherit' : 'var(--error)' }
        }
    ]
}
