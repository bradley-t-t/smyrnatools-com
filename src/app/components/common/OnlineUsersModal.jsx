import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserPresenceService } from '../../../services/UserPresenceService'
const MILLISECONDS_PER_MINUTE = 60000
const MILLISECONDS_PER_HOUR = 3600000
const MILLISECONDS_PER_DAY = 86400000
function formatLastActivity(lastActivity) {
    if (!lastActivity) return 'Unknown'
    const diffMs = Date.now() - new Date(lastActivity).getTime()
    const diffMins = Math.floor(diffMs / MILLISECONDS_PER_MINUTE)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMs / MILLISECONDS_PER_HOUR)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffMs / MILLISECONDS_PER_DAY)}d ago`
}
function OnlineUsersModal({ isOpen, onClose, anchorRect }) {
    const [onlineUsers, setOnlineUsers] = useState(() => UserPresenceService.getOnlineUsers())
    const [regionNames, setRegionNames] = useState(() => UserPresenceService.getRegionNames())
    const [roleColorMap, setRoleColorMap] = useState(() => UserPresenceService.getRoleColorMap())
    const [isLoading, setIsLoading] = useState(() => UserPresenceService.getIsLoading())
    useEffect(() => {
        if (!isOpen) return
        setOnlineUsers(UserPresenceService.getOnlineUsers())
        setRegionNames(UserPresenceService.getRegionNames())
        setRoleColorMap(UserPresenceService.getRoleColorMap())
        setIsLoading(UserPresenceService.getIsLoading())
        UserPresenceService.refreshOnlineUsers(true)
        const handleUpdate = (snapshot) => {
            setOnlineUsers(snapshot.users)
            setRegionNames(snapshot.regionNames)
            setRoleColorMap(snapshot.roleColorMap)
            setIsLoading(snapshot.isLoading)
        }
        UserPresenceService.addOnlineUsersListener(handleUpdate)
        return () => UserPresenceService.removeOnlineUsersListener(handleUpdate)
    }, [isOpen])
    if (!isOpen) return null
    /* Position is runtime-computed from anchorRect, must stay inline */
    const modalStyle = {
        position: 'fixed',
        zIndex: 1000,
        ...(anchorRect?.useLeft
            ? { bottom: anchorRect.bottom, left: anchorRect.left }
            : {
                  right: anchorRect ? window.innerWidth - anchorRect.right : '16px',
                  top: anchorRect ? anchorRect.bottom + 8 : '80px'
              })
    }
    const modal = (
        <div className="fixed inset-0 z-[999]" onClick={onClose}>
            <div
                style={modalStyle}
                className="flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-xl border border-border-light bg-bg-primary shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-shrink-0 items-center justify-between border-b border-border-light bg-bg-primary px-4 py-3">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-users text-text-secondary" />
                        <span className="font-semibold text-text-primary">Online Users</span>
                        {!isLoading && (
                            <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary">
                                {onlineUsers.length}
                            </span>
                        )}
                    </div>
                    <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover"
                        onClick={onClose}
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading && onlineUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                            <i className="fas fa-spinner fa-spin mb-2 text-xl" />
                            <span className="text-sm">Loading users...</span>
                        </div>
                    ) : onlineUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                            <i className="fas fa-user-slash mb-2 text-2xl" />
                            <span className="text-sm">No users online</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-light">
                            {onlineUsers.map((user) => {
                                const roleColor =
                                    (user.roles?.[0] && roleColorMap[user.roles[0].toLowerCase()]) ?? '#64748b'
                                return (
                                    <div
                                        key={user.id}
                                        className="border-border-light px-4 py-3 transition-colors hover:bg-bg-hover"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="relative flex-shrink-0">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-tertiary">
                                                    <i className="fas fa-user text-text-secondary" />
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg-primary bg-green-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-text-primary">
                                                    {user.name || 'Unknown User'}
                                                    {user.isCurrentUser && (
                                                        <span className="ml-1 font-normal text-text-secondary">
                                                            (You)
                                                        </span>
                                                    )}
                                                </span>
                                                <div className="mt-0.5 flex items-center gap-1.5">
                                                    {user.roles?.length > 0 && (
                                                        <span
                                                            className="rounded px-1.5 py-0.5 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: roleColor.startsWith('hsl')
                                                                    ? roleColor
                                                                          .replace('hsl(', 'hsla(')
                                                                          .replace(')', ', 0.12)')
                                                                    : `${roleColor}1f`,
                                                                color: roleColor
                                                            }}
                                                        >
                                                            {user.roles[0]}
                                                        </span>
                                                    )}
                                                    {user.regionCode && (
                                                        <span className="text-xs text-text-secondary">
                                                            {regionNames[user.regionCode] || user.regionCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
                                                    <span className="flex items-center gap-1">
                                                        {(user.activeDevices || ['desktop']).map((d) => (
                                                            <i
                                                                key={d}
                                                                className={`fas fa-${d === 'mobile' ? 'mobile-alt' : 'desktop'} text-[10px]`}
                                                            />
                                                        ))}
                                                    </span>
                                                    <span>{`Active ${formatLastActivity(user.lastActivity)}`}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
    return ReactDOM.createPortal(modal, document.body)
}
export default OnlineUsersModal
