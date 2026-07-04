import React from 'react'

import { GrammarUtility } from '../../../utils/GrammarUtility'

const MIN_DIALABLE_DIGITS = 7
const stripToDigits = (phone) => String(phone || '').replace(/\D/g, '')

/**
 * Tappable phone-number renderer. Wraps the value in a `tel:` anchor so a
 * click hands off to the OS's registered dialer — Avaya Workplace /
 * Equinox / one-X register as the `tel:` protocol handler on the desktop,
 * mobile browsers natively dial. Falls back to a plain `<span>` when the
 * input doesn't have enough digits to be a real number (extension-only
 * fragments, "—", etc.).
 *
 * `onClick` propagation is stopped so a row-level click handler on the
 * parent doesn't intercept the dial.
 *
 * @param {object} props
 * @param {string} props.phone     - Raw phone string (any format).
 * @param {string} [props.display] - Optional override for the visible label;
 *                                   defaults to `GrammarUtility.formatPhone`.
 * @param {string} [props.className]
 * @param {object} [props.style]
 * @param {string} [props.title]
 */
function PhoneLink({ className = '', display, phone, style, title }) {
    if (!phone) return null
    const digits = stripToDigits(phone)
    const label = display ?? GrammarUtility.formatPhone(phone)
    if (digits.length < MIN_DIALABLE_DIGITS) {
        return (
            <span className={className} style={style} title={title}>
                {label}
            </span>
        )
    }
    return (
        <a
            href={`tel:${digits}`}
            className={`text-current underline-offset-2 transition-colors duration-150 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary rounded-sm ${className}`.trim()}
            style={style}
            title={title || `Call ${label}`}
            aria-label={`Call ${label}`}
            onClick={(event) => event.stopPropagation()}
        >
            {label}
        </a>
    )
}

export default PhoneLink
