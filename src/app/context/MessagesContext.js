import React, { createContext, useContext } from 'react'

import { useMessages } from '../hooks/useMessages'

const MessagesContext = createContext(null)

/**
 * Provides a single shared useMessages instance to the component tree.
 * Prevents Navigation and NotificationsView from running duplicate hooks
 * with separate state — unread counts stay in sync everywhere.
 */
export function MessagesProvider({ userId, children }) {
    const messagesHook = useMessages(userId)
    return <MessagesContext.Provider value={messagesHook}>{children}</MessagesContext.Provider>
}

/** @returns The shared messages hook (conversations, unreadCount, markAsRead, etc.) */
export function useSharedMessages() {
    const context = useContext(MessagesContext)
    if (!context) throw new Error('useSharedMessages must be used within a MessagesProvider')
    return context
}
