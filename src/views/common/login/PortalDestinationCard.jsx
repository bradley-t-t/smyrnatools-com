import React, { memo } from 'react'

/**
 * Per-tone icon and dot colours. The portal sits on a permanently dark
 * ambient video, so each tone is lifted to a brighter variant that reads
 * against the glass surface (dark navy accent → sky-blue, deep blues and
 * greens → light saturated variants).
 */
const TONE_STYLES = {
    accent: { dot: 'bg-sky-300', icon: 'text-sky-300' },
    info: { dot: 'bg-blue-300', icon: 'text-blue-300' },
    neutral: { dot: 'bg-slate-300', icon: 'text-white/70' },
    success: { dot: 'bg-emerald-300', icon: 'text-emerald-300' }
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
        'group block w-full rounded-card border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left no-underline backdrop-blur-md',
        'transition-[background-color,border-color,transform] duration-150 ease-out motion-reduce:transition-none',
        'hover:border-white/20 hover:bg-white/[0.08]',
        'focus-visible:outline-none focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
    ].join(' ')

    const content = (
        <div className="flex items-center gap-4">
            <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] ${toneCls.icon}`}
                aria-hidden="true"
            >
                <i className={`fas fa-${icon} text-base`} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate font-heading text-[15px] font-bold tracking-tight text-white">
                        {title}
                    </span>
                    {meta && (
                        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/75">
                            <span className={`h-1 w-1 rounded-full ${toneCls.dot}`} aria-hidden="true" />
                            {meta}
                        </span>
                    )}
                </div>
                <span className="text-[12.5px] leading-snug text-white/70">{description}</span>
            </div>
            <span
                className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/50 transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none"
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
