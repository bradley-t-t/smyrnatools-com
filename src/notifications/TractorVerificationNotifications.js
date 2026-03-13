/** Tractor verification notification provider — alerts when unverified tractors exist at a plant. */
import { TractorService } from '../services/TractorService'
import VerifiedUtility, { createVerificationNotificationProvider } from '../utils/VerifiedUtility'
export default createVerificationNotificationProvider({
    entityLabel: () => 'tractors',
    fetchAllItems: () => TractorService.getAllTractors().catch(() => []),
    idPrefix: 'tractors-verify',
    isVerifiedFn: (item) => VerifiedUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy),
    notificationType: 'tractors.verifications',
    permissionKey: 'notifications.tractor_manager',
    titleLabel: 'Tractor'
})
