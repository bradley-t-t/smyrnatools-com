/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { fmtFloat, fmtInt, fmtPct } from '../../../../../utils/PlanStatisticsFormatUtility'
import { Panel } from '../../../ui/Panel'

/** Launchpad tile linking into a deep-dive sub-page — single teaser metric +
 *  hint so the Overview answers "what should I look at next?" without
 *  replaying any other section. */
function LaunchpadTile({ accent, hint, icon, label, onSelect, section, value }) {
    return (
        <button type="button"
            onClick={() => onSelect?.(section)}
            className="flex flex-col gap-1 items-start rounded-lg border bg-bg-secondary border-border-light cursor-pointer p-3 text-left hover:border-current transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none active:scale-[0.97]"
            style={{ color: 'var(--text-secondary)' }}
        >
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider">
                <i className={`fas ${icon} text-[11px] text-text-primary`} />
                {label}
            </span>
            <span className="font-mono tabular-nums font-bold leading-none text-text-primary" style={{ fontSize: 22 }}>
                {value}
            </span>
            {hint && <span className="text-[10.5px] text-text-tertiary">{hint}</span>}
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-text-primary">
                Open
                <i className="fas fa-arrow-right text-[9px]" />
            </span>
        </button>
    )
}

/** A single Highlight row inside the period-spotlight / watchlist panels.
 *  Big icon, label, value, optional hint underneath — mirrors the visual
 *  rhythm of the Plan Statistics overview. */
function HighlightRow({ hint, icon, label, value }) {
    return (
        <div className="flex items-start gap-3 px-3 py-2.5 border-t border-border-light first:border-t-0">
            <i className={`fas ${icon} text-[11px] mt-1 w-4 text-center text-text-tertiary`} />
            <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-tertiary">{label}</div>
                <div className="font-semibold truncate text-text-primary" style={{ fontSize: 13.5 }}>
                    {value}
                </div>
                {hint && <div className="text-[11px] text-text-tertiary truncate">{hint}</div>}
            </div>
        </div>
    )
}

/**
 * Overview page — every-section snapshot. Reads as a launchpad: headline
 * fleet shape on top, two side-by-side cards (worst-flagged + healthiest
 * plants), then a grid of launchpad tiles into every deep-dive sub-page.
 */
export function AssetStatisticsOverviewPage({ accentColor, config, onSelectSection, stats }) {
    const { perPlant, summary } = stats
    const accent = accentColor || '#1e3a5f'

    /** Healthiest / least healthy plants — rough heuristic: weight verified
     *  rate + low shop% + low service overdue. Gives the Overview a quick
     *  "where to look first" answer without restating the per-plant page. */
    const plantHealth = perPlant
        .map((row) => {
            const verifiedRate = row.total > 0 ? row.verified / row.total : 0
            const shopRate = row.total > 0 ? row.shop / row.total : 0
            const overdueRate = row.total > 0 ? row.overdueService / row.total : 0
            const score = verifiedRate - shopRate - overdueRate
            return { ...row, overdueRate, score, shopRate, verifiedRate }
        })
        .sort((a, b) => b.score - a.score)

    const healthiest = plantHealth.slice(0, 3)
    const needsAttention = [...plantHealth].sort((a, b) => a.score - b.score).slice(0, 3)

    const shopHint = summary.shopCount > 0 ? `${fmtInt(summary.shopCount)} in shop` : 'no shop entries'

    return (
        <div className="flex flex-col gap-4">
            <Panel title="Fleet snapshot" innerClassName="p-0">
                <HighlightRow
                    icon="fa-clipboard-check"
                    label="Operational fleet"
                    value={`${fmtInt(summary.total)} assets`}
                    hint={`${fmtInt(summary.activeCount)} active · ${fmtInt(summary.spareCount)} spare · ${shopHint}`}
                />
                {config?.hasVerification && (
                    <HighlightRow
                        icon="fa-clipboard-check"
                        label="Verified"
                        value={summary.total > 0 ? `${fmtPct((summary.verifiedRate || 0) * 100)}` : '—'}
                        hint={`${fmtInt(summary.unverified)} unverified · ${fmtInt(summary.assetsMissingAnyField)} missing data`}
                    />
                )}
                {summary.hasService && (
                    <HighlightRow
                        icon="fa-wrench"
                        label="Service health"
                        value={
                            summary.overdueService > 0 ? `${fmtInt(summary.overdueService)} overdue` : 'All caught up'
                        }
                        hint={summary.hasChip ? `${fmtInt(summary.overdueChip)} overdue chips` : 'past-due > 180 days'}
                    />
                )}
                {summary.openIssues > 0 ? (
                    <HighlightRow
                        icon="fa-triangle-exclamation"
                        label="Open issues"
                        value={`${fmtInt(summary.openIssues)} issues`}
                        hint={`across ${fmtInt(summary.assetsWithOpenIssues)} assets`}
                    />
                ) : (
                    <HighlightRow icon="fa-circle-check" label="Open issues" value="None reported" />
                )}
                {summary.hasCleanliness && (
                    <HighlightRow
                        icon="fa-broom"
                        label="Cleanliness"
                        value={summary.cleanlinessAvg != null ? `${fmtFloat(summary.cleanlinessAvg)} ★ avg` : '—'}
                        hint={
                            summary.dirtyCount > 0 ? `${fmtInt(summary.dirtyCount)} assets below 3★` : 'no dirty assets'
                        }
                    />
                )}
                {config?.hasOperatorAssignment && (
                    <HighlightRow
                        icon="fa-id-badge"
                        label="Operator coverage"
                        value={
                            summary.unassignedActive > 0
                                ? `${fmtInt(summary.unassignedActive)} unassigned`
                                : 'Fully covered'
                        }
                        hint={`${fmtInt(summary.activeCount)} active assets`}
                    />
                )}
                {stats.hoursStats?.hasHours && (
                    <HighlightRow
                        icon="fa-gauge"
                        label="Fleet hours"
                        value={
                            stats.hoursStats.avgHours != null
                                ? `${fmtInt(Math.round(stats.hoursStats.avgHours))}h avg`
                                : '—'
                        }
                        hint={
                            stats.hoursStats.hoursUnrecorded > 0
                                ? `${fmtInt(stats.hoursStats.hoursRecorded)} reporting · ${fmtInt(stats.hoursStats.hoursUnrecorded)} missing`
                                : `${fmtInt(stats.hoursStats.hoursRecorded)} reporting · all caught up`
                        }
                    />
                )}
                <HighlightRow
                    icon="fa-clock-rotate-left"
                    label="Avg status tenure"
                    value={summary.avgStatusTenure != null ? `${fmtInt(summary.avgStatusTenure)} days` : '—'}
                    hint={summary.avgFleetYear ? `model year ${summary.avgFleetYear}` : 'no year data'}
                />
            </Panel>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel title="Plants that need attention" innerClassName="p-0">
                    {needsAttention.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">No plants in scope.</div>
                    ) : (
                        <div className="flex flex-col">
                            {needsAttention.map((plant) => (
                                <div
                                    key={plant.code}
                                    className="flex items-center gap-3 px-3 py-2.5 border-t border-border-light first:border-t-0"
                                >
                                    <span
                                        className="inline-block w-2 h-2 rounded-full shrink-0"
                                        style={{ background: accent }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono tabular-nums font-semibold text-text-primary">
                                            {plant.code} {plant.name !== plant.code && `· ${plant.name}`}
                                        </div>
                                        <div className="text-[11px] text-text-tertiary">
                                            {fmtInt(plant.total)} fleet
                                            {config?.hasVerification &&
                                                ` · ${fmtPct(plant.verifiedRate * 100)} verified`}
                                            {plant.overdueService > 0 && ` · ${fmtInt(plant.overdueService)} overdue`}
                                            {plant.shop > 0 && ` · ${fmtInt(plant.shop)} shop`}
                                        </div>
                                    </div>
                                    <button type="button"
                                        onClick={() => onSelectSection?.('plants')}
                                        className="text-[11px] font-semibold bg-transparent border-none cursor-pointer text-text-primary active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                                    >
                                        View →
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
                <Panel title="Healthiest plants" innerClassName="p-0">
                    {healthiest.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">No plants in scope.</div>
                    ) : (
                        <div className="flex flex-col">
                            {healthiest.map((plant) => (
                                <div
                                    key={plant.code}
                                    className="flex items-center gap-3 px-3 py-2.5 border-t border-border-light first:border-t-0"
                                >
                                    <span
                                        className="inline-block w-2 h-2 rounded-full shrink-0"
                                        style={{ background: '#16a34a' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono tabular-nums font-semibold text-text-primary">
                                            {plant.code} {plant.name !== plant.code && `· ${plant.name}`}
                                        </div>
                                        <div className="text-[11px] text-text-tertiary">
                                            {fmtInt(plant.total)} fleet
                                            {config?.hasVerification &&
                                                ` · ${fmtPct(plant.verifiedRate * 100)} verified`}
                                            {plant.overdueService === 0 &&
                                                summary.hasService &&
                                                ' · all service current'}
                                            {!summary.hasService && plant.shop === 0 && ' · no shop entries'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel title="Jump into details" innerClassName="p-3">
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    <LaunchpadTile
                        accent={accent}
                        icon="fa-circle-half-stroke"
                        label="Fleet Status"
                        section="fleetStatus"
                        value={fmtInt(summary.shopCount)}
                        hint={`${fmtInt(summary.shopCount)} in shop · ${fmtInt(summary.spareCount)} spare`}
                        onSelect={onSelectSection}
                    />
                    <LaunchpadTile
                        accent={accent}
                        icon="fa-industry"
                        label="Plant Distribution"
                        section="plants"
                        value={fmtInt(perPlant.length)}
                        hint={`${fmtInt(perPlant.length)} plants with fleet`}
                        onSelect={onSelectSection}
                    />
                    {summary.hasService && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-wrench"
                            label="Service Health"
                            section="service"
                            value={fmtInt(summary.overdueService)}
                            hint={`${fmtInt(summary.overdueService)} past-due assets`}
                            onSelect={onSelectSection}
                        />
                    )}
                    <LaunchpadTile
                        accent={accent}
                        icon="fa-screwdriver-wrench"
                        label="Shop Performance"
                        section="shopPerformance"
                        value={fmtInt(stats.shopPerformance.totalInShop)}
                        hint={
                            stats.shopPerformance.stuckCount > 0
                                ? `${fmtInt(stats.shopPerformance.stuckCount)} stuck > ${stats.shopPerformance.stuckThreshold}d`
                                : 'shop queue snapshot'
                        }
                        onSelect={onSelectSection}
                    />
                    {stats.hoursStats?.hasHours && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-gauge"
                            label="Hours & Utilization"
                            section="hours"
                            value={
                                stats.hoursStats.avgHours != null
                                    ? `${fmtInt(Math.round(stats.hoursStats.avgHours))}h`
                                    : '—'
                            }
                            hint={
                                stats.hoursStats.hoursRecorded > 0
                                    ? `${fmtInt(stats.hoursStats.hoursRecorded)} reporting · ${fmtInt(stats.hoursStats.hoursUnrecorded)} missing`
                                    : 'no hours recorded'
                            }
                            onSelect={onSelectSection}
                        />
                    )}
                    {config?.hasVerification && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-clipboard-check"
                            label="Verification & Data"
                            section="verification"
                            value={fmtPct((summary.verifiedRate || 0) * 100)}
                            hint={`${fmtInt(summary.unverified)} need verifying`}
                            onSelect={onSelectSection}
                        />
                    )}
                    {summary.hasCleanliness && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-broom"
                            label="Cleanliness"
                            section="cleanliness"
                            value={summary.cleanlinessAvg != null ? `${fmtFloat(summary.cleanlinessAvg)}★` : '—'}
                            hint={`${fmtInt(summary.dirtyCount)} below 3★`}
                            onSelect={onSelectSection}
                        />
                    )}
                    {config?.hasOperatorAssignment && (
                        <LaunchpadTile
                            accent={accent}
                            icon="fa-id-badge"
                            label="Operator Coverage"
                            section="operators"
                            value={fmtInt(summary.unassignedActive)}
                            hint={`${fmtInt(summary.unassignedActive)} active w/o op`}
                            onSelect={onSelectSection}
                        />
                    )}
                    <LaunchpadTile
                        accent={accent}
                        icon="fa-triangle-exclamation"
                        label="Issues"
                        section="issues"
                        value={fmtInt(summary.openIssues)}
                        hint={`${fmtInt(summary.assetsWithOpenIssues)} assets affected`}
                        onSelect={onSelectSection}
                    />
                    <LaunchpadTile
                        accent={accent}
                        icon="fa-clock-rotate-left"
                        label="Fleet Aging"
                        section="aging"
                        value={summary.avgFleetYear || '—'}
                        hint="model year distribution"
                        onSelect={onSelectSection}
                    />
                </div>
            </Panel>
        </div>
    )
}

export default AssetStatisticsOverviewPage
