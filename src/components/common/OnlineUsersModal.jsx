import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { RegionService } from '../../services/RegionService'
import { UserPresenceService } from '../../services/UserPresenceService'
import { UserService } from '../../services/UserService'

function OnlineUsersModal({ isOpen, onClose, anchorRect }) {
    const [onlineUsers, setOnlineUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [regionNames, setRegionNames] = useState({})
    const [currentUserId, setCurrentUserId] = useState(null)

    useEffect(() => {
        if (!isOpen) return

        const fetchUsers = async () => {
            setIsLoading(true)
            try {
                const currentUser = await UserService.getCurrentUser()
                const currentId = currentUser?.id || null
                setCurrentUserId(currentId)

                let users = await UserPresenceService.getOnlineUsers()
                users = users || []

                if (currentId) {
                    const isCurrentUserInList = users.some((u) => u.id === currentId)
                    if (!isCurrentUserInList) {
                        const [name, rolesData, profile, userRoleWeight] = await Promise.all([
                            UserService.getUserDisplayName(currentId),
                            UserService.getUserRoles(currentId),
                            UserService.getUserProfile(currentId).catch(() => null),
                            UserService.getUserWeight(currentId).catch(() => 0)
                        ])

                        let roleNames = []
                        if (Array.isArray(rolesData)) {
                            roleNames = rolesData
                                .map((r) => {
                                    if (typeof r === 'string') return r
                                    if (r && typeof r === 'object' && r.name) return r.name
                                    return null
                                })
                                .filter(Boolean)
                        }

                        let regionCode = null
                        if (profile) {
                            if (profile.regions && Array.isArray(profile.regions) && profile.regions.length > 0) {
                                regionCode = profile.regions[0]
                            } else if (profile.region_code) {
                                regionCode = profile.region_code
                            } else if (profile.regionCode) {
                                regionCode = profile.regionCode
                            }
                        }

                        users.push({
                            id: currentId,
                            isCurrentUser: true,
                            lastActivity: new Date().toISOString(),
                            name,
                            regionCode,
                            roleWeight: userRoleWeight || 0,
                            roles: roleNames
                        })
                    } else {
                        users = users.map((u) => (u.id === currentId ? { ...u, isCurrentUser: true } : u))
                    }
                }

                users.sort((a, b) => (b.roleWeight || 0) - (a.roleWeight || 0))

                setOnlineUsers(users)

                const regionCodes = [...new Set(users.map((u) => u.regionCode).filter(Boolean))]
                const names = { ...regionNames }
                for (const code of regionCodes) {
                    if (!names[code]) {
                        try {
                            const region = await RegionService.fetchRegionByCode(code)
                            names[code] = region?.regionName || region?.region_name || code
                        } catch {
                            names[code] = code
                        }
                    }
                }
                setRegionNames(names)
            } catch {
                setOnlineUsers([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchUsers()

        const handleUpdate = async (users) => {
            let updatedUsers = [...(users || [])]

            const currentId = currentUserId
            if (currentId) {
                const isCurrentUserInList = updatedUsers.some((u) => u.id === currentId)
                if (!isCurrentUserInList) {
                    try {
                        const [name, rolesData, profile, userRoleWeight] = await Promise.all([
                            UserService.getUserDisplayName(currentId),
                            UserService.getUserRoles(currentId),
                            UserService.getUserProfile(currentId).catch(() => null),
                            UserService.getUserWeight(currentId).catch(() => 0)
                        ])

                        let roleNames = []
                        if (Array.isArray(rolesData)) {
                            roleNames = rolesData
                                .map((r) => {
                                    if (typeof r === 'string') return r
                                    if (r && typeof r === 'object' && r.name) return r.name
                                    return null
                                })
                                .filter(Boolean)
                        }

                        let regionCode = null
                        if (profile) {
                            if (profile.regions && Array.isArray(profile.regions) && profile.regions.length > 0) {
                                regionCode = profile.regions[0]
                            } else if (profile.region_code) {
                                regionCode = profile.region_code
                            } else if (profile.regionCode) {
                                regionCode = profile.regionCode
                            }
                        }

                        updatedUsers.push({
                            id: currentId,
                            isCurrentUser: true,
                            lastActivity: new Date().toISOString(),
                            name,
                            regionCode,
                            roleWeight: userRoleWeight || 0,
                            roles: roleNames
                        })
                    } catch {}
                } else {
                    updatedUsers = updatedUsers.map((u) => (u.id === currentId ? { ...u, isCurrentUser: true } : u))
                }
            }

            updatedUsers.sort((a, b) => (b.roleWeight || 0) - (a.roleWeight || 0))
            setOnlineUsers(updatedUsers)
        }

        UserPresenceService.addListener(handleUpdate)

        return () => {
            UserPresenceService.removeListener(handleUpdate)
        }
    }, [isOpen, currentUserId])

    const formatLastActivity = (lastActivity) => {
        if (!lastActivity) return 'Unknown'

        const now = new Date()
        const activity = new Date(lastActivity)
        const diffMs = now - activity
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    const getRoleColor = (roles) => {
        if (!roles || roles.length === 0) return '#64748b'
        const role = roles[0].toLowerCase()
        if (role.includes('admin') || role.includes('owner')) return '#dc2626'
        if (role.includes('manager') || role.includes('regional')) return '#a51e36'
        if (role.includes('plant')) return '#0891b2'
        if (role.includes('instructor') || role.includes('trainer')) return '#059669'
        return '#64748b'
    }

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
                        <i className="fas fa-users text-slate-600"></i>
                        <span className="font-semibold text-slate-800">Online Users</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                            {onlineUsers.length}
                        </span>
                    </div>
                    <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        onClick={onClose}
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="fas fa-spinner fa-spin text-xl mb-2"></i>
                            <span className="text-sm">Loading users...</span>
                        </div>
                    ) : onlineUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="fas fa-user-slash text-2xl mb-2"></i>
                            <span className="text-sm">No users online</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {onlineUsers.map((user) => (
                                <div key={user.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                <i className="fas fa-user text-slate-500"></i>
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-slate-800 truncate">
                                                    {user.name || 'Unknown User'}
                                                    {user.isCurrentUser && (
                                                        <span className="text-slate-400 font-normal ml-1">(You)</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {user.roles && user.roles.length > 0 && (
                                                    <span
                                                        className="text-xs font-medium px-1.5 py-0.5 rounded"
                                                        style={{
                                                            backgroundColor: `${getRoleColor(user.roles)}15`,
                                                            color: getRoleColor(user.roles)
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
                                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                                <i className="fas fa-clock text-[10px]"></i>
                                                <span>
                                                    {user.isCurrentUser
                                                        ? 'Active now'
                                                        : `Last active ${formatLastActivity(user.lastActivity)}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return ReactDOM.createPortal(modal, document.body)
}

export default OnlineUsersModal
