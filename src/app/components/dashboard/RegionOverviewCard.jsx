import React from 'react'

import { useAccentColor } from '../../hooks/useAccentColor'
import { DashboardCard, MetricCard, SkeletonMetricCard } from '../ui/DashboardCards'
/**
 * Top-level dashboard hero card showing region-wide KPIs.
 * Displays fleet total, allocation rate, overdue services, and verification percentage.
 * Shows skeleton placeholders while data is loading.
 * @param {Object} props
 * @param {boolean} props.showSkeleton - Renders shimmer placeholders instead of real data.
 * @param {string} props.regionDisplayName - Human-readable region name.
 * @param {string} props.heroRegionSub - Subtitle text (e.g. plant count or scope description).
 * @param {Object} props.displayStats - Aggregated stats object with fleetTotal, overallAllocationPercent, etc.
 * @param {boolean} props.isMobile - Uses 2-column grid on mobile, 4-column on desktop.
 */
export default function RegionOverviewCard({ showSkeleton, regionDisplayName, heroRegionSub, displayStats, isMobile }) {
    const accentColor = useAccentColor()
    return (
        <DashboardCard className="mb-6 overflow-hidden !p-0">
            <div
                className="relative px-4 py-4 md:px-6 md:py-5"
                style={{
                    backgroundColor: accentColor,
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
                        radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 50%)
                    `,
                    backgroundPosition: '0 0, 0 0, 0 0',
                    backgroundSize: '20px 20px, 20px 20px, 40px 40px'
                }}
            >
                {showSkeleton ? (
                    <>
                        <div className="h-6 w-48 bg-white/20 rounded-md mb-2 animate-pulse" />
                        <div className="h-4 w-72 bg-white/10 rounded-md animate-pulse" />
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-white m-0 mb-1">{regionDisplayName}</h2>
                        <p className="text-sm text-white/70 m-0">{heroRegionSub}</p>
                    </>
                )}
            </div>
            <div className="px-4 py-4 md:px-6 md:py-5">
                <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-4'}`}>
                    {showSkeleton ? (
                        [1, 2, 3, 4].map((i) => <SkeletonMetricCard key={i} />)
                    ) : (
                        <>
                            <MetricCard label="Fleet Total" value={displayStats.fleetTotal} subtitle="Total Assets" />
                            <MetricCard
                                label="Asset Allocation"
                                value={`${displayStats.overallAllocationPercent}%`}
                                subtitle="Overall Allocation"
                            />
                            <MetricCard
                                label="Service Overdue"
                                value={displayStats.overdueTotal}
                                subtitle="Need Attention"
                            />
                            <MetricCard
                                label="Verification"
                                value={`${displayStats.verificationAverage}%`}
                                subtitle="Overall Verified"
                            />
                        </>
                    )}
                </div>
            </div>
        </DashboardCard>
    )
}
