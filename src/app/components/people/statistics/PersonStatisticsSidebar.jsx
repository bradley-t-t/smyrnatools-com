/* eslint-disable react/forbid-dom-props */
import React, { useMemo } from 'react'

/**
 * Catalogue of every Statistics sub-page available for a people roster
 * view. The `applies` predicate runs against the entity kind + the derived
 * summary so sections that have no data (e.g. rating for managers,
 * last-login for operators) never appear in the menu.
 */
const ALL_PERSON_STATS_SECTIONS = [
    {
        applies: () => true,
        description: 'Headline counts + a snapshot into every other section.',
        icon: 'fa-gauge-high',
        id: 'overview',
        label: 'Overview'
    },
    {
        applies: ({ kind }) => kind === 'operators',
        description: 'Status mix across the operator roster (Active, Light Duty, Training, etc.).',
        icon: 'fa-circle-half-stroke',
        id: 'status',
        label: 'Roster Status'
    },
    {
        applies: () => true,
        description: 'Per-plant counts, active split, and trainer/role coverage.',
        icon: 'fa-industry',
        id: 'plants',
        label: 'Plant Distribution'
    },
    {
        applies: () => true,
        description: 'Breakdown by operator position (Mixer / Tractor) or manager role.',
        icon: 'fa-user-tag',
        id: 'roles',
        label: 'Position & Role'
    },
    {
        applies: ({ kind }) => kind === 'operators',
        description: 'Pending starts, active training, trainer roster, and recent hires — the operator lifecycle.',
        icon: 'fa-user-plus',
        id: 'hiringTraining',
        label: 'Hiring & Training'
    },
    {
        applies: ({ kind }) => kind === 'operators',
        description: 'Operator ratings distribution and the lowest-rated active operators.',
        icon: 'fa-star',
        id: 'rating',
        label: 'Ratings'
    },
    {
        applies: ({ kind }) => kind === 'managers',
        description: 'Plant coverage gaps, single-point-of-failure plants, role tiers, and recent additions.',
        icon: 'fa-shield-halved',
        id: 'coverage',
        label: 'Coverage & Risk'
    },
    {
        applies: ({ kind }) => kind === 'managers',
        description: 'Last-login recency and stale-account watchlist.',
        icon: 'fa-right-to-bracket',
        id: 'activity',
        label: 'Login Activity'
    }
]

export function usePersonStatsSections({ kind, summary }) {
    return useMemo(
        () => ALL_PERSON_STATS_SECTIONS.filter((section) => section.applies({ kind, summary })),
        [kind, summary]
    )
}

export function PersonStatisticsSidebar({ accentColor, activeSection, onSelect, sections }) {
    return (
        <aside className="hidden md:flex shrink-0 flex-col gap-0.5 sticky top-0 self-start py-2 pr-1 w-[220px]">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-2 text-text-tertiary">
                Statistics
            </div>
            {sections.map((section) => {
                const active = section.id === activeSection
                return (
                    <button type="button"
                        key={section.id}
                        onClick={() => onSelect(section.id)}
                        className="flex items-center gap-2.5 rounded-md border-none cursor-pointer text-left px-3 py-2 transition-[background-color,color,transform] duration-150 ease-out motion-reduce:transition-none active:scale-[0.97] hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
                        style={{
                            background: active ? `${accentColor}15` : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                        title={section.description}
                        aria-pressed={active}
                    >
                        <i className={`fas ${section.icon} text-[12px] w-3.5 text-center`} aria-hidden="true" />
                        <span className="text-[12.5px] font-semibold truncate">{section.label}</span>
                    </button>
                )
            })}
        </aside>
    )
}

export function PersonStatisticsSectionTabs({ accentColor, activeSection, onSelect, sections }) {
    return (
        <div
            className="md:hidden flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1"
            style={{ scrollbarWidth: 'none' }}
        >
            {sections.map((section) => {
                const active = section.id === activeSection
                return (
                    <button type="button"
                        key={section.id}
                        onClick={() => onSelect(section.id)}
                        className="flex items-center gap-1.5 rounded-md border-none cursor-pointer px-2.5 py-1.5 text-[12px] font-semibold shrink-0 active:scale-[0.97] transition-[background-color,color,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
                        style={{
                            background: active ? `${accentColor}15` : 'var(--bg-tertiary)',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                        title={section.description}
                        aria-pressed={active}
                    >
                        <i className={`fas ${section.icon} text-[11px]`} aria-hidden="true" />
                        <span>{section.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default PersonStatisticsSidebar
