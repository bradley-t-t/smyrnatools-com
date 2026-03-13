import React, { memo, useEffect, useState } from 'react'

import { supabase } from '../../../services/DatabaseService'
/** Color mapping for each known asset status value. */
const STATUS_COLORS = {
    Active: '#16a34a',
    'Down In Yard': '#dc2626',
    'In Shop': '#3b82f6',
    'Light Duty': '#f59e0b',
    'No Hire': '#b91c1c',
    'Pending Start': '#3b82f6',
    Retired: '#6b7280',
    Sold: '#6b7280',
    Spare: '#9333ea',
    Stationary: '#4f46e5',
    Terminated: '#dc2626',
    'Third Party Work': '#7c3aed',
    Training: '#6366f1',
    'Waiting For Shop': '#f59e0b'
}
/**
 * Animated horizontal bar that visualizes the percentage of time an asset
 * has spent in each status since creation.
 * Fetches status change history from the corresponding Supabase history table
 * and renders proportional colored segments with a hover tooltip breakdown.
 * @param {Object} props
 * @param {string} props.itemId - Primary key of the asset record.
 * @param {'mixer'|'tractor'|'trailer'|'equipment'|'pickup-truck'|'operator'} props.itemType - Asset type used to resolve the history table.
 * @param {string} props.currentStatus - The asset's current status value.
 * @param {string} [props.createdAt] - ISO date string for when the asset was created; used as the timeline start.
 */
const StatusHistoryBar = memo(function StatusHistoryBar({ itemId, itemType, currentStatus, createdAt }) {
    const [statusPercentages, setStatusPercentages] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isHovered, setIsHovered] = useState(false)
    const [animateIn, setAnimateIn] = useState(false)
    useEffect(() => {
        if (!itemId || !itemType) return
        let cancelled = false
        const fetchStatusHistory = async () => {
            try {
                const tableMap = {
                    equipment: 'heavy_equipment_history',
                    mixer: 'mixers_history',
                    operator: 'operators_history',
                    'pickup-truck': 'pickup_trucks_history',
                    tractor: 'tractors_history',
                    trailer: 'trailers_history'
                }
                const idFieldMap = {
                    equipment: 'equipment_id',
                    mixer: 'mixer_id',
                    operator: 'operator_id',
                    'pickup-truck': 'truck_id',
                    tractor: 'tractor_id',
                    trailer: 'trailer_id'
                }
                const tableName = tableMap[itemType]
                const idField = idFieldMap[itemType]
                if (!tableName || !idField) {
                    setLoading(false)
                    return
                }
                const { data: historyData } = await supabase
                    .from(tableName)
                    .select('field_name, old_value, new_value, changed_at')
                    .eq(idField, itemId)
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: true })
                if (cancelled) return
                const statusChanges = historyData || []
                const now = new Date()
                const startDate = createdAt
                    ? new Date(createdAt)
                    : statusChanges.length > 0
                      ? new Date(statusChanges[0].changed_at)
                      : now
                const totalDays = Math.max(1, Math.round((now - startDate) / (1000 * 60 * 60 * 24)))
                if (statusChanges.length === 0) {
                    setStatusPercentages([{ days: totalDays, percentage: 100, status: currentStatus || 'Unknown' }])
                    setLoading(false)
                    return
                }
                const statusPeriods = []
                let previousStatus = statusChanges[0].old_value || currentStatus
                let previousDate = startDate
                for (const change of statusChanges) {
                    const changeDate = new Date(change.changed_at)
                    const days = Math.max(0, Math.round((changeDate - previousDate) / (1000 * 60 * 60 * 24)))
                    if (days > 0 && previousStatus) {
                        statusPeriods.push({ days, status: previousStatus })
                    }
                    previousStatus = change.new_value
                    previousDate = changeDate
                }
                const finalDays = Math.max(0, Math.round((now - previousDate) / (1000 * 60 * 60 * 24)))
                if (finalDays > 0 || statusPeriods.length === 0) {
                    statusPeriods.push({ days: Math.max(1, finalDays), status: currentStatus || previousStatus })
                }
                const statusDaysMap = {}
                statusPeriods.forEach((p) => {
                    statusDaysMap[p.status] = (statusDaysMap[p.status] || 0) + p.days
                })
                const totalTrackedDays = Object.values(statusDaysMap).reduce((sum, d) => sum + d, 0) || 1
                const statusOrder = { Active: 0, 'In Shop': 1, Spare: 2 }
                const percentages = Object.entries(statusDaysMap)
                    .map(([status, days]) => ({
                        days,
                        percentage: Math.round((days / totalTrackedDays) * 100),
                        status
                    }))
                    .filter((p) => p.percentage > 0)
                    .sort((a, b) => {
                        const orderA = statusOrder[a.status] ?? 99
                        const orderB = statusOrder[b.status] ?? 99
                        if (orderA !== orderB) return orderA - orderB
                        return b.days - a.days
                    })
                if (cancelled) return
                setStatusPercentages(percentages)
            } catch {
                if (!cancelled) setStatusPercentages(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchStatusHistory()
        return () => {
            cancelled = true
        }
    }, [itemId, itemType, currentStatus, createdAt])
    useEffect(() => {
        if (!loading && statusPercentages) {
            const timer = setTimeout(() => setAnimateIn(true), 50)
            return () => clearTimeout(timer)
        }
    }, [loading, statusPercentages])
    const totalDays = statusPercentages?.reduce((sum, s) => sum + s.days, 0) || 0
    return (
        <div
            className="relative mt-2 w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex h-1.5 w-full overflow-hidden rounded-md bg-bg-hover">
                {loading ? (
                    <div
                        className="h-full w-full animate-shimmer"
                        style={{
                            background:
                                'linear-gradient(90deg, var(--bg-hover) 0%, var(--bg-secondary) 50%, var(--bg-hover) 100%)',
                            backgroundSize: '200% 100%'
                        }}
                    />
                ) : statusPercentages && statusPercentages.length > 0 ? (
                    statusPercentages.map((item, index) => (
                        <div
                            key={index}
                            className="h-full transition-[width] duration-[600ms] ease-out"
                            style={{
                                background: STATUS_COLORS[item.status] || '#64748b',
                                minWidth: item.percentage > 0 ? '2px' : '0',
                                opacity: animateIn ? 1 : 0,
                                transition: 'width 0.6s ease-out, opacity 0.4s ease-out',
                                transitionDelay: `${index * 0.1}s`,
                                width: animateIn ? `${item.percentage}%` : '0%'
                            }}
                        />
                    ))
                ) : null}
            </div>
            {isHovered && !loading && statusPercentages && statusPercentages.length > 0 && (
                <div className="absolute left-1/2 top-full z-[1000] min-w-[140px] -translate-x-1/2 rounded-lg border border-border-light bg-bg-primary p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                    <div className="mb-1.5 text-[9px] font-semibold uppercase text-text-secondary">
                        {totalDays} days tracked
                    </div>
                    {statusPercentages.map((item, index) => (
                        <div
                            key={index}
                            className={`flex items-center gap-1.5 ${index < statusPercentages.length - 1 ? 'mb-1' : ''}`}
                        >
                            <div
                                className="h-2 w-2 flex-shrink-0 rounded-sm"
                                style={{ background: STATUS_COLORS[item.status] || '#64748b' }}
                            />
                            <span className="flex-1 text-[11px] font-medium text-text-primary">{item.status}</span>
                            <span className="text-[10px] text-text-secondary">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
})
export default StatusHistoryBar
