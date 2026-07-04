/* eslint-disable react/forbid-dom-props */
import React, { useMemo } from 'react'

/**
 * Master catalogue of every Statistics sub-page. Sections are filtered per
 * asset type by `applies` — a predicate over the asset config + the live
 * derived summary so a section that has no data on screen (e.g. cleanliness
 * for pickup trucks, service for trailers) never appears in the menu.
 */
const ALL_ASSET_STATS_SECTIONS = [
    {
        applies: () => true,
        description: 'Headline KPIs + a snapshot of every other section.',
        icon: 'fa-gauge-high',
        id: 'overview',
        label: 'Overview'
    },
    {
        applies: () => true,
        description: 'Status mix, sub-status breakdown, and longest-in-status watchlist.',
        icon: 'fa-circle-half-stroke',
        id: 'fleetStatus',
        label: 'Fleet Status'
    },
    {
        applies: () => true,
        description: 'Per-plant scorecards — active / spare / shop split with verification and coverage.',
        icon: 'fa-industry',
        id: 'plants',
        label: 'Plant Distribution'
    },
    {
        applies: ({ summary }) => summary.hasService,
        description: 'Past-due service, days-since-service distribution, and the longest-overdue watchlist.',
        icon: 'fa-wrench',
        id: 'service',
        label: 'Service Health'
    },
    {
        applies: ({ config }) => !!config?.verification?.hasHours,
        description: 'Hours distribution, fleet-wide averages, per-plant utilization, and highest-hour assets.',
        icon: 'fa-gauge',
        id: 'hours',
        label: 'Hours & Utilization'
    },
    {
        applies: () => true,
        description: 'Shop load, sub-status breakdown, days-in-shop, and the stuck-asset watchlist.',
        icon: 'fa-screwdriver-wrench',
        id: 'shopPerformance',
        label: 'Shop Performance'
    },
    {
        applies: ({ config }) => !!config?.hasVerification,
        description: 'Verification rate, stale verifications, and missing identification fields.',
        icon: 'fa-clipboard-check',
        id: 'verification',
        label: 'Verification & Data'
    },
    {
        applies: ({ summary }) => summary.hasCleanliness,
        description: 'Cleanliness rating distribution, dirty fleet list, and per-plant cleanliness rollup.',
        icon: 'fa-broom',
        id: 'cleanliness',
        label: 'Cleanliness'
    },
    {
        applies: ({ config }) => !!config?.hasOperatorAssignment,
        description: 'Assigned vs. unassigned active assets, plus operators on the bench.',
        icon: 'fa-id-badge',
        id: 'operators',
        label: 'Operator Coverage'
    },
    {
        applies: () => true,
        description: 'Open-issue counts, top problem assets, and issues by plant.',
        icon: 'fa-triangle-exclamation',
        id: 'issues',
        label: 'Issues'
    },
    {
        applies: () => true,
        description: 'Model year distribution and the oldest assets still in operation.',
        icon: 'fa-clock-rotate-left',
        id: 'aging',
        label: 'Fleet Aging'
    }
]

/** Returns the section list applicable to the current asset config — used by
 *  the sidebar, mobile tab bar, and the section-meta lookup in the root
 *  view. Excluded sections are pruned both from the menu and from the
 *  routing switch so links stay valid. */
export function useAssetStatsSections({ config, summary }) {
    return useMemo(
        () => ALL_ASSET_STATS_SECTIONS.filter((section) => section.applies({ config, summary })),
        [config, summary]
    )
}

export function AssetStatisticsSidebar({ accentColor, activeSection, onSelect, sections }) {
    return (
        <aside
            aria-label="Statistics sections"
            className="hidden md:flex shrink-0 flex-col gap-0.5 sticky top-0 self-start py-2 pr-1 w-[220px]"
        >
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-2 text-text-tertiary">
                Statistics
            </div>
            {sections.map((section) => {
                const active = section.id === activeSection
                return (
                    <button type="button"
                        key={section.id}
                        onClick={() => onSelect(section.id)}
                        aria-current={active ? 'page' : undefined}
                        aria-label={`${section.label}. ${section.description}`}
                        className="flex items-center gap-2.5 rounded-md border-none cursor-pointer text-left px-3 py-2 transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        style={{
                            background: active ? `${accentColor}15` : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        <i className={`fas ${section.icon} text-[12px] w-3.5 text-center`} />
                        <span className="text-[12.5px] font-semibold truncate">{section.label}</span>
                    </button>
                )
            })}
        </aside>
    )
}

export function AssetStatisticsSectionTabs({ accentColor, activeSection, onSelect, sections }) {
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
                        aria-current={active ? 'page' : undefined}
                        aria-label={`${section.label}. ${section.description}`}
                        className="flex items-center gap-1.5 rounded-md border-none cursor-pointer px-2.5 py-1.5 text-[12px] font-semibold shrink-0 active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        style={{
                            background: active ? `${accentColor}15` : 'var(--bg-tertiary)',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        <i className={`fas ${section.icon} text-[11px]`} />
                        <span>{section.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default AssetStatisticsSidebar
