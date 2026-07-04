import React, { useMemo } from 'react'

import DateUtility from '../../../utils/DateUtility'
import { ATTACHMENT_ICONS, resolveAttachmentView, SECTION_LABEL_CLASS } from '../../constants/notificationsConstants'
import Badge from '../common/Badge'
import UserAvatar from '../common/UserAvatar'

/** Section wrapper inside the context rail — title + count + content. */
function ContextSection({ children, count, icon, label }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
                {icon && <i className={`fas ${icon} text-[10px] text-text-tertiary text-center w-3`} />}
                <span className={SECTION_LABEL_CLASS} style={{ color: 'var(--text-tertiary)' }}>
                    {label}
                </span>
                {count != null && (
                    <Badge
                        tone="neutral"
                        size="xs"
                        weight="semibold"
                        uppercase={false}
                        className="ml-auto font-mono tabular-nums"
                    >
                        {count}
                    </Badge>
                )}
            </div>
            {children}
        </div>
    )
}

function ContextEmpty({ children }) {
    return (
        <div className="text-[11px] rounded px-2.5 py-2 bg-bg-secondary border border-border-light text-text-tertiary">
            {children}
        </div>
    )
}

function ContextStat({ label, value }) {
    return (
        <div className="rounded px-2.5 py-2 flex flex-col gap-0.5 bg-bg-secondary border border-border-light">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-text-tertiary">{label}</span>
            <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">{value}</span>
        </div>
    )
}

function ContextActionButton({ accentColor, active = false, danger = false, icon, label, onClick }) {
    const styles = danger
        ? {
              background: 'rgba(220, 38, 38, 0.08)',
              borderColor: 'rgba(220, 38, 38, 0.25)',
              color: 'var(--text-primary)'
          }
        : active
          ? { background: `${accentColor}14`, borderColor: `${accentColor}55`, color: 'var(--text-primary)' }
          : { background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }
    return (
        <button type="button"
            onClick={onClick}
            className="flex items-center gap-2 rounded px-3 py-2 text-[12px] font-semibold cursor-pointer transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:brightness-95 border active:scale-[0.97]"
            style={styles}
        >
            <i className={`fas ${icon} text-[11px] text-center w-3.5`} />
            <span>{label}</span>
        </button>
    )
}

/** Right-side context rail — appears next to the active thread on wide
 *  viewports. Shows the partner's profile, every shared asset across the
 *  thread, derived activity stats, and quick-action toggles for pin / mute /
 *  delete. Hidden under `xl` (the rail is supplementary; the chat header
 *  exposes the same toggles for narrower screens). */
export default function ConversationContextRail({
    accentColor,
    conversation,
    displayName,
    isMuted,
    isPinned,
    onAttachmentClick,
    onDelete,
    onToggleMute,
    onTogglePin,
    resolvedUserId
}) {
    /** Memo'd to keep `[]` referentially stable for the derivations below. */
    const messages = useMemo(() => conversation.messages || [], [conversation.messages])

    /** Unique list of attachments referenced anywhere in the thread. Keyed
     *  by `type:itemNumber` so the same asset doesn't render twice when
     *  it's been mentioned across multiple messages. */
    const sharedAssets = useMemo(() => {
        const seen = new Map()
        messages.forEach((msg) => {
            if (!msg.attachmentType || !msg.attachmentMeta) return
            const key = `${msg.attachmentType}:${msg.attachmentMeta.itemNumber || msg.id}`
            if (seen.has(key)) return
            seen.set(key, { meta: msg.attachmentMeta, type: msg.attachmentType })
        })
        return [...seen.values()]
    }, [messages])

    /** Lightweight stats — sent vs received message counts, last activity
     *  relative time, and total attachments. Drives the right rail's
     *  "Activity" card. */
    const stats = useMemo(() => {
        let sent = 0
        let received = 0
        messages.forEach((msg) => {
            if (resolvedUserId && String(msg.senderId) === String(resolvedUserId)) sent += 1
            else received += 1
        })
        return {
            attachments: sharedAssets.length,
            lastActivity: conversation.lastMessage?.createdAt,
            received,
            sent,
            total: messages.length
        }
    }, [messages, resolvedUserId, conversation.lastMessage, sharedAssets.length])

    return (
        <aside className="hidden xl:flex shrink-0 flex-col w-[280px] overflow-y-auto bg-bg-primary border-l border-border-light">
            <div className="flex flex-col gap-3.5 p-3.5">
                {/* Profile card */}
                <div className="flex flex-col items-center gap-2 rounded p-4 text-center bg-bg-secondary border border-border-light">
                    <UserAvatar
                        name={displayName}
                        userId={conversation.otherId}
                        size={56}
                        rounded="md"
                        className="text-[18px]"
                    />
                    <div className="min-w-0">
                        <div className="text-[13.5px] font-bold truncate text-text-primary">{displayName}</div>
                        <div className="text-[10.5px] mt-0.5 truncate text-text-tertiary">
                            {stats.total} message{stats.total === 1 ? '' : 's'} · last{' '}
                            {DateUtility.formatTimeAgo(stats.lastActivity)}
                        </div>
                    </div>
                </div>

                {/* Shared assets */}
                <ContextSection icon="fa-paperclip" label="Shared assets" count={sharedAssets.length}>
                    {sharedAssets.length === 0 ? (
                        <ContextEmpty>No assets referenced in this thread yet.</ContextEmpty>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {sharedAssets.map(({ meta, type }) => {
                                const icon = ATTACHMENT_ICONS[type] || 'fas fa-paperclip'
                                const label = (() => {
                                    if (type === 'issue') return 'Issue'
                                    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                                })()
                                const isViewable = !!resolveAttachmentView(type, meta)
                                return (
                                    <button type="button"
                                        key={`${type}-${meta.itemNumber || Math.random()}`}
                                        onClick={() => isViewable && onAttachmentClick?.(type, meta)}
                                        disabled={!isViewable}
                                        className="flex items-center gap-2 rounded text-left transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary px-2.5 py-1.5 cursor-pointer disabled:cursor-default bg-bg-primary border border-border-light active:scale-[0.97] disabled:active:scale-100"
                                    >
                                        <i className={`${icon} text-[11px]`} style={{ color: accentColor }} />
                                        <span className="font-mono tabular-nums text-[11.5px] font-bold text-text-primary">
                                            {meta.itemNumber || '—'}
                                        </span>
                                        <span className="ml-auto text-[9.5px] uppercase tracking-wider font-semibold text-text-tertiary">
                                            {label}
                                        </span>
                                        {isViewable && (
                                            <i className="fas fa-external-link-alt text-[9px] text-text-tertiary" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ContextSection>

                {/* Activity */}
                <ContextSection icon="fa-chart-line" label="Activity">
                    <div className="grid grid-cols-2 gap-2">
                        <ContextStat label="Sent" value={stats.sent} />
                        <ContextStat label="Received" value={stats.received} />
                        <ContextStat label="Attachments" value={stats.attachments} />
                        <ContextStat label="Total" value={stats.total} />
                    </div>
                </ContextSection>

                {/* Quick actions */}
                <ContextSection icon="fa-bolt" label="Quick actions">
                    <div className="flex flex-col gap-1.5">
                        <ContextActionButton
                            accentColor={accentColor}
                            active={isPinned}
                            icon="fa-thumbtack"
                            label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
                            onClick={onTogglePin}
                        />
                        <ContextActionButton
                            accentColor={accentColor}
                            active={isMuted}
                            icon={isMuted ? 'fa-bell-slash' : 'fa-bell'}
                            label={isMuted ? 'Unmute notifications' : 'Mute notifications'}
                            onClick={onToggleMute}
                        />
                        <ContextActionButton
                            danger
                            icon="fa-trash-alt"
                            label="Delete conversation"
                            onClick={onDelete}
                        />
                    </div>
                </ContextSection>
            </div>
        </aside>
    )
}
