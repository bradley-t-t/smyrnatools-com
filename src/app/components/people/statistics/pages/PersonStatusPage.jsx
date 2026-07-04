import React from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import { CategoricalBarChart, StatusPieChart } from '../../../assets/statistics/AssetStatisticsCharts'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'

export function PersonStatusPage({ accentColor, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { statusDistribution, summary } = stats
    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat label="Active" value={fmtInt(summary.activeCount)} hint="on the roster today" />
                <Stat label="Inactive" value={fmtInt(summary.retiredCount)} hint="terminated / no-hire" />
                <Stat label="Trainers" value={fmtInt(summary.trainerCount)} hint="flagged as trainer" />
                <Stat
                    label="Missing data"
                    value={fmtInt(summary.missingPlant + summary.missingName + summary.missingPhone)}
                    hint="plant + name + phone gaps"
                />
            </StatGroup>
            <Panel title="Roster status mix" innerClassName="p-3">
                {statusDistribution.length === 0 ? (
                    <div className="text-[12px] py-6 text-center text-text-tertiary">No status data in scope.</div>
                ) : (
                    <StatusPieChart data={statusDistribution} />
                )}
            </Panel>
            <Panel title="By status" innerClassName="p-3">
                <CategoricalBarChart accent={accent} data={statusDistribution} height={220} />
            </Panel>
        </div>
    )
}
