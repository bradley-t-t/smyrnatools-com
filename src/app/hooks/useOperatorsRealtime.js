import { useEffect } from 'react'

import { Database } from '../../services/DatabaseService'
import {
    applyOperatorUpdatePayload,
    mapOperatorInsertPayload
} from '../../views/people/operators/list/operatorRealtimeMapper'

/**
 * Subscribes to database realtime changes on the operators table so the list
 * reflects INSERT/UPDATE/DELETE events without refetching. The setOperators
 * callback receives the same immutable updater shape used previously.
 */
export default function useOperatorsRealtime(setOperators) {
    useEffect(() => {
        const channel = Database.channel('operators-realtime-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'operators' }, (payload) => {
                const newData = payload.new
                setOperators((prev) => {
                    if (prev.some((o) => o.employeeId === newData.employee_id)) return prev
                    return [...prev, mapOperatorInsertPayload(newData)]
                })
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'operators' }, (payload) => {
                const updatedData = payload.new
                setOperators((prev) =>
                    prev.map((operator) =>
                        operator.employeeId === updatedData.employee_id
                            ? applyOperatorUpdatePayload(operator, updatedData)
                            : operator
                    )
                )
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'operators' }, (payload) => {
                setOperators((prev) => prev.filter((operator) => operator.employeeId !== payload.old.employee_id))
            })
            .subscribe()
        return () => {
            Database.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
}
