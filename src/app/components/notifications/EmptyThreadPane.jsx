import React from 'react'

/** Shown when no thread is selected in the chat pane — explains where to
 *  click next and offers a Compose shortcut. */
export default function EmptyThreadPane({ accentColor, onCompose }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-text-tertiary">
            <div
                className="flex h-12 w-12 items-center justify-center rounded mb-3 bg-bg-tertiary"
                style={{ color: accentColor }}
            >
                <i className="fas fa-comments text-lg" />
            </div>
            <div className="text-[13px] font-semibold text-text-primary">Select a conversation</div>
            <div className="text-[10.5px] mt-1">Pick a thread on the left or start a new message</div>
            <button type="button"
                onClick={onCompose}
                className="mt-3 flex items-center gap-1.5 rounded text-[10.5px] font-semibold uppercase tracking-wider px-2.5 py-1 text-white active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{ background: accentColor }}
            >
                <i className="fas fa-pen text-[10px]" />
                New Message
            </button>
        </div>
    )
}
