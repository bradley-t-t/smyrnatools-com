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
            style={{
                marginTop: '8px',
                position: 'relative',
                width: '100%'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                style={{
                    background: 'var(--bg-hover)',
                    borderRadius: '6px',
                    display: 'flex',
                    height: '6px',
                    overflow: 'hidden',
                    width: '100%'
                }}
            >
                {loading ? (
                    <div
                        style={{
                            animation: 'shimmer 1.5s infinite',
                            background:
                                'linear-gradient(90deg, var(--bg-hover) 0%, var(--bg-secondary) 50%, var(--bg-hover) 100%)',
                            backgroundSize: '200% 100%',
                            height: '100%',
                            width: '100%'
                        }}
                    />
                ) : statusPercentages && statusPercentages.length > 0 ? (
                    statusPercentages.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                background: STATUS_COLORS[item.status] || '#64748b',
                                height: '100%',
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
                <div
                    style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        left: '50%',
                        minWidth: '140px',
                        padding: '8px 10px',
                        position: 'absolute',
                        top: '100%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000
                    }}
                >
                    <div
                        style={{
                            color: 'var(--text-secondary)',
                            fontSize: '9px',
                            fontWeight: 600,
                            marginBottom: '6px',
                            textTransform: 'uppercase'
                        }}
                    >
                        {totalDays} days tracked
                    </div>
                    {statusPercentages.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                gap: '6px',
                                marginBottom: index < statusPercentages.length - 1 ? '4px' : 0
                            }}
                        >
                            <div
                                style={{
                                    background: STATUS_COLORS[item.status] || '#64748b',
                                    borderRadius: '2px',
                                    flexShrink: 0,
                                    height: '8px',
                                    width: '8px'
                                }}
                            />
                            <span style={{ color: '#334155', flex: 1, fontSize: '11px', fontWeight: 500 }}>
                                {item.status}
                            </span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            )}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    )
})
export default StatusHistoryBar
