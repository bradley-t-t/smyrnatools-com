/* eslint-disable react/forbid-dom-props */
import React from 'react'

const TABS = [
    { icon: 'fa-list', id: 'list', label: 'List' },
    { icon: 'fa-chart-column', id: 'statistics', label: 'Statistics' }
]

/** Tab bar shared by OperatorsView and ManagersView. Matches the asset
 *  shell's chrome so the two surfaces feel like one product. */
export default function PersonViewTabBar({ accentColor, activeTab, onChange }) {
    return (
        <div
            className="flex items-center gap-1 rounded-lg p-0.5 bg-bg-tertiary border border-border-light"
            role="tablist"
        >
            {TABS.map((tab) => {
                const active = tab.id === activeTab
                return (
                    <button type="button"
                        key={tab.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.id)}
                        className="flex items-center gap-1.5 rounded-md text-[12px] font-semibold border-none cursor-pointer px-3 py-1.5 transition-[background-color,color,transform] duration-150 ease-out motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
                        style={{
                            background: active ? accentColor : 'transparent',
                            color: active ? '#fff' : 'var(--text-secondary)'
                        }}
                    >
                        <i className={`fas ${tab.icon} text-[11px]`} aria-hidden="true" />
                        <span>{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
