/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { fmtFloat, fmtInt, fmtPct } from '../../../../../utils/PlanStatisticsFormatUtility'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { CategoricalBarChart } from '../AssetStatisticsCharts'
import { AssetWatchlistTable, StatusPill } from '../AssetStatisticsTables'

/** Sub-status color palette — same hues the list view + status charts use,
 *  so a "Ready For Pickup" pill reads the same color in every surface. */
const SUB_STATUS_PALETTE = {
    'Down In Yard': '#dc2626',
    'In Shop': '#3b82f6',
    'Ready For Pickup': '#16a34a',
    'Third Party Work': '#f59e0b',
    'Waiting For Shop': '#ea580c'
}

/** Compact "where the queue stands today" tile — count + the average days
 *  every asset in that bucket has been waiting. Used along the top of the
 *  page so the operations team sees both volume and aging at once. */
function SubStatusTile({ accent, count, days, label, share }) {
    const color = SUB_STATUS_PALETTE[label] || accent
    return (
        <div className="rounded-lg p-3 flex flex-col gap-1 bg-bg-secondary border border-border-light">
            <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary truncate">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="font-mono tabular-nums font-bold text-text-primary" style={{ fontSize: 22 }}>
                    {fmtInt(count)}
                </span>
                {share > 0 && <span className="text-[11px] text-text-tertiary">{fmtPct(share * 100)}</span>}
            </div>
            <div className="text-[10.5px] text-text-tertiary">
                {days != null ? `${fmtFloat(days)}d avg in this bucket` : 'tenure not recorded'}
            </div>
        </div>
    )
}

/**
 * Shop Performance — the operations team's window into the shop queue. The
 * page is intentionally focused on the *current* shop snapshot (no history
 * yet), so every number is derivable from the live items already streaming
 * into the page via realtime. When the asset type carries shop
 * sub-statuses (mixers today), the page breaks the queue out into the same
 * buckets the list view uses; otherwise it falls back to a single "In
 * Shop" rollup.
 */
export function AssetStatisticsShopPerformancePage({ accentColor, onSelectAsset, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { shopPerformance, summary } = stats
    const {
        avgShopDays,
        downInYardCount,
        inShopCount,
        readyForPickupCount,
        readyForPickupQueue,
        shopByPlant,
        shopRate,
        stuckCount,
        stuckInShop,
        stuckThreshold,
        subStatusDistribution,
        supportsSubStatuses,
        tenureDistribution,
        thirdPartyCount,
        totalInShop,
        waitingForShopCount
    } = shopPerformance

    if (totalInShop === 0) {
        return (
            <div className="flex flex-col gap-4">
                <StatGroup columns={4}>
                    <Stat label="In shop" value="0" hint="shop is empty" />
                    <Stat label="Shop rate" value="0%" hint="of operational fleet" />
                    <Stat label="Avg days in shop" value="—" hint="no shop entries" />
                    <Stat label={`Stuck > ${stuckThreshold}d`} value="0" hint="nothing flagged" />
                </StatGroup>
                <Panel title="Nothing in the shop right now" innerClassName="p-6">
                    <div className="flex items-center justify-center gap-2 py-4 text-[12.5px] text-text-secondary">
                        <i className="fas fa-circle-check text-[18px]" />
                        Every operational asset in scope is on the road or on standby.
                    </div>
                </Panel>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat label="In shop" value={fmtInt(totalInShop)} hint={`${fmtPct(shopRate * 100)} of fleet`} />
                <Stat
                    label="Avg days in shop"
                    value={avgShopDays != null ? `${fmtFloat(avgShopDays)}d` : '—'}
                    hint={supportsSubStatuses ? 'across every sub-status' : 'time in shop status'}
                />
                <Stat label={`Stuck > ${stuckThreshold}d`} value={fmtInt(stuckCount)} hint="needs attention" />
                {supportsSubStatuses ? (
                    <Stat label="Ready for pickup" value={fmtInt(readyForPickupCount)} hint="done, awaiting pickup" />
                ) : (
                    <Stat label="Plants impacted" value={fmtInt(shopByPlant.length)} hint="plants with shop entries" />
                )}
            </StatGroup>

            {supportsSubStatuses && (
                <Panel title="Where the queue stands" innerClassName="p-3">
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <SubStatusTile
                            accent={accent}
                            count={inShopCount}
                            days={subStatusDistribution.find((row) => row.label === 'In Shop')?.avgDays}
                            label="In Shop"
                            share={totalInShop > 0 ? inShopCount / totalInShop : 0}
                        />
                        <SubStatusTile
                            accent={accent}
                            count={thirdPartyCount}
                            days={subStatusDistribution.find((row) => row.label === 'Third Party Work')?.avgDays}
                            label="Third Party Work"
                            share={totalInShop > 0 ? thirdPartyCount / totalInShop : 0}
                        />
                        <SubStatusTile
                            accent={accent}
                            count={readyForPickupCount}
                            days={subStatusDistribution.find((row) => row.label === 'Ready For Pickup')?.avgDays}
                            label="Ready For Pickup"
                            share={totalInShop > 0 ? readyForPickupCount / totalInShop : 0}
                        />
                        <SubStatusTile
                            accent={accent}
                            count={waitingForShopCount}
                            days={subStatusDistribution.find((row) => row.label === 'Waiting For Shop')?.avgDays}
                            label="Waiting For Shop"
                            share={totalInShop > 0 ? waitingForShopCount / totalInShop : 0}
                        />
                        <SubStatusTile
                            accent={accent}
                            count={downInYardCount}
                            days={subStatusDistribution.find((row) => row.label === 'Down In Yard')?.avgDays}
                            label="Down In Yard"
                            share={totalInShop > 0 ? downInYardCount / totalInShop : 0}
                        />
                    </div>
                </Panel>
            )}

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel title="Days currently in shop" innerClassName="p-3">
                    <CategoricalBarChart accent={accent} data={tenureDistribution} height={220} />
                    <div className="mt-2 text-[11px] text-text-tertiary">
                        Histogram of how long each asset has been in its current shop sub-status. Tail past 30 days is
                        where shop intervention pays off the most.
                    </div>
                </Panel>
                <Panel title="Shop load by plant" innerClassName="p-3">
                    {shopByPlant.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-text-tertiary">
                            <i className="fas fa-circle-info text-[14px]" />
                            No plants currently have shop entries.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="text-text-tertiary">
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Plant
                                        </th>
                                        <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                            Total
                                        </th>
                                        {supportsSubStatuses && (
                                            <>
                                                <th
                                                    className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2"
                                                    title="In active repair"
                                                >
                                                    In Shop
                                                </th>
                                                <th
                                                    className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2"
                                                    title="Outsourced repair work"
                                                >
                                                    3rd Party
                                                </th>
                                                <th
                                                    className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2"
                                                    title="Done, awaiting pickup"
                                                >
                                                    Ready
                                                </th>
                                                <th
                                                    className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2"
                                                    title="Waiting to enter the shop"
                                                >
                                                    Waiting
                                                </th>
                                                <th
                                                    className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2"
                                                    title="Down in the yard — urgent"
                                                >
                                                    Down
                                                </th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {shopByPlant.map((row) => (
                                        <tr key={row.code} className="border-t border-border-light">
                                            <td className="px-3 py-2">
                                                <span className="font-mono tabular-nums font-semibold text-text-primary">
                                                    {row.code}
                                                </span>
                                                {row.name !== row.code && (
                                                    <span className="ml-2 text-text-secondary">{row.name}</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text-primary">
                                                {fmtInt(row.total)}
                                            </td>
                                            {supportsSubStatuses && (
                                                <>
                                                    <td className="px-2 py-2 text-right font-mono tabular-nums text-text-primary">
                                                        {row.inShop > 0 ? fmtInt(row.inShop) : '—'}
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-mono tabular-nums text-text-primary">
                                                        {row.thirdParty > 0 ? fmtInt(row.thirdParty) : '—'}
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-mono tabular-nums text-text-primary">
                                                        {row.readyForPickup > 0 ? fmtInt(row.readyForPickup) : '—'}
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-mono tabular-nums text-text-primary">
                                                        {row.waitingForShop > 0 ? fmtInt(row.waitingForShop) : '—'}
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-mono tabular-nums text-text-primary">
                                                        {row.downInYard > 0 ? fmtInt(row.downInYard) : '—'}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>

            <Panel
                title="Stuck in shop"
                innerClassName="p-0"
                right={
                    <span className="text-[11px] text-text-tertiary">
                        {`Top ${stuckInShop.length} by days in shop`}
                    </span>
                }
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Days in shop"
                    onSelect={onSelectAsset}
                    rows={stuckInShop}
                    valueAccessor={(row) => row.days}
                    valueFormatter={(value) => (value == null ? '—' : `${fmtInt(value)}d`)}
                />
            </Panel>

            {supportsSubStatuses && readyForPickupQueue.length > 0 && (
                <Panel
                    title="Ready-for-pickup queue"
                    innerClassName="p-0"
                    right={
                        <span className="text-[11px] text-text-tertiary">
                            {`${readyForPickupQueue.length} asset${readyForPickupQueue.length === 1 ? '' : 's'} waiting`}
                        </span>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="text-text-tertiary">
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Asset
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Plant
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Status
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Waiting
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {readyForPickupQueue.map((row) => (
                                    <tr key={row.id} className="border-t border-border-light">
                                        <td className="px-3 py-2">
                                            <button type="button"
                                                onClick={() => onSelectAsset?.(row)}
                                                className="font-mono tabular-nums font-semibold bg-transparent border-none cursor-pointer p-0 text-left text-text-primary active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                                            >
                                                {row.identifier}
                                            </button>
                                            {row.operatorName && (
                                                <div className="text-[10.5px] text-text-tertiary truncate">
                                                    {row.operatorName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                            {row.plant}
                                        </td>
                                        <td className="px-2 py-2">
                                            <StatusPill status={row.status} />
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-text-primary">
                                            {row.days == null ? '—' : `${fmtInt(row.days)}d`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}

            {/* When the fleet hits an aggregate health milestone, surface it
                inline so the operations team can celebrate a clean shop. */}
            {summary.total > 0 && totalInShop / summary.total < 0.05 && (
                <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-text-secondary">
                    <i className="fas fa-circle-check text-[14px]" />
                    Shop is running lean — under 5% of the fleet is in repair.
                </div>
            )}
        </div>
    )
}

export default AssetStatisticsShopPerformancePage
