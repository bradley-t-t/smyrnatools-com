import React from 'react'

/** Sticky scrollspy nav for the cockpit's left column. Each entry scrolls
 *  its section into view; active state mirrors the Plan dashboard side-nav
 *  with a 2px accent border on the leading edge. */
export default function AccountSideNav({ accentColor, activeId, onJump, sections }) {
    return (
        <aside
            className="hidden lg:block sticky top-0 self-start py-5 pr-3 overflow-y-auto w-[200px]"
            style={{ maxHeight: '100vh' }}
        >
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] px-2 pb-2 text-text-tertiary">
                Sections
            </div>
            <nav className="flex flex-col">
                {sections.map(({ icon, id, label }) => {
                    const isActive = activeId === id
                    return (
                        <button type="button"
                            key={id}
                            onClick={() => onJump(id)}
                            className="flex items-center gap-2 px-2 py-1.5 border-none cursor-pointer text-[13px] text-left bg-transparent transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none active:scale-[0.97]"
                            style={{
                                borderLeft: `2px solid ${isActive ? accentColor : 'transparent'}`,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontWeight: isActive ? 600 : 400
                            }}
                        >
                            <i
                                className={`fas ${icon} text-[12px] w-3.5`}
                                style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                            />
                            <span className="flex-1 truncate">{label}</span>
                        </button>
                    )
                })}
            </nav>
        </aside>
    )
}
