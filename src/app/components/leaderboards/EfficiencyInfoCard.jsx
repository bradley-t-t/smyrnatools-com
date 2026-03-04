import React, { useState } from 'react'

import { useIsMobile } from '../../hooks/useIsMobile'

/** Formula component definitions used to render the efficiency calculation breakdown. */
const FORMULA_COMPONENTS = [
    { description: 'Average yards produced per hour worked', isOperator: false, label: 'YPH Score', weight: '90%' },
    { isOperator: true, symbol: '+' },
    { description: 'Efficiency of loads vs capacity', isOperator: false, label: 'Load Efficiency', weight: '10%' },
    { isOperator: true, symbol: '-' },
    {
        description: 'Deductions for missing or incomplete reports',
        isOperator: false,
        label: 'Report Penalty',
        weight: null
    }
]

/**
 * Collapsible info card explaining the leaderboard efficiency formula.
 * Displays a visual formula breakdown with weighted components
 * and numbered descriptions when expanded.
 */
export default function EfficiencyInfoCard() {
    const isMobile = useIsMobile()
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 md:mb-8">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-blue-100/50 md:px-6"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
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
                    className={`fas fa-chevron-down text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {isExpanded && (
                <div className="border-t border-blue-100 px-5 pb-5 pt-4 md:px-6 md:pb-6">
                    <div className="mb-5 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white p-4 shadow-sm">
                        {FORMULA_COMPONENTS.map((item, idx) =>
                            item.isOperator ? (
                                <span key={idx} className="px-1 text-lg font-bold text-blue-600">
                                    {item.symbol}
                                </span>
                            ) : (
                                <div
                                    key={idx}
                                    className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 px-3 py-2"
                                >
                                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                                    {item.weight && (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[0.625rem] font-bold text-blue-700">
                                            {item.weight}
                                        </span>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    <div className="space-y-2">
                        {FORMULA_COMPONENTS.filter((c) => !c.isOperator).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 rounded-lg bg-white/60 px-3 py-2">
                                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs text-blue-600">
                                    {idx + 1}
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                                    <span className="text-sm text-slate-500"> → {item.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                        <i className="fas fa-lightbulb mt-0.5" />
                        <span>
                            Fleet cleanliness is displayed for reference but does not affect the efficiency score.
                            Higher efficiency indicates better overall plant performance.
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
