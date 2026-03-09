import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { OnlineUsersService } from '../../../services/OnlineUsersService'
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
    const [onlineUsers, setOnlineUsers] = useState(() => OnlineUsersService.getUsers())
    const [regionNames, setRegionNames] = useState(() => OnlineUsersService.getRegionNames())
    const [roleColorMap, setRoleColorMap] = useState(() => OnlineUsersService.getRoleColorMap())
    const [isLoading, setIsLoading] = useState(() => OnlineUsersService.getIsLoading())
    useEffect(() => {
        if (!isOpen) return
        setOnlineUsers(OnlineUsersService.getUsers())
        setRegionNames(OnlineUsersService.getRegionNames())
        setRoleColorMap(OnlineUsersService.getRoleColorMap())
        setIsLoading(OnlineUsersService.getIsLoading())
        OnlineUsersService.refresh(true)
        const handleUpdate = (snapshot) => {
            setOnlineUsers(snapshot.users)
            setRegionNames(snapshot.regionNames)
            setRoleColorMap(snapshot.roleColorMap)
            setIsLoading(snapshot.isLoading)
        }
        OnlineUsersService.addListener(handleUpdate)
        return () => OnlineUsersService.removeListener(handleUpdate)
    }, [isOpen])
    if (!isOpen) return null
    const modalStyle = {
        position: 'fixed',
        right: anchorRect ? window.innerWidth - anchorRect.right : '16px',
        top: anchorRect ? anchorRect.bottom + 8 : '80px',
        zIndex: 1000
    }
    const modal = (
        <div className="fixed inset-0 z-[999]" onClick={onClose}>
            <div
                style={{ ...modalStyle, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                className="w-80 max-h-[70vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}
                >
                    <div className="flex items-center gap-2">
                        <i className="fas fa-users" style={{ color: 'var(--text-secondary)' }} />
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Online Users
                        </span>
                        {!isLoading && (
                            <span
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            >
                                {onlineUsers.length}
                            </span>
                        )}
                    </div>
                    <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                        onClick={onClose}
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading && onlineUsers.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center py-12"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-spinner fa-spin text-xl mb-2" />
                            <span className="text-sm">Loading users...</span>
                        </div>
                    ) : onlineUsers.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center py-12"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-user-slash text-2xl mb-2" />
                            <span className="text-sm">No users online</span>
                        </div>
                    ) : (
                        <div style={{ borderColor: 'var(--border-light)' }} className="divide-y">
                            {onlineUsers.map((user) => {
                                const roleColor =
                                    (user.roles?.[0] && roleColorMap[user.roles[0].toLowerCase()]) ?? '#64748b'
                                return (
                                    <div
                                        key={user.id}
                                        className="px-4 py-3 transition-colors"
                                        style={{ borderColor: 'var(--border-light)' }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')
                                        }
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="relative flex-shrink-0">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                                                >
                                                    <i
                                                        className="fas fa-user"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    />
                                                </div>
                                                <div
                                                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2"
                                                    style={{ borderColor: 'var(--bg-primary)' }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span
                                                    className="font-semibold text-sm truncate block"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {user.name || 'Unknown User'}
                                                    {user.isCurrentUser && (
                                                        <span
                                                            className="font-normal ml-1"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            (You)
                                                        </span>
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {user.roles?.length > 0 && (
                                                        <span
                                                            className="text-xs font-medium px-1.5 py-0.5 rounded"
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
                                                        <span
                                                            className="text-xs"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            {regionNames[user.regionCode] || user.regionCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    className="flex items-center gap-1.5 mt-1 text-xs"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
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
