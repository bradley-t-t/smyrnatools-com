import React from 'react'

/** Card shell with consistent border / radius / background tokens. */
export function Card({ children, className = '' }) {
    return (
        <div className={`rounded-card border border-border-light bg-bg-primary shadow-sm ${className}`}>{children}</div>
    )
}

/** Header row used at the top of most account cards — icon chip + title +
 *  optional description. */
export function CardHeader({ accentColor: _accentColor, description, icon, title }) {
    return (
        <div className="flex items-center gap-3 border-b border-border-light px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                <i className={`fas ${icon} text-[16px]`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <div className="font-heading text-[14px] font-semibold text-text-primary">{title}</div>
                {description && <div className="mt-0.5 text-[12px] text-text-tertiary">{description}</div>}
            </div>
        </div>
    )
}

/** Filled accent-color button — primary form actions. */
export function PrimaryButton({ accentColor, children, disabled, icon, onClick, type = 'button' }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white shadow-sm transition-all duration-150 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none"
            style={{ background: accentColor }}
        >
            {icon && <i className={`fas ${icon} text-[12px]`} aria-hidden="true" />}
            {children}
        </button>
    )
}

/** Outlined secondary button — destructive variant flips border/fill to status-danger. */
export function SubtleButton({ children, danger = false, disabled = false, icon, onClick, type = 'button' }) {
    const dangerClasses =
        'bg-status-danger/10 border border-status-danger/35 text-status-danger hover:bg-status-danger/20 focus-visible:ring-status-danger'
    const subtleClasses =
        'bg-bg-secondary border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:ring-accent'
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none ${
                danger ? dangerClasses : subtleClasses
            }`}
        >
            {icon && <i className={`fas ${icon} text-[12px]`} aria-hidden="true" />}
            {children}
        </button>
    )
}

/** iOS-style toggle switch. */
export function Toggle({ accentColor, ariaLabel, checked, onChange }) {
    return (
        <button type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={onChange}
            className="relative inline-flex h-6 w-11 shrink-0 rounded-full border border-border-light transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] motion-reduce:transition-none"
            style={{ background: checked ? accentColor : 'var(--bg-tertiary)' }}
        >
            <span
                className="absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-white shadow-sm transition-all duration-200 ease-out motion-reduce:transition-none"
                style={{ left: checked ? 22 : 2 }}
            />
        </button>
    )
}

/** Inline pill switcher — accepts a list of `{value, label, icon}` options. */
export function SegmentedControl({ accentColor, onChange, options, value }) {
    return (
        <div className="inline-flex items-center gap-1 rounded-md border border-border-light bg-bg-tertiary p-1">
            {options.map((opt) => {
                const active = value === opt.value
                return (
                    <button type="button"
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        aria-pressed={active}
                        className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[12.5px] font-semibold uppercase tracking-wider transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] motion-reduce:transition-none"
                        style={{
                            background: active ? accentColor : 'transparent',
                            color: active ? '#fff' : 'var(--text-secondary)'
                        }}
                    >
                        {opt.icon && <i className={`fas ${opt.icon} text-[12px]`} aria-hidden="true" />}
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

/** Single label / value detail row used in the Profile tab's scope card. */
export function DetailRow({ icon, label, mono, value }) {
    return (
        <div className="flex items-center justify-between border-b border-border-light py-3.5 last:border-b-0">
            <div className="flex items-center gap-3">
                <i className={`fas ${icon} w-5 text-center text-[13px] text-text-tertiary`} aria-hidden="true" />
                <span className="text-[13px] text-text-secondary">{label}</span>
            </div>
            <span className={`text-[14px] font-semibold text-text-primary ${mono ? 'font-mono tabular-nums' : ''}`}>
                {value}
            </span>
        </div>
    )
}

/** Single cell in the at-a-glance stat strip. Flat label / mono value / hint. */
export function StatCell({ hint, label, value }) {
    return (
        <div className="flex flex-col gap-0.5 border-r border-border-light bg-bg-primary px-3 py-2.5 last:border-r-0">
            <span className="text-[11px] text-text-secondary">{label}</span>
            <span className="font-mono text-[20px] font-semibold leading-tight tabular-nums text-text-primary">
                {value}
            </span>
            {hint && <span className="text-[11px] text-text-tertiary">{hint}</span>}
        </div>
    )
}
