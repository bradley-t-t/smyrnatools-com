/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { ICONS } from '../../../constants/navigationConstants'

const HEADER_SELECT_ARROW =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")"

/** Labeled section divider used in the mobile navigation drawer. */
export function MobileSection({ title, children }) {
    return (
        <div className="mb-4">
            <div className="mb-1 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                {title}
            </div>
            {children}
        </div>
    )
}

/** Single tappable row in the mobile navigation drawer. */
export function MobileMenuItem({ item, isActive, onClick, accentColor = '#1e3a5f' }) {
    const activeTint = `${accentColor}14`
    return (
        <button type="button"
            className={`mb-1 flex w-full items-center gap-3 rounded-[10px] border-none p-3 text-left text-text-primary cursor-pointer transition-[background-color,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${isActive ? 'font-semibold' : 'font-normal bg-transparent'}`}
            style={isActive ? { backgroundColor: activeTint } : undefined}
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
        >
            <i
                className={`fas ${ICONS[item.id] || 'fa-circle'} w-5 text-base ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}
                aria-hidden="true"
            />
            <span className="text-[15px]">{item.text}</span>
        </button>
    )
}

/** Region <select> for the mobile drawer. */
export function MobileRegionSelect({ regionCode, permittedRegions, onChange }) {
    return (
        <div className="mb-5">
            <label
                htmlFor="mobile-region-select"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary"
            >
                Region
            </label>
            <select
                id="mobile-region-select"
                aria-label="Region"
                className="w-full cursor-pointer appearance-none rounded-[10px] border-2 border-border-light bg-bg-secondary py-3 pl-3 pr-9 text-sm font-semibold text-text-primary bg-no-repeat bg-[right_12px_center] bg-[length:16px_16px] [color-scheme:light] dark:[color-scheme:dark] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke=%22currentColor%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%222%22%20d=%22M19%209l-7%207-7-7%22%3E%3C/path%3E%3C/svg%3E')] transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none hover:border-border-medium focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15"
                value={regionCode || ''}
                onChange={onChange}
            >
                {permittedRegions.length === 0 ? (
                    <option value="">Loading...</option>
                ) : (
                    permittedRegions.map((r) => (
                        <option key={r.regionCode || r.region_code} value={r.regionCode || r.region_code}>
                            {r.regionName || r.region_name}
                        </option>
                    ))
                )}
            </select>
        </div>
    )
}

/** Compact region <select> for the two-level top bar. */
export function TwoLevelRegionSelect({ regionCode, permittedRegions, onChange }) {
    return (
        <select
            value={regionCode || ''}
            onChange={onChange}
            aria-label="Region"
            className="cursor-pointer appearance-none rounded-[10px] border border-white/[0.12] bg-white/[0.08] py-2 pl-3 pr-8 text-[13px] font-semibold text-white transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none hover:bg-white/[0.14] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{
                backgroundImage: HEADER_SELECT_ARROW,
                backgroundPosition: 'right 8px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '14px'
            }}
        >
            {permittedRegions.length === 0 ? (
                <option value="" className="bg-[#1e293b] text-slate-50">
                    Loading...
                </option>
            ) : (
                permittedRegions.map((r) => (
                    <option
                        className="bg-[#1e293b] text-slate-50"
                        key={r.regionCode || r.region_code}
                        value={r.regionCode || r.region_code}
                    >
                        {r.regionName || r.region_name}
                    </option>
                ))
            )}
        </select>
    )
}

/** Region <select> for the top-bar basic header (responsive to tablet sizing). */
export function TopBarRegionSelect({ regionCode, permittedRegions, onChange, isTablet }) {
    const size = isTablet
        ? 'py-1.5 pl-2.5 pr-6 text-xs rounded-lg max-w-[120px]'
        : 'py-2.5 pl-4 pr-9 text-sm rounded-[12px]'
    return (
        <select
            className={`appearance-none cursor-pointer overflow-hidden whitespace-nowrap text-ellipsis bg-white/[0.08] border border-white/15 font-semibold text-white tracking-[0.01em] transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none hover:bg-white/[0.16] hover:border-white/30 focus-visible:bg-white/[0.16] focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${size}`}
            aria-label="Region"
            value={regionCode || ''}
            onChange={onChange}
            style={{
                backgroundImage: HEADER_SELECT_ARROW,
                backgroundPosition: 'right 8px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: isTablet ? '12px' : '16px'
            }}
        >
            {permittedRegions.length === 0 ? (
                <option className="bg-[#1e293b] text-slate-50" value="">
                    Loading...
                </option>
            ) : (
                permittedRegions.map((r) => (
                    <option
                        className="bg-[#1e293b] text-slate-50"
                        key={r.regionCode || r.region_code}
                        value={r.regionCode || r.region_code}
                    >
                        {r.regionName || r.region_name}
                    </option>
                ))
            )}
        </select>
    )
}
