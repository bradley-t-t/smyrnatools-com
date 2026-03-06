import { useCallback, useEffect, useRef } from 'react'

import { supabase } from '../../services/DatabaseService'
const activeChannels = new Map()
/**
 * Supabase realtime subscription hook with debounced change processing.
 * Handles INSERT, UPDATE, DELETE events with per-event-type callbacks.
 */
export function useRealtimeSubscription(config) {
    const {
        table,
        event = '*',
        filter = null,
        onInsert,
        onUpdate,
        onDelete,
        onChange,
        enabled = true,
        debounceMs = 100
    } = config
    const debounceTimerRef = useRef(null)
    const pendingChangesRef = useRef([])
    const callbacksRef = useRef({ onChange, onDelete, onInsert, onUpdate })
    callbacksRef.current = { onChange, onDelete, onInsert, onUpdate }
    const processChanges = useCallback(() => {
        if (pendingChangesRef.current.length === 0) return
        const changes = [...pendingChangesRef.current]
        pendingChangesRef.current = []
        const {
            onChange: _onChange,
            onInsert: _onInsert,
            onUpdate: _onUpdate,
            onDelete: _onDelete
        } = callbacksRef.current
        changes.forEach((payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload
            if (_onChange) {
                _onChange(payload)
            }
            switch (eventType) {
                case 'INSERT':
                    if (_onInsert) _onInsert(newRecord, payload)
                    break
                case 'UPDATE':
                    if (_onUpdate) _onUpdate(newRecord, oldRecord, payload)
                    break
                case 'DELETE':
                    if (_onDelete) _onDelete(oldRecord, payload)
                    break
                default:
                    break
            }
        })
    }, [])
    const handleChange = useCallback(
        (payload) => {
            pendingChangesRef.current.push(payload)
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
            debounceTimerRef.current = setTimeout(() => {
                processChanges()
            }, debounceMs)
        },
        [processChanges, debounceMs]
    )
    useEffect(() => {
        if (!enabled || !table) return
        const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`
        const subscriptionConfig = {
            event,
            schema: 'public',
            table
        }
        if (filter) {
            subscriptionConfig.filter = filter
        }
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', subscriptionConfig, handleChange)
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    activeChannels.set(channelName, channel)
                }
            })
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
            activeChannels.delete(channelName)
            supabase.removeChannel(channel)
        }
    }, [table, event, filter, enabled, handleChange])
}
/**
 * Subscribes to multiple Supabase tables simultaneously,
 * invoking a shared onAnyChange handler for any event.
 */
export function useMultiTableSubscription(tables, handlers) {
    const { onAnyChange, enabled = true } = handlers
    useEffect(() => {
        if (!enabled || !tables || tables.length === 0) return
        const channelName = `realtime-multi-${tables.join('-')}-${Date.now()}`
        let channel = supabase.channel(channelName)
        tables.forEach((table) => {
            channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
                if (onAnyChange) {
                    onAnyChange({ ...payload, table })
                }
            })
        })
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                activeChannels.set(channelName, channel)
            }
        })
        return () => {
            activeChannels.delete(channelName)
            supabase.removeChannel(channel)
        }
    }, [tables, onAnyChange, enabled])
}
/** Imperatively subscribes to a single Supabase table outside of React lifecycle. */
export function subscribeToTable(table, callback, options = {}) {
    const { event = '*', filter = null } = options
    const channelName = `manual-${table}-${Date.now()}`
    const subscriptionConfig = {
        event,
        schema: 'public',
        table
    }
    if (filter) {
        subscriptionConfig.filter = filter
    }
    const channel = supabase.channel(channelName).on('postgres_changes', subscriptionConfig, callback).subscribe()
    return () => {
        supabase.removeChannel(channel)
    }
}
export default useRealtimeSubscription
