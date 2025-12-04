import {UserService} from '../services/UserService';
import ValidationUtility from './ValidationUtility';
import VerifiedUtility from './VerifiedUtility';

class CleanupUtility {
    static async cleanupNullOperators(items, updateItemFn, getAllItemsFn = null) {
        const allItems = items || (getAllItemsFn ? await getAllItemsFn() : []);
        
        const itemsWithNullOperators = allItems.filter(item => 
            item.assignedOperator === '0' || item.assignedOperator === 0
        );
        
        if (itemsWithNullOperators.length === 0) {
            return { total: 0, fixed: 0 };
        }

        const user = await UserService.getCurrentUser();
        const userId = user?.id || user;
        
        if (!userId) {
            return { 
                total: itemsWithNullOperators.length, 
                fixed: 0, 
                error: 'No user ID available' 
            };
        }
        
        const results = await Promise.allSettled(
            itemsWithNullOperators.map(item => 
                updateItemFn(item.id, {
                    assignedOperator: null,
                    ...(item.status === 'Active' && { status: 'Spare' })
                }, userId)
            )
        );
        
        const fixed = results.filter(r => r.status === 'fulfilled').length;
        
        return { 
            total: itemsWithNullOperators.length, 
            fixed 
        };
    }

    static async verificationCheck(items, updateItemFn, assetType = 'mixer', operators = []) {
        if (!items || items.length === 0) {
            return { total: 0, fixed: 0, invalidItems: [] };
        }

        const user = await UserService.getCurrentUser();
        const userId = user?.id || user;
        
        if (!userId) {
            return { 
                total: 0, 
                fixed: 0, 
                invalidItems: [],
                error: 'No user ID available' 
            };
        }

        const invalidItems = items.filter(item => {
            const isMarkedVerified = VerifiedUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy);
            
            if (!isMarkedVerified) {
                return false;
            }

            const hasValidVIN = item.vin && ValidationUtility.isVIN(item.vin);
            const hasMake = !!item.make;
            const hasModel = !!item.model;
            const hasYear = !!item.year;
            const isRetired = item.status === 'Retired';

            if (isRetired) {
                return true;
            }

            if (!hasValidVIN || !hasMake || !hasModel || !hasYear) {
                return true;
            }

            if (assetType === 'mixer' && item.status === 'Active') {
                const hasValidOperator = item.assignedOperator && 
                    item.assignedOperator !== '0' && 
                    item.assignedOperator !== 0 &&
                    item.assignedOperator !== null &&
                    item.assignedOperator !== undefined;

                if (!hasValidOperator) {
                    return true;
                }

                if (operators && operators.length > 0) {
                    const operatorExists = operators.some(op => op.employeeId === item.assignedOperator);
                    if (!operatorExists) {
                        return true;
                    }
                }
            }

            return false;
        });

        if (invalidItems.length === 0) {
            return { total: 0, fixed: 0, invalidItems: [] };
        }

        const results = await Promise.allSettled(
            invalidItems.map(item => {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                
                return updateItemFn(item.id, {
                    updatedLast: oneWeekAgo.toISOString()
                }, userId);
            })
        );
        
        const fixed = results.filter(r => r.status === 'fulfilled').length;
        
        return { 
            total: invalidItems.length, 
            fixed,
            invalidItems: invalidItems.map(item => ({
                id: item.id,
                number: item.truckNumber || item.truck_number || 'Unknown',
                issues: CleanupUtility._getVerificationIssues(item, assetType, operators)
            }))
        };
    }

    static _getVerificationIssues(item, assetType, operators = []) {
        const issues = [];

        if (item.status === 'Retired') {
            issues.push('Retired assets cannot be verified');
        }

        if (!item.vin || !ValidationUtility.isVIN(item.vin)) {
            issues.push('Invalid or missing VIN');
        }

        if (!item.make) {
            issues.push('Missing Make');
        }

        if (!item.model) {
            issues.push('Missing Model');
        }

        if (!item.year) {
            issues.push('Missing Year');
        }

        if (assetType === 'mixer' && item.status === 'Active') {
            const hasValidOperator = item.assignedOperator && 
                item.assignedOperator !== '0' && 
                item.assignedOperator !== 0 &&
                item.assignedOperator !== null &&
                item.assignedOperator !== undefined;

            if (!hasValidOperator) {
                issues.push('Missing or invalid operator for active mixer');
            } else if (operators && operators.length > 0) {
                const operatorExists = operators.some(op => op.employeeId === item.assignedOperator);
                if (!operatorExists) {
                    issues.push('Assigned operator does not exist');
                }
            }
        }

        return issues;
    }
}

export default CleanupUtility;
