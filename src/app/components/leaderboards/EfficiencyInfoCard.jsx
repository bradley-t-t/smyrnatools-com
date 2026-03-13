import React, { useState } from 'react'

import { usePreferences } from '../../context/PreferencesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
const FORMULA_COMPONENTS = [
    { description: 'Average yards produced per hour worked', label: 'YPH Score', weight: '90%' },
    { isOperator: true, symbol: '+' },
    { description: 'Efficiency of loads vs operator capacity', label: 'Load Efficiency', weight: '10%' },
    { isOperator: true, symbol: '\u2212' },
    { description: 'Deductions for missing or incomplete reports', label: 'Report Penalty', weight: null }
]
/**
 * Collapsible info card explaining the leaderboard efficiency formula.
 * Displays a visual formula breakdown with weighted components
 * and numbered descriptions when expanded.
 */
export default function EfficiencyInfoCard() {
    const isMobile = useIsMobile()
    const [isExpanded, setIsExpanded] = useState(false)
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <div
            className="mb-6 overflow-hidden rounded-2xl border md:mb-8"
            style={{ background: `linear-gradient(135deg, ${accent}08, ${accent}04)`, borderColor: `${accent}20` }}
        >
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors md:px-6 hover:bg-[--hover-bg]"
                style={{ '--hover-bg': `${accent}10` }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${accent}15`, color: accent }}
                    >
                        <i className="fas fa-calculator" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-800 md:text-base">
                            How Efficiency is Calculated
                        </div>
                        {!isExpanded && !isMobile && (
                            <div className="text-xs text-slate-500">Click to see the formula breakdown</div>
                        )}
                    </div>
                </div>
                <i
                    className={`fas fa-chevron-down text-slate-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>
            {isExpanded && (
                <div className="px-5 pb-5 pt-4 md:px-6 md:pb-6 border-t" style={{ borderColor: `${accent}15` }}>
                    <div className="mb-5 flex flex-wrap items-center justify-center gap-2.5 rounded-xl bg-white/80 p-4 shadow-sm border border-slate-100">
                        {FORMULA_COMPONENTS.map((item, idx) =>
                            item.isOperator ? (
                                <span key={idx} className="px-1 text-lg font-bold" style={{ color: accent }}>
                                    {item.symbol}
                                </span>
                            ) : (
                                <div
                                    key={idx}
                                    className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-2.5"
                                >
                                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                                    {item.weight && (
                                        <span
                                            className="rounded-full px-2.5 py-0.5 text-[0.625rem] font-bold text-white"
                                            style={{ backgroundColor: accent }}
                                        >
                                            {item.weight}
                                        </span>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                    <div className="space-y-2">
                        {FORMULA_COMPONENTS.filter((c) => !c.isOperator).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 rounded-lg bg-white/60 px-3 py-2.5">
                                <div
                                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                    style={{ backgroundColor: accent }}
                                >
                                    {idx + 1}
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                                    <span className="text-sm text-slate-500"> — {item.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div
                        className="mt-4 flex items-start gap-2.5 rounded-lg p-3 text-xs"
                        style={{ backgroundColor: `${accent}08`, color: `${accent}cc` }}
                    >
                        <i className="fas fa-info-circle mt-0.5" />
                        <span>
                            Fleet cleanliness and safety metrics are displayed for reference but do not affect the
                            efficiency score. Higher efficiency indicates better overall plant performance.
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
