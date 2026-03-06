import React from 'react'

import {
    AllocationPill,
    DashboardCard,
    FreightTypeBreakdown,
    MetricCard,
    SectionTitle,
    StatusPill,
    TrailerTypeBreakdown
} from '../ui/DashboardCards'
/**
 * Dashboard section displaying per-asset-type fleet metrics.
 * Shows active/spare/in-shop counts, allocation rates, and type breakdowns
 * for mixers, tractors, trailers, equipment, and pickup trucks.
 * Mixers are hidden for Aggregate regions.
 * @param {Object} props
 * @param {Object} props.displayStats - Per-asset-type stats (active, spare, shop, allocationPercent, freight, trailerType).
 * @param {Object} props.stats - Raw stats including pickups.
 * @param {boolean} props.isAggregate - Hides mixers when true.
 * @param {Object} props.selectedRegion - Region object; Concrete type highlights the mixers card.
 * @param {string} props.accentColor - Theme accent color for highlighted cards.
 * @param {boolean} props.isMobile - Uses single-column layout on mobile.
 */
export default function FleetOverviewSection({
    displayStats,
    stats,
    isAggregate,
    selectedRegion,
    accentColor,
    isMobile
}) {
    return (
        <DashboardCard>
            <SectionTitle>Fleet Overview</SectionTitle>
            <div
                className={`grid ${isMobile ? 'gap-3 grid-cols-1' : 'gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]'}`}
            >
                {!isAggregate && (
                    <MetricCard
                        label="Mixers"
                        value={displayStats.mixers.total}
                        icon="fa-truck"
                        iconBg="#dbeafe"
                        iconColor="#2563eb"
                        highlight={selectedRegion?.type === 'Concrete'}
                        accentColor={accentColor}
                    >
                        <StatusPill>Active {displayStats.mixers.active}</StatusPill>
                        <StatusPill>Spare {displayStats.mixers.spare}</StatusPill>
                        <StatusPill>In Shop {displayStats.mixers.shop}</StatusPill>
                        <AllocationPill percent={displayStats.mixers.allocationPercent} />
                    </MetricCard>
                )}
                <MetricCard
                    label="Tractors"
                    value={displayStats.tractors.total}
                    icon="fa-tractor"
                    iconBg="#dcfce7"
                    iconColor="#16a34a"
                    highlight={selectedRegion?.type === 'Aggregate'}
                    accentColor={accentColor}
                >
                    <StatusPill>Active {displayStats.tractors.active}</StatusPill>
                    <StatusPill>Spare {displayStats.tractors.spare}</StatusPill>
                    <StatusPill>In Shop {displayStats.tractors.shop}</StatusPill>
                    <AllocationPill percent={displayStats.tractors.allocationPercent} />
                    {displayStats.tractors.freight && (
                        <FreightTypeBreakdown freightData={displayStats.tractors.freight} isMobile={isMobile} />
                    )}
                </MetricCard>
                <MetricCard
                    label="Trailers"
                    value={displayStats.trailers.total}
                    icon="fa-trailer"
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                >
                    <StatusPill>Active {displayStats.trailers.active}</StatusPill>
                    <StatusPill>Spare {displayStats.trailers.spare}</StatusPill>
                    <StatusPill>In Shop {displayStats.trailers.shop}</StatusPill>
                    <AllocationPill percent={displayStats.trailers.allocationPercent} />
                    {displayStats.trailers.trailerType && (
                        <TrailerTypeBreakdown trailerTypeData={displayStats.trailers.trailerType} isMobile={isMobile} />
                    )}
                </MetricCard>
                <MetricCard
                    label="Equipment"
                    value={displayStats.equipment.total}
                    icon="fa-snowplow"
                    iconBg="#f3e8ff"
                    iconColor="#9333ea"
                >
                    <StatusPill>Active {displayStats.equipment.active}</StatusPill>
                    <StatusPill>Spare {displayStats.equipment.spare}</StatusPill>
                    <StatusPill>In Shop {displayStats.equipment.shop}</StatusPill>
                    <AllocationPill percent={displayStats.equipment.allocationPercent} />
                </MetricCard>
                <MetricCard
                    label="Pickup Trucks"
                    value={stats.pickups.total}
                    icon="fa-truck-pickup"
                    iconBg="#fce7f3"
                    iconColor="#db2777"
                >
                    <StatusPill>Active {stats.pickups.active}</StatusPill>
                    <StatusPill>In Shop {stats.pickups.shop}</StatusPill>
                    <StatusPill>Stationary {stats.pickups.stationary}</StatusPill>
                </MetricCard>
            </div>
        </DashboardCard>
    )
}
