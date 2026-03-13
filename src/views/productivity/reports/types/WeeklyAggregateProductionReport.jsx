import React from 'react'

import { reportTypeMap } from '../../../../app/types/ReportTypes'
import {
    ComparisonTable,
    ReportCard,
    RPT_INPUT,
    TD_STYLE,
    usePreviousWeekReport,
    useReportVariance,
    VarianceCell
} from './shared'
/** Submit-mode plugin for the Aggregate Production report — material tonnage fields with week-over-week variance comparison. */
export function AggregateProductionSubmitPlugin({ form, setForm, readOnly, weekIso }) {
    const { previousReport: lastWeekAgg } = usePreviousWeekReport(weekIso, 'aggregate_production')
    const { getLastWeekValue, formatVariancePercent } = useReportVariance(lastWeekAgg?.data, form)
    return (
        <ReportCard title="Aggregate Production Report" accent>
            <div className="flex flex-col gap-4">
                <ComparisonTable headers={['Material', 'Last Week', 'This Week', 'Variance']}>
                    {reportTypeMap.aggregate_production.fields.map((f) => (
                        <tr key={f.name} className="hover:[&>td]:bg-slate-50">
                            <td className={TD_STYLE}>{f.label}</td>
                            <td className={TD_STYLE}>
                                <input
                                    type="text"
                                    value={String(getLastWeekValue(f.name))}
                                    disabled
                                    className={RPT_INPUT}
                                />
                            </td>
                            <td className={TD_STYLE}>
                                <input
                                    type="number"
                                    value={form[f.name] ?? ''}
                                    onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                                    disabled={readOnly}
                                    className={RPT_INPUT}
                                />
                            </td>
                            <td className={TD_STYLE}>
                                <VarianceCell varianceStr={formatVariancePercent(f.name)} />
                            </td>
                        </tr>
                    ))}
                </ComparisonTable>
            </div>
        </ReportCard>
    )
}
export function AggregateProductionReviewPlugin() {
    return (
        <ReportCard title="Aggregate Production Report">
            <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                Review view for Aggregate Production reports.
            </div>
        </ReportCard>
    )
}
