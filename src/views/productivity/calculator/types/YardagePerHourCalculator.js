import React, { useCallback, useEffect, useState } from 'react'

import { usePreferences } from '../../../../app/context/PreferencesContext'
import { useIsMobile } from '../../../../app/hooks/useIsMobile'

/** Color mappings for performance status tiers. */
const STATUS_STYLES = {
    error: { badge: 'bg-red-100 text-red-500', bg: 'bg-red-50', border: 'border-red-500' },
    info: { badge: 'bg-blue-100 text-blue-500', bg: 'bg-blue-50', border: 'border-blue-500' },
    success: { badge: 'bg-green-100 text-green-600', bg: 'bg-green-50', border: 'border-green-600' },
    warning: { badge: 'bg-amber-100 text-amber-500', bg: 'bg-amber-50', border: 'border-amber-500' }
}

/**
 * Real-time yardage production rate calculator. Supports two modes:
 * - Live: auto-updates current time every 60s to track in-progress pours.
 * - Completed: manual entry of start/end times for finished pours.
 * Computes yards/hr, loads/hr (assuming 10 yd/load), and elapsed time,
 * with a performance grade (Excellent / Good / Average / Below Avg / Slow).
 */
const YardagePerHourCalculator = () => {
    const { preferences } = usePreferences()
    const isMobile = useIsMobile()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [values, setValues] = useState({
        completionTime: '',
        firstLoadTime: '',
        totalYards: '',
        yardsPoured: ''
    })
    const [isOngoing, setIsOngoing] = useState(true)
    const [result, setResult] = useState(null)
    const getCurrentTimeString = () => {
        const now = new Date()
        return now.toTimeString().slice(0, 5)
    }
    useEffect(() => {
        if (!values.completionTime) {
            setValues((prev) => ({ ...prev, completionTime: getCurrentTimeString() }))
        }
    }, [values.completionTime])
    // In live mode, refresh the current time every 60s to keep the rate calculation current.
    useEffect(() => {
        if (isOngoing) {
            setValues((prev) => ({ ...prev, completionTime: getCurrentTimeString() }))
            const interval = setInterval(() => {
                setValues((prev) => ({ ...prev, completionTime: getCurrentTimeString() }))
            }, 60000)
            return () => clearInterval(interval)
        }
    }, [isOngoing])
    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
    }
    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return null
        const parts = timeStr.split(':')
        if (parts.length !== 2) return null
        const hours = parseInt(parts[0], 10)
        const mins = parseInt(parts[1], 10)
        if (isNaN(hours) || isNaN(mins)) return null
        return hours * 60 + mins
    }
    const calculate = useCallback(() => {
        const firstLoadMins = parseTimeToMinutes(values.firstLoadTime)
        const completionMins = parseTimeToMinutes(values.completionTime)
        const yards = isOngoing ? parseFloat(values.yardsPoured) : parseFloat(values.totalYards)
        if (firstLoadMins === null || completionMins === null || isNaN(yards) || yards <= 0) {
            setResult(null)
            return
        }
        let elapsedMins = completionMins - firstLoadMins
        // Handle overnight pours where completion time is past midnight.
        if (elapsedMins <= 0) {
            elapsedMins += 24 * 60
        }
        const elapsedHours = elapsedMins / 60
        const yardsPerHour = yards / elapsedHours
        // Standard mixer truck capacity is ~10 yards per load.
        const loadsPerHour = yardsPerHour / 10
        const hours = Math.floor(elapsedMins / 60)
        const mins = elapsedMins % 60
        setResult({
            elapsedMins,
            elapsedTime: `${hours}h ${mins}m`,
            loadsPerHour: loadsPerHour.toFixed(2),
            totalYards: yards,
            yardsPerHour: yardsPerHour.toFixed(1)
        })
    }, [values, isOngoing])
    useEffect(() => {
        calculate()
    }, [calculate])
    const clearForm = () => {
        setValues({
            completionTime: getCurrentTimeString(),
            firstLoadTime: '',
            totalYards: '',
            yardsPoured: ''
        })
        setIsOngoing(false)
        setResult(null)
    }
    /**
     * Grades production rate based on typical ready-mix plant benchmarks:
     * 40+ yd/hr Excellent, 30+ Good, 20+ Average, 10+ Below Avg, <10 Slow.
     */
    const getPerformanceStatus = () => {
        if (!result) return null
        const yph = parseFloat(result.yardsPerHour)
        if (yph >= 40) return { color: 'success', label: 'Excellent' }
        if (yph >= 30) return { color: 'success', label: 'Good' }
        if (yph >= 20) return { color: 'info', label: 'Average' }
        if (yph >= 10) return { color: 'warning', label: 'Below Avg' }
        return { color: 'error', label: 'Slow' }
    }
    const status = getPerformanceStatus()

    const containerClass = `bg-[var(--card-background)] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${isMobile ? 'rounded-lg p-4' : 'rounded-xl p-8'}`
    const inputClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 focus:border-[var(--calc-accent)] focus:shadow-[0_0_0_3px_var(--calc-accent-ring)] ${isMobile ? 'text-base py-2.5 px-3' : 'text-lg py-3 px-4'}`
    const labelClass = `text-[var(--text-secondary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'}`

    const statusStyle = status ? STATUS_STYLES[status.color] : null
    const resultBoxClass =
        result && statusStyle
            ? `${statusStyle.bg} border-[3px] ${statusStyle.border}`
            : 'bg-[var(--card-background)] border-[3px] border-[var(--border-color)]'

    return (
        <div
            className={containerClass}
            style={{ '--calc-accent': accentColor, '--calc-accent-ring': `${accentColor}1a` }}
        >
            <div
                className={`flex border-b-2 border-[var(--border-light)] pb-4 ${isMobile ? 'flex-col items-start gap-4 mb-6' : 'flex-row items-center justify-between mb-8'}`}
            >
                <div
                    className={`flex items-center gap-3 text-[var(--text-primary)] font-bold ${isMobile ? 'text-base' : 'text-xl'}`}
                >
                    <i className="fas fa-tachometer-alt" style={{ color: accentColor }}></i>
                    <span>Yardage Per Hour</span>
                </div>
                <div className="flex gap-2 rounded-lg bg-[var(--bg-secondary)] p-1">
                    <button
                        className={`flex items-center gap-2 font-semibold rounded-md border-none cursor-pointer transition-all duration-200 ${isMobile ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4'} ${!isOngoing ? 'text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                        style={!isOngoing ? { background: accentColor } : undefined}
                        onClick={() => setIsOngoing(false)}
                    >
                        Completed
                    </button>
                    <button
                        className={`flex items-center gap-2 font-semibold rounded-md border-none cursor-pointer transition-all duration-200 ${isMobile ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4'} ${isOngoing ? 'text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                        style={isOngoing ? { background: accentColor } : undefined}
                        onClick={() => setIsOngoing(true)}
                    >
                        <i className="fas fa-circle text-[0.5rem]"></i>
                        Live
                    </button>
                </div>
            </div>
            <div className={isMobile ? 'mb-6' : 'mb-8'}>
                <div
                    className={`flex items-center justify-center flex-wrap ${isMobile ? 'flex-col gap-4 mb-6' : 'flex-row gap-8 mb-8'}`}
                >
                    <div
                        className={`flex flex-col items-center ${isMobile ? 'min-w-full w-full' : 'min-w-[300px] w-auto'}`}
                    >
                        <div className={`w-full ${isMobile ? 'p-3' : 'p-4'}`}>
                            <div className="flex flex-col flex-1 gap-2">
                                <label className={labelClass}>{isOngoing ? 'Poured' : 'Total'}</label>
                                <div className="flex items-center relative">
                                    <input
                                        type="number"
                                        value={isOngoing ? values.yardsPoured : values.totalYards}
                                        onChange={(e) =>
                                            handleChange(isOngoing ? 'yardsPoured' : 'totalYards', e.target.value)
                                        }
                                        placeholder="0"
                                        className={inputClass}
                                    />
                                    <span
                                        className={`absolute right-4 text-[var(--text-tertiary)] font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}
                                    >
                                        yd
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-[3px] my-2" style={{ background: accentColor }}></div>
                        <div className={`w-full ${isMobile ? 'p-3' : 'p-4'}`}>
                            <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2' : 'flex-nowrap gap-4'}`}>
                                <div className="flex flex-col flex-1 gap-2">
                                    <label className={labelClass}>First Load</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="time"
                                            value={values.firstLoadTime}
                                            onChange={(e) => handleChange('firstLoadTime', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <span
                                    className={`text-[var(--text-tertiary)] font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}
                                >
                                    to
                                </span>
                                <div className="flex flex-col flex-1 gap-2">
                                    <label className={labelClass}>{isOngoing ? 'Now' : 'Last Poured'}</label>
                                    {isOngoing ? (
                                        <div
                                            className={`flex items-center gap-2 rounded-lg bg-green-100 text-green-600 font-bold ${isMobile ? 'text-base py-2.5 px-3' : 'text-lg py-3 px-4'}`}
                                        >
                                            <i className="fas fa-circle text-[0.5rem] animate-pulse"></i>
                                            <span>{values.completionTime}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center relative">
                                            <input
                                                type="time"
                                                value={values.completionTime}
                                                onChange={(e) => handleChange('completionTime', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <span className="text-2xl md:text-3xl font-bold" style={{ color: accentColor }}>
                        =
                    </span>
                    <div
                        className={`flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${resultBoxClass} ${isMobile ? 'min-w-full p-4' : 'min-w-[200px] p-6'}`}
                    >
                        {result ? (
                            <>
                                <span
                                    className="font-bold leading-none"
                                    style={{ color: accentColor, fontSize: isMobile ? '2rem' : '3rem' }}
                                >
                                    {result.yardsPerHour}
                                </span>
                                <span
                                    className={`text-[var(--text-secondary)] font-semibold mt-2 ${isMobile ? 'text-sm' : 'text-base'}`}
                                >
                                    yd/hr
                                </span>
                            </>
                        ) : (
                            <span className={`text-[var(--text-tertiary)] ${isMobile ? 'text-3xl' : 'text-5xl'}`}>
                                &mdash;
                            </span>
                        )}
                    </div>
                </div>
                {result && (
                    <div
                        className={`flex items-center flex-wrap justify-center rounded-xl bg-[var(--bg-secondary)] ${isMobile ? 'gap-4 p-4' : 'gap-8 p-6'}`}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span
                                className="font-bold"
                                style={{ color: accentColor, fontSize: isMobile ? '1.125rem' : '1.5rem' }}
                            >
                                {result.loadsPerHour}
                            </span>
                            <span
                                className={`text-[var(--text-tertiary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`}
                            >
                                loads/hr
                            </span>
                        </div>
                        <div className={`bg-[var(--border-color)] ${isMobile ? 'hidden' : 'block w-px h-10'}`}></div>
                        <div className="flex flex-col items-center gap-1">
                            <span
                                className="font-bold"
                                style={{ color: accentColor, fontSize: isMobile ? '1.125rem' : '1.5rem' }}
                            >
                                {result.totalYards}
                            </span>
                            <span
                                className={`text-[var(--text-tertiary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`}
                            >
                                {isOngoing ? 'poured' : 'total'}
                            </span>
                        </div>
                        <div className={`bg-[var(--border-color)] ${isMobile ? 'hidden' : 'block w-px h-10'}`}></div>
                        <div className="flex flex-col items-center gap-1">
                            <span
                                className="font-bold"
                                style={{ color: accentColor, fontSize: isMobile ? '1.125rem' : '1.5rem' }}
                            >
                                {result.elapsedTime}
                            </span>
                            <span
                                className={`text-[var(--text-tertiary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`}
                            >
                                elapsed
                            </span>
                        </div>
                        {status && (
                            <>
                                <div
                                    className={`bg-[var(--border-color)] ${isMobile ? 'hidden' : 'block w-px h-10'}`}
                                ></div>
                                <div
                                    className={`font-bold uppercase tracking-wide rounded-lg ${isMobile ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4'} ${statusStyle.badge}`}
                                >
                                    {status.label}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {!result && (
                <div
                    className={`bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-xl text-center ${isMobile ? 'mb-6 py-8 px-4' : 'mb-8 py-12 px-8'}`}
                >
                    <div className={`text-[var(--text-tertiary)] mb-4 ${isMobile ? 'text-3xl' : 'text-5xl'}`}>
                        <i className="fas fa-truck-loading"></i>
                    </div>
                    <span
                        className={`text-[var(--text-secondary)] ${isMobile ? 'text-[0.8125rem]' : 'text-[0.9375rem]'}`}
                    >
                        Enter yardage and times to calculate production rate
                    </span>
                </div>
            )}
            <div className="flex justify-center">
                <button
                    onClick={clearForm}
                    className={`flex items-center gap-2 bg-[var(--card-background)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] cursor-pointer font-semibold outline-none transition-all duration-200 hover:bg-[var(--bg-secondary)] ${isMobile ? 'text-[0.8125rem] py-2.5 px-4' : 'text-[0.9375rem] py-3 px-6'}`}
                >
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}
export default YardagePerHourCalculator
