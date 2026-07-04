import React from 'react'

/**
 * Unified Badge — Dot + Text treatment (mockup #08, Linear-style).
 *
 * Every badge across the app shares one visual identity:
 *   - Neutral theme-tracking body (`bg-bg-tertiary` + `text-text-primary`).
 *     Both tokens auto-adapt across light / dark / grayed themes, which
 *     means the badge body and its text always clear WCAG AA contrast
 *     without any per-theme tuning.
 *   - A small colored leading dot carries the semantic (success / warning
 *     / danger / info / neutral / accent — or any data-driven hue passed
 *     via `variant="custom"`). The dot is the only place hue lives, so a
 *     plant-code badge, a status pill, and a count chip all look visually
 *     identical except for the dot colour.
 *   - 700-weight uppercase text with 0.06em tracking, locked via
 *     `!important` so no caller `className` can drift the typography.
 *
 * What varies per call site is only the tone (or custom dot colour) and
 * optionally the size (xs–lg). The `weight`, `uppercase`, `dot`,
 * `variant`, and `style` background/color overrides are accepted but
 * intentionally consumed-and-ignored — they're back-compat with the ~290
 * existing call sites and would otherwise let visual drift creep back in.
 *
 * Common patterns:
 *   <Badge tone="success">Active</Badge>
 *   <Badge tone="danger" size="xs" count={3} />
 *   <Badge variant="custom" bg={plantColor}>{plantCode}</Badge>
 *   <Badge as="button" tone="accent" onClick={...}>Filter</Badge>
 */

/**
 * Per-tone dot colour. Tone bg utilities (`bg-status-*`, `bg-accent`)
 * carry the project's saturated hue tokens — used for the dot, not the
 * body. The body is always `bg-bg-tertiary`.
 */
const TONE_DOT_CLS = {
    accent: 'bg-accent',
    danger: 'bg-status-danger',
    info: 'bg-status-shop',
    neutral: 'bg-status-spare',
    success: 'bg-status-active',
    warning: 'bg-status-warning'
}

/**
 * Per-tone icon colour — applied when a caller passes `icon` (which then
 * REPLACES the dot as the leading semantic indicator).
 */
const TONE_ICON_CLS = {
    accent: 'text-accent',
    danger: 'text-status-danger',
    info: 'text-status-shop',
    neutral: 'text-status-spare',
    success: 'text-status-active',
    warning: 'text-status-warning'
}

/**
 * Per-size rhythm. The dot scales subtly with the badge so xs chips carry
 * a 4px dot while lg chips carry an 8px dot — proportionally consistent
 * at every size. Padding is asymmetric (less on the left where the dot
 * lives) to keep the dot tucked close to the badge edge.
 */
const SIZE_STYLES = {
    lg: {
        dotSize: 'h-2 w-2',
        gap: 'gap-2',
        iconSize: 'text-[11px]',
        pad: 'pl-2.5 pr-3 py-1',
        removeSize: 'h-4 w-4',
        text: 'text-[12px]'
    },
    md: {
        dotSize: 'h-1.5 w-1.5',
        gap: 'gap-1.5',
        iconSize: 'text-[10px]',
        pad: 'pl-2 pr-2.5 py-0.5',
        removeSize: 'h-3.5 w-3.5',
        text: 'text-[11px]'
    },
    sm: {
        dotSize: 'h-1.5 w-1.5',
        gap: 'gap-1.5',
        iconSize: 'text-[10px]',
        pad: 'pl-1.5 pr-2 py-0.5',
        removeSize: 'h-3 w-3',
        text: 'text-[10px]'
    },
    xs: {
        dotSize: 'h-1 w-1',
        gap: 'gap-1',
        iconSize: 'text-[8px]',
        // py-0.5 (2px each) gives descenders / ascenders breathing room so
        // text at 9px with leading-none doesn't get clipped at the body
        // edges. Going lower (py-0) crops the bottom of g/y/p/q characters.
        pad: 'pl-1 pr-1.5 py-0.5',
        removeSize: 'h-3 w-3',
        text: 'text-[9px]'
    }
}

/**
 * Shape map is retained for back-compat with the ~290 existing call sites
 * (which still pass `shape="pill"` / `shape="square"` / etc.), but the
 * actual rendered radius is locked to `rounded` (4px) via `!rounded` in
 * the base classes below. The Dot + Text design picked from mockup #08
 * specifies a 4px radius for every badge, so allowing per-callsite
 * variation was the source of the "some are pill, some are square, some
 * are rounded-md" inconsistency the user kept catching.
 */
const SHAPE_CLS = {
    pill: 'rounded',
    rounded: 'rounded',
    'rounded-md': 'rounded',
    square: 'rounded'
}

const formatCount = (count) => {
    if (typeof count !== 'number' || count <= 0) return null
    if (count > 99) return '99+'
    return String(count)
}

/**
 * Render an icon. Accepts either a Font Awesome name (`"check"`,
 * `"triangle-exclamation"`) or — for back-compat with callers that pass
 * the legacy `fa-` prefix (`"fa-check"`, `"fa-circle-check"`) — strips
 * the prefix before applying. Caller can also pass a React node for
 * full control, which is rendered as-is.
 */
const renderIconNode = (node, sizeCfg, colorCls) => {
    if (!node) return null
    if (typeof node === 'string') {
        const name = node.replace(/^fa-/, '')
        return <i className={`fas fa-${name} ${sizeCfg.iconSize} ${colorCls}`} aria-hidden="true" />
    }
    return node
}

/**
 * Strip background/color overrides from a caller-supplied inline `style`.
 * The design mandate is uniform neutral body + theme-primary text, so we
 * filter out the three properties that could re-introduce inconsistency.
 * Everything else (positioning, min-width, transitions, etc.) passes
 * through untouched.
 */
const cleanStyleProp = (style) => {
    if (!style || typeof style !== 'object') return style
    const { background, backgroundColor, color, ...rest } = style
    void background
    void backgroundColor
    void color
    return Object.keys(rest).length > 0 ? rest : undefined
}

export default function Badge({
    children,
    tone = 'neutral',
    variant,
    size = 'sm',
    shape = 'rounded',
    weight: _weight,
    uppercase: _uppercase,
    icon,
    trailingIcon,
    dot: _dot,
    count,
    removable = false,
    onRemove,
    as,
    onClick,
    href,
    active = false,
    pulse = false,
    bg,
    fg,
    title,
    className = '',
    ...rest
}) {
    const sizeCfg = SIZE_STYLES[size] ?? SIZE_STYLES.sm
    const shapeCls = SHAPE_CLS[shape] ?? SHAPE_CLS.rounded
    const isCustom = variant === 'custom' || variant === 'custom-solid'

    const interactive = Boolean(onClick) || as === 'button' || Boolean(href)
    const Element = as || (href ? 'a' : interactive ? 'button' : 'span')

    // Strip caller inline bg/color so the brutalist "uniform neutral body"
    // rule holds across every callsite, regardless of legacy code that
    // tried to force a coloured body via `style={{ background: ... }}`.
    const cleanedRest = { ...rest, style: cleanStyleProp(rest.style) }
    if (cleanedRest.style === undefined) delete cleanedRest.style

    /*
     * Typography + body styling is locked with `!important` so no caller
     * className can drift the design language: every badge is uppercase,
     * 0.06em-tracked, 700-weight, theme-primary text on a theme-tertiary
     * body. Tailwind emits font-weight utilities alphabetically — without
     * `!`, a caller's `font-semibold` would beat the base `font-bold` via
     * CSS source order (same trap we hit with the previous brutalist
     * variant). `!` locks the design.
     */
    const classes = [
        'inline-flex items-center justify-center text-center align-middle shrink-0 box-border whitespace-nowrap leading-none',
        '!uppercase !tracking-[0.06em] !font-bold !text-text-primary !bg-bg-tertiary !rounded',
        sizeCfg.text,
        sizeCfg.pad,
        sizeCfg.gap,
        shapeCls,
        interactive &&
            'cursor-pointer transition-[transform,filter] duration-100 ease-out hover:brightness-95 active:scale-[0.97]',
        active && 'ring-1 ring-inset ring-accent/40',
        pulse && 'animate-pulse',
        className
    ]
        .filter(Boolean)
        .join(' ')

    /*
     * Leading semantic indicator. Priority:
     *   1. Caller's `icon` prop (rendered in the tone colour for tone
     *      variants, or in the caller's custom hue for variant="custom").
     *   2. A colored dot — but only if there's a semantic colour to carry:
     *      a tone variant (the dot picks up the tone token) OR a custom
     *      variant with a `bg`/`fg` to use.
     *   3. Nothing — callers using variant="custom" without a colour AND
     *      embedding their own icon in `children` (e.g. DashboardHeader's
     *      region chip) shouldn't get a phantom dot eating left padding.
     *
     * Caller's `bg` / `fg` values are routed to the DOT (or icon) only —
     * never the body. Body always renders with the theme-tracking
     * `!bg-bg-tertiary` + `!text-text-primary` classes so contrast holds
     * in every theme. The previous behaviour of letting `fg="#ffffff"`
     * force white body text was the cause of unreadable badges on the
     * OnlineUsersModal role chip and similar callsites.
     */
    const dotColorCls = isCustom ? '' : (TONE_DOT_CLS[tone] ?? TONE_DOT_CLS.neutral)
    const iconColorCls = isCustom ? '' : (TONE_ICON_CLS[tone] ?? TONE_ICON_CLS.neutral)
    const customColor = isCustom ? bg || fg : null
    const renderDot = !icon && (!isCustom || customColor)

    const leadingEl = icon ? (
        renderIconNode(icon, sizeCfg, isCustom ? '' : iconColorCls)
    ) : renderDot ? (
        <span
            className={`shrink-0 rounded-full ${sizeCfg.dotSize} ${dotColorCls}`}
            /* eslint-disable-next-line react/forbid-dom-props -- data-driven dot colour for variant="custom" */
            style={customColor ? { background: customColor } : undefined}
            aria-hidden="true"
        />
    ) : null

    // Wrap the leading icon in a span so its color override (for custom
    // variant) can be applied via inline style.
    const leadingWrapper =
        icon && customColor ? (
            <span
                className="inline-flex shrink-0"
                /* eslint-disable-next-line react/forbid-dom-props -- data-driven icon colour for variant="custom" */
                style={{ color: customColor }}
            >
                {leadingEl}
            </span>
        ) : (
            leadingEl
        )

    const content = count != null ? formatCount(count) : children

    const removeBtn = removable ? (
        <button type="button"
            onClick={(e) => {
                e.stopPropagation()
                onRemove?.()
            }}
            className={`-mr-1 ml-0.5 inline-flex items-center justify-center hover:bg-current/10 ${sizeCfg.removeSize} ${sizeCfg.iconSize}`}
            aria-label="Remove"
        >
            <i className="fas fa-times" aria-hidden="true" />
        </button>
    ) : null

    const elementProps = {
        className: classes,
        onClick,
        title,
        ...cleanedRest
    }
    if (Element === 'button') {
        elementProps.type = elementProps.type ?? 'button'
    }
    if (Element === 'a' && href) {
        elementProps.href = href
    }

    /*
     * Render content directly (no wrapping `<span>`) so multi-child callers
     * — DashboardHeader's region chip passes `<i>` + `<span>name` +
     * `<span>sub` — get their elements as direct flex items, picking up
     * the parent flex container's `gap-*` between siblings. Wrapping them
     * in a single span collapsed all three into one flex item with no
     * inter-element gap, which is why the icon ended up glued to the text.
     * For single-string children or `count` values, React renders the
     * text node inline as expected.
     */
    return (
        <Element {...elementProps}>
            {leadingWrapper}
            {content != null && content !== '' && content}
            {renderIconNode(trailingIcon, sizeCfg, isCustom ? '' : iconColorCls)}
            {removeBtn}
        </Element>
    )
}

export { cleanStyleProp, formatCount, SHAPE_CLS, SIZE_STYLES, TONE_DOT_CLS, TONE_ICON_CLS }
