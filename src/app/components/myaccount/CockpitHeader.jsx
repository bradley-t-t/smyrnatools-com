import React from 'react'

import Badge from '../common/Badge'

/** Slim sticky page header for the account view. Mirrors `PlanHeader`'s
 *  rhythm: title + region scope chip + flex spacer + action cluster + inline
 *  tab pill switcher. */
export default function CockpitHeader({
    accentColor,
    activeTab,
    isMobile,
    onChangeTab,
    onOpenMessages,
    onSignOut,
    regionLabel,
    tabs,
    unreadMessageCount = 0
}) {
    return (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-light bg-bg-primary px-3 py-2.5 sm:px-4">
            <h1 className="m-0 shrink-0 font-heading text-lg font-bold tracking-tight text-text-primary">Account</h1>
            {regionLabel && (
                <Badge
                    tone="neutral"
                    variant="custom"
                    size="lg"
                    shape="pill"
                    weight="medium"
                    uppercase={false}
                    className="max-w-full bg-bg-secondary border border-border-light text-text-primary"
                >
                    <i className="fas fa-location-dot text-[10px] text-accent" aria-hidden="true" />
                    <span className="truncate">{regionLabel}</span>
                </Badge>
            )}
            <div className="min-w-[8px] flex-1" />
            <div className="flex shrink-0 items-center gap-1.5">
                {onOpenMessages && (
                    <button type="button"
                        onClick={() => onOpenMessages()}
                        title={
                            unreadMessageCount > 0
                                ? `${unreadMessageCount} unread message${unreadMessageCount === 1 ? '' : 's'}`
                                : 'Open messages'
                        }
                        aria-label={
                            unreadMessageCount > 0 ? `Open messages — ${unreadMessageCount} unread` : 'Open messages'
                        }
                        className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-2 text-xs font-semibold text-text-secondary transition-all duration-150 ease-out hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] motion-reduce:transition-none"
                    >
                        <i className="fas fa-comments" aria-hidden="true" />
                        {!isMobile && <span>Messages</span>}
                        {unreadMessageCount > 0 && (
                            <Badge
                                tone="danger"
                                size="xs"
                                shape="pill"
                                weight="bold"
                                uppercase={false}
                                className="absolute -right-1 -top-1 h-[16px] min-w-[16px] justify-center font-mono tabular-nums ring-2 ring-bg-primary"
                                aria-hidden="true"
                            >
                                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                            </Badge>
                        )}
                    </button>
                )}
                <button type="button"
                    onClick={onSignOut}
                    title="Sign out"
                    aria-label="Sign out"
                    /* Solid theme tokens only — the previous draft used Tailwind
                     * opacity modifiers (`border-status-danger/35`,
                     * `bg-status-danger/10`, `hover:bg-status-danger/20`),
                     * but the `status-danger` token is defined as
                     * `var(--status-danger)` without an `<alpha-value>`
                     * placeholder. Tailwind compiles those to invalid
                     * `rgb(var(--status-danger) / 0.35)` rules that the
                     * browser drops, leaving the button with no border,
                     * no background, and no hover state.
                     *
                     * Default state mirrors the Messages button's chrome
                     * (same surface / border / sizing) so they read as a
                     * set; the destructive identity lives in the icon +
                     * label color until hover, which flips the whole
                     * button to a solid red surface as a strong action
                     * cue. */
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border-light bg-bg-tertiary px-3 py-2 text-xs font-semibold text-status-danger transition-all duration-150 ease-out hover:bg-status-danger hover:text-white hover:border-status-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] motion-reduce:transition-none"
                >
                    <i className="fas fa-arrow-right-from-bracket" aria-hidden="true" />
                    {!isMobile && <span>Sign out</span>}
                </button>
            </div>
            <div
                className="flex items-center overflow-x-auto rounded-md border border-border-light bg-bg-tertiary p-0.5"
                role="tablist"
            >
                {tabs.map(({ icon, id, label }) => {
                    const isActive = activeTab === id
                    return (
                        <button type="button"
                            key={id}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onChangeTab(id)}
                            data-tutorial-target={id === 'preferences' ? 'preferences-tab' : null}
                            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] motion-reduce:transition-none"
                            style={{
                                backgroundColor: isActive ? accentColor : 'transparent',
                                color: isActive ? '#fff' : 'var(--text-secondary)'
                            }}
                        >
                            <i className={`fas ${icon}`} aria-hidden="true" />
                            {!isMobile && <span>{label}</span>}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
