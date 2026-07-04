import { useEffect, useState } from 'react'

/* The dispatch data pipeline that powered per-customer service verdicts
 * (DispatchDataService + dispatch-data-service edge function) was removed
 * when the Operations Plan tool was retired. The Call List customer card
 * still renders the <CustomerServiceContext> panel, which gracefully
 * shows its "No measured service history" empty state when this hook
 * returns no orders. Until a replacement data source is wired up, this
 * hook is a no-op that yields the empty shape the panel expects. */

const EMPTY_STATE = {
    aggregate: null,
    error: null,
    isLoading: false,
    orders: []
}

export function useCustomerServiceLookup() {
    const [state] = useState(EMPTY_STATE)
    useEffect(() => {}, [])
    return state
}

export default useCustomerServiceLookup
