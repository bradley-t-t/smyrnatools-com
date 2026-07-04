import { useCallback, useState } from 'react'

import { OperatorService } from '../../services/OperatorService'

/**
 * Tracks the operators shown in the assignment modal, including the
 * "last unassigned" operator so the user can undo an unassign immediately.
 */
export default function useMixerOperatorsModal({ operators, setOperators }) {
    const [operatorModalOperators, setOperatorModalOperators] = useState([])
    const [lastUnassignedOperatorId, setLastUnassignedOperatorId] = useState(null)

    const fetchOperatorsForModal = useCallback(async () => {
        let dbOperators = await OperatorService.fetchOperators()
        if (lastUnassignedOperatorId) {
            const unassignedOperator = dbOperators.find((op) => op.employeeId === lastUnassignedOperatorId)
            if (unassignedOperator) dbOperators = [...dbOperators, unassignedOperator]
        }
        setOperatorModalOperators(dbOperators)
    }, [lastUnassignedOperatorId])

    const refreshOperators = useCallback(async () => {
        const updatedOperators = await OperatorService.fetchOperators()
        setOperators(updatedOperators)
    }, [setOperators])

    return {
        fetchOperatorsForModal,
        lastUnassignedOperatorId,
        operatorModalOperators,
        operators,
        refreshOperators,
        setLastUnassignedOperatorId
    }
}
