/* eslint-disable react/forbid-dom-props */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Database } from '../../../services/DatabaseService'

/**
 * Status → CSS variable token. Reads from the same `--status-*` palette
 * the rest of the app uses, so the bar respects every theme automatically.
 * Falls back to a neutral slate token for any unknown status value.
 */
const STATUS_COLOR_VAR = {
    Active: 'var(--status-active)',
    'Down In Yard': 'var(--status-danger)',
    'In Shop': 'var(--status-shop)',
    'Light Duty': 'var(--status-warning)',
    'No Hire': 'var(--status-danger)',
    'Pending Start': 'var(--status-shop)',
    Retired: 'var(--text-tertiary)',
    Sold: 'var(--text-tertiary)',
    Spare: 'var(--status-spare)',
    Stationary: 'var(--status-shop)',
    Terminated: 'var(--status-danger)',
    'Third Party Work': 'var(--status-spare)',
    Training: 'var(--status-warning)',
    'Waiting For Shop': 'var(--status-warning)'
}

const FALLBACK_STATUS_COLOR = 'var(--text-tertiary)'

const resolveStatusColor = (status) => STATUS_COLOR_VAR[status] || FALLBACK_STATUS_COLOR
/**
 * Animated horizontal bar that visualizes the percentage of time an asset
 * has spent in each status since creation.
 * Fetches status change history from the corresponding database history table
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
    /* Tooltip lives in a portal to escape the virtualized row's transform-
     * induced stacking context (any `<tr>` with a transform contains
     * absolutely-positioned descendants regardless of their z-index, which
     * is why the previous in-tree `z-[1000]` got painted under the next
     * row). Coordinates are recomputed on scroll / resize while open so the
     * tooltip tracks the bar through virtualized scrolling. */
    const wrapperRef = useRef(null)
    const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 })
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
                const { data: historyData } = await Database.from(tableName)
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
    const computeTooltipPosition = useCallback(() => {
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (!rect) return null
        return { left: rect.left + rect.width / 2, top: rect.bottom + 4 }
    }, [])
    const showTooltip = useCallback(() => {
        const next = computeTooltipPosition()
        if (next) setTooltipPosition(next)
        setIsHovered(true)
    }, [computeTooltipPosition])
    const hideTooltip = useCallback(() => setIsHovered(false), [])
    useEffect(() => {
        if (!isHovered) return
        const reposition = () => {
            const next = computeTooltipPosition()
            if (next) setTooltipPosition(next)
        }
        window.addEventListener('scroll', reposition, { capture: true, passive: true })
        window.addEventListener('resize', reposition, { passive: true })
        return () => {
            window.removeEventListener('scroll', reposition, { capture: true })
            window.removeEventListener('resize', reposition)
        }
    }, [isHovered, computeTooltipPosition])
    const totalDays = statusPercentages?.reduce((sum, s) => sum + s.days, 0) || 0
    const shouldShowTooltip = isHovered && !loading && statusPercentages && statusPercentages.length > 0
    return (
        <div ref={wrapperRef} className="relative mt-2 w-full" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
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
                                background: resolveStatusColor(item.status),
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
            {shouldShowTooltip &&
                createPortal(
                    <div
                        className="pointer-events-none fixed z-[1000] min-w-[140px] -translate-x-1/2 rounded-card border border-border-light bg-bg-secondary p-2.5 shadow-modal animate-fade-in-fast"
                        style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
                    >
                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
                            {totalDays} days tracked
                        </div>
                        {statusPercentages.map((item, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-1.5 ${index < statusPercentages.length - 1 ? 'mb-1' : ''}`}
                            >
                                <div
                                    className="h-2 w-2 flex-shrink-0 rounded-sm"
                                    style={{ background: resolveStatusColor(item.status) }}
                                />
                                <span className="flex-1 text-[11px] font-medium text-text-primary">{item.status}</span>
                                <span className="text-[10px] text-text-secondary">{item.percentage}%</span>
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    )
})
export default StatusHistoryBar
