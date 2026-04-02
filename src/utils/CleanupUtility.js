import { UserService } from '../services/UserService'
import { hasNoOperator } from './BaseAssetUtility'
import ValidationUtility from './ValidationUtility'
import VerifiedUtility from './VerifiedUtility'

/** Resolves asset make/model/year across different field naming conventions. */
function getFieldValue(item, fieldType) {
    switch (fieldType) {
        case 'make':
            return item.make || item.equipmentMake || item.tractorMake || item.trailerMake
        case 'model':
            return item.model || item.equipmentModel || item.tractorModel || item.trailerModel
        case 'year':
            return item.year || item.yearMade || item.tractorYear || item.trailerYear
        default:
            return null
    }
}

/**
 * Data-integrity cleanup routines for fleet assets.
 * Fixes null-operator assignments and invalidates verification status
 * on assets that fail completeness checks (missing VIN, make, model, year, or operator).
 */
class CleanupUtility {
    static async cleanupNullOperators(items, updateItemFn, getAllItemsFn = null) {
        const allItems = items || (getAllItemsFn ? await getAllItemsFn() : [])
        const itemsWithNullOperators = allItems.filter(
            (item) => item.assignedOperator === '0' || item.assignedOperator === 0
        )
        if (itemsWithNullOperators.length === 0) {
            return { fixed: 0, total: 0 }
        }
        const user = await UserService.getCurrentUser()
        const userId = user?.id || user
        if (!userId) {
            return {
                error: 'No user ID available',
                fixed: 0,
                total: itemsWithNullOperators.length
            }
        }
        const results = await Promise.allSettled(
            itemsWithNullOperators.map((item) =>
                updateItemFn(
                    item.id,
                    {
                        assignedOperator: null,
                        ...(item.status === 'Active' && { status: 'Spare' })
                    },
                    userId
                )
            )
        )
        const fixed = results.filter((r) => r.status === 'fulfilled').length
        return {
            fixed,
            total: itemsWithNullOperators.length
        }
    }
    static async verificationCheck(items, updateItemFn, assetType = 'mixer', operators = []) {
        if (!items || items.length === 0) {
            return { fixed: 0, invalidItems: [], total: 0 }
        }
        const user = await UserService.getCurrentUser()
        const userId = user?.id || user
        if (!userId) {
            return {
                error: 'No user ID available',
                fixed: 0,
                invalidItems: [],
                total: 0
            }
        }
        const invalidItems = items.filter((item) => {
            if (!VerifiedUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy)) {
                return false
            }
            return CleanupUtility._getVerificationIssues(item, assetType, operators).length > 0
        })
        if (invalidItems.length === 0) {
            return { fixed: 0, invalidItems: [], total: 0 }
        }
        const results = await Promise.allSettled(
            invalidItems.map((item) => {
                const oneWeekAgo = new Date()
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
                return updateItemFn(
                    item.id,
                    {
                        updatedLast: oneWeekAgo.toISOString()
                    },
                    userId
                )
            })
        )
        const fixed = results.filter((r) => r.status === 'fulfilled').length
        return {
            fixed,
            invalidItems: invalidItems.map((item) => ({
                id: item.id,
                issues: CleanupUtility._getVerificationIssues(item, assetType, operators),
                number: item.truckNumber || item.truck_number || 'Unknown'
            })),
            total: invalidItems.length
        }
    }
    static _getVerificationIssues(item, assetType, operators = []) {
        const issues = []
        if (item.status === 'Retired') {
            issues.push('Retired assets cannot be verified')
        }
        if (assetType !== 'equipment') {
            const hasValidVIN = item.vin && ValidationUtility.isVIN(item.vin)
            if (!hasValidVIN) {
                issues.push('Invalid or missing VIN')
            }
        }
        if (!getFieldValue(item, 'make')) {
            issues.push('Missing Make')
        }
        if (!getFieldValue(item, 'model')) {
            issues.push('Missing Model')
        }
        if (!getFieldValue(item, 'year')) {
            issues.push('Missing Year')
        }
        if ((assetType === 'mixer' || assetType === 'tractor') && item.status === 'Active') {
            if (hasNoOperator(item)) {
                issues.push(`Missing or invalid operator for active ${assetType}`)
            } else if (operators && operators.length > 0) {
                const operatorExists = operators.some((op) => op.employeeId === item.assignedOperator)
                if (!operatorExists) {
                    issues.push('Assigned operator does not exist')
                }
            }
        }
        return issues
    }
}
export default CleanupUtility
