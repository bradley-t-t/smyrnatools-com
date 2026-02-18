import React from 'react'

import { reportTypeMap } from '../../../types/ReportTypes'
import {
    ComparisonTable,
    ReportCard,
    reportPluginStyles,
    usePreviousWeekReport,
    useReportVariance,
    VarianceCell
} from './shared'

export function AggregateProductionSubmitPlugin({ form, setForm, readOnly, weekIso }) {
    const { previousReport: lastWeekAgg } = usePreviousWeekReport(weekIso, 'aggregate_production')
    const { getLastWeekValue, formatVariancePercent } = useReportVariance(lastWeekAgg?.data, form)

    return (
        <>
            <style>{reportPluginStyles}</style>
            <ReportCard title="Aggregate Production Report" accent>
                <div className="rpt-form-row rpt-flex-col">
                    <ComparisonTable headers={['Material', 'Last Week', 'This Week', 'Variance']}>
                        {reportTypeMap.aggregate_production.fields.map((f) => (
                            <tr key={f.name}>
                                <td>{f.label}</td>
                                <td>
                                    <input
                                        type="text"
                                        value={String(getLastWeekValue(f.name))}
                                        disabled
                                        className="rpt-input"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={form[f.name] ?? ''}
                                        onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                                        disabled={readOnly}
                                        className="rpt-input"
                                    />
                                </td>
                                <td>
                                    <VarianceCell varianceStr={formatVariancePercent(f.name)} />
                                </td>
                            </tr>
                        ))}
                    </ComparisonTable>
                </div>
            </ReportCard>
        </>
    )
}

export function AggregateProductionReviewPlugin() {
    return (
        <>
            <style>{reportPluginStyles}</style>
            <ReportCard title="Aggregate Production Report">
                <div className="rpt-empty">Review view for Aggregate Production reports.</div>
            </ReportCard>
        </>
    )
}
