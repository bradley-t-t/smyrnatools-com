/* eslint-disable react/forbid-dom-props */
import React, { useMemo } from 'react'

import { fmtInt, fmtPct } from '../../../../../utils/PlanStatisticsFormatUtility'
import { itemDisplayId } from '../../../../hooks/useAssetStatistics'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { AssetWatchlistTable } from '../AssetStatisticsTables'

const displayStatus = (item) => {
    const status = String(item.status || 'Unknown')
    if (status !== 'In Shop') return status
    const map = {
        down_in_yard: 'Down In Yard',
        in_shop: 'In Shop',
        ready_for_pickup: 'Ready For Pickup',
        third_party: 'Third Party Work',
        waiting_for_shop: 'Waiting For Shop'
    }
    return map[item.shopStatus] || 'In Shop'
}

/** Days since last verified (or never verified). null means we have no
 *  signal at all; in that case we surface the asset under "never verified". */
const daysSinceVerifiedSignal = (item) => {
    const ts = item.updatedLast || item.updatedAt
    if (!ts) return null
    const time = new Date(ts).getTime()
    if (!Number.isFinite(time)) return null
    return Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)))
}

/**
 * Verification & Data Quality — combines two adjacent questions: are we
 * keeping the fleet verified weekly, and is the identification data (VIN,
 * make, model, year) actually filled in? Both rates compress to a single
 * "data quality" headline.
 */
export function AssetStatisticsVerificationPage({ accentColor, config, onSelectAsset, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { operatorNames, scopedItems, summary } = stats

    /** Unverified watchlist — assets that are operational but failing the
     *  weekly verification check. Sorted by how long it's been since any
     *  edit, so stale assets bubble to the top. */
    const unverifiedAssets = useMemo(() => {
        const enriched = scopedItems
            .filter((item) => !['Retired', 'Terminated'].includes(item.status))
            .filter((item) => !(typeof item.isVerified === 'function' && item.isVerified()))
            .map((item) => ({
                days: daysSinceVerifiedSignal(item),
                id: item.id,
                identifier: itemDisplayId(item, config),
                operatorName: operatorNames.get(item.assignedOperator) || null,
                plant: item.assignedPlant || '—',
                status: displayStatus(item)
            }))
        enriched.sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
        return enriched.slice(0, 20)
    }, [config, operatorNames, scopedItems])

    /** Assets missing one or more identification fields. Surfaced alongside
     *  the unverified list because these are the most common reasons an
     *  asset fails verification. */
    const missingDataAssets = useMemo(() => {
        const enriched = scopedItems
            .filter((item) => !['Retired', 'Terminated'].includes(item.status))
            .map((item) => {
                const missing = []
                const vin = item.vinNumber || item.vin
                if (!vin) missing.push('VIN')
                if (!item.make) missing.push('Make')
                if (!item.model) missing.push('Model')
                if (!item.year) missing.push('Year')
                return {
                    id: item.id,
                    identifier: itemDisplayId(item, config),
                    missing,
                    operatorName: operatorNames.get(item.assignedOperator) || null,
                    plant: item.assignedPlant || '—',
                    status: displayStatus(item)
                }
            })
            .filter((row) => row.missing.length > 0)
        enriched.sort((a, b) => b.missing.length - a.missing.length)
        return enriched.slice(0, 20)
    }, [config, operatorNames, scopedItems])

    const verifiedRatePct = summary.total > 0 ? (summary.verifiedRate || 0) * 100 : 0
    const completeRatePct =
        summary.total > 0 ? ((summary.total - summary.assetsMissingAnyField) / summary.total) * 100 : 0

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat
                    label="Verified"
                    value={fmtPct(verifiedRatePct)}
                    hint={`${fmtInt(summary.verified)} of ${fmtInt(summary.total)}`}
                />
                <Stat label="Unverified" value={fmtInt(summary.unverified)} hint="not checked this week" />
                <Stat
                    label="Data complete"
                    value={fmtPct(completeRatePct)}
                    hint={`${fmtInt(summary.assetsMissingAnyField)} assets missing fields`}
                />
                <Stat
                    label="Fields blank"
                    value={fmtInt(
                        summary.missingVin + summary.missingMake + summary.missingModel + summary.missingYear
                    )}
                    hint="VIN + Make + Model + Year"
                />
            </StatGroup>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Panel title="Missing VIN" innerClassName="p-3">
                    <div className="font-mono tabular-nums font-bold text-text-primary" style={{ fontSize: 24 }}>
                        {fmtInt(summary.missingVin)}
                    </div>
                    <div className="text-[11px] text-text-tertiary">asset records without a VIN</div>
                </Panel>
                <Panel title="Missing make" innerClassName="p-3">
                    <div className="font-mono tabular-nums font-bold text-text-primary" style={{ fontSize: 24 }}>
                        {fmtInt(summary.missingMake)}
                    </div>
                    <div className="text-[11px] text-text-tertiary">manufacturer blank</div>
                </Panel>
                <Panel title="Missing model" innerClassName="p-3">
                    <div className="font-mono tabular-nums font-bold text-text-primary" style={{ fontSize: 24 }}>
                        {fmtInt(summary.missingModel)}
                    </div>
                    <div className="text-[11px] text-text-tertiary">model name blank</div>
                </Panel>
                <Panel title="Missing year" innerClassName="p-3">
                    <div className="font-mono tabular-nums font-bold text-text-primary" style={{ fontSize: 24 }}>
                        {fmtInt(summary.missingYear)}
                    </div>
                    <div className="text-[11px] text-text-tertiary">model year blank</div>
                </Panel>
            </div>

            <Panel
                title="Unverified assets"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Showing ${unverifiedAssets.length}`}</span>}
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Days since edit"
                    onSelect={onSelectAsset}
                    rows={unverifiedAssets}
                    valueAccessor={(row) => row.days}
                    valueFormatter={(value) => (value == null ? 'Never' : `${fmtInt(value)}d`)}
                />
            </Panel>

            <Panel
                title="Assets missing identification fields"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Showing ${missingDataAssets.length}`}</span>}
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Fields missing"
                    onSelect={onSelectAsset}
                    rows={missingDataAssets}
                    valueAccessor={(row) => row.missing.length}
                    valueFormatter={(_value, row) => row.missing.join(', ')}
                />
            </Panel>
        </div>
    )
}

export default AssetStatisticsVerificationPage
