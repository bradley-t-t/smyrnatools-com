import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import MessageService from '../../../services/MessageService'
import UserUtility from '../../../utils/UserUtility'
import { SECTION_LABEL_CLASS } from '../../constants/notificationsConstants'
import { usePreferences } from '../../context/PreferencesContext'
import UserAvatar from '../common/UserAvatar'

/** Modal for composing a brand new message thread. Loads the regional
 *  recipient list on mount, supports search, and shows a confirmation
 *  state after the message sends successfully. */
export default function ComposeModal({ accentColor, onClose, onSend }) {
    const { preferences } = usePreferences()
    const regionCode = preferences?.selectedRegion?.code || ''
    const [recipients, setRecipients] = useState([])
    const [selectedRecipient, setSelectedRecipient] = useState(null)
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [recipientSearch, setRecipientSearch] = useState('')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [loadingRecipients, setLoadingRecipients] = useState(true)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoadingRecipients(true)
            try {
                const list = await MessageService.getRegionalRecipients(regionCode)
                if (!cancelled) setRecipients(list)
            } catch {
                /* empty */
            }
            if (!cancelled) setLoadingRecipients(false)
        }
        load()
        return () => {
            cancelled = true
        }
    }, [regionCode])

    const filteredRecipients = recipientSearch
        ? recipients.filter((r) =>
              `${r.firstName} ${r.lastName} ${r.roleName} ${r.plantCode}`
                  .toLowerCase()
                  .includes(recipientSearch.toLowerCase())
          )
        : recipients

    const handleSend = async () => {
        if (!selectedRecipient || !body.trim() || sending) return
        setSending(true)
        setError('')
        try {
            await onSend(selectedRecipient.id, subject, body)
            setSent(true)
        } catch (e) {
            setError(e?.message || 'Failed to send message')
        }
        setSending(false)
    }

    const fieldStyle = {
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        color: 'var(--text-primary)'
    }

    if (typeof document === 'undefined' || !document.body) return null

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[rgba(15,_23,_42,_0.65)] animate-[fadeIn_200ms_ease-out_both] motion-reduce:animate-none"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden rounded bg-bg-primary border border-border-light"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-light">
                    <div className="flex items-center gap-2">
                        <div
                            className="flex h-6 w-6 items-center justify-center rounded bg-bg-tertiary"
                            style={{ color: accentColor }}
                        >
                            <i className="fas fa-pen text-[11px]" />
                        </div>
                        <span className={SECTION_LABEL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                            New Message
                        </span>
                    </div>
                    <button type="button"
                        onClick={onClose}
                        className="flex h-6 w-6 items-center justify-center rounded transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary text-text-secondary active:scale-[0.92]"
                        aria-label="Close"
                    >
                        <i className="fas fa-times text-[11px]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                    {sent ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <div className="w-12 h-12 rounded flex items-center justify-center bg-green-100 text-text-primary">
                                <i className="fas fa-check text-lg" />
                            </div>
                            <div className="text-[14px] font-semibold text-text-primary">Message Sent</div>
                            <p className="text-[12px] text-text-secondary">
                                {selectedRecipient?.firstName} {selectedRecipient?.lastName} will receive your message
                            </p>
                            <button type="button"
                                onClick={onClose}
                                className="rounded text-[10.5px] font-semibold uppercase tracking-wider text-white px-3 py-1.5 active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                                style={{ background: accentColor }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className={`block ${SECTION_LABEL_CLASS} mb-1.5 text-text-secondary`}>To</label>
                                <div ref={dropdownRef} className="relative">
                                    {selectedRecipient ? (
                                        <div
                                            className="flex items-center gap-2.5 px-2.5 py-2 rounded"
                                            style={fieldStyle}
                                        >
                                            <UserAvatar
                                                userId={selectedRecipient.id}
                                                initials={UserUtility.getInitials(
                                                    `${selectedRecipient.firstName} ${selectedRecipient.lastName}`
                                                )}
                                                size="md"
                                                rounded="md"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12.5px] font-semibold truncate text-text-primary">
                                                    {selectedRecipient.firstName} {selectedRecipient.lastName}
                                                </div>
                                                <div className="text-[10.5px] truncate text-text-secondary">
                                                    {selectedRecipient.roleName}
                                                    {selectedRecipient.plantCode
                                                        ? ` · ${selectedRecipient.plantCode}`
                                                        : ''}
                                                </div>
                                            </div>
                                            <button type="button"
                                                onClick={() => setSelectedRecipient(null)}
                                                className="text-[11px] flex h-6 w-6 items-center justify-center rounded hover:bg-bg-tertiary text-text-secondary active:scale-[0.92] transition-transform duration-150 ease-out motion-reduce:transition-none"
                                                aria-label="Clear recipient"
                                            >
                                                <i className="fas fa-times" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <i
                                                    aria-hidden="true"
                                                    className="fas fa-magnifying-glass pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary"
                                                />
                                                <input
                                                    type="search"
                                                    value={recipientSearch}
                                                    onChange={(e) => {
                                                        setRecipientSearch(e.target.value)
                                                        setDropdownOpen(true)
                                                    }}
                                                    onFocus={() => setDropdownOpen(true)}
                                                    placeholder="Search by name, role, or plant…"
                                                    aria-label="Search recipients"
                                                    aria-expanded={dropdownOpen}
                                                    aria-haspopup="listbox"
                                                    className="w-full pl-7 pr-2.5 py-1.5 rounded text-[12.5px] outline-none placeholder:text-text-tertiary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30 [&::-webkit-search-cancel-button]:hidden"
                                                    style={fieldStyle}
                                                />
                                            </div>
                                            {dropdownOpen && (
                                                <div
                                                    role="listbox"
                                                    className="absolute left-0 right-0 z-10 mt-1 max-h-52 overflow-y-auto rounded py-1 bg-bg-primary border border-border-light shadow-lg"
                                                >
                                                    {loadingRecipients ? (
                                                        <div className="px-3 py-2 text-[12px] text-center text-text-secondary">
                                                            <i className="fas fa-spinner animate-dv-spin mr-1.5" />
                                                            Loading…
                                                        </div>
                                                    ) : filteredRecipients.length === 0 ? (
                                                        <div className="px-3 py-2 text-[12px] text-center text-text-secondary">
                                                            No results found
                                                        </div>
                                                    ) : (
                                                        filteredRecipients.map((r) => (
                                                            <button type="button"
                                                                key={r.id}
                                                                role="option"
                                                                aria-selected={false}
                                                                onClick={() => {
                                                                    setSelectedRecipient(r)
                                                                    setDropdownOpen(false)
                                                                    setRecipientSearch('')
                                                                }}
                                                                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary focus-visible:bg-bg-tertiary focus-visible:outline-none text-text-primary active:scale-[0.97]"
                                                            >
                                                                <UserAvatar
                                                                    userId={r.id}
                                                                    initials={UserUtility.getInitials(
                                                                        `${r.firstName} ${r.lastName}`
                                                                    )}
                                                                    size={24}
                                                                    rounded="md"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[12px] font-semibold truncate">
                                                                        {r.firstName} {r.lastName}
                                                                    </div>
                                                                    <div className="text-[10.5px] truncate text-text-secondary">
                                                                        {r.roleName}
                                                                        {r.plantCode ? ` · ${r.plantCode}` : ''}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className={`block ${SECTION_LABEL_CLASS} mb-1.5 text-text-secondary`}>
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Subject (optional)"
                                    className="w-full px-2.5 py-1.5 rounded text-[12.5px] outline-none placeholder:text-text-tertiary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30"
                                    style={fieldStyle}
                                />
                            </div>

                            <div>
                                <label className={`block ${SECTION_LABEL_CLASS} mb-1.5 text-text-secondary`}>
                                    Message
                                </label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Write your message…"
                                    rows="5"
                                    className="w-full px-2.5 py-1.5 rounded text-[12.5px] outline-none resize-y placeholder:text-text-tertiary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30"
                                    style={{ ...fieldStyle, fontFamily: 'inherit', lineHeight: 1.55 }}
                                />
                            </div>

                            {error && (
                                <div className="px-2.5 py-1.5 rounded text-[12px] font-medium bg-red-100 text-text-primary">
                                    <i className="fas fa-exclamation-triangle mr-1.5" />
                                    {error}
                                </div>
                            )}

                            <button type="button"
                                onClick={handleSend}
                                disabled={!selectedRecipient || !body.trim() || sending}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded text-[10.5px] font-semibold uppercase tracking-wider active:scale-[0.97] disabled:active:scale-100 transition-transform duration-150 ease-out motion-reduce:transition-none"
                                style={{
                                    background:
                                        !selectedRecipient || !body.trim() || sending
                                            ? 'var(--bg-tertiary)'
                                            : accentColor,
                                    color:
                                        !selectedRecipient || !body.trim() || sending
                                            ? 'var(--text-tertiary)'
                                            : 'white',
                                    cursor: !selectedRecipient || !body.trim() || sending ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <i
                                    className={`fas ${sending ? 'fa-spinner animate-dv-spin' : 'fa-paper-plane'} text-[10px]`}
                                />
                                {sending ? 'Sending…' : 'Send Message'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
