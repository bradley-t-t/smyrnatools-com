import React from 'react'

import LeaderboardsUtility from '../../../utils/LeaderboardsUtility'

const PODIUM_CONFIG = {
    1: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'fa-trophy',
        iconColor: 'text-amber-500',
        label: '1st',
        pillarBg: 'bg-gradient-to-t from-amber-100 to-amber-50'
    },
    2: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: 'fa-medal',
        iconColor: 'text-slate-400',
        label: '2nd',
        pillarBg: 'bg-gradient-to-t from-slate-100 to-slate-50'
    },
    3: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'fa-award',
        iconColor: 'text-orange-400',
        label: '3rd',
        pillarBg: 'bg-gradient-to-t from-orange-100 to-orange-50'
    }
}

const PILLAR_HEIGHTS = {
    1: 'h-28 md:h-36',
    2: 'h-20 md:h-28',
    3: 'h-16 md:h-24'
}

function formatMetric(plant, category) {
    switch (category) {
        case 'efficiency':
            return {
                color: LeaderboardsUtility.getEfficiencyColor(plant.avgEfficiency),
                value: `${plant.avgEfficiency.toFixed(1)}%`
            }
        case 'yph':
            return { value: plant.avgYPH.toFixed(2) }
        case 'production':
            return { suffix: 'yds', value: Math.round(plant.totalYardage).toLocaleString() }
        case 'weekly-yardage':
            return { suffix: 'yds/wk', value: Math.round(plant.avgYardageWeekly).toLocaleString() }
        case 'daily-yardage':
            return { suffix: 'yds/day', value: Math.round(plant.avgYardageDaily).toLocaleString() }
        case 'monthly-yardage':
            return { suffix: 'yds/mo', value: Math.round(plant.avgMonthlyYards).toLocaleString() }
        case 'weekly-hours':
            return { suffix: 'hrs/wk', value: Math.round(plant.avgWeeklyHours).toLocaleString() }
        case 'daily-hours':
            return { suffix: 'hrs/day', value: Math.round(plant.avgHoursDaily).toLocaleString() }
        case 'monthly-hours':
            return { suffix: 'hrs/mo', value: Math.round(plant.avgMonthlyHours).toLocaleString() }
        case 'help-given':
            return { suffix: 'hrs', value: Math.round(plant.helpGiven) }
        case 'help-received':
            return { suffix: 'hrs', value: Math.round(plant.helpReceived) }
        default:
            return { value: '--' }
    }
}

function PodiumCard({ plant, rank, category }) {
    const config = PODIUM_CONFIG[rank]
    if (!config || !plant) return null

    const metric = formatMetric(plant, category)
    const order = rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'

    return (
        <div className={`flex flex-1 flex-col ${order}`}>
            <div className={`mb-3 rounded-xl border p-4 text-center ${config.bg} ${config.border}`}>
                <div className="mb-2 flex items-center justify-center gap-2">
                    <i className={`fas ${config.icon} ${config.iconColor}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{config.label}</span>
                </div>
                <div className="mb-1 text-base font-bold text-slate-900">Plant {plant.plantCode}</div>
                <div className="mb-3 text-xs text-slate-500">{plant.plantName}</div>
                <div
                    className="text-2xl font-extrabold text-slate-900"
                    style={metric.color ? { color: metric.color } : undefined}
                >
                    {metric.value}
                </div>
                {metric.suffix && (
                    <div className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
                        {metric.suffix}
                    </div>
                )}
            </div>
            <div className={`w-full rounded-t-lg ${config.pillarBg} ${PILLAR_HEIGHTS[rank]}`} />
        </div>
    )
}

export default function LeaderboardPodium({ topThree, selectedCategory }) {
    if (!topThree || topThree.length < 3) return null

    const [first, second, third] = topThree

    return (
        <div className="mb-6 md:mb-8">
            <div className="flex items-end gap-3 md:gap-4">
                <PodiumCard plant={second} rank={2} category={selectedCategory} />
                <PodiumCard plant={first} rank={1} category={selectedCategory} />
                <PodiumCard plant={third} rank={3} category={selectedCategory} />
            </div>
        </div>
    )
}

export function PodiumSkeleton() {
    return (
        <div className="mb-6 md:mb-8">
            <div className="flex items-end gap-3 md:gap-4">
                {[2, 1, 3].map((rank) => (
                    <div
                        key={rank}
                        className={`flex flex-1 flex-col ${rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'}`}
                    >
                        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mx-auto mb-2 h-4 w-12 animate-pulse rounded bg-slate-200" />
                            <div className="mx-auto mb-1 h-5 w-20 animate-pulse rounded bg-slate-200" />
                            <div className="mx-auto mb-3 h-3 w-24 animate-pulse rounded bg-slate-200" />
                            <div className="mx-auto h-8 w-16 animate-pulse rounded bg-slate-200" />
                        </div>
                        <div className={`w-full animate-pulse rounded-t-lg bg-slate-100 ${PILLAR_HEIGHTS[rank]}`} />
                    </div>
                ))}
            </div>
        </div>
    )
}
