import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { supabase } from '../../services/DatabaseService'

const RealtimeContext = createContext(null)

const ASSET_TABLES = ['mixers', 'tractors', 'trailers', 'heavy_equipment', 'pickup_trucks', 'operators']

export function RealtimeProvider({ children }) {
    const listenersRef = useRef(new Map())
    const channelsRef = useRef(new Map())
    const [isConnected, setIsConnected] = useState(false)

    const notifyListeners = useCallback((table, eventType, data) => {
        const tableListeners = listenersRef.current.get(table) || []
        tableListeners.forEach((listener) => {
            try {
                listener(eventType, data)
            } catch (e) {}
        })

        const allListeners = listenersRef.current.get('*') || []
        allListeners.forEach((listener) => {
            try {
                listener(eventType, { ...data, table })
            } catch (e) {}
        })
    }, [])

    const subscribe = useCallback((table, callback) => {
        if (!listenersRef.current.has(table)) {
            listenersRef.current.set(table, [])
        }
        listenersRef.current.get(table).push(callback)

        return () => {
            const listeners = listenersRef.current.get(table) || []
            const index = listeners.indexOf(callback)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [])

    const subscribeToAll = useCallback(
        (callback) => {
            return subscribe('*', callback)
        },
        [subscribe]
    )

    useEffect(() => {
        ASSET_TABLES.forEach((table) => {
            const channelName = `global-${table}-realtime`

            const channel = supabase
                .channel(channelName)
                .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
                    notifyListeners(table, payload.eventType, {
                        eventType: payload.eventType,
                        new: payload.new,
                        old: payload.old
                    })
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        channelsRef.current.set(channelName, channel)
                        if (channelsRef.current.size === ASSET_TABLES.length) {
                            setIsConnected(true)
                        }
                    }
                })
        })

        return () => {
            channelsRef.current.forEach((channel, name) => {
                supabase.removeChannel(channel)
            })
            channelsRef.current.clear()
            setIsConnected(false)
        }
    }, [notifyListeners])

    const value = {
        isConnected,
        subscribe,
        subscribeToAll
    }

    return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

const noopContext = {
    isConnected: false,
    subscribe: () => () => {},
    subscribeToAll: () => () => {}
}

export function useRealtime() {
    const context = useContext(RealtimeContext)
    if (!context) {
        return noopContext
    }
    return context
}

export function useAssetRealtime(table, onUpdate) {
    const { subscribe } = useRealtime()

    useEffect(() => {
        if (!table || !onUpdate) return

        const unsubscribe = subscribe(table, (eventType, data) => {
            onUpdate(eventType, data)
        })

        return unsubscribe
    }, [table, onUpdate, subscribe])
}

export function useAllAssetsRealtime(onUpdate) {
    const { subscribeToAll } = useRealtime()

    useEffect(() => {
        if (!onUpdate) return

        const unsubscribe = subscribeToAll((eventType, data) => {
            onUpdate(eventType, data)
        })

        return unsubscribe
    }, [onUpdate, subscribeToAll])
}

export default RealtimeContext
