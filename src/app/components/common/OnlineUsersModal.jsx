import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { RegionService } from '../../../services/RegionService'
import { UserPresenceService } from '../../../services/UserPresenceService'
import { UserService } from '../../../services/UserService'

const MILLISECONDS_PER_MINUTE = 60000
const MILLISECONDS_PER_HOUR = 3600000
const MILLISECONDS_PER_DAY = 86400000

function extractRoleNames(rolesData) {
    if (!Array.isArray(rolesData)) return []
    return rolesData.map((r) => (typeof r === 'string' ? r : (r?.name ?? null))).filter(Boolean)
}

function extractRegionCode(profile) {
    if (!profile) return null
    if (Array.isArray(profile.regions) && profile.regions.length > 0) return profile.regions[0]
    return profile.region_code || profile.regionCode || null
}

async function buildCurrentUserEntry(userId) {
    const [name, rolesData, profile, roleWeight] = await Promise.all([
        UserService.getUserDisplayName(userId),
        UserService.getUserRoles(userId),
        UserService.getUserProfile(userId).catch(() => null),
        UserService.getUserWeight(userId).catch(() => 0)
    ])
    return {
        id: userId,
        isCurrentUser: true,
        lastActivity: new Date().toISOString(),
        name,
        regionCode: extractRegionCode(profile),
        roleWeight: roleWeight || 0,
        roles: extractRoleNames(rolesData)
    }
}

function ensureCurrentUser(users, currentId) {
    if (!currentId) return users
    const hasCurrentUser = users.some((u) => u.id === currentId)
    if (hasCurrentUser) return users.map((u) => (u.id === currentId ? { ...u, isCurrentUser: true } : u))
    return users
}

function sortByRoleWeight(users) {
    return [...users].sort((a, b) => (b.roleWeight || 0) - (a.roleWeight || 0))
}

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

const ROLE_COLORS = [
    { color: '#dc2626', match: (r) => r.includes('admin') || r.includes('owner') },
    { color: '#a51e36', match: (r) => r.includes('manager') || r.includes('regional') },
    { color: '#0891b2', match: (r) => r.includes('plant') },
    { color: '#059669', match: (r) => r.includes('instructor') || r.includes('trainer') }
]

function getRoleColor(roles) {
    if (!roles?.length) return '#64748b'
    const role = roles[0].toLowerCase()
    return ROLE_COLORS.find(({ match }) => match(role))?.color ?? '#64748b'
}

function OnlineUsersModal({ isOpen, onClose, anchorRect }) {
    const [onlineUsers, setOnlineUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [regionNames, setRegionNames] = useState({})
    const [currentUserId, setCurrentUserId] = useState(null)

    const resolveRegionNames = useCallback(
        async (users) => {
            const codes = [...new Set(users.map((u) => u.regionCode).filter(Boolean))]
            const names = { ...regionNames }
            let changed = false
            for (const code of codes) {
                if (names[code]) continue
                try {
                    const region = await RegionService.fetchRegionByCode(code)
                    names[code] = region?.regionName || region?.region_name || code
                } catch {
                    names[code] = code
                }
                changed = true
            }
            if (changed) setRegionNames(names)
        },
        [regionNames]
    )

    useEffect(() => {
        if (!isOpen) return

        const fetchUsers = async () => {
            setIsLoading(true)
            try {
                const currentUser = await UserService.getCurrentUser()
                const currentId = currentUser?.id || null
                setCurrentUserId(currentId)

                let users = (await UserPresenceService.getOnlineUsers()) || []
                users = ensureCurrentUser(users, currentId)

                if (currentId && !users.some((u) => u.id === currentId)) {
                    const entry = await buildCurrentUserEntry(currentId)
                    users = [...users, entry]
                }

                users = sortByRoleWeight(users)
                setOnlineUsers(users)
                await resolveRegionNames(users)
            } catch {
                setOnlineUsers([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchUsers()

        const handleUpdate = async (incoming) => {
            let users = [...(incoming || [])]
            users = ensureCurrentUser(users, currentUserId)

            if (currentUserId && !users.some((u) => u.id === currentUserId)) {
                try {
                    const entry = await buildCurrentUserEntry(currentUserId)
                    users = [...users, entry]
                } catch {}
            }

            setOnlineUsers(sortByRoleWeight(users))
        }

        UserPresenceService.addListener(handleUpdate)
        return () => UserPresenceService.removeListener(handleUpdate)
    }, [isOpen, currentUserId])

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
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                            {onlineUsers.length}
                        </span>
                    </div>
                    <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        onClick={onClose}
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
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
                                const roleColor = getRoleColor(user.roles)
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
                                                                backgroundColor: `${roleColor}15`,
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
                                                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                                    <i className="fas fa-clock text-[10px]" />
                                                    <span>
                                                        {user.isCurrentUser
                                                            ? 'Active now'
                                                            : `Last active ${formatLastActivity(user.lastActivity)}`}
                                                    </span>
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
