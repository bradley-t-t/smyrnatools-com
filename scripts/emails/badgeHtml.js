/**
 * Server-side badge HTML renderer — Dot + Text treatment (mockup #08).
 *
 * Mirrors the React `<Badge />` component (`src/app/components/common/
 * Badge.jsx`) exactly so email-rendered badges share the same visual
 * identity as in-app badges: neutral light-gray body, dark theme-primary
 * text, 700-weight uppercase with 0.06em tracking, and a small colored
 * leading dot that carries the semantic tone.
 *
 * Email clients strip `<style>` blocks and have flaky support for `flex`
 * and CSS custom properties, so every badge ships as a flat inline-style
 * `<span>` with an inner `<span>` for the dot. `display:inline-block` +
 * `vertical-align:middle` works in every major client (Gmail, Outlook,
 * Apple Mail) where `inline-flex` does not.
 *
 * Emails always render against a light backdrop so the body and text
 * colors are hard-coded to the project's light-theme tokens — no
 * theme-switching at send time.
 *
 * Usage:
 *   import { renderBadgeHtml } from './badgeHtml.js'
 *   renderBadgeHtml({ label: 'Needs help', tone: 'danger' })
 *   renderBadgeHtml({ label: 'Covered', tone: 'success' })
 *   renderBadgeHtml({ label: 'Direct load', tone: 'info', size: 'sm' })
 *   renderBadgeHtml({ label: 'SC', bg: '#a1b2c3' })   // custom dot colour
 */

/**
 * Per-tone dot colour. Mirrors `TONE_DOT_CLS` in `Badge.jsx` —
 * `--status-active` / `--status-warning` etc. resolved to their concrete
 * hex values for the server-side render (CSS vars don't survive in
 * email clients).
 */
const TONE_DOT = {
    accent: '#1e3a5f',
    danger: '#dc2626',
    info: '#2563eb',
    neutral: '#64748b',
    success: '#16a34a',
    warning: '#ca8a04'
}

/**
 * Per-size rhythm. Padding is asymmetric (less on the left, where the dot
 * lives) to mirror the in-app component. Dot size scales with badge size.
 */
const SIZE_PALETTE = {
    lg: { font: 12, padX: 12, padY: 4, padL: 10, dotSize: 8, gap: 8 },
    md: { font: 11, padX: 10, padY: 2, padL: 8, dotSize: 6, gap: 6 },
    sm: { font: 10, padX: 8, padY: 2, padL: 6, dotSize: 6, gap: 6 },
    xs: { font: 9, padX: 6, padY: 0, padL: 4, dotSize: 4, gap: 4 }
}

const SHAPE_RADIUS = {
    pill: '999px',
    rounded: '4px',
    'rounded-md': '6px',
    square: '0'
}

/**
 * Fixed light-theme tokens. Emails render against a light backdrop in
 * every major client; no need for theme branching.
 */
const BODY_BG = '#e7edf3'
const TEXT_COLOR = '#1e293b'

const htmlEscape = (value) => {
    const str = value == null ? '' : String(value)
    return str.replace(
        /[&<>"']/g,
        (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    )
}

/**
 * Renders an inline-styled `<span>` badge for email HTML. Every call
 * produces the same Dot + Text visual: neutral body, dark text, colored
 * leading dot.
 *
 * @param {object} opts
 * @param {string} opts.label                     — badge text
 * @param {'success'|'warning'|'danger'|'info'|'neutral'|'accent'} [opts.tone='neutral']
 * @param {'xs'|'sm'|'md'|'lg'} [opts.size='sm']
 * @param {'pill'|'rounded'|'rounded-md'|'square'} [opts.shape='rounded']
 * @param {string} [opts.bg]                      — custom dot colour (overrides tone)
 * @param {string} [opts.fg]                      — alias for `bg` (custom dot colour)
 * @param {string} [opts.marginRight]             — trailing space, e.g. '6px'
 * @returns {string}                              — HTML string
 */
function renderBadgeHtml({
    label,
    tone = 'neutral',
    size = 'sm',
    shape = 'rounded',
    bg,
    fg,
    marginRight
} = {}) {
    const sizeCfg = SIZE_PALETTE[size] || SIZE_PALETTE.sm
    const dotColor = bg || fg || TONE_DOT[tone] || TONE_DOT.neutral
    const radius = SHAPE_RADIUS[shape] || SHAPE_RADIUS.rounded

    const bodyStyleParts = [
        'display:inline-block',
        `padding:${sizeCfg.padY}px ${sizeCfg.padX}px ${sizeCfg.padY}px ${sizeCfg.padL}px`,
        `border-radius:${radius}`,
        `font-size:${sizeCfg.font}px`,
        'font-weight:700',
        'text-transform:uppercase',
        'letter-spacing:0.06em',
        `background:${BODY_BG}`,
        `color:${TEXT_COLOR}`,
        'line-height:1'
    ]
    if (marginRight) {
        bodyStyleParts.push(`margin-right:${marginRight}`)
    }

    const dotStyleParts = [
        'display:inline-block',
        `width:${sizeCfg.dotSize}px`,
        `height:${sizeCfg.dotSize}px`,
        'border-radius:50%',
        `background:${dotColor}`,
        `margin-right:${sizeCfg.gap}px`,
        'vertical-align:middle'
    ]

    return [
        `<span style="${bodyStyleParts.join(';')};">`,
        `<span style="${dotStyleParts.join(';')};"></span>`,
        `<span style="vertical-align:middle;">${htmlEscape(label)}</span>`,
        '</span>'
    ].join('')
}

export { htmlEscape, renderBadgeHtml, SHAPE_RADIUS, SIZE_PALETTE, TONE_DOT }
