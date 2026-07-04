import React, { useCallback, useMemo, useState } from 'react'

/**
 * Unified StarRating — the single component for every star display in the app.
 *
 * One visual identity for cleanliness, condition, performance, help-score, and
 * any other 1–N rating across every asset type (mixer / tractor / trailer /
 * equipment / pickup truck) and every people type (operator / manager). Locks
 * the design language the same way Badge.jsx does — caller `className` can
 * supply layout (margin, alignment) but cannot drift colour, size, gap, or
 * filled / empty treatment.
 *
 * Modes:
 *   - Read-only display (default) — render filled / half / empty stars for
 *     `value`. When `value` is null / 0, render the `notRatedLabel` text
 *     instead of an empty bar (callers can override or hide entirely).
 *   - Interactive picker — supply `onChange`. Hover previews, click sets,
 *     clicking the currently-selected rating clears it to 0 (matches the
 *     existing reset semantics across every legacy picker).
 *
 * Half-star precision is supported via a clipped overlay (filled star clipped
 * to 50% width over an outline star at the same slot). Values are rounded to
 * the nearest 0.5.
 *
 * Common patterns:
 *   <StarRating value={3} />                                  display
 *   <StarRating value={3.5} size="md" showValue />            display + number
 *   <StarRating value={r} onChange={setR} size="lg" />        picker
 *   <StarRating value={r} tone="warning" />                   cleanliness amber
 *   <StarRating value={null} />                               renders "Not Rated"
 */

/**
 * Per-tone filled-star colour. Empty stars always use `text-border-light` so
 * the bar reads as a tracked / un-tracked pair regardless of tone.
 */
const TONE_FILLED_CLS = {
    accent: 'text-accent',
    danger: 'text-status-danger',
    info: 'text-status-shop',
    neutral: 'text-text-primary',
    success: 'text-status-active',
    warning: 'text-status-warning'
}

const EMPTY_CLS = 'text-border-light'

/**
 * Per-size rhythm. Star pixel size, gap between stars, and inline-value text
 * size scale together so xs rows feel dense and lg pickers feel grabbable.
 */
const SIZE_STYLES = {
    lg: {
        gap: 'gap-1.5',
        pickerTap: 'p-1',
        star: 'text-[22px]',
        value: 'text-[14px] ml-2'
    },
    md: {
        gap: 'gap-1',
        pickerTap: 'p-0.5',
        star: 'text-[16px]',
        value: 'text-[12px] ml-1.5'
    },
    sm: {
        gap: 'gap-0.5',
        pickerTap: 'p-0',
        star: 'text-[12px]',
        value: 'text-[11px] ml-1'
    },
    xs: {
        gap: 'gap-px',
        pickerTap: 'p-0',
        star: 'text-[10px]',
        value: 'text-[10px] ml-1'
    }
}

const VALUE_FORMATTERS = {
    decimal: (v, max) => formatNumber(v),
    fraction: (v, max) => `${formatNumber(v)}/${max}`,
    stars: (v, max) => `${formatNumber(v)}★`
}

const formatNumber = (n) => {
    if (n == null) return ''
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

const roundToHalf = (n) => Math.round(n * 2) / 2

/**
 * Strip background/color overrides from a caller-supplied inline `style` so
 * no legacy callsite can drift the locked star colours. Mirrors Badge.jsx.
 */
const cleanStyleProp = (style) => {
    if (!style || typeof style !== 'object') return style
    const { background, backgroundColor, color, ...rest } = style
    void background
    void backgroundColor
    void color
    return Object.keys(rest).length > 0 ? rest : undefined
}

/**
 * One star slot. Renders an outline star always, then overlays a filled star
 * clipped to either 50% width (half) or 100% width (full). The two-icon
 * stack means we get half-stars without needing fa-star-half — the clip is
 * deterministic at every size.
 */
const StarSlot = ({ fillPercent, filledCls, sizeCls }) => {
    const showOverlay = fillPercent > 0
    return (
        <span className={`relative inline-flex shrink-0 ${sizeCls}`} aria-hidden="true">
            <i className={`fas fa-star ${EMPTY_CLS}`} />
            {showOverlay && (
                <span
                    className="absolute inset-0 overflow-hidden"
                    style={fillPercent < 1 ? { width: `${fillPercent * 100}%` } : undefined}
                >
                    <i className={`fas fa-star ${filledCls}`} />
                </span>
            )}
        </span>
    )
}

export default function StarRating({
    value,
    max = 5,
    size = 'sm',
    tone = 'neutral',
    onChange,
    showValue = false,
    valueFormat = 'decimal',
    notRatedLabel = 'Not Rated',
    ariaLabel,
    className = '',
    ...rest
}) {
    const sizeCfg = SIZE_STYLES[size] ?? SIZE_STYLES.sm
    const filledCls = TONE_FILLED_CLS[tone] ?? TONE_FILLED_CLS.neutral
    const isInteractive = typeof onChange === 'function'

    const [hoverValue, setHoverValue] = useState(null)

    const normalizedValue = useMemo(() => {
        if (value == null || Number.isNaN(value)) return null
        const clamped = Math.max(0, Math.min(max, Number(value)))
        return roundToHalf(clamped)
    }, [value, max])

    const displayValue = hoverValue ?? normalizedValue ?? 0

    const handleClick = useCallback(
        (n) => {
            if (!isInteractive) return
            onChange(normalizedValue === n ? 0 : n)
        },
        [isInteractive, normalizedValue, onChange]
    )

    const handleKeyDown = useCallback(
        (event) => {
            if (!isInteractive) return
            const current = normalizedValue ?? 0
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault()
                onChange(Math.min(max, current + 1))
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault()
                onChange(Math.max(0, current - 1))
            } else if (/^[0-9]$/.test(event.key)) {
                const n = Number(event.key)
                if (n >= 0 && n <= max) {
                    event.preventDefault()
                    onChange(n)
                }
            } else if (event.key === 'Escape') {
                event.preventDefault()
                onChange(0)
            }
        },
        [isInteractive, max, normalizedValue, onChange]
    )

    const showNotRated = !isInteractive && (normalizedValue == null || normalizedValue === 0)

    if (showNotRated) {
        return (
            <span
                className={`inline-flex items-center text-text-secondary !${sizeCfg.value.split(' ')[0]} ${className}`.trim()}
                {...{ ...rest, style: cleanStyleProp(rest.style) }}
            >
                {notRatedLabel}
            </span>
        )
    }

    const computedAriaLabel =
        ariaLabel ?? `Rating: ${normalizedValue == null ? 'unrated' : `${formatNumber(normalizedValue)} of ${max}`}`

    const formatter = VALUE_FORMATTERS[valueFormat] ?? VALUE_FORMATTERS.decimal

    const slots = Array.from({ length: max }, (_, index) => {
        const starNumber = index + 1
        const fill = Math.max(0, Math.min(1, displayValue - index))
        return { fill, starNumber }
    })

    const cleanedRest = { ...rest, style: cleanStyleProp(rest.style) }
    if (cleanedRest.style === undefined) delete cleanedRest.style

    const containerClasses = [
        'inline-flex items-center align-middle leading-none',
        sizeCfg.gap,
        isInteractive && 'cursor-pointer',
        className
    ]
        .filter(Boolean)
        .join(' ')

    if (isInteractive) {
        return (
            <span
                role="radiogroup"
                aria-label={computedAriaLabel}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onMouseLeave={() => setHoverValue(null)}
                className={`${containerClasses} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded`}
                {...cleanedRest}
            >
                {slots.map(({ starNumber }) => (
                    <button type="button"
                        key={starNumber}
                        role="radio"
                        aria-checked={normalizedValue === starNumber}
                        aria-label={`${starNumber} star${starNumber === 1 ? '' : 's'}`}
                        onMouseEnter={() => setHoverValue(starNumber)}
                        onClick={() => handleClick(starNumber)}
                        className={`${sizeCfg.pickerTap} inline-flex items-center justify-center bg-transparent border-0 cursor-pointer transition-transform duration-100 ease-out hover:scale-110 active:scale-95`}
                    >
                        <StarSlot
                            fillPercent={Math.max(
                                0,
                                Math.min(1, (hoverValue ?? normalizedValue ?? 0) - (starNumber - 1))
                            )}
                            filledCls={filledCls}
                            sizeCls={sizeCfg.star}
                        />
                    </button>
                ))}
                {showValue && normalizedValue != null && (
                    <span className={`${sizeCfg.value} text-text-primary font-medium`}>
                        {formatter(normalizedValue, max)}
                    </span>
                )}
            </span>
        )
    }

    return (
        <span role="img" aria-label={computedAriaLabel} className={containerClasses} {...cleanedRest}>
            {slots.map(({ fill, starNumber }) => (
                <StarSlot key={starNumber} fillPercent={fill} filledCls={filledCls} sizeCls={sizeCfg.star} />
            ))}
            {showValue && normalizedValue != null && (
                <span className={`${sizeCfg.value} text-text-primary font-medium`}>
                    {formatter(normalizedValue, max)}
                </span>
            )}
        </span>
    )
}

export { EMPTY_CLS, SIZE_STYLES, TONE_FILLED_CLS, VALUE_FORMATTERS }
