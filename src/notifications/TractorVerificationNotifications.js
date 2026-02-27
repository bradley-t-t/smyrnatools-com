import { TractorService } from '../services/TractorService'
import TractorUtility from '../utils/TractorUtility'
import createVerificationNotificationProvider from '../utils/VerificationNotificationProviderUtility'

export default createVerificationNotificationProvider({
    entityLabel: () => 'tractors',
    fetchAllItems: () => TractorService.getAllTractors().catch(() => []),
    idPrefix: 'tractors-verify',
    isVerifiedFn: (item) => TractorUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy),
    notificationType: 'tractors.verifications',
    permissionKey: 'notifications.tractor_manager',
    titleLabel: 'Tractor'
})
