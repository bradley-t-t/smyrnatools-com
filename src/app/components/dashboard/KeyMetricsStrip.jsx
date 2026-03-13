import React from 'react'

import { MetricPill as MetricCard } from './shared/DashboardSharedComponents'

/**
 * Horizontal strip of 6–8 key metric cards displayed at the top of the main content area.
 * Adapts between plant-specific metrics (YPH, cleanliness, safety) and region-level
 * metrics (fleet total, allocation, in shop, overdue, operators, verified).
 */
export default function KeyMetricsStrip({ displayStats, plantNotifications, isPlantMode, accentColor, isMobile }) {
    const stats = displayStats || {}
    const opStats = stats.operators || {}
    const leaderboard = plantNotifications?.leaderboardMetrics

    if (isPlantMode && leaderboard) {
        return (
            <div className={`flex flex-wrap gap-2.5 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                <MetricCard
                    label="Raw YPH"
                    value={leaderboard.rawYPH?.toFixed(2) || '--'}
                    icon="fa-chart-line"
                    accentColor={accentColor}
                />
                <MetricCard
                    label="Adjusted YPH"
                    value={leaderboard.adjustedYPH?.toFixed(2) || '--'}
                    icon="fa-calculator"
                    accentColor={accentColor}
                />
                <MetricCard
                    label="Net Help"
                    value={`${leaderboard.netHelp > 0 ? '+' : ''}${Math.round(leaderboard.netHelp || 0)}h`}
                    color={leaderboard.netHelp > 0 ? '#16a34a' : leaderboard.netHelp < 0 ? '#dc2626' : undefined}
                    icon="fa-hands-helping"
                    accentColor={accentColor}
                />
                <MetricCard
                    label="Cleanliness"
                    value={leaderboard.avgCleanliness?.toFixed(1) || '--'}
                    color={
                        (leaderboard.avgCleanliness || 0) >= 4
                            ? '#16a34a'
                            : (leaderboard.avgCleanliness || 0) >= 3
                              ? '#f59e0b'
                              : '#dc2626'
                    }
                    icon="fa-broom"
                    accentColor={accentColor}
                />
                <MetricCard
                    label="Safety"
                    value={leaderboard.safetyIncidents || 0}
                    color={(leaderboard.safetyIncidents || 0) === 0 ? '#16a34a' : '#dc2626'}
                    icon="fa-hard-hat"
                    accentColor={accentColor}
                />
            </div>
        )
    }

    return (
        <div className={`flex flex-wrap gap-2.5 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <MetricCard label="Fleet Total" value={stats.fleetTotal || 0} icon="fa-truck" accentColor={accentColor} />
            <MetricCard
                label="Allocation"
                value={`${Math.round(stats.overallAllocationPercent || 0)}%`}
                icon="fa-th-large"
                color={
                    (stats.overallAllocationPercent || 0) >= 80
                        ? '#16a34a'
                        : (stats.overallAllocationPercent || 0) >= 50
                          ? '#f59e0b'
                          : '#dc2626'
                }
                accentColor={accentColor}
            />
            <MetricCard
                label="In Shop"
                value={
                    (stats.mixers?.shop || 0) +
                    (stats.tractors?.shop || 0) +
                    (stats.trailers?.shop || 0) +
                    (stats.equipment?.shop || 0)
                }
                icon="fa-tools"
                color="#f59e0b"
                accentColor={accentColor}
            />
            <MetricCard
                label="Overdue"
                value={stats.overdueTotal || 0}
                icon="fa-exclamation-triangle"
                color={(stats.overdueTotal || 0) === 0 ? '#16a34a' : '#dc2626'}
                accentColor={accentColor}
            />
            <MetricCard
                label="Operators"
                value={opStats.active || 0}
                icon="fa-users"
                accentColor={accentColor}
                suffix={opStats.unassigned > 0 ? `(${opStats.unassigned} idle)` : ''}
            />
            <MetricCard
                label="Verified"
                value={`${Math.round(stats.verificationAverage || 0)}%`}
                icon="fa-clipboard-check"
                color={
                    (stats.verificationAverage || 0) >= 90
                        ? '#16a34a'
                        : (stats.verificationAverage || 0) >= 70
                          ? '#f59e0b'
                          : '#dc2626'
                }
                accentColor={accentColor}
            />
        </div>
    )
}
