import React from 'react'

import { CollapsibleTable } from '../ui/CollapsibleTable'
import { DashboardCard, MetricCard, SectionTitle, StatusPill } from '../ui/DashboardCards'

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
