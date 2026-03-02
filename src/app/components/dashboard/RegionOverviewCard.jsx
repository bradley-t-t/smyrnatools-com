import React from 'react'

import { DashboardCard, MetricCard, SkeletonMetricCard } from '../ui/DashboardCards'

export default function RegionOverviewCard({ showSkeleton, regionDisplayName, heroRegionSub, displayStats, isMobile }) {
    return (
        <DashboardCard className="mb-6">
            <div className="mb-5">
                {showSkeleton ? (
                    <>
                        <div className="h-6 w-48 bg-slate-200 rounded-md mb-2" />
                        <div className="h-4 w-72 bg-slate-200 rounded-md" />
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-slate-900 m-0 mb-1">{regionDisplayName}</h2>
                        <p className="text-sm text-slate-500 m-0">{heroRegionSub}</p>
                    </>
                )}
            </div>

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
        </DashboardCard>
    )
}
