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
                style={modalStyle}
                className="w-80 max-h-[70vh] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-users text-slate-600" />
                        <span className="font-semibold text-slate-800">Online Users</span>
                        {!isLoading && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                                {onlineUsers.length}
                            </span>
                        )}
                    </div>
                    <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        onClick={onClose}
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading && onlineUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="fas fa-spinner fa-spin text-xl mb-2" />
                            <span className="text-sm">Loading users...</span>
                        </div>
                    ) : onlineUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="fas fa-user-slash text-2xl mb-2" />
                            <span className="text-sm">No users online</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {onlineUsers.map((user) => {
                                const roleColor =
                                    (user.roles?.[0] && roleColorMap[user.roles[0].toLowerCase()]) ?? '#64748b'
                                return (
                                    <div key={user.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                    <i className="fas fa-user text-slate-500" />
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-sm text-slate-800 truncate block">
                                                    {user.name || 'Unknown User'}
                                                    {user.isCurrentUser && (
                                                        <span className="text-slate-400 font-normal ml-1">(You)</span>
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
                                                        <span className="text-xs text-slate-500">
                                                            {regionNames[user.regionCode] || user.regionCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                                                    <i
                                                        className={`fas fa-${user.deviceType === 'mobile' ? 'mobile-alt' : 'desktop'} text-[10px]`}
                                                    />
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
