/** Equipment verification notification provider — alerts when unverified equipment exists at a plant. */
import { EquipmentService } from '../services/EquipmentService'
import VerifiedUtility, { createVerificationNotificationProvider } from '../utils/VerifiedUtility'
export default createVerificationNotificationProvider({
    entityLabel: () => 'equipment',
    fetchAllItems: () => EquipmentService.getAllEquipments().catch(() => []),
    idPrefix: 'equipment-verify',
    isVerifiedFn: (item) => VerifiedUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy),
    notificationType: 'equipment.verifications',
    permissionKey: 'notifications.equipment_manager',
    titleLabel: 'Equipment'
})
