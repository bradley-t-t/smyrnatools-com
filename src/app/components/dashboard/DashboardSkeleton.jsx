import React from 'react'

import { DashboardCard, SkeletonMetricCard } from '../ui/DashboardCards'
/**
 * Placeholder skeleton UI rendered while dashboard data is loading.
 * Mimics the layout of Fleet Overview, Maintenance, and People sections
 * with shimmer rectangles.
 * @param {Object} props
 * @param {boolean} props.isMobile - Uses single-column grid on mobile.
 */
export default function DashboardSkeleton({ isMobile }) {
    return (
        <div className="grid gap-6">
            <DashboardCard>
                <div className="h-5 w-36 bg-slate-200 rounded-md mb-5" />
                <div
                    className={`grid ${isMobile ? 'gap-3 grid-cols-1' : 'gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]'}`}
                >
                    {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonMetricCard key={i} />
                    ))}
                </div>
            </DashboardCard>
            <DashboardCard>
                <div className="h-5 w-24 bg-slate-200 rounded-md mb-5" />
                <SkeletonMetricCard />
                <div className="mt-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg mb-3 px-4 py-3.5">
                            <div className="h-4 w-48 bg-slate-200 rounded" />
                        </div>
                    ))}
                </div>
            </DashboardCard>
            <DashboardCard>
                <div className="h-5 w-48 bg-slate-200 rounded-md mb-5" />
                <div
                    className={`grid ${isMobile ? 'gap-3 grid-cols-1' : 'gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]'} mb-4 md:mb-6`}
                >
                    {[1, 2].map((i) => (
                        <SkeletonMetricCard key={i} />
                    ))}
                </div>
            </DashboardCard>
        </div>
    )
}
