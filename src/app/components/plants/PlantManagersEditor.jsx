/* eslint-disable react/forbid-dom-props */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { UserService } from '../../../services/UserService'

const DROPDOWN_MAX_HEIGHT = 256
const DROPDOWN_VIEWPORT_GUTTER = 8

const formatUserLabel = (user) => {
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
    return name || user?.email || user?.id || 'Unknown user'
}

/**
 * Reusable manager-picker for a single plant. Owns the user-list fetch,
 * the search picker, and the attached-manager rows; the caller owns the
 * `managerIds` array and a single `onChange(nextIds)` setter. Used by
 * both `PlantsDetailView` (inline in the detail surface) and the
 * quick-edit modal mounted from `PlantsView`.
 *
 * The results dropdown is rendered through a `createPortal` to
 * `document.body` and positioned with `getBoundingClientRect` of the
 * input — that escapes every parent `overflow: hidden / auto` context
 * (the detail-view card and the modal body both clip) so the list is
 * always fully visible regardless of where the editor is mounted.
 */
export default function PlantManagersEditor({ managerIds, onChange, disabled = false }) {
    const [allUsers, setAllUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(true)
    const [pickerQuery, setPickerQuery] = useState('')
    const [pickerOpen, setPickerOpen] = useState(false)
    const [dropdownRect, setDropdownRect] = useState(null)
    const inputRef = useRef(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setUsersLoading(true)
            try {
                const users = await UserService.getAllUsersWithProfilesAndRoles()
                if (!cancelled) setAllUsers(Array.isArray(users) ? users : [])
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load users for plant manager picker:', error)
                    setAllUsers([])
                }
            } finally {
                if (!cancelled) setUsersLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const usersById = useMemo(() => {
        const map = new Map()
        allUsers.forEach((user) => {
            if (user?.id) map.set(user.id, user)
        })
        return map
    }, [allUsers])

    const attachedManagers = useMemo(
        () =>
            (managerIds || []).map((id) => ({
                id,
                user: usersById.get(id) || null
            })),
        [managerIds, usersById]
    )

    const pickerResults = useMemo(() => {
        const query = pickerQuery.trim().toLowerCase()
        const attachedSet = new Set(managerIds || [])
        return allUsers
            .filter((user) => user?.id && !attachedSet.has(user.id))
            .filter((user) => {
                if (!query) return true
                const haystack = `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`.toLowerCase()
                return haystack.includes(query)
            })
            .sort((a, b) => {
                const aName = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase()
                const bName = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase()
                return aName.localeCompare(bName)
            })
            .slice(0, 30)
    }, [allUsers, pickerQuery, managerIds])

    /** Measure the input and pick a top vs. bottom placement based on which
     *  side has more room. Width matches the input's so the floating list
     *  reads as an extension of the field. */
    const recomputeDropdownRect = useCallback(() => {
        const el = inputRef.current
        if (!el) {
            setDropdownRect(null)
            return
        }
        const rect = el.getBoundingClientRect()
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
        const spaceBelow = viewportHeight - rect.bottom - DROPDOWN_VIEWPORT_GUTTER
        const spaceAbove = rect.top - DROPDOWN_VIEWPORT_GUTTER
        const flipAbove = spaceBelow < Math.min(DROPDOWN_MAX_HEIGHT, 160) && spaceAbove > spaceBelow
        const availableHeight = Math.max(120, Math.min(DROPDOWN_MAX_HEIGHT, flipAbove ? spaceAbove : spaceBelow))
        setDropdownRect({
            flipAbove,
            height: availableHeight,
            left: rect.left,
            top: flipAbove ? rect.top - 4 : rect.bottom + 4,
            width: rect.width
        })
    }, [])

    useLayoutEffect(() => {
        if (!pickerOpen) return undefined
        recomputeDropdownRect()
        const handle = () => recomputeDropdownRect()
        window.addEventListener('resize', handle)
        window.addEventListener('scroll', handle, true)
        return () => {
            window.removeEventListener('resize', handle)
            window.removeEventListener('scroll', handle, true)
        }
    }, [pickerOpen, recomputeDropdownRect])

    const attachManager = (userId) => {
        if (!userId || (managerIds || []).includes(userId)) return
        onChange([...(managerIds || []), userId])
        setPickerQuery('')
        setPickerOpen(false)
    }

    const removeManager = (userId) => {
        onChange((managerIds || []).filter((id) => id !== userId))
    }

    const dropdownStyle = dropdownRect
        ? dropdownRect.flipAbove
            ? {
                  left: dropdownRect.left,
                  maxHeight: dropdownRect.height,
                  top: dropdownRect.top,
                  transform: 'translateY(-100%)',
                  width: dropdownRect.width
              }
            : {
                  left: dropdownRect.left,
                  maxHeight: dropdownRect.height,
                  top: dropdownRect.top,
                  width: dropdownRect.width
              }
        : null

    const renderDropdown = () => {
        if (!pickerOpen || usersLoading || !dropdownStyle || typeof document === 'undefined') return null
        return createPortal(
            <div
                role="listbox"
                aria-label="Manager candidates"
                className="fixed z-[1100] overflow-y-auto rounded-xl border border-border-light bg-bg-primary shadow-lg"
                style={dropdownStyle}
            >
                {pickerResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-text-tertiary italic">No matching users.</div>
                ) : (
                    pickerResults.map((user) => (
                        <button type="button"
                            key={user.id}
                            role="option"
                            aria-selected={false}
                            onMouseDown={(event) => {
                                event.preventDefault()
                                attachManager(user.id)
                            }}
                            className="block w-full border-b border-border-light px-4 py-2.5 text-left text-sm last:border-b-0 transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:outline-none focus-visible:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent/40 active:scale-[0.97]"
                        >
                            <div className="font-semibold text-text-primary">{formatUserLabel(user)}</div>
                            {user.email && (
                                <div className="text-[11.5px] text-text-tertiary">
                                    {user.email}
                                    {user.roleName ? ` · ${user.roleName}` : ''}
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>,
            document.body
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {attachedManagers.length === 0 ? (
                <div className="rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-tertiary italic">
                    No managers attached yet.
                </div>
            ) : (
                <ul className="flex flex-col gap-1.5">
                    {attachedManagers.map(({ id, user }) => (
                        <li
                            key={id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-border-light bg-bg-secondary px-4 py-2.5"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-text-primary">
                                    {user ? formatUserLabel(user) : id}
                                </div>
                                {user?.email && (
                                    <div className="truncate text-[11.5px] text-text-tertiary">{user.email}</div>
                                )}
                            </div>
                            <button type="button"
                                onClick={() => removeManager(id)}
                                disabled={disabled}
                                className="rounded-lg border border-border-light bg-bg-primary px-2.5 py-1 text-[11.5px] font-semibold text-text-primary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] disabled:active:scale-100"
                                title="Remove manager"
                            >
                                <i className="fas fa-times mr-1 text-[10px]" />
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div>
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={pickerOpen && !usersLoading}
                    aria-haspopup="listbox"
                    aria-label="Search by name or email to attach a manager"
                    value={pickerQuery}
                    onChange={(event) => {
                        setPickerQuery(event.target.value)
                        setPickerOpen(true)
                    }}
                    onFocus={() => setPickerOpen(true)}
                    onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
                    placeholder={usersLoading ? 'Loading users…' : 'Search by name or email to attach a manager…'}
                    disabled={usersLoading || disabled}
                    className="w-full rounded-xl border border-border-light bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition-colors duration-150 hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {renderDropdown()}
            </div>
        </div>
    )
}
