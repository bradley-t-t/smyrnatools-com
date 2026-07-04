/* eslint-disable react/forbid-dom-props */
import React from 'react'

import UserAvatar from '../common/UserAvatar'

/** 30×30 icon button used by the chat header. Active state tints with the
 *  user's accent; danger flips to red. */
function ChatHeaderIconButton({ accentColor, active = false, danger = false, icon, onClick, title }) {
    const styles = danger
        ? {
              background: 'rgba(220, 38, 38, 0.12)',
              borderColor: 'rgba(220, 38, 38, 0.3)',
              color: 'var(--text-primary)'
          }
        : active
          ? { background: `${accentColor}1a`, borderColor: `${accentColor}55`, color: 'var(--text-primary)' }
          : { background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }
    return (
        <button type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className="flex h-8 w-8 items-center justify-center rounded cursor-pointer transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:brightness-95 border active:scale-[0.92]"
            style={styles}
        >
            <i className={`fas ${icon} text-[11px]`} />
        </button>
    )
}

/** Active-thread header — partner avatar, name, message count, and pin /
 *  mute / delete toggles. On mobile a back-arrow appears at the leading
 *  edge so the user can pop back to the sidebar. */
export default function ChatHeader({
    accentColor,
    conversation,
    isMobile,
    isMuted = false,
    isPinned = false,
    onBack,
    onDelete,
    onToggleMute,
    onTogglePin,
    userNames
}) {
    const name = userNames[conversation.otherId] || 'Conversation'
    const messageCount = conversation.messages.length
    return (
        <div className="flex items-center gap-2.5 px-3 py-2 shrink-0 bg-bg-primary border-b border-border-light">
            {isMobile && (
                <button type="button"
                    onClick={onBack}
                    className="flex h-8 w-8 items-center justify-center rounded transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary text-text-secondary active:scale-[0.92]"
                    aria-label="Back to inbox"
                >
                    <i className="fas fa-arrow-left text-[12px]" />
                </button>
            )}
            <UserAvatar name={name} userId={conversation.otherId} size={36} rounded="md" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold m-0 truncate text-text-primary">{name}</span>
                    {isPinned && (
                        <i
                            className="fas fa-thumbtack text-[10px]"
                            style={{ color: accentColor, transform: 'rotate(40deg)' }}
                            title="Pinned"
                        />
                    )}
                    {isMuted && <i className="fas fa-bell-slash text-[10px] text-text-tertiary" title="Muted" />}
                </div>
                <div className="text-[10.5px] m-0 font-mono tabular-nums uppercase tracking-wider text-text-tertiary">
                    {messageCount} message{messageCount !== 1 ? 's' : ''}
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <ChatHeaderIconButton
                    accentColor={accentColor}
                    active={isPinned}
                    icon="fa-thumbtack"
                    onClick={onTogglePin}
                    title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
                />
                <ChatHeaderIconButton
                    accentColor={accentColor}
                    active={isMuted}
                    icon={isMuted ? 'fa-bell-slash' : 'fa-bell'}
                    onClick={onToggleMute}
                    title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
                />
                <ChatHeaderIconButton danger icon="fa-trash-alt" onClick={onDelete} title="Delete conversation" />
            </div>
        </div>
    )
}
