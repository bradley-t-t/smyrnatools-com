import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import MessageService from '../../../services/MessageService'
import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'

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
            className="fixed inset-0 z-[2100] flex items-center justify-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[460px] max-h-[85vh] flex flex-col overflow-hidden rounded-2xl"
                style={{ background: 'var(--bg-secondary)', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                >
                    <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Send {itemType}
                    </span>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer text-sm"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {sent ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <i className="fas fa-check-circle text-3xl" style={{ color: '#22c55e' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                Sent to {selectedManager?.firstName} {selectedManager?.lastName}
                            </span>
                            <button
                                onClick={onClose}
                                className="mt-2 px-5 py-2 rounded-lg border-none text-sm font-medium text-white cursor-pointer"
                                style={{ background: accentColor }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Asset info */}
                            <div
                                className="flex items-center gap-3 rounded-lg px-3.5 py-3 mb-4"
                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                            >
                                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {itemNumber || 'N/A'}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {itemType}
                                </span>
                                <span
                                    className="ml-auto text-[11px] font-semibold rounded px-2 py-0.5"
                                    style={{
                                        background: 'var(--bg-hover)',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    {item.status || 'Unknown'}
                                </span>
                            </div>

                            {/* Recipient */}
                            <label
                                className="block text-xs font-semibold mb-1.5"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Send to
                            </label>
                            {loading ? (
                                <div
                                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 mb-4 animate-pulse"
                                    style={{
                                        background: 'var(--bg-primary)',
                                        border: '1.5px solid var(--border-light)'
                                    }}
                                >
                                    <div className="h-3.5 rounded w-32" style={{ background: 'var(--bg-hover)' }} />
                                    <div
                                        className="ml-auto w-2.5 h-2.5 rounded"
                                        style={{ background: 'var(--bg-hover)' }}
                                    />
                                </div>
                            ) : (
                                <div ref={dropdownRef} className="relative mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setDropdownOpen((prev) => !prev)}
                                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left cursor-pointer"
                                        style={{
                                            background: 'var(--bg-primary)',
                                            border: dropdownOpen
                                                ? `1.5px solid ${accentColor}`
                                                : '1.5px solid var(--border-light)',
                                            color: selectedManager ? 'var(--text-primary)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {selectedManager ? (
                                            <>
                                                <div
                                                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold text-white"
                                                    style={{ background: accentColor }}
                                                >
                                                    {getInitials(selectedManager)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div
                                                        className="font-medium text-sm"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {selectedManager.firstName} {selectedManager.lastName}
                                                    </div>
                                                    <div
                                                        className="text-[11px]"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
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
                                            className="fas fa-chevron-down ml-auto text-[10px]"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.15s'
                                            }}
                                        />
                                    </button>

                                    {dropdownOpen && (
                                        <div
                                            className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden flex flex-col z-10"
                                            style={{
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-light)',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                maxHeight: '260px'
                                            }}
                                        >
                                            {/* Search */}
                                            <div
                                                className="px-2.5 py-2"
                                                style={{ borderBottom: '1px solid var(--border-light)' }}
                                            >
                                                <div className="relative">
                                                    <i
                                                        className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={recipientSearch}
                                                        onChange={(e) => setRecipientSearch(e.target.value)}
                                                        placeholder="Search..."
                                                        autoFocus
                                                        className="w-full text-[13px] rounded-md py-1.5 pl-7 pr-2.5 outline-none"
                                                        style={{
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border-light)',
                                                            color: 'var(--text-primary)',
                                                            fontFamily: 'inherit'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto">
                                                {filteredManagers.length === 0 ? (
                                                    <div
                                                        className="text-center text-[13px] py-4"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {managers.length === 0 ? 'No team members found' : 'No matches'}
                                                    </div>
                                                ) : (
                                                    filteredManagers.map((mgr) => {
                                                        const isSelected = selectedManager?.id === mgr.id
                                                        return (
                                                            <button
                                                                key={mgr.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedManager(mgr)
                                                                    setDropdownOpen(false)
                                                                    setRecipientSearch('')
                                                                }}
                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left border-none cursor-pointer"
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
                                                                <div
                                                                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold"
                                                                    style={{
                                                                        background: isSelected
                                                                            ? accentColor
                                                                            : 'var(--bg-hover)',
                                                                        color: isSelected
                                                                            ? 'white'
                                                                            : 'var(--text-secondary)'
                                                                    }}
                                                                >
                                                                    {getInitials(mgr)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div
                                                                        className="text-[13px] font-medium"
                                                                        style={{ color: 'var(--text-primary)' }}
                                                                    >
                                                                        {mgr.firstName} {mgr.lastName}
                                                                    </div>
                                                                    <div
                                                                        className="text-[11px]"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
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
                            <label
                                className="block text-xs font-semibold mb-1.5"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Message <span className="font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={commentary}
                                onChange={(e) => setCommentary(e.target.value)}
                                placeholder="Add a note..."
                                rows="3"
                                className="w-full rounded-lg text-sm mb-4 outline-none resize-y"
                                style={{
                                    background: 'var(--bg-primary)',
                                    border: '1.5px solid var(--border-light)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'inherit',
                                    lineHeight: 1.5,
                                    padding: '0.625rem 0.75rem'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = accentColor
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-light)'
                                }}
                            />

                            {error && (
                                <div className="flex items-center gap-2 rounded-lg text-[13px] font-medium mb-3 px-3 py-2.5 bg-red-50 text-red-600">
                                    <i className="fas fa-exclamation-triangle text-xs" />
                                    {error}
                                </div>
                            )}

                            {/* Send */}
                            <button
                                onClick={handleSend}
                                disabled={disabled}
                                className="w-full flex items-center justify-center gap-2 rounded-lg border-none text-sm font-semibold py-2.5 transition-opacity"
                                style={{
                                    background: disabled ? 'var(--border-medium)' : accentColor,
                                    color: disabled ? 'var(--text-secondary)' : 'white',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    opacity: disabled ? 0.6 : 1
                                }}
                            >
                                <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
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
