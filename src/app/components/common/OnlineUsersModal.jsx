/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserPresenceService } from '../../../services/UserPresenceService'
import { useUserAccents } from '../../hooks/useUserAccent'
import Badge from './Badge'
import UserAvatar from './UserAvatar'

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

    useEffect(() => {
        if (!isOpen) return
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    const onlineUserIds = useMemo(() => onlineUsers.map((u) => u.id), [onlineUsers])
    const accentByUserId = useUserAccents(onlineUserIds)

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
                role="dialog"
                aria-modal="false"
                aria-label="Online users"
                style={modalStyle}
                className="flex max-h-[70vh] w-80 flex-col overflow-hidden rounded border border-border-light bg-bg-primary shadow-modal animate-fade-slide-in motion-reduce:animate-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-border-light px-3 py-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-bg-tertiary text-text-secondary">
                            <i className="fas fa-users text-[11px]" aria-hidden="true" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                            Online Users
                        </span>
                        {!isLoading && (
                            <Badge tone="neutral" size="xs" weight="bold" className="font-mono tabular-nums">
                                {onlineUsers.length}
                            </Badge>
                        )}
                    </div>
                    <button type="button"
                        className="flex h-6 w-6 items-center justify-center rounded text-text-secondary cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                        onClick={onClose}
                        aria-label="Close online users"
                    >
                        <i className="fas fa-times text-[11px]" aria-hidden="true" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading && onlineUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
                            <i className="fas fa-spinner fa-spin mb-2 text-xl" aria-hidden="true" />
                            <span className="text-[12px]">Loading users…</span>
                        </div>
                    ) : onlineUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
                            <i className="fas fa-user-slash mb-2 text-2xl" aria-hidden="true" />
                            <span className="text-[12px] font-semibold text-text-primary">No users online</span>
                        </div>
                    ) : (
                        <div role="list">
                            {onlineUsers.map((user) => {
                                /* Source data occasionally repeats the same role on a user
                                 * — usually from a join hitting both a role assignment row
                                 * and the role's name string with mismatched casing. Dedupe
                                 * case-insensitively here so the badge row reads once-per-
                                 * role, keeping the first encountered casing for display. */
                                const uniqueRoles = []
                                const seenRoleKeys = new Set()
                                for (const role of user.roles || []) {
                                    if (!role) continue
                                    const key = String(role).trim().toLowerCase()
                                    if (!key || seenRoleKeys.has(key)) continue
                                    seenRoleKeys.add(key)
                                    uniqueRoles.push(role)
                                }
                                const roleColor =
                                    (uniqueRoles[0] && roleColorMap[uniqueRoles[0].toLowerCase()]) ?? '#64748b'
                                return (
                                    <div
                                        key={user.id}
                                        role="listitem"
                                        className="border-b border-border-light px-3 py-2 transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover"
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <UserAvatar
                                                name={user.name}
                                                accentColor={accentByUserId[user.id]}
                                                size="md"
                                                rounded="md"
                                            >
                                                <span
                                                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-600 border-2 border-bg-primary motion-reduce:animate-none"
                                                    aria-hidden="true"
                                                />
                                            </UserAvatar>
                                            <div className="min-w-0 flex-1">
                                                <span className="block truncate text-[12px] font-semibold text-text-primary">
                                                    {user.name || 'Unknown User'}
                                                    {user.isCurrentUser && (
                                                        <span className="ml-1 font-normal text-text-tertiary">
                                                            (You)
                                                        </span>
                                                    )}
                                                </span>
                                                {uniqueRoles.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                                        {uniqueRoles.map((role) => (
                                                            <Badge
                                                                key={role.toLowerCase()}
                                                                variant="custom"
                                                                bg={roleColorMap[role.toLowerCase()] ?? roleColor}
                                                                fg="#ffffff"
                                                                size="xs"
                                                                weight="semibold"
                                                                className="force-white-text"
                                                            >
                                                                {role}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                                {user.regionCode && (
                                                    <div className="mt-1 text-[10.5px] text-text-secondary truncate">
                                                        {regionNames[user.regionCode] || user.regionCode}
                                                    </div>
                                                )}
                                                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-text-tertiary">
                                                    <span className="flex items-center gap-1">
                                                        {(user.activeDevices || ['desktop']).map((d) => (
                                                            <i
                                                                key={d}
                                                                className={`fas fa-${d === 'mobile' ? 'mobile-alt' : 'desktop'} text-[9px]`}
                                                                aria-hidden="true"
                                                            />
                                                        ))}
                                                    </span>
                                                    <span className="font-mono tabular-nums">
                                                        Active {formatLastActivity(user.lastActivity)}
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
