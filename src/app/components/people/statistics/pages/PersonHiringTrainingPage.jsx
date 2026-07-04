import React from 'react'

import { fmtInt, fmtScorePct } from '../../../../../utils/PlanStatisticsFormatUtility'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { daysUntilLabel, formatEventDate, formatPendingDate } from './personStatsShared'

/**
 * Hiring & Training — operator-only pipeline view. Surfaces the four
 * lifecycle states dispatch actually cares about: Pending Start (offer
 * accepted, waiting), Training (on-site with a trainer), the trainer
 * roster itself, and recent hires (active within 90 days). No Hire and
 * trainer-coverage gaps round it out.
 */
export function PersonHiringTrainingPage({ stats }) {
    const { hiringTraining, summary } = stats
    if (!hiringTraining) {
        return (
            <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-text-tertiary">
                <i className="fas fa-circle-info text-[14px]" />
                Hiring &amp; training data only applies to operators.
            </div>
        )
    }

    const {
        counts,
        hiredRetained,
        hiresInPeriod,
        inTraining,
        noHireList,
        pendingStarts,
        periodActive,
        plantsMissingTrainers,
        recentHires,
        retentionRate,
        terminatedInPeriod,
        trainers
    } = hiringTraining
    const startingSoon = pendingStarts.filter((row) => row.daysUntilStart != null && row.daysUntilStart <= 7).length
    const overdueStarts = pendingStarts.filter((row) => row.daysUntilStart != null && row.daysUntilStart < 0).length
    const periodHint = periodActive ? 'in selected period' : 'lifetime'

    return (
        <div className="flex flex-col gap-4">
            {/* Period activity — filters by createdAt (hires) or
                statusChangedAt (training / activation / termination) inside
                the selected time range. Collapses to lifetime totals when
                the period is all-time so the strip is always useful.
                Retention reads the current status of those same hires so
                the funnel and its outcome live side by side. */}
            <StatGroup columns={5}>
                <Stat label="Hired" value={fmtInt(counts.hired)} hint={periodHint} />
                <Stat label="Started training" value={fmtInt(counts.startedTraining)} hint={periodHint} />
                <Stat label="Activated" value={fmtInt(counts.activated)} hint={periodHint} />
                <Stat
                    label="Terminated"
                    value={fmtInt(counts.terminated)}
                    hint={counts.noHire > 0 ? `${periodHint} · ${fmtInt(counts.noHire)} declined` : periodHint}
                />
                <Stat
                    label="Retention"
                    value={fmtScorePct(retentionRate)}
                    hint={
                        counts.hired > 0
                            ? `${fmtInt(hiredRetained)} of ${fmtInt(counts.hired)} retained`
                            : `no hires ${periodHint}`
                    }
                />
            </StatGroup>

            {/* Live pipeline snapshot — independent of the selected period
                so dispatch always sees who's currently in the funnel. */}
            <StatGroup columns={4}>
                <Stat
                    label="Pending starts"
                    value={fmtInt(pendingStarts.length)}
                    hint={
                        overdueStarts > 0
                            ? `${fmtInt(overdueStarts)} past start date`
                            : startingSoon > 0
                              ? `${fmtInt(startingSoon)} starting in 7 d`
                              : 'no active pipeline'
                    }
                />
                <Stat label="In training" value={fmtInt(inTraining.length)} hint="currently on-site with trainer" />
                <Stat
                    label="Trainers"
                    value={fmtInt(trainers.length)}
                    hint={`covering ${fmtInt(trainers.reduce((sum, t) => sum + t.mentees, 0))} mentees`}
                />
                <Stat label="Recent hires" value={fmtInt(recentHires.length)} hint="active, hired within 90 d" />
            </StatGroup>

            <Panel
                title="Pending starts"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`${pendingStarts.length} in queue`}</span>}
            >
                {pendingStarts.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">
                        No pending starts in scope. Pipeline is clear.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="text-text-tertiary">
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Name
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Plant
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Position
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Start date
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Countdown
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingStarts.map((row) => (
                                    <tr key={row.id} className="border-t border-border-light">
                                        <td className="px-3 py-2 font-semibold text-text-primary">{row.name}</td>
                                        <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                            {row.plant}
                                        </td>
                                        <td className="px-2 py-2 text-text-secondary">{row.position}</td>
                                        <td className="px-2 py-2 text-text-secondary">
                                            {formatPendingDate(row.pendingStartDate)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                                            {daysUntilLabel(row.daysUntilStart)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel
                    title="Currently in training"
                    innerClassName="p-0"
                    right={<span className="text-[11px] text-text-tertiary">{`${inTraining.length} active`}</span>}
                >
                    {inTraining.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">
                            Nobody is in training right now.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="text-text-tertiary">
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Name
                                        </th>
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                            Plant
                                        </th>
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                            Trainer
                                        </th>
                                        <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Days in
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inTraining.map((row) => (
                                        <tr key={row.id} className="border-t border-border-light">
                                            <td className="px-3 py-2 font-semibold text-text-primary">{row.name}</td>
                                            <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                                {row.plant}
                                            </td>
                                            <td className="px-2 py-2 text-text-secondary">
                                                {row.assignedTrainerName ? (
                                                    row.assignedTrainerName
                                                ) : (
                                                    <span className="italic text-text-tertiary">No trainer</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                                                {row.daysInTraining == null ? '—' : `${fmtInt(row.daysInTraining)} d`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
                <Panel
                    title="Trainer roster"
                    innerClassName="p-0"
                    right={<span className="text-[11px] text-text-tertiary">{`${trainers.length} trainers`}</span>}
                >
                    {trainers.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">
                            No trainers flagged on the roster.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="text-text-tertiary">
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Trainer
                                        </th>
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                            Plant
                                        </th>
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                            Position
                                        </th>
                                        <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Mentees
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trainers.map((row) => (
                                        <tr key={row.id} className="border-t border-border-light">
                                            <td className="px-3 py-2 font-semibold text-text-primary">{row.name}</td>
                                            <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                                {row.plant}
                                            </td>
                                            <td className="px-2 py-2 text-text-secondary">{row.position}</td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                                                {fmtInt(row.mentees)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>

            {periodActive && (
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                    <Panel
                        title="Hires in period"
                        innerClassName="p-0"
                        right={<span className="text-[11px] text-text-tertiary">{`${hiresInPeriod.length} new`}</span>}
                    >
                        {hiresInPeriod.length === 0 ? (
                            <div className="text-[12px] py-4 text-center text-text-tertiary">
                                No hires inside the selected window.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[12px] border-collapse">
                                    <thead>
                                        <tr className="text-text-tertiary">
                                            <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                                Name
                                            </th>
                                            <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                                Plant
                                            </th>
                                            <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                                Position
                                            </th>
                                            <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                                Status
                                            </th>
                                            <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                                Hired
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hiresInPeriod.map((row) => (
                                            <tr key={row.id} className="border-t border-border-light">
                                                <td className="px-3 py-2 font-semibold text-text-primary">
                                                    {row.name}
                                                </td>
                                                <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                                    {row.plant}
                                                </td>
                                                <td className="px-2 py-2 text-text-secondary">{row.position}</td>
                                                <td className="px-2 py-2 text-text-secondary">{row.status}</td>
                                                <td className="px-3 py-2 text-right font-mono tabular-nums text-text-primary">
                                                    {formatEventDate(row.eventDate)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                    <Panel
                        title="Terminations in period"
                        innerClassName="p-0"
                        right={
                            <span className="text-[11px] text-text-tertiary">
                                {`${terminatedInPeriod.length} ended`}
                            </span>
                        }
                    >
                        {terminatedInPeriod.length === 0 ? (
                            <div className="text-[12px] py-4 text-center text-text-tertiary">
                                No terminations inside the selected window.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[12px] border-collapse">
                                    <thead>
                                        <tr className="text-text-tertiary">
                                            <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                                Name
                                            </th>
                                            <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                                Plant
                                            </th>
                                            <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                                Position
                                            </th>
                                            <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                                Effective
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {terminatedInPeriod.map((row) => (
                                            <tr key={row.id} className="border-t border-border-light">
                                                <td className="px-3 py-2 font-semibold text-text-primary">
                                                    {row.name}
                                                </td>
                                                <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                                    {row.plant}
                                                </td>
                                                <td className="px-2 py-2 text-text-secondary">{row.position}</td>
                                                <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                                                    {formatEventDate(row.eventDate)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                </div>
            )}

            <Panel
                title="Recent hires (last 90 days)"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`${recentHires.length} new`}</span>}
            >
                {recentHires.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">
                        No new hires within the last 90 days.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="text-text-tertiary">
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Name
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Plant
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Position
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Status
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Days on roster
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentHires.map((row) => (
                                    <tr key={row.id} className="border-t border-border-light">
                                        <td className="px-3 py-2 font-semibold text-text-primary">{row.name}</td>
                                        <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                            {row.plant}
                                        </td>
                                        <td className="px-2 py-2 text-text-secondary">{row.position}</td>
                                        <td className="px-2 py-2 text-text-secondary">{row.status}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-text-primary">
                                            {fmtInt(row.tenureDays)} d
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel
                    title="Plants missing trainer coverage"
                    innerClassName="p-0"
                    right={
                        <span className="text-[11px] text-text-tertiary">
                            {plantsMissingTrainers.length > 0
                                ? `${plantsMissingTrainers.length} plant${plantsMissingTrainers.length === 1 ? '' : 's'}`
                                : 'Coverage complete'}
                        </span>
                    }
                >
                    {plantsMissingTrainers.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">
                            Every plant with roster has a trainer.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="text-text-tertiary">
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Plant
                                        </th>
                                        <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Active roster
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plantsMissingTrainers.map((row) => (
                                        <tr key={row.code} className="border-t border-border-light">
                                            <td className="px-3 py-2">
                                                <span className="font-mono tabular-nums font-semibold text-text-primary">
                                                    {row.code}
                                                </span>
                                                {row.name !== row.code && (
                                                    <span className="ml-2 text-text-secondary">{row.name}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                                                {fmtInt(row.active)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
                <Panel
                    title="Declined / No-hire"
                    innerClassName="p-0"
                    right={<span className="text-[11px] text-text-tertiary">{`${noHireList.length} on file`}</span>}
                >
                    {noHireList.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">
                            No declined applicants on file.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="text-text-tertiary">
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Name
                                        </th>
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                            Plant
                                        </th>
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Position
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {noHireList.map((row) => (
                                        <tr key={row.id} className="border-t border-border-light">
                                            <td className="px-3 py-2 font-semibold text-text-primary">{row.name}</td>
                                            <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                                {row.plant}
                                            </td>
                                            <td className="px-3 py-2 text-text-secondary">{row.position}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>

            {summary.total > 0 && pendingStarts.length === 0 && inTraining.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-text-secondary">
                    <i className="fas fa-circle-check text-[14px]" />
                    Hiring pipeline is empty — every operator is either training or already in production.
                </div>
            )}
        </div>
    )
}
