/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import MessageService from '../../../services/MessageService'
import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
import UserAvatar from './UserAvatar'

/**
 * Modal for sending an asset as a message attachment to a team member.
 * @param {object} props.item - The asset item being sent
 * @param {string} props.itemNumber - Display identifier (truck #, trailer #, etc.)
 * @param {string} props.itemType - Asset type label ("Tractor", "Trailer", etc.)
 * @param {function} props.onClose - Close handler
 */
export default function SendAssetMessageModal({ item, itemNumber, itemType, onClose }) {
    const [managers, setManagers] = useState([])
    const [selectedManager, setSelectedManager] = useState(null)
    const [commentary, setCommentary] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [recipientSearch, setRecipientSearch] = useState('')
    const dropdownRef = useRef(null)
    const { preferences } = usePreferences()
    const accentColor = preferences?.accentColor || '#1e3a5f'
    const regionCode = preferences?.selectedRegion?.code || ''

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            try {
                const list = await MessageService.getRegionalRecipients(regionCode)
                if (!cancelled) setManagers(list)
            } catch {
                setError('Failed to load team members')
            }
            setLoading(false)
        }
        load()
        return () => {
            cancelled = true
        }
    }, [regionCode])

    const filteredManagers = useMemo(() => {
        const query = recipientSearch.trim().toLowerCase()
        if (!query) return managers
        return managers.filter((mgr) => {
            const fullName = `${mgr.firstName || ''} ${mgr.lastName || ''}`.toLowerCase()
            const role = (mgr.roleName || '').toLowerCase()
            const plant = (mgr.plantCode || '').toLowerCase()
            return fullName.includes(query) || role.includes(query) || plant.includes(query)
        })
    }, [managers, recipientSearch])

    const handleSend = async () => {
        if (!selectedManager || sending) return
        setSending(true)
        setError('')
        try {
            const currentUser = await UserService.getCurrentUser()
            const subject = `${itemType} ${itemNumber || ''} — ${item.status || 'Unknown'} Status`
            const attachment = {
                meta: { itemId: item.id, itemNumber, itemType, status: item.status },
                type: 'asset'
            }
            await MessageService.sendMessage(
                currentUser?.id,
                selectedManager.id,
                subject,
                commentary || `${itemType} ${itemNumber || 'N/A'} — Status: ${item.status || 'Unknown'}`,
                attachment
            )
            window.dispatchEvent(new Event('messages-refresh'))
            setSent(true)
        } catch (e) {
            setError(e?.message || 'Failed to send message')
        }
        setSending(false)
    }

    const getInitials = (mgr) => {
        const f = mgr.firstName?.[0] || ''
        const l = mgr.lastName?.[0] || ''
        return (f + l).toUpperCase() || '?'
    }

    const disabled = !selectedManager || sending

    return ReactDOM.createPortal(
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-[rgba(15,_23,_42,_0.6)] animate-[fadeIn_200ms_ease-out_both] motion-reduce:animate-none"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[460px] max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-bg-secondary animate-[popIn_220ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none"
                style={{ boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
                    <span className="text-base font-semibold text-text-primary">Send {itemType}</span>
                    <button type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer text-sm bg-bg-hover text-text-secondary active:scale-[0.92] transition-transform duration-150 ease-out motion-reduce:transition-none"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {sent ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <i className="fas fa-check-circle text-3xl text-text-primary" />
                            <span className="text-sm font-medium text-text-primary">
                                Sent to {selectedManager?.firstName} {selectedManager?.lastName}
                            </span>
                            <button type="button"
                                onClick={onClose}
                                className="mt-2 px-5 py-2 rounded-lg border-none text-sm font-medium text-white cursor-pointer active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                                style={{ background: accentColor }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Asset info */}
                            <div className="flex items-center gap-3 rounded-lg px-3.5 py-3 mb-4 bg-bg-primary border border-border-light">
                                <span className="text-sm font-semibold text-text-primary">{itemNumber || 'N/A'}</span>
                                <span className="text-xs text-text-secondary">{itemType}</span>
                                <span className="ml-auto text-[11px] font-semibold rounded px-2 py-0.5 bg-bg-hover text-text-secondary">
                                    {item.status || 'Unknown'}
                                </span>
                            </div>

                            {/* Recipient */}
                            <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Send to</label>
                            {loading ? (
                                <div
                                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 mb-4 animate-pulse bg-bg-primary"
                                    style={{ border: '1.5px solid var(--border-light)' }}
                                >
                                    <div className="h-3.5 rounded w-32 bg-bg-hover" />
                                    <div className="ml-auto w-2.5 h-2.5 rounded bg-bg-hover" />
                                </div>
                            ) : (
                                <div ref={dropdownRef} className="relative mb-4">
                                    <button type="button"
                                        onClick={() => setDropdownOpen((prev) => !prev)}
                                        aria-haspopup="listbox"
                                        aria-expanded={dropdownOpen}
                                        aria-label="Select recipient"
                                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left cursor-pointer bg-bg-primary active:scale-[0.99] transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                                        style={{
                                            border: dropdownOpen
                                                ? `1.5px solid ${accentColor}`
                                                : '1.5px solid var(--border-light)',
                                            color: selectedManager ? 'var(--text-primary)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {selectedManager ? (
                                            <>
                                                <UserAvatar
                                                    userId={selectedManager.id}
                                                    initials={getInitials(selectedManager)}
                                                    size="md"
                                                    rounded="md"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-text-primary">
                                                        {selectedManager.firstName} {selectedManager.lastName}
                                                    </div>
                                                    <div className="text-[11px] text-text-secondary">
                                                        {selectedManager.roleName}
                                                        {selectedManager.plantCode
                                                            ? ` · ${selectedManager.plantCode}`
                                                            : ''}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <span>Select a recipient...</span>
                                        )}
                                        <i
                                            className="fas fa-chevron-down ml-auto text-[10px] text-text-secondary"
                                            style={{
                                                transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.15s'
                                            }}
                                        />
                                    </button>

                                    {dropdownOpen && (
                                        <div
                                            className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden flex flex-col z-10 bg-bg-primary border border-border-light"
                                            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '260px' }}
                                        >
                                            {/* Search */}
                                            <div className="px-2.5 py-2 border-b border-border-light">
                                                <div className="relative">
                                                    <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none text-text-secondary" />
                                                    <input
                                                        type="search"
                                                        value={recipientSearch}
                                                        onChange={(e) => setRecipientSearch(e.target.value)}
                                                        placeholder="Search recipients..."
                                                        aria-label="Search recipients"
                                                        autoFocus
                                                        className="w-full text-[13px] rounded-md py-1.5 pl-7 pr-7 outline-none bg-bg-secondary border border-border-light text-text-primary placeholder:text-text-tertiary transition-colors duration-150 hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
                                                        style={{ fontFamily: 'inherit' }}
                                                    />
                                                    {recipientSearch && (
                                                        <button type="button"
                                                            onClick={() => setRecipientSearch('')}
                                                            aria-label="Clear search"
                                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors duration-150"
                                                        >
                                                            <i className="fas fa-times text-[10px]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                role="listbox"
                                                aria-label="Recipients"
                                                className="flex-1 overflow-y-auto"
                                            >
                                                {filteredManagers.length === 0 ? (
                                                    <div className="text-center text-[13px] py-4 text-text-secondary">
                                                        {managers.length === 0 ? 'No team members found' : 'No matches'}
                                                    </div>
                                                ) : (
                                                    filteredManagers.map((mgr) => {
                                                        const isSelected = selectedManager?.id === mgr.id
                                                        return (
                                                            <button type="button"
                                                                key={mgr.id}
                                                                role="option"
                                                                aria-selected={isSelected}
                                                                onClick={() => {
                                                                    setSelectedManager(mgr)
                                                                    setDropdownOpen(false)
                                                                    setRecipientSearch('')
                                                                }}
                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left border-none cursor-pointer active:scale-[0.99] transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-inset"
                                                                style={{
                                                                    background: isSelected
                                                                        ? `${accentColor}12`
                                                                        : 'transparent',
                                                                    transition: 'background 0.1s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isSelected)
                                                                        e.currentTarget.style.background =
                                                                            'var(--bg-hover)'
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isSelected)
                                                                        e.currentTarget.style.background = 'transparent'
                                                                }}
                                                            >
                                                                <UserAvatar
                                                                    userId={mgr.id}
                                                                    initials={getInitials(mgr)}
                                                                    size="md"
                                                                    rounded="md"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[13px] font-medium text-text-primary">
                                                                        {mgr.firstName} {mgr.lastName}
                                                                    </div>
                                                                    <div className="text-[11px] text-text-secondary">
                                                                        {mgr.roleName}
                                                                        {mgr.plantCode ? ` · ${mgr.plantCode}` : ''}
                                                                    </div>
                                                                </div>
                                                                {isSelected && (
                                                                    <i
                                                                        className="fas fa-check text-xs"
                                                                        style={{ color: accentColor }}
                                                                    />
                                                                )}
                                                            </button>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Message */}
                            <label className="block text-xs font-semibold mb-1.5 text-text-secondary">
                                Message <span className="font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={commentary}
                                onChange={(e) => setCommentary(e.target.value)}
                                placeholder="Add a note..."
                                rows="3"
                                className="w-full rounded-lg text-sm mb-4 outline-none resize-y bg-bg-primary text-text-primary border-[1.5px] border-border-light leading-normal px-3 py-2.5 transition-colors duration-150 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                                style={{ fontFamily: 'inherit' }}
                            />

                            {error && (
                                <div className="flex items-center gap-2 rounded-lg text-[13px] font-medium mb-3 px-3 py-2.5 bg-red-50 text-text-primary">
                                    <i className="fas fa-exclamation-triangle text-xs" />
                                    {error}
                                </div>
                            )}

                            {/* Send */}
                            <button type="button"
                                onClick={handleSend}
                                disabled={disabled}
                                className="w-full flex items-center justify-center gap-2 rounded-lg border-none text-sm font-semibold py-2.5 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none active:scale-[0.97] disabled:active:scale-100"
                                style={{
                                    background: disabled ? 'var(--border-medium)' : accentColor,
                                    color: disabled ? 'var(--text-secondary)' : 'white',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    opacity: disabled ? 0.6 : 1
                                }}
                            >
                                <i
                                    className={`fas ${sending ? 'fa-spinner animate-dv-spin' : 'fa-paper-plane'} text-xs`}
                                />
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
