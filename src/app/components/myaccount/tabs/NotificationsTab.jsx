import React from 'react'

import { FieldStyle } from '../../../constants/myAccountConstants'
import { Card, CardHeader, PrimaryButton, Toggle } from '../MyAccountAtoms'

/** Notifications tab body — inbox summary (unread + total + open button) and
 *  per-channel email notification toggles. */
export default function NotificationsTab({
    accentColor,
    conversations = [],
    onOpenMessages,
    preferences,
    unreadMessageCount = 0,
    updatePreferences
}) {
    const conversationCount = conversations?.length || 0
    return (
        <>
            {onOpenMessages && (
                <section id="messages" className="scroll-mt-4">
                    <Card>
                        <CardHeader
                            accentColor={accentColor}
                            icon="fa-comments"
                            title="Messages"
                            description="Direct messages with teammates and managers"
                        />
                        <div className="px-5 py-5 flex flex-col gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-bg-secondary border border-border-light">
                                    <span
                                        className="font-mono tabular-nums text-[18px] font-bold"
                                        style={{ color: unreadMessageCount > 0 ? '#dc2626' : 'var(--text-primary)' }}
                                    >
                                        {unreadMessageCount}
                                    </span>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                                        Unread
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-bg-secondary border border-border-light">
                                    <span className="font-mono tabular-nums text-[18px] font-bold text-text-primary">
                                        {conversationCount}
                                    </span>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                                        Conversation{conversationCount === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="flex-1" />
                                <PrimaryButton
                                    accentColor={accentColor}
                                    icon="fa-inbox"
                                    onClick={() => onOpenMessages()}
                                >
                                    Open inbox
                                </PrimaryButton>
                            </div>
                            {conversationCount === 0 && (
                                <p className="m-0 text-[12.5px] text-text-tertiary">
                                    Nothing here yet. New messages from teammates will land in your inbox.
                                </p>
                            )}
                        </div>
                    </Card>
                </section>
            )}

            <section id="notifications" className="scroll-mt-4">
                <Card>
                    <CardHeader
                        accentColor={accentColor}
                        icon="fa-bell"
                        title="Email Notifications"
                        description="Control which email notifications you receive"
                    />
                    <div className="px-5 py-5">
                        <div className="flex items-start justify-between gap-4 rounded-lg px-4 py-4" style={FieldStyle}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-comment-dots text-[13px] text-text-tertiary" />
                                    <span className="text-[14px] font-semibold text-text-primary">
                                        Asset Comment Emails
                                    </span>
                                </div>
                                <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
                                    Receive an email when someone comments on an asset assigned to your plant. Applies
                                    to Plant Managers and District Managers only.
                                </p>
                            </div>
                            <Toggle
                                accentColor={accentColor}
                                ariaLabel="Toggle asset comment email notifications"
                                checked={!!preferences.acceptCommentEmails}
                                onChange={() =>
                                    updatePreferences('acceptCommentEmails', !preferences.acceptCommentEmails)
                                }
                            />
                        </div>
                    </div>
                </Card>
            </section>
        </>
    )
}
