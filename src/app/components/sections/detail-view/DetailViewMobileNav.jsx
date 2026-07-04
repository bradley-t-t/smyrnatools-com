/* eslint-disable react/forbid-dom-props */
import React from 'react'

export default function DetailViewMobileNav({ accent, activeSection, footerActions, sections, setActiveSection }) {
    return (
        <nav className="dv-mobile-nav">
            {sections.map((section) => (
                <button type="button"
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="dv-mobile-nav-btn"
                    style={{
                        background: activeSection === section.id ? `${accent}15` : 'var(--bg-secondary)',
                        color: activeSection === section.id ? accent : 'var(--text-secondary)'
                    }}
                >
                    <i className={section.icon || 'fas fa-circle'}></i>
                    <span className="max-w-[60px] truncate">{section.title}</span>
                </button>
            ))}
            {footerActions && (
                <div className="ml-auto flex gap-1 border-l border-border-light pl-2">{footerActions}</div>
            )}
        </nav>
    )
}
