import {useCallback, useEffect, useRef} from 'react'
import {useRealtime} from '../app/context/RealtimeContext'

const TABLE_MAP = {
    mixers: 'mixers',
    tractors: 'tractors',
    trailers: 'trailers',
    equipment: 'equipment',
    'heavy equipment': 'equipment',
    'pickup trucks': 'pickup_trucks',
    'pickup_trucks': 'pickup_trucks',
    operators: 'operators',
    plants: 'plants',
    regions: 'regions',
    list: 'list_items'
}

export function useAssetRealtimeUpdates(assetType, options = {}) {
    const {
        onInsert,
        onUpdate,
        onDelete,
        onAnyChange,
        updateLocalState,
        enabled = true
    } = options

    const {subscribe} = useRealtime()
    const handlersRef = useRef({onInsert, onUpdate, onDelete, onAnyChange, updateLocalState})

    useEffect(() => {
        handlersRef.current = {onInsert, onUpdate, onDelete, onAnyChange, updateLocalState}
    }, [onInsert, onUpdate, onDelete, onAnyChange, updateLocalState])

    const handleRealtimeEvent = useCallback((eventType, data) => {
        const handlers = handlersRef.current

        if (handlers.onAnyChange) {
            handlers.onAnyChange(eventType, data)
        }

        if (handlers.updateLocalState) {
            switch (eventType) {
                case 'INSERT':
                    handlers.updateLocalState(prev => {
                        if (!Array.isArray(prev)) return prev
                        const exists = prev.some(item => 
                            item.id === data.new?.id || 
                            item.truckNumber === data.new?.truck_number
                        )
                        if (exists) return prev
                        return [...prev, data.new]
                    })
                    break
                case 'UPDATE':
                    handlers.updateLocalState(prev => {
                        if (!Array.isArray(prev)) return prev
                        return prev.map(item => {
                            const matchesId = item.id === data.new?.id
                            const matchesTruckNumber = item.truckNumber === data.new?.truck_number
                            if (matchesId || matchesTruckNumber) {
                                return {...item, ...data.new}
                            }
                            return item
                        })
                    })
                    break
                case 'DELETE':
                    handlers.updateLocalState(prev => {
                        if (!Array.isArray(prev)) return prev
                        return prev.filter(item => 
                            item.id !== data.old?.id && 
                            item.truckNumber !== data.old?.truck_number
                        )
                    })
                    break
                default:
                    break
            }
        }

        switch (eventType) {
            case 'INSERT':
                if (handlers.onInsert) handlers.onInsert(data.new)
                break
            case 'UPDATE':
                if (handlers.onUpdate) handlers.onUpdate(data.new, data.old)
                break
            case 'DELETE':
                if (handlers.onDelete) handlers.onDelete(data.old)
                break
            default:
                break
        }
    }, [])

    useEffect(() => {
        if (!enabled || !assetType) return

        const tableName = TABLE_MAP[assetType.toLowerCase()] || assetType.toLowerCase()
        
        const unsubscribe = subscribe(tableName, handleRealtimeEvent)

        return unsubscribe
    }, [assetType, enabled, subscribe, handleRealtimeEvent])
}

export function useMultiAssetRealtimeUpdates(assetTypes, onAnyChange, enabled = true) {
    const {subscribe} = useRealtime()
    const onAnyChangeRef = useRef(onAnyChange)

    useEffect(() => {
        onAnyChangeRef.current = onAnyChange
    }, [onAnyChange])

    useEffect(() => {
        if (!enabled || !assetTypes || assetTypes.length === 0) return

        const unsubscribes = assetTypes.map(assetType => {
            const tableName = TABLE_MAP[assetType.toLowerCase()] || assetType.toLowerCase()
            return subscribe(tableName, (eventType, data) => {
                if (onAnyChangeRef.current) {
                    onAnyChangeRef.current(eventType, {...data, assetType})
                }
            })
        })

        return () => {
            unsubscribes.forEach(unsub => unsub())
        }
    }, [assetTypes, enabled, subscribe])
}

export default useAssetRealtimeUpdates
