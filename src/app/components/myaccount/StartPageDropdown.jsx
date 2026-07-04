import React, { useEffect, useRef, useState } from 'react'

import { FieldStyle, START_PAGE_OPTIONS } from '../../constants/myAccountConstants'

/** Custom styled dropdown for selecting the default start page — uses the
 *  shared icon list from `START_PAGE_OPTIONS`. Closes on outside click. */
export default function StartPageDropdown({ accentColor, onChange, value }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const selected = START_PAGE_OPTIONS.find((o) => o.id === value) || START_PAGE_OPTIONS[0]

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left outline-none transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent/30 active:scale-[0.97]"
                style={FieldStyle}
            >
                <span className="flex items-center gap-3">
                    <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-tertiary"
                        style={{ color: accentColor }}
                    >
                        <i className={`fas ${selected.icon} text-[14px]`} />
                    </span>
                    <span className="text-[14px] font-semibold text-text-primary">{selected.id}</span>
                </span>
                <i
                    className={`fas fa-chevron-down text-[11px] transition-transform ${open ? 'rotate-180' : ''} text-text-tertiary`}
                />
            </button>
            {open && (
                <div
                    role="listbox"
                    aria-label="Start page"
                    className="absolute left-0 right-0 z-50 mt-1.5 max-h-72 overflow-y-auto rounded-lg py-1.5 bg-bg-primary border border-border-light"
                    style={{ boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.18))' }}
                >
                    {START_PAGE_OPTIONS.map(({ icon, id }) => {
                        const isActive = id === value
                        return (
                            <button type="button"
                                key={id}
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                    onChange(id)
                                    setOpen(false)
                                }}
                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary text-text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-accent/40"
                                style={{
                                    background: isActive ? `${accentColor}14` : 'transparent',
                                    fontWeight: isActive ? 600 : 500
                                }}
                            >
                                <span
                                    className="flex h-7 w-7 items-center justify-center rounded-md"
                                    style={{
                                        background: isActive ? `${accentColor}20` : 'var(--bg-tertiary)',
                                        color: accentColor
                                    }}
                                >
                                    <i className={`fas ${icon} text-[12px]`} />
                                </span>
                                {id}
                                {isActive && (
                                    <i className="fas fa-check ml-auto text-[11px]" style={{ color: accentColor }} />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
