import React from 'react'

import { ATTACHMENT_ICONS, resolveAttachmentView } from '../../constants/notificationsConstants'

/** Attachment preview inside chat bubbles. `light` flips the chip styling
 *  for messages sent by the current user (white-on-accent bubble). */
export default function AttachmentPreview({ accentColor, light, meta, type }) {
    const icon = ATTACHMENT_ICONS[type] || 'fas fa-paperclip'
    const label =
        type === 'issue' ? 'Issue' : type?.replace(/_/g, ' ')?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Attachment'
    const isViewable = !!resolveAttachmentView(type, meta)
    return (
        <div className="flex items-start gap-2">
            <div
                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                style={{ background: light ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)' }}
            >
                <i className={`${icon} text-[10px]`} style={{ color: light ? 'white' : accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                            background: light ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                            color: light ? 'white' : accentColor
                        }}
                    >
                        {label}
                    </span>
                    {meta.itemNumber && (
                        <span className="text-[11px] font-semibold font-mono tabular-nums">{meta.itemNumber}</span>
                    )}
                    {meta.severity && (
                        <span
                            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded text-white"
                            style={{
                                background:
                                    meta.severity === 'High'
                                        ? '#dc2626'
                                        : meta.severity === 'Low'
                                          ? '#16a34a'
                                          : '#2563eb'
                            }}
                        >
                            {meta.severity}
                        </span>
                    )}
                    {isViewable && <i className="fas fa-external-link-alt text-[9px] ml-auto opacity-55" />}
                </div>
                {meta.issueText && <p className="text-[11px] m-0 leading-snug opacity-85">{meta.issueText}</p>}
            </div>
        </div>
    )
}
