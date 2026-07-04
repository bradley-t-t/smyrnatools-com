/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { Panel } from '../ui/Panel'

/** Single label · count row in a two-column flat table. */
function CountRow({ color, label, value }) {
    return (
        <tr className="transition-colors duration-150 hover:bg-bg-hover">
            <td className="px-3 py-2 text-[12.5px] border-b border-border-light text-text-primary">
                <div className="flex items-center gap-2">
                    {color && (
                        <span
                            className="w-2 h-2 rounded-sm flex-shrink-0"
                            style={{ background: color }}
                            aria-hidden="true"
                        />
                    )}
                    <span>{label}</span>
                </div>
            </td>
            <td className="px-3 py-2 text-right font-mono tabular-nums text-[12.5px] font-semibold border-b border-border-light text-text-primary">
                {value.toLocaleString()}
            </td>
        </tr>
    )
}

/** Bold totals row — sits at the bottom of each sub-table. */
function TotalRow({ label, value }) {
    return (
        <tr className="bg-bg-secondary">
            <td className="px-3 py-2 text-[12.5px] font-semibold border-t border-border-medium text-text-primary">
                {label}
            </td>
            <td className="px-3 py-2 text-right font-mono tabular-nums text-[12.5px] font-semibold border-t border-border-medium text-text-primary">
                {value.toLocaleString()}
            </td>
        </tr>
    )
}

/** Section header inside a panel — used to split operators vs managers tables. */
function SubHeader({ label, meta }) {
    return (
        <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</span>
            {meta && <span className="text-[11px] text-text-tertiary">{meta}</span>}
        </div>
    )
}

/**
 * People panel — two flat tables (operators by type, managers by role).
 * No StatGroup tiles; every category reads as a single row so headcount
 * scans the same way as the fleet table above.
 */
export default function DashboardPeopleSection({ accentColor: _accentColor, displayStats, isAggregate, managerStats }) {
    const ops = displayStats.operators || {}
    const mixerOps = ops.mixerAssigned || 0
    const tractorOps = ops.tractorAssigned || 0
    const lightDuty = ops.lightDuty || 0
    const pending = ops.pending || 0
    const training = ops.training || 0
    const unassigned = ops.unassigned || 0
    const totalOperators = ops.total || 0

    const managers = managerStats || { buckets: {}, total: 0 }
    const managerRows = [
        { color: '#0ea5e9', count: managers.buckets.plant || 0, role: 'Plant managers' },
        { color: '#9333ea', count: managers.buckets.district || 0, role: 'District managers' },
        { color: '#0d9488', count: managers.buckets.dispatcher || 0, role: 'Dispatchers' },
        { color: '#dc2626', count: managers.buckets.safety || 0, role: 'Safety' },
        { color: '#64748b', count: managers.buckets.other || 0, role: 'Other' }
    ].filter((row) => row.count > 0)

    const operatorRows = [
        !isAggregate && {
            color: '#1e40af',
            label: 'Mixer operators',
            value: mixerOps
        },
        {
            color: '#16a34a',
            label: 'Tractor operators',
            value: tractorOps
        },
        training > 0 && {
            color: '#f59e0b',
            label: 'Training',
            value: training
        },
        lightDuty > 0 && {
            color: '#7c3aed',
            label: 'Light duty',
            value: lightDuty
        },
        pending > 0 && {
            color: '#10b981',
            label: 'Pending start',
            value: pending
        },
        unassigned > 0 && {
            color: '#a16207',
            label: 'Unassigned',
            value: unassigned
        }
    ].filter(Boolean)

    return (
        <Panel
            id="people"
            title="People"
            innerClassName="p-3"
            right={
                <span className="text-[11px] text-text-tertiary">
                    {totalOperators} operators · {managers.total} managers
                </span>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <SubHeader label="Operators" meta={`${totalOperators} on roster`} />
                    <table className="w-full border-collapse rounded overflow-hidden border border-border-light">
                        <tbody>
                            {operatorRows.map((row) => (
                                <CountRow key={row.label} color={row.color} label={row.label} value={row.value} />
                            ))}
                            <TotalRow label="Total operators" value={totalOperators} />
                        </tbody>
                    </table>
                </div>

                <div>
                    <SubHeader label="Managers" meta={`${managers.total} total`} />
                    {managerRows.length > 0 ? (
                        <table className="w-full border-collapse rounded overflow-hidden border border-border-light">
                            <tbody>
                                {managerRows.map((row) => (
                                    <CountRow key={row.role} color={row.color} label={row.role} value={row.count} />
                                ))}
                                <TotalRow label="Total managers" value={managers.total} />
                            </tbody>
                        </table>
                    ) : (
                        <div className="rounded p-3 text-[12.5px] bg-bg-secondary border border-border-light text-text-secondary">
                            No managers in scope.
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    )
}
