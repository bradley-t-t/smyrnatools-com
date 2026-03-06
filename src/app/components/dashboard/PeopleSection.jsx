import React from 'react'

import { CollapsibleTable } from '../ui/CollapsibleTable'
import { DashboardCard, MetricCard, SectionTitle, StatusPill } from '../ui/DashboardCards'
/**
 * Dashboard section for operator workforce metrics and collapsible detail tables.
 * Shows total/active/assigned operator counts, plus expandable tables for
 * training, pending-start, and light-duty operators.
 * @param {Object} props
 * @param {Object} props.displayStats - Aggregated operator stats (total, active, assigned, etc.).
 * @param {boolean} props.isAggregate - Hides mixer-specific assignment count when true.
 * @param {Array} props.filteredTrainingOperators - Operators currently in training.
 * @param {Array} props.filteredPendingStartOperators - Operators awaiting their start date.
 * @param {Array} props.filteredLightDutyOperators - Operators on light duty.
 * @param {boolean} props.trainingCollapsed - Controls training table collapse state.
 * @param {Function} props.setTrainingCollapsed - Toggles training table.
 * @param {boolean} props.pendingCollapsed - Controls pending-start table collapse state.
 * @param {Function} props.setPendingCollapsed - Toggles pending-start table.
 * @param {boolean} props.lightDutyCollapsed - Controls light-duty table collapse state.
 * @param {Function} props.setLightDutyCollapsed - Toggles light-duty table.
 * @param {Function} props.formatPendingDate - Formats a pending start date for display.
 * @param {string} props.accentColor - Theme accent color for table headers.
 */
export default function PeopleSection({
    displayStats,
    isAggregate,
    filteredTrainingOperators,
    filteredPendingStartOperators,
    filteredLightDutyOperators,
    trainingCollapsed,
    setTrainingCollapsed,
    pendingCollapsed,
    setPendingCollapsed,
    lightDutyCollapsed,
    setLightDutyCollapsed,
    formatPendingDate,
    accentColor
}) {
    return (
        <DashboardCard>
            <SectionTitle>People</SectionTitle>
            <MetricCard
                label="Operators"
                value={displayStats.operators.total}
                icon="fa-users"
                iconBg="#e0f2fe"
                iconColor="#0284c7"
                className="mb-5"
            >
                <StatusPill>Active {displayStats.operators.active}</StatusPill>
                <StatusPill>Light Duty {displayStats.operators.lightDuty}</StatusPill>
                <StatusPill>Assigned {displayStats.operators.assigned}</StatusPill>
                {!isAggregate && <StatusPill>Mixers {displayStats.operators.mixerAssigned}</StatusPill>}
                <StatusPill>Tractors {displayStats.operators.tractorAssigned}</StatusPill>
                <StatusPill>Unassigned {displayStats.operators.unassigned}</StatusPill>
            </MetricCard>
            <CollapsibleTable
                title={`Operators In Training (${filteredTrainingOperators.length})`}
                collapsed={trainingCollapsed}
                onToggle={() => setTrainingCollapsed((v) => !v)}
                disabled={!filteredTrainingOperators.length}
                headers={['Plant (Training At)', 'Operator', 'Trainer', 'Position', 'Plant (Training For)']}
                rows={filteredTrainingOperators}
                renderRow={(r) => [
                    r.trainerPlant || '-',
                    r.operatorName || '-',
                    r.trainerName || '-',
                    r.operatorPosition || '-',
                    r.operatorPlant || '-'
                ]}
                accentColor={accentColor}
            />
            <CollapsibleTable
                title={`Pending Start Operators (${filteredPendingStartOperators.length})`}
                collapsed={pendingCollapsed}
                onToggle={() => setPendingCollapsed((v) => !v)}
                disabled={!filteredPendingStartOperators.length}
                headers={['Plant (Training At)', 'Operator', 'Plant (Training For)', 'Pending Start Date']}
                rows={filteredPendingStartOperators}
                renderRow={(r) => [
                    r.trainerPlant || '-',
                    r.operatorName || '-',
                    r.operatorPlant || '-',
                    formatPendingDate(r.pendingDate)
                ]}
                accentColor={accentColor}
            />
            <CollapsibleTable
                title={`Light Duty Operators (${filteredLightDutyOperators.length})`}
                collapsed={lightDutyCollapsed}
                onToggle={() => setLightDutyCollapsed((v) => !v)}
                disabled={!filteredLightDutyOperators.length}
                headers={['Plant', 'Operator']}
                rows={filteredLightDutyOperators}
                renderRow={(r) => [r.plant || '-', r.operatorName || '-']}
                accentColor={accentColor}
            />
        </DashboardCard>
    )
}
