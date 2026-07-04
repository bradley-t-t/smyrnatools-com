import React from 'react'

import Badge from '../common/Badge'

/** Sticky page header — title + at-a-glance chips + Mark all read + Compose.
 *  Mirrors the Plan-tab cockpit header rhythm so the messages surface feels
 *  like part of the same product. */
export default function PageHeader({ accentColor, conversationCount = 0, onCompose, onMarkAllRead, unreadCount = 0 }) {
    return (
        <div className="shrink-0 flex items-center flex-wrap gap-x-3 gap-y-2 border-b px-3 sm:px-4 py-2.5 bg-bg-primary border-border-light">
            <h1 className="text-lg font-bold tracking-tight m-0 shrink-0 text-text-primary">Messages</h1>
            <Badge
                tone="neutral"
                variant="custom"
                size="md"
                weight="medium"
                uppercase={false}
                icon="comments"
                className="bg-bg-secondary border border-border-light text-text-primary"
            >
                <span className="font-mono tabular-nums">{conversationCount}</span> conversation
                {conversationCount === 1 ? '' : 's'}
            </Badge>
            {unreadCount > 0 && (
                <Badge
                    tone="danger"
                    variant="custom"
                    size="md"
                    weight="medium"
                    uppercase={false}
                    icon="envelope"
                    className="bg-[rgba(220,38,38,0.12)] border border-[rgba(220,38,38,0.3)] text-text-primary"
                >
                    <span className="font-mono tabular-nums">{unreadCount}</span> unread
                </Badge>
            )}
            <div className="flex-1 min-w-[8px]" />
            {unreadCount > 0 && (
                <button type="button"
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2 bg-bg-tertiary text-text-secondary active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                >
                    <i className="fas fa-check-double" />
                    <span className="hidden sm:inline">Mark all read</span>
                </button>
            )}
            <button type="button"
                onClick={onCompose}
                className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2 text-white active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{ background: accentColor }}
            >
                <i className="fas fa-pen" />
                Compose
            </button>
        </div>
    )
}
