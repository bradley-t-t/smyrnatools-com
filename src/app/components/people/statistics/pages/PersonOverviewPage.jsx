/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { fmtInt, fmtPct } from '../../../../../utils/PlanStatisticsFormatUtility'
import { StatusPieChart } from '../../../assets/statistics/AssetStatisticsCharts'
import StarRating from '../../../common/StarRating'
import { Panel } from '../../../ui/Panel'
import { HighlightRow, LaunchpadTile } from './personStatsShared'

export function PersonOverviewPage({ accentColor, kind, onSelectSection, stats }) {
    const accent = accentColor || '#1e3a5f'
    const isOperators = kind === 'operators'
    const { perPlant, roleDistribution, statusDistribution, summary } = stats
    const topRoles = roleDistribution.slice(0, 4)
    const topStatuses = statusDistribution.slice(0, 4)

    return (
        <div className="flex flex-col gap-4">
            <Panel title="Roster snapshot" innerClassName="p-0">
                <HighlightRow
                    icon="fa-users"
                    label={isOperators ? 'Operators' : 'Managers'}
                    value={`${fmtInt(summary.total)} on roster`}
                    hint={`${fmtInt(summary.activeCount)} active · ${fmtInt(summary.retiredCount)} terminated / inactive`}
                />
                {isOperators && summary.ratingSamples > 0 && (
                    <HighlightRow
                        icon="fa-star"
                        label="Rating"
                        value={
                            summary.avgRating != null ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <StarRating
                                        value={summary.avgRating}
                                        size="sm"
                                        tone="warning"
                                        showValue
                                        valueFormat="decimal"
                                    />
                                    <span className="text-text-tertiary">avg</span>
                                </span>
                            ) : (
                                '—'
                            )
                        }
                        hint={`${fmtInt(summary.ratingSamples)} rated operators`}
                    />
                )}
                {!isOperators && (
                    <HighlightRow
                        icon="fa-right-to-bracket"
                        label="Login recency"
                        value={
                            summary.avgLastLoginDays != null
                                ? `${fmtInt(summary.avgLastLoginDays)} d avg`
                                : 'no recent logins'
                        }
                        hint={
                            summary.neverLoggedIn > 0
                                ? `${fmtInt(summary.neverLoggedIn)} have never logged in`
                                : 'every manager has signed in'
                        }
                    />
                )}
                {!isOperators && stats.managerCoverage && (
                    <HighlightRow
                        icon="fa-shield-halved"
                        label="Coverage risk"
                        value={
                            stats.managerCoverage.uncoveredPlants.length === 0 &&
                            stats.managerCoverage.spofPlants.length === 0
                                ? 'No gaps — every plant has backup'
                                : `${fmtInt(stats.managerCoverage.uncoveredPlants.length)} uncovered · ${fmtInt(stats.managerCoverage.spofPlants.length)} SPOF`
                        }
                        hint={
                            stats.managerCoverage.recentAdditions.length > 0
                                ? `${fmtInt(stats.managerCoverage.recentAdditions.length)} added in last 30 d`
                                : 'roster stable last 30 d'
                        }
                    />
                )}
                {!isOperators && stats.managerCoverage && (
                    <HighlightRow
                        icon="fa-user-shield"
                        label="Role tiers"
                        value={`${fmtInt(stats.managerCoverage.roleTiers.admin)} admin · ${fmtInt(stats.managerCoverage.roleTiers.lead)} lead`}
                        hint={`${fmtInt(stats.managerCoverage.roleTiers.manager)} manager · ${fmtInt(stats.managerCoverage.roleTiers.viewer)} viewer`}
                    />
                )}
                {isOperators && stats.hiringTraining && (
                    <HighlightRow
                        icon="fa-user-plus"
                        label="Hiring pipeline"
                        value={
                            stats.hiringTraining.pendingStarts.length + stats.hiringTraining.inTraining.length > 0
                                ? `${fmtInt(stats.hiringTraining.pendingStarts.length)} pending · ${fmtInt(stats.hiringTraining.inTraining.length)} training`
                                : 'Empty'
                        }
                        hint={`${fmtInt(stats.hiringTraining.trainers.length)} trainer${stats.hiringTraining.trainers.length === 1 ? '' : 's'} · ${fmtInt(stats.hiringTraining.recentHires.length)} new in 90 d`}
                    />
                )}
                <HighlightRow
                    icon="fa-industry"
                    label="Plants represented"
                    value={`${fmtInt(summary.plantsRepresented)} plants`}
                    hint={`${fmtInt(perPlant.length)} in scoped per-plant rollup`}
                />
            </Panel>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {topRoles.length > 0 && (
                    <Panel title={isOperators ? 'Top positions' : 'Top roles'} innerClassName="p-0">
                        <div className="flex flex-col">
                            {topRoles.map((row) => (
                                <div
                                    key={row.label}
                                    className="flex items-center gap-3 px-3 py-2.5 border-t border-border-light first:border-t-0"
                                >
                                    <span className="font-mono tabular-nums font-semibold w-10 text-right text-text-primary">
                                        {fmtInt(row.count)}
                                    </span>
                                    <span className="flex-1 truncate text-text-secondary">{row.label}</span>
                                    <span className="text-[11px] text-text-tertiary">
                                        {fmtPct((row.count / summary.total) * 100)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}
                {isOperators && topStatuses.length > 0 && (
                    <Panel title="Status mix" innerClassName="p-3">
                        <StatusPieChart data={statusDistribution.slice(0, 6)} />
                    </Panel>
                )}
                {!isOperators && (
                    <Panel title="Where managers live" innerClassName="p-0">
                        <div className="flex flex-col">
                            {perPlant.slice(0, 6).map((row) => (
                                <div
                                    key={row.code}
                                    className="flex items-center gap-3 px-3 py-2.5 border-t border-border-light first:border-t-0"
                                >
                                    <span className="font-mono tabular-nums font-semibold w-12 text-text-primary">
                                        {row.code}
                                    </span>
                                    <span className="flex-1 truncate text-text-secondary">{row.name}</span>
                                    <span className="font-mono tabular-nums font-semibold text-text-primary">
                                        {fmtInt(row.total)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}
            </div>

            <Panel title="Jump into details" innerClassName="p-3">
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {isOperators && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-circle-half-stroke"
                            label="Roster Status"
                            section="status"
                            value={fmtInt(summary.activeCount)}
                            hint={`${fmtInt(summary.retiredCount)} inactive`}
                            onSelect={onSelectSection}
                        />
                    )}
                    <LaunchpadTile
                        accent={accent}
                        icon="fa-industry"
                        label="Plant Distribution"
                        section="plants"
                        value={fmtInt(perPlant.length)}
                        hint="plants in scope"
                        onSelect={onSelectSection}
                    />
                    <LaunchpadTile
                        accent={accent}
                        icon="fa-user-tag"
                        label={isOperators ? 'Positions' : 'Roles'}
                        section="roles"
                        value={fmtInt(roleDistribution.length)}
                        hint={isOperators ? 'unique positions' : 'unique roles'}
                        onSelect={onSelectSection}
                    />
                    {isOperators && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-user-plus"
                            label="Hiring & Training"
                            section="hiringTraining"
                            value={fmtInt(stats.hiringTraining?.pendingStarts.length || 0)}
                            hint={
                                stats.hiringTraining?.inTraining.length > 0
                                    ? `${fmtInt(stats.hiringTraining.inTraining.length)} in training`
                                    : 'pending + training pipeline'
                            }
                            onSelect={onSelectSection}
                        />
                    )}
                    {isOperators && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-star"
                            label="Ratings"
                            section="rating"
                            value={
                                summary.avgRating != null ? (
                                    <StarRating
                                        value={summary.avgRating}
                                        size="sm"
                                        tone="warning"
                                        showValue
                                        valueFormat="decimal"
                                    />
                                ) : (
                                    '—'
                                )
                            }
                            hint={`${fmtInt(summary.ratingSamples)} rated`}
                            onSelect={onSelectSection}
                        />
                    )}
                    {!isOperators && stats.managerCoverage && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-shield-halved"
                            label="Coverage & Risk"
                            section="coverage"
                            value={fmtInt(
                                stats.managerCoverage.uncoveredPlants.length + stats.managerCoverage.spofPlants.length
                            )}
                            hint={
                                stats.managerCoverage.uncoveredPlants.length + stats.managerCoverage.spofPlants.length >
                                0
                                    ? `${fmtInt(stats.managerCoverage.uncoveredPlants.length)} uncovered · ${fmtInt(stats.managerCoverage.spofPlants.length)} SPOF`
                                    : 'no coverage gaps'
                            }
                            onSelect={onSelectSection}
                        />
                    )}
                    {!isOperators && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-right-to-bracket"
                            label="Login Activity"
                            section="activity"
                            value={fmtInt(summary.neverLoggedIn)}
                            hint="never logged in"
                            onSelect={onSelectSection}
                        />
                    )}
                </div>
            </Panel>
        </div>
    )
}
