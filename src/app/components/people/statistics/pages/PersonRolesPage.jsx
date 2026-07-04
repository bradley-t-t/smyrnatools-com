import React from 'react'

import { fmtInt, fmtPct } from '../../../../../utils/PlanStatisticsFormatUtility'
import { CategoricalBarChart } from '../../../assets/statistics/AssetStatisticsCharts'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'

export function PersonRolesPage({ accentColor, kind, stats }) {
    const accent = accentColor || '#1e3a5f'
    const isOperators = kind === 'operators'
    const { roleDistribution, summary } = stats
    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat
                    label={isOperators ? 'Positions' : 'Roles'}
                    value={fmtInt(roleDistribution.length)}
                    hint={isOperators ? 'unique operator positions' : 'unique roles'}
                />
                <Stat
                    label="Top group"
                    value={roleDistribution[0] ? fmtInt(roleDistribution[0].count) : '—'}
                    hint={roleDistribution[0] ? roleDistribution[0].label : '—'}
                />
                <Stat
                    label="Top group share"
                    value={
                        roleDistribution[0] && summary.total > 0
                            ? fmtPct((roleDistribution[0].count / summary.total) * 100)
                            : '—'
                    }
                    hint="of roster"
                />
                {isOperators && (
                    <Stat label="Trainers" value={fmtInt(summary.trainerCount)} hint="across all positions" />
                )}
            </StatGroup>
            <Panel title={isOperators ? 'Position breakdown' : 'Role breakdown'} innerClassName="p-3">
                {roleDistribution.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">Nothing assigned yet.</div>
                ) : (
                    <CategoricalBarChart accent={accent} data={roleDistribution} height={240} />
                )}
            </Panel>
        </div>
    )
}
