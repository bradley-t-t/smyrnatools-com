/* eslint-disable react/forbid-dom-props */
import React from 'react'

/**
 * Top-of-shell header for detail views. Theme-aware (light/dark/gray) via
 * the `bg-bg-primary` + `text-text-primary` tokens, and densified to match
 * the list-view rhythm: 14px title, 4px outer padding scale, single-border
 * separator. Mobile overrides in `index.css` (`.dv-header`, `.dv-header-title`)
 * keep this header from blowing up on small screens.
 */
export default function DetailViewHeader({ headerActions, icon, onBack, onClose, subtitle, title }) {
    return (
        <div className="relative border-b border-border-light bg-bg-primary">
            <div className="dv-header relative flex items-center gap-3 px-4 py-2.5">
                <button type="button"
                    onClick={onBack || onClose}
                    aria-label="Back"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border-none bg-bg-secondary text-[13px] text-text-secondary cursor-pointer transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {icon && <i className={`${icon} text-text-secondary text-[14px]`}></i>}
                        <h1 className="dv-header-title m-0 truncate text-[15px] font-bold text-text-primary">
                            {title}
                        </h1>
                    </div>
                    {subtitle && <p className="m-0 mt-0.5 text-[11.5px] text-text-secondary">{subtitle}</p>}
                </div>
                <div className="dv-header-actions flex items-center gap-1.5">{headerActions}</div>
            </div>
        </div>
    )
}
