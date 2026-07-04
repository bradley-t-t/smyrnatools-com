import React, { memo } from 'react'

/**
 * Per-tone icon and dot colours. Uses the app's semantic status tokens so
 * destination tiles slot into the same colour vocabulary the rest of the
 * product uses (navy accent, blue info, green active).
 */
const TONE_STYLES = {
    accent: { dot: 'bg-accent', icon: 'text-accent' },
    info: { dot: 'bg-status-shop', icon: 'text-status-shop' },
    neutral: { dot: 'bg-status-spare', icon: 'text-text-secondary' },
    success: { dot: 'bg-status-active', icon: 'text-status-active' }
}

/**
 * Horizontal portal destination row. Flat 1px panel that mirrors the
 * dashboard's tile aesthetic — icon chip on the left, title + meta + copy
 * in the middle, arrow indicator on the right. Renders as either:
 *   - an external `<a>` (when `href` is provided) — opens in a new tab,
 *     decorated with the standard external-link rel attributes
 *   - a `<button>` (when `onClick` is provided) — used for in-app routes
 */
const PortalDestinationCard = memo(function PortalDestinationCard({
    title,
    description,
    icon,
    href,
    onClick,
    meta,
    tone = 'neutral'
}) {
    const isExternal = Boolean(href)
    const toneCls = TONE_STYLES[tone] || TONE_STYLES.neutral
    const baseClasses = [
        'group block w-full rounded-card border border-border-light bg-bg-primary px-4 py-3.5 text-left no-underline',
        'transition-[background-color,border-color,transform] duration-150 ease-out motion-reduce:transition-none',
        'hover:border-border-medium hover:bg-bg-hover',
        'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary'
    ].join(' ')

    const content = (
        <div className="flex items-center gap-4">
            <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-light bg-bg-secondary ${toneCls.icon}`}
                aria-hidden="true"
            >
                <i className={`fas fa-${icon} text-base`} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate font-heading text-[15px] font-bold tracking-tight text-text-primary">
                        {title}
                    </span>
                    {meta && (
                        <span className="inline-flex items-center gap-1 rounded border border-border-light bg-bg-tertiary px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-secondary">
                            <span className={`h-1 w-1 rounded-full ${toneCls.dot}`} aria-hidden="true" />
                            {meta}
                        </span>
                    )}
                </div>
                <span className="text-[12.5px] leading-snug text-text-secondary">{description}</span>
            </div>
            <span
                className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-text-primary motion-reduce:transition-none"
                aria-hidden="true"
            >
                <i className={`fas ${isExternal ? 'fa-arrow-up-right-from-square' : 'fa-arrow-right'} text-xs`} />
            </span>
        </div>
    )

    if (isExternal) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={baseClasses}>
                {content}
            </a>
        )
    }
    return (
        <button type="button" onClick={onClick} className={baseClasses}>
            {content}
        </button>
    )
})

export default PortalDestinationCard
