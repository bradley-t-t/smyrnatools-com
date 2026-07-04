import React from 'react'

import Badge from '../../app/components/common/Badge'
import StarRating from '../../app/components/common/StarRating'

/**
 * Maps status-pill palette keys to Badge tones. Centralizes the asset-card
 * status palette so the unified Badge component renders the right semantic
 * tone for each status string.
 */
const STATUS_BADGE_CLASS_TO_TONE = {
    'bg-bg-tertiary text-text-secondary': 'neutral',
    'bg-status-active text-white': 'success',
    'bg-status-danger text-white': 'danger',
    'bg-status-shop text-white': 'info',
    'bg-status-spare text-white': 'neutral',
    'bg-status-warning text-white': 'warning'
}

const getInitials = (name) => {
    if (!name) return '—'
    const parts = String(name).split(' ').filter(Boolean)
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (name[0] || '?').toUpperCase()
}

/** 9+ clamp for badge counts (avoids "10" pushing pill out of round). */
const formatBadgeCount = (count) => (count > 9 ? '9+' : count)

/**
 * Compact circular count badge anchored to action icons (top-right corner).
 * Used for unread comments and open-issues counts. Uses Badge primitive with
 * a tight 9+ clamp instead of Badge's default 99+ formatter to keep the dot
 * visually round.
 */
function CountBadge({ count, tone = 'accent' }) {
    if (!count) return null
    return (
        <Badge
            tone={tone === 'danger' ? 'danger' : 'accent'}
            size="xs"
            shape="pill"
            uppercase={false}
            className="absolute -top-1 -right-1 min-w-[14px] justify-center"
        >
            {formatBadgeCount(count)}
        </Badge>
    )
}

/**
 * Footer-row action button (Comments / Issues / History).
 * Borderless tap target with focus-visible ring and active scale press.
 */
function CardFooterAction({ count, countTone, icon, label, onActivate, divider }) {
    return (
        <button type="button"
            onClick={(event) => {
                event.stopPropagation()
                onActivate?.()
            }}
            aria-label={label}
            className={`relative flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold cursor-pointer text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                divider ? 'border-r border-border-light' : ''
            }`}
        >
            <i className={`fas ${icon}`} />
            <span>{label}</span>
            {count > 0 && (
                <Badge
                    tone={countTone === 'danger' ? 'danger' : 'accent'}
                    size="xs"
                    shape="pill"
                    uppercase={false}
                    className="min-w-[16px] justify-center"
                >
                    {formatBadgeCount(count)}
                </Badge>
            )}
        </button>
    )
}

/**
 * Operator/tractor assignment row icon button (comment, history).
 * 24x24 borderless icon, accent on hover, keyboard accessible.
 */
function AssignmentIconButton({ ariaLabel, count, icon, onActivate }) {
    return (
        <button type="button"
            onClick={(event) => {
                event.stopPropagation()
                onActivate?.()
            }}
            title={ariaLabel}
            aria-label={ariaLabel}
            className="relative inline-flex h-6 w-6 items-center justify-center rounded-md border-none bg-transparent text-[10px] text-text-secondary transition-colors duration-150 hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
            <i className={`fas ${icon}`} />
            {count > 0 && <CountBadge count={count} tone="accent" />}
        </button>
    )
}

/**
 * Config-driven grid card for all asset types.
 * Renders a polished card with icon header, status pill, optional
 * operator/tractor assignment bar, 2-column detail grid, and footer
 * action row with comment/issue/history affordances.
 *
 * Visual contract:
 * - Card surface: `bg-bg-secondary border border-border-light rounded-card`.
 * - Hover lift: `-translate-y-0.5` + `shadow-card` via `transition` from the design system.
 * - Status pills use `bg-status-*` tokens — never raw hex.
 * - Wrapper is `role="button"` for keyboard activation (Enter/Space).
 */
function AssetGridCard({
    item,
    config,
    operator,
    tractor,
    plantName,
    isVerified,
    displayStatus,
    statusDays,
    onSelect,
    onShowCommentModal,
    onShowIssueModal,
    onShowHistoryModal,
    onShowOperatorCommentModal,
    onShowOperatorHistoryModal
}) {
    const number = item[config.primaryField] || '---'
    const statusBadgeClass = config.statusBadgeClasses?.[displayStatus] || 'bg-bg-tertiary text-text-secondary'

    const subtitleName = config.hasOperatorAssignment
        ? operator?.name
        : config.hasTractorAssignment
          ? tractor?.truckNumber
              ? `#${tractor.truckNumber}`
              : null
          : null

    const fields = config.gridCardFields || []

    const handleSelect = () => onSelect?.(item.id)

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSelect()
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            aria-label={`${config.singularLabel} ${number}`}
            className="group flex flex-col overflow-hidden rounded-card border border-border-light bg-bg-secondary shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card hover:border-border-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-white text-lg">
                    <i className={`fas ${config.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="truncate font-heading text-lg font-semibold tracking-tight text-text-primary tabular-nums">
                        #{number}
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                        {config.singularLabel}
                    </div>
                </div>
                {config.hasVerification && isVerified !== undefined && (
                    <Badge
                        tone={isVerified ? 'success' : 'warning'}
                        variant="soft"
                        size="sm"
                        shape="pill"
                        uppercase={false}
                        icon={isVerified ? 'check-circle' : 'exclamation-circle'}
                        className="shrink-0 px-2.5 py-1"
                    >
                        {isVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                )}
                <Badge
                    tone={STATUS_BADGE_CLASS_TO_TONE[statusBadgeClass] || 'neutral'}
                    size="md"
                    shape="rounded-md"
                    uppercase={false}
                    className="shrink-0 px-2.5 py-1"
                >
                    {`${displayStatus || '---'}${statusDays ? ` (${statusDays}d)` : ''}`}
                </Badge>
            </div>

            {(config.hasOperatorAssignment || config.hasTractorAssignment) && (
                <div
                    className={`flex items-center gap-2.5 px-5 py-2.5 bg-bg-hover/60 ${!subtitleName ? 'opacity-60' : ''}`}
                >
                    <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            subtitleName
                                ? 'bg-gradient-to-br from-accent to-accent-hover'
                                : 'bg-bg-tertiary text-text-tertiary'
                        }`}
                    >
                        {getInitials(config.hasOperatorAssignment ? operator?.name : tractor?.truckNumber)}
                    </div>
                    <span
                        className={`flex-1 truncate text-xs font-semibold ${
                            subtitleName ? 'text-text-primary' : 'italic text-text-tertiary'
                        }`}
                    >
                        {subtitleName || 'Not Assigned'}
                    </span>
                    {config.hasOperatorAssignment && operator?.name && (
                        <div className="flex gap-1">
                            <AssignmentIconButton
                                ariaLabel="Operator comments"
                                count={operator.commentsCount}
                                icon="fa-comment"
                                onActivate={() => onShowOperatorCommentModal?.(operator)}
                            />
                            <AssignmentIconButton
                                ariaLabel="Operator history"
                                icon="fa-history"
                                onActivate={() => onShowOperatorHistoryModal?.(operator)}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2">
                {fields.map((field, idx) => {
                    const value = field.getValue
                        ? field.getValue(item, { operator, plantName, tractor })
                        : (item[field.key] ?? '---')
                    const isOverdue = field.isOverdue?.(item)
                    const warning = field.getWarning?.(item)
                    const isLastRow = idx >= fields.length - 2
                    const isOdd = idx % 2 === 0

                    return (
                        <div
                            key={field.label}
                            className={`flex flex-col gap-0.5 px-5 py-3 ${!isLastRow ? 'border-b border-border-light' : ''} ${isOdd ? 'border-r border-border-light' : ''}`}
                        >
                            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                                {field.label}
                            </span>
                            <span className="text-[13px] font-semibold text-text-primary">
                                {field.type === 'stars' ? (
                                    <span className="inline-flex items-center gap-1">
                                        <StarRating value={value || 0} tone="warning" size="sm" />
                                        {warning && (
                                            <Badge
                                                tone="danger"
                                                variant="soft"
                                                size="xs"
                                                shape="rounded-md"
                                                uppercase={false}
                                                className="ml-1"
                                            >
                                                {warning}
                                            </Badge>
                                        )}
                                    </span>
                                ) : field.type === 'monospace' ? (
                                    <span className="font-mono text-[11px] tabular-nums text-text-secondary">
                                        {value}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5">
                                        {value}
                                        {isOverdue && (
                                            <Badge tone="danger" variant="soft" size="xs" shape="rounded-md">
                                                Overdue
                                            </Badge>
                                        )}
                                    </span>
                                )}
                            </span>
                        </div>
                    )
                })}
            </div>

            <div className="flex border-t border-border-light">
                <CardFooterAction
                    count={item.commentsCount}
                    countTone="accent"
                    divider
                    icon="fa-comments"
                    label="Comments"
                    onActivate={onShowCommentModal}
                />
                <CardFooterAction
                    count={item.openIssuesCount}
                    countTone="danger"
                    divider
                    icon="fa-tools"
                    label="Issues"
                    onActivate={onShowIssueModal}
                />
                <CardFooterAction icon="fa-history" label="History" onActivate={onShowHistoryModal} />
            </div>
        </div>
    )
}

export default AssetGridCard
