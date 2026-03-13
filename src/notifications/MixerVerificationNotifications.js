/** Mixer verification notification provider — alerts when unverified mixers exist at a plant. */
import { MixerService } from '../services/MixerService'
import VerifiedUtility, { createVerificationNotificationProvider } from '../utils/VerifiedUtility'
export default createVerificationNotificationProvider({
    entityLabel: (count) => (count === 1 ? 'mixer' : 'mixers'),
    fetchAllItems: () => MixerService.getAllMixers().catch(() => []),
    idPrefix: 'mixers-verify',
    isVerifiedFn: (item) => VerifiedUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy),
    notificationType: 'mixers.verifications',
    permissionKey: 'notifications.plant_manager',
    titleLabel: 'Mixer'
})
