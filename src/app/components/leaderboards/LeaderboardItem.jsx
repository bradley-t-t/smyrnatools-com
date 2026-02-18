import React from 'react'

import LeaderboardsUtility from '../../../utils/LeaderboardsUtility'

const RANK_STYLES = {
    1: {
        badge: 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg',
        border: 'border-2 border-amber-400',
        icon: 'fa-trophy'
    },
    2: {
        badge: 'bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-lg',
        border: 'border-2 border-gray-400',
        icon: 'fa-medal'
    },
    3: {
        badge: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg',
        border: 'border-2 border-orange-500',
        icon: 'fa-award'
    }
}

function getRankClasses(rank) {
    const preset = RANK_STYLES[rank]
    if (preset) return preset
    return {
        badge: 'bg-gray-100 text-gray-500',
        border: 'border border-gray-200',
        icon: null
    }
}

function formatMetricValue(plant, category) {
    switch (category) {
        case 'efficiency':
            return (
                <span style={{ color: LeaderboardsUtility.getEfficiencyColor(plant.avgEfficiency) }}>
                    {plant.avgEfficiency.toFixed(1)}%
                </span>
            )
        case 'yph':
            return plant.avgYPH.toFixed(2)
        case 'production':
            return Math.round(plant.totalYardage).toLocaleString()
        case 'weekly-yardage':
            return Math.round(plant.avgYardageWeekly).toLocaleString()
        case 'daily-yardage':
            return Math.round(plant.avgYardageDaily).toLocaleString()
        case 'monthly-yardage':
            return Math.round(plant.avgMonthlyYards).toLocaleString()
        case 'weekly-hours':
            return Math.round(plant.avgWeeklyHours).toLocaleString()
        case 'daily-hours':
            return Math.round(plant.avgHoursDaily).toLocaleString()
        case 'monthly-hours':
            return Math.round(plant.avgMonthlyHours).toLocaleString()
        case 'help-given':
            return `${Math.round(plant.helpGiven)} hours`
        case 'help-received':
            return `${Math.round(plant.helpReceived)} hours`
        default:
            return '--'
    }
}

function StatItem({ label, value, valueColor, onClick, clickable }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span
                className={`text-[0.625rem] font-medium uppercase tracking-wide md:text-xs ${clickable ? 'cursor-pointer text-[#1e3a5f]' : 'text-gray-500'}`}
                onClick={onClick}
            >
                {label}
                {clickable && <i className="fas fa-info-circle ml-1" />}
            </span>
            <span className={`text-[0.8125rem] font-semibold md:text-[0.9375rem] ${valueColor}`}>{value}</span>
        </div>
    )
}

function EfficiencyStats({ plant, onHelpClick }) {
    const hasHelp = plant.helpGiven > 0 || plant.helpReceived > 0
    const helpBalance = plant.helpGiven - plant.helpReceived
    const helpColor = helpBalance > 0 ? 'text-green-600' : helpBalance < 0 ? 'text-red-500' : 'text-gray-900'
    const missingTotal = (plant.missingReports || 0) + (plant.incompleteReports || 0)

    return (
        <>
            <StatItem
                label="Avg. YPH"
                value={
                    <span
                        className="flex items-center gap-1"
                        title="Left: YPH before help adjustment / Right: YPH after help adjustment"
                    >
                        <em className="not-italic text-gray-500">{(plant.rawYPH ?? plant.avgYPH).toFixed(2)}</em>
                        <span className="text-gray-400">/</span>
                        <strong>{plant.avgYPH.toFixed(2)}</strong>
                    </span>
                }
            />
            <StatItem label="Load Efficiency" value={`${plant.loadsEfficiency.toFixed(1)}%`} />
            <StatItem
                label="Help Net Balance"
                value={hasHelp ? `${helpBalance > 0 ? '+' : ''}${Math.round(helpBalance)}h` : 'N/A'}
                valueColor={helpColor}
                clickable={hasHelp}
                onClick={hasHelp ? onHelpClick : undefined}
            />
            <StatItem
                label="Missing Reports"
                value={missingTotal}
                valueColor={missingTotal > 0 ? 'text-red-500' : 'text-green-600'}
            />
            <StatItem
                label="Avg. Cleanliness"
                value={(plant.avgFleetCleanliness || 0) > 0 ? `${plant.avgFleetCleanliness.toFixed(1)}/5` : 'N/A'}
                valueColor={
                    (plant.avgFleetCleanliness || 0) >= 4
                        ? 'text-green-600'
                        : (plant.avgFleetCleanliness || 0) >= 3
                          ? 'text-amber-500'
                          : 'text-red-500'
                }
            />
            <StatItem
                label="Safety Incidents"
                value={plant.safetyReportsCount || 0}
                valueColor={(plant.safetyReportsCount || 0) > 0 ? 'text-red-500' : 'text-green-600'}
            />
        </>
    )
}

export default function LeaderboardItem({ plant, rank, selectedCategory, onHelpClick }) {
    const { badge, border, icon } = getRankClasses(rank)
    const isTopThree = rank <= 3

    return (
        <div
            className={`flex flex-col gap-3 rounded-lg bg-white p-4 transition-all md:grid md:grid-cols-[60px_1fr_auto_1fr] md:items-center md:gap-6 md:rounded-xl md:p-6 ${border} ${isTopThree ? 'shadow-md' : 'shadow-sm'}`}
        >
            <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-base font-bold md:h-[60px] md:w-[60px] md:text-2xl ${badge}`}
            >
                {icon ? <i className={`fas ${icon}`} /> : <span>{rank}</span>}
            </div>

            <div className="flex flex-1 flex-col gap-1">
                <div className="text-base font-bold text-gray-900 md:text-lg">Plant {plant.plantCode}</div>
                <div className="text-xs text-gray-500 md:text-sm">{plant.plantName}</div>
            </div>

            <div className="text-left text-2xl font-bold text-accent md:text-center md:text-3xl">
                {formatMetricValue(plant, selectedCategory)}
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] md:gap-4">
                {selectedCategory === 'efficiency' && <EfficiencyStats plant={plant} onHelpClick={onHelpClick} />}
            </div>
        </div>
    )
}

export function LeaderboardSkeleton() {
    return (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid md:grid-cols-[60px_1fr_auto_1fr] md:items-center md:gap-6 md:rounded-xl md:p-6">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 md:h-[60px] md:w-[60px]" />
            <div className="flex flex-col gap-1.5">
                <div className="h-5 w-2/5 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-7 w-20 animate-pulse rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-2">
                <div className="h-4 w-3/5 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-2/5 animate-pulse rounded bg-gray-200" />
            </div>
        </div>
    )
}
