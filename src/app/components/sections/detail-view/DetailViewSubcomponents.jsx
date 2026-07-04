/* eslint-disable react/forbid-dom-props */
import React, { useContext, useEffect } from 'react'

import { usePreferences } from '../../../context/PreferencesContext'
import StarRating from '../../common/StarRating'
import { DetailViewContext } from './DetailViewContext'

/**
 * Detail-view atoms (Section, Card, Field, Input, Select, Textarea, Button,
 * Toggle, Rating, Banner, Divider) tuned to match the list-view density
 * contract: `text-[12px]`/`text-[12.5px]` body, `py-1.5 px-2.5` cells,
 * `rounded-md` corners, `border-border-light` single borders, theme-aware
 * `bg-bg-*` / `text-text-*` tokens (light + dark + gray). No `bg-white` /
 * `slate-*` / `gray-*` hardcoded colors; every surface respects the
 * three-theme system.
 *
 * Keeps the `dv-input` / `dv-btn` class hooks so the `:focus` accent ring
 * and `:active` press-feedback rules in `src/app/index.css` still apply.
 */

const DEFAULT_ACCENT = '#1e3a5f'

const LABEL_CLASS = 'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary'
const VALUE_BOX_CLASS = 'rounded-md border border-border-light bg-bg-secondary px-2.5 py-1.5 text-[12.5px] font-medium'
const INPUT_CLASS =
    'dv-input w-full rounded-md border border-border-light bg-bg-primary px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none transition-[border-color,box-shadow] duration-150'

export function Section({ id, title, icon, children }) {
    const { activeSection, registerSection } = useContext(DetailViewContext)
    useEffect(() => {
        registerSection({ icon, id, title })
    }, [id, title, icon, registerSection])
    if (activeSection !== id) return null

    const childArray = React.Children.toArray(children)
    const count = childArray.length
    const gridClass = count === 1 ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-3'

    const renderChildren = () => {
        if (count === 3) {
            return (
                <>
                    {childArray[0]}
                    {childArray[1]}
                    <div className="col-span-full">{childArray[2]}</div>
                </>
            )
        }
        if (count === 5) {
            return (
                <>
                    {childArray[0]}
                    {childArray[1]}
                    {childArray[2]}
                    {childArray[3]}
                    <div className="col-span-full">{childArray[4]}</div>
                </>
            )
        }
        return childArray
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="dv-section-header flex items-center gap-2">
                {icon && <i className={`${icon} text-text-secondary text-[13px]`}></i>}
                <h2 className="m-0 text-[14px] font-bold text-text-primary">{title}</h2>
            </div>
            <div className={`dv-section-grid ${gridClass}`}>{renderChildren()}</div>
        </div>
    )
}

export function Card({ title, icon, children, actions, fullWidth }) {
    return (
        <div
            className={`overflow-hidden rounded-md border border-border-light bg-bg-primary ${fullWidth ? 'col-[1_/_-1]' : ''}`}
        >
            {title && (
                <div className="flex items-center justify-between gap-2 border-b border-border-light bg-bg-secondary px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-text-primary">
                        {icon && <i className={`${icon} text-text-secondary text-[12px]`}></i>}
                        {title}
                    </div>
                    {actions && <div className="flex items-center gap-1.5">{actions}</div>}
                </div>
            )}
            <div className="flex flex-col gap-2.5 p-3">{children}</div>
        </div>
    )
}

export function Row({ children, cols = 2 }) {
    return (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {children}
        </div>
    )
}

export function Field({ label, value, empty = '-', icon }) {
    const hasValue = value !== undefined && value !== null && value !== ''
    return (
        <div className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>
                {icon && <i className={`${icon} text-text-secondary text-[10px]`}></i>}
                {label}
            </span>
            <span className={`${VALUE_BOX_CLASS} ${hasValue ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {hasValue ? value : empty}
            </span>
        </div>
    )
}

export function Input({ label, icon, ...props }) {
    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className={LABEL_CLASS}>
                    {icon && <i className={`${icon} text-text-secondary text-[10px]`}></i>}
                    {label}
                </label>
            )}
            <input {...props} className={INPUT_CLASS} style={props.style} />
        </div>
    )
}

export function Select({ label, icon, options = [], placeholder, ...props }) {
    // Inline caret SVG matches the theme-aware text-secondary token color
    // by using the foreground color via mask isn't supported on <select>,
    // so we keep the stroke as a neutral gray that reads on every theme.
    const selectBg =
        "var(--bg-primary) url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\") right 10px center/14px no-repeat"
    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className={LABEL_CLASS}>
                    {icon && <i className={`${icon} text-text-secondary text-[10px]`}></i>}
                    {label}
                </label>
            )}
            <select
                {...props}
                className="dv-input w-full cursor-pointer appearance-none rounded-md border border-border-light text-[12.5px] text-text-primary outline-none transition-[border-color,box-shadow] duration-150"
                style={{
                    background: selectBg,
                    padding: '6px 32px 6px 10px',
                    ...props.style
                }}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option
                        key={typeof opt === 'string' ? opt : opt.value}
                        value={typeof opt === 'string' ? opt : opt.value}
                    >
                        {typeof opt === 'string' ? opt : opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

export function Textarea({ label, icon, ...props }) {
    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className={LABEL_CLASS}>
                    {icon && <i className={`${icon} text-text-secondary text-[10px]`}></i>}
                    {label}
                </label>
            )}
            <textarea
                {...props}
                className="dv-input w-full min-h-[96px] resize-y rounded-md border border-border-light bg-bg-primary px-2.5 py-1.5 text-[12.5px] leading-[1.5] text-text-primary outline-none transition-[border-color,box-shadow] duration-150"
                style={props.style}
            />
        </div>
    )
}

export function Button({ variant = 'primary', block, children, ...props }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || DEFAULT_ACCENT
    const variants = {
        danger: { background: '#dc2626', color: 'white' },
        ghost: { background: 'transparent', color: 'var(--text-secondary)' },
        outline: { background: 'var(--bg-primary)', border: `1px solid ${accent}`, color: accent },
        primary: { background: accent, color: 'white' },
        secondary: { background: 'var(--bg-secondary)', color: 'var(--text-primary)' },
        warning: { background: '#f59e0b', color: 'white' }
    }
    const v = variants[variant] || variants.primary
    return (
        <button type="button"
            {...props}
            className={`dv-btn inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-[opacity,transform] duration-150 ${block ? 'w-full' : 'w-auto'} ${props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer opacity-100'}`}
            style={{
                border: v.border || '1px solid transparent',
                ...v,
                ...props.style
            }}
        >
            {children}
        </button>
    )
}

export function Divider() {
    return <div className="my-1 h-px bg-border-light"></div>
}

export function Banner({ type = 'info', icon, children }) {
    // Semantic banner tones use a low-saturation tinted background that reads
    // on all three themes via the text-text-primary foreground token. The
    // hard-coded tint hex values are intentional — they're semantic state
    // indicators (error red / warning amber / success green / info blue),
    // not surface chrome, so they stay constant across themes.
    const types = {
        error: { bg: '#fef2f2', border: '#fecaca', icon: 'fa-times-circle' },
        info: { bg: '#eff6ff', border: '#bfdbfe', icon: 'fa-info-circle' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', icon: 'fa-check-circle' },
        warning: { bg: '#fffbeb', border: '#fde68a', icon: 'fa-exclamation-triangle' }
    }
    const t = types[type] || types.info
    return (
        <div
            className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-text-primary"
            style={{
                background: t.bg,
                border: `1px solid ${t.border}`
            }}
        >
            <i className={`fas ${icon || t.icon} text-[12px]`}></i>
            <span className="flex-1">{children}</span>
        </div>
    )
}

export function Toggle({ label, checked, onChange, disabled }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || DEFAULT_ACCENT
    return (
        <label className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <div
                className="relative h-5 w-9 rounded-full p-[2px] transition-colors duration-200"
                style={{ background: checked ? accent : 'var(--border-medium)' }}
            >
                <div
                    className="h-4 w-4 rounded-full bg-bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-200"
                    style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
                ></div>
            </div>
            <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="hidden" />
            {label && <span className="text-[12.5px] font-medium text-text-primary">{label}</span>}
        </label>
    )
}

export function Rating({ value = 0, onChange, max = 5, disabled }) {
    // Detail uses `sm` (vs list's `xs`) so ratings are clearly editable
    // without ballooning the row height. Still well under list-row size.
    return (
        <StarRating
            value={value}
            onChange={disabled ? undefined : onChange}
            max={max}
            size="sm"
            tone="warning"
            showValue={value > 0}
            valueFormat="fraction"
        />
    )
}
