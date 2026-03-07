import React from 'react'

import { DashboardCard } from '../ui/DashboardCards'

const BASE_DELAY = 80
const DECAY = 0.92

function staggerDelay(index) {
    let total = 0
    for (let i = 0; i < index; i++) total += Math.max(20, BASE_DELAY * Math.pow(DECAY, i))
    return Math.round(total)
}

function PulseBlock({ className, style, delay }) {
    return (
        <div
            className={`bg-slate-200 rounded-lg animate-pulse ${className}`}
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', ...style }}
        />
    )
}

function SkeletonMetricCard({ delay, isMobile }) {
    return (
        <div
            className={`rounded-xl ${isMobile ? 'p-4' : 'p-5'} bg-slate-50 border border-slate-200 animate-pulse`}
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="h-3.5 w-20 rounded bg-slate-200 mb-2" />
                    <div className="h-8 w-14 rounded bg-slate-200" />
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-200" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
                <div className="h-6 w-16 rounded-2xl bg-slate-200" />
                <div className="h-6 w-14 rounded-2xl bg-slate-200" />
                <div className="h-6 w-18 rounded-2xl bg-slate-200" />
            </div>
        </div>
    )
}

/**
 * Placeholder skeleton UI rendered while dashboard data is loading.
 * Mimics the layout of Fleet Overview, Fleet Analytics, People, and
 * Maintenance Quality sections with staggered shimmer animations.
 * @param {Object} props
 * @param {boolean} props.isMobile - Uses single-column grid on mobile.
 */
export default function DashboardSkeleton({ isMobile }) {
    const fleetCards = 5
    const gridCols = isMobile ? 'gap-3 grid-cols-1' : 'gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]'

    return (
        <div className={`grid ${isMobile ? 'gap-4' : 'gap-6'}`}>
            {/* Fleet Overview */}
            <DashboardCard>
                <PulseBlock className="h-5 w-36 mb-5" delay={staggerDelay(0)} />
                <div className={`grid ${gridCols}`}>
                    {Array.from({ length: fleetCards }, (_, i) => (
                        <SkeletonMetricCard key={i} delay={staggerDelay(i + 1)} isMobile={isMobile} />
                    ))}
                </div>
            </DashboardCard>

            {/* Fleet Analytics */}
            <DashboardCard>
                <PulseBlock className="h-5 w-32 mb-5" delay={staggerDelay(fleetCards + 1)} />
                <div
                    className="animate-pulse rounded-xl bg-slate-50 border border-slate-200"
                    style={{
                        animationDelay: `${staggerDelay(fleetCards + 2)}ms`,
                        animationFillMode: 'both',
                        height: isMobile ? '200px' : '300px'
                    }}
                />
            </DashboardCard>

            {/* People */}
            <DashboardCard>
                <PulseBlock className="h-5 w-20 mb-5" delay={staggerDelay(fleetCards + 3)} />
                <SkeletonMetricCard delay={staggerDelay(fleetCards + 4)} isMobile={isMobile} />
                <div className="mt-4 flex flex-col gap-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3.5 animate-pulse"
                            style={{
                                animationDelay: `${staggerDelay(fleetCards + 5 + i)}ms`,
                                animationFillMode: 'both'
                            }}
                        >
                            <div className="h-4 w-48 rounded bg-slate-200" />
                            <div className="h-4 w-4 rounded bg-slate-200" />
                        </div>
                    ))}
                </div>
            </DashboardCard>

            {/* Maintenance Quality */}
            <DashboardCard>
                <PulseBlock className="h-5 w-44 mb-5" delay={staggerDelay(fleetCards + 8)} />
                <div
                    className={`grid ${isMobile ? 'gap-3 grid-cols-1' : 'gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]'} mb-5`}
                >
                    {[0, 1].map((i) => (
                        <SkeletonMetricCard key={i} delay={staggerDelay(fleetCards + 9 + i)} isMobile={isMobile} />
                    ))}
                </div>
                <div
                    className="animate-pulse rounded-xl bg-slate-50 border border-slate-200"
                    style={{
                        animationDelay: `${staggerDelay(fleetCards + 11)}ms`,
                        animationFillMode: 'both',
                        height: isMobile ? '160px' : '240px'
                    }}
                />
            </DashboardCard>
        </div>
    )
}
