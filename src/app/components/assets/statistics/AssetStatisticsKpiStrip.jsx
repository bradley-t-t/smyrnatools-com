import React from 'react'

import { fmtFloat, fmtInt, fmtPct } from '../../../../utils/PlanStatisticsFormatUtility'
import { Stat, StatGroup } from '../../ui/Panel'

/** Compact KPI strip — five tiles giving the fleet manager their first-look
 *  read on the asset type. Counts are scoped to the active plant filter so
 *  drilling down updates the strip in lockstep with the rest of the page.
 *
 *  Tile selection is config-driven: verification, service, cleanliness, and
 *  operator-assignment tiles only surface when the asset type actually
 *  carries those concepts, so trailers and pickup trucks see a strip
 *  shaped to what matters for them. */
export function AssetStatisticsKpiStrip({ config, summary }) {
    const verifiedValue = summary.total > 0 ? fmtPct((summary.verifiedRate || 0) * 100) : '—'
    const overdueLabel = summary.hasService ? `${fmtInt(summary.overdueService)} past due` : 'service tracking off'
    const issuesLabel = summary.openIssues > 0 ? `${fmtInt(summary.assetsWithOpenIssues)} assets` : 'no open issues'
    const ageHint = summary.avgFleetYear != null ? `model year ${summary.avgFleetYear}` : 'no year data'

    const verificationTile = config?.hasVerification
        ? { hint: 'fleet-wide check', label: 'Verified', value: verifiedValue }
        : null
    const serviceTile = summary.hasService
        ? { hint: overdueLabel, label: 'Service overdue', value: fmtInt(summary.overdueService) }
        : null
    const issuesTile = { hint: issuesLabel, label: 'Open issues', value: fmtInt(summary.openIssues) }
    const shopTile = {
        hint: `${fmtInt(summary.shopCount)} in shop`,
        label: 'In shop',
        value: fmtInt(summary.shopCount)
    }
    const cleanlinessTile = summary.hasCleanliness
        ? {
              hint: summary.dirtyCount > 0 ? `${fmtInt(summary.dirtyCount)} below 3★` : 'no dirty assets',
              label: 'Avg cleanliness',
              value: summary.cleanlinessAvg != null ? `${fmtFloat(summary.cleanlinessAvg)} ★` : '—'
          }
        : null
    const operatorTile = config?.hasOperatorAssignment
        ? {
              hint:
                  summary.unassignedActive > 0
                      ? `${fmtInt(summary.unassignedActive)} active w/o operator`
                      : 'fully covered',
              label: 'Unassigned',
              value: fmtInt(summary.unassignedActive)
          }
        : null
    const tenureTile = {
        hint: ageHint,
        label: 'Avg status tenure',
        value: summary.avgStatusTenure != null ? `${fmtInt(summary.avgStatusTenure)}d` : '—'
    }

    /** Build five strong tiles, dropping any that don't apply to this
     *  asset type. Order them by operational importance so the first ones
     *  in the strip are always the most actionable. */
    const tiles = [
        { hint: `${fmtInt(summary.activeCount)} active`, label: 'Total fleet', value: fmtInt(summary.total) }
    ]
    if (verificationTile) tiles.push(verificationTile)
    if (serviceTile) tiles.push(serviceTile)
    tiles.push(issuesTile)
    if (cleanlinessTile) tiles.push(cleanlinessTile)
    if (operatorTile && tiles.length < 5) tiles.push(operatorTile)
    if (tiles.length < 5) tiles.push(shopTile)
    if (tiles.length < 5) tiles.push(tenureTile)

    return (
        <StatGroup columns={5}>
            {tiles.slice(0, 5).map((tile) => (
                <Stat key={tile.label} hint={tile.hint} label={tile.label} value={tile.value} />
            ))}
        </StatGroup>
    )
}

export default AssetStatisticsKpiStrip
