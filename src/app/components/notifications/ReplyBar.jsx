import React, { useRef, useState } from 'react'

/** Fixed reply bar at the bottom of the conversation. Auto-grows up to 100px,
 *  submits on plain Enter, allows Shift-Enter for newlines. */
export default function ReplyBar({ accentColor, onSend, otherName }) {
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const textareaRef = useRef(null)

    const handleSend = async () => {
        const text = body.trim()
        if (!text || sending) return
        setSending(true)
        setBody('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        try {
            await onSend(text)
        } catch {
            /* empty */
        }
        setSending(false)
        textareaRef.current?.focus()
    }

    const canSend = !!body.trim() && !sending

    return (
        <div className="flex items-end gap-2 px-3 sm:px-4 py-2 shrink-0 bg-bg-primary border-t border-border-light">
            <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    }
                }}
                placeholder={`Message ${otherName}…`}
                aria-label={`Message ${otherName}`}
                rows="1"
                className="flex-1 px-3 py-1.5 rounded text-[12.5px] outline-none resize-none bg-bg-secondary border border-border-light text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                style={{ fontFamily: 'inherit', maxHeight: '100px' }}
                onInput={(e) => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
            />
            <button type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="h-8 w-8 flex items-center justify-center rounded text-white shrink-0 active:scale-[0.92] disabled:active:scale-100 transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{
                    background: canSend ? accentColor : 'var(--bg-tertiary)',
                    color: canSend ? '#fff' : 'var(--text-tertiary)',
                    cursor: canSend ? 'pointer' : 'not-allowed'
                }}
                aria-label="Send message"
            >
                <i className={`fas ${sending ? 'fa-spinner animate-dv-spin' : 'fa-paper-plane'} text-[12px]`} />
            </button>
        </div>
    )
}
