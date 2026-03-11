import React, { useCallback, useEffect, useState } from 'react'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
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
    const styles = {
        container: {
            background: 'var(--card-background)',
            border: '1px solid var(--border-light)',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: isMobile ? '1rem' : '2rem'
        },
        emptyIcon: {
            color: 'var(--text-tertiary)',
            fontSize: isMobile ? '2rem' : '3rem',
            marginBottom: '1rem'
        },
        emptyState: {
            background: 'var(--bg-secondary)',
            border: '2px dashed var(--border-color)',
            borderRadius: '12px',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '2rem 1rem' : '3rem 2rem',
            textAlign: 'center'
        },
        emptyText: {
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem'
        },
        equals: {
            color: accentColor,
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700
        },
        equation: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '1rem' : '2rem',
            justifyContent: 'center',
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        footer: {
            display: 'flex',
            justifyContent: 'center'
        },
        fraction: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            minWidth: isMobile ? '100%' : '300px',
            width: isMobile ? '100%' : 'auto'
        },
        fractionBar: {
            background: accentColor,
            height: '3px',
            margin: '0.5rem 0',
            width: '100%'
        },
        fractionPart: {
            padding: isMobile ? '0.75rem' : '1rem',
            width: '100%'
        },
        headerTitle: {
            alignItems: 'center',
            color: 'var(--text-primary)',
            display: 'flex',
            fontSize: isMobile ? '1rem' : '1.25rem',
            fontWeight: 700,
            gap: '0.75rem'
        },
        input: {
            border: '2px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 600,
            outline: 'none',
            padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        },
        inputGroup: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            gap: '0.5rem'
        },
        inputUnit: {
            color: 'var(--text-tertiary)',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            position: 'absolute',
            right: '1rem'
        },
        inputWrap: {
            alignItems: 'center',
            display: 'flex',
            position: 'relative'
        },
        label: {
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        liveIcon: {
            animation: 'pulse 2s infinite',
            fontSize: '0.5rem'
        },
        liveTime: {
            alignItems: 'center',
            background: '#dcfce7',
            borderRadius: '8px',
            color: '#16a34a',
            display: 'flex',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            gap: '0.5rem',
            padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem'
        },
        mainLayout: {
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        modeButton: (active, _isLive) => ({
            alignItems: 'center',
            background: active ? accentColor : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: active ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
            transition: 'all 0.2s'
        }),
        modeToggle: {
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            display: 'flex',
            gap: '0.5rem',
            padding: '0.25rem'
        },
        resetButton: {
            alignItems: 'center',
            background: 'var(--card-background)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: 600,
            gap: '0.5rem',
            outline: 'none',
            padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
            transition: 'all 0.2s'
        },
        resultBox: (hasResult, statusColor) => ({
            alignItems: 'center',
            background: hasResult
                ? statusColor === 'success'
                    ? '#f0fdf4'
                    : statusColor === 'info'
                      ? '#eff6ff'
                      : statusColor === 'warning'
                        ? '#fffbeb'
                        : statusColor === 'error'
                          ? '#fef2f2'
                          : 'var(--card-background)'
                : 'var(--card-background)',
            border: '3px solid',
            borderColor: hasResult
                ? statusColor === 'success'
                    ? '#16a34a'
                    : statusColor === 'info'
                      ? '#3b82f6'
                      : statusColor === 'warning'
                        ? '#f59e0b'
                        : statusColor === 'error'
                          ? '#ef4444'
                          : 'var(--border-color)'
                : 'var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: isMobile ? '100%' : '200px',
            padding: isMobile ? '1rem' : '1.5rem',
            transition: 'all 0.3s',
            width: isMobile ? '100%' : 'auto'
        }),
        resultEmpty: {
            color: 'var(--text-tertiary)',
            fontSize: isMobile ? '2rem' : '3rem'
        },
        resultUnit: {
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            marginTop: '0.5rem'
        },
        resultValue: {
            color: accentColor,
            fontSize: isMobile ? '2rem' : '3rem',
            fontWeight: 700,
            lineHeight: 1
        },
        sectionHeader: {
            alignItems: isMobile ? 'flex-start' : 'center',
            borderBottom: '2px solid var(--border-light)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '0',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            paddingBottom: '1rem'
        },
        statDivider: {
            background: 'var(--border-color)',
            display: isMobile ? 'none' : 'block',
            height: isMobile ? '30px' : '40px',
            width: '1px'
        },
        statItem: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
        },
        statLabel: {
            color: 'var(--text-tertiary)',
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        statValue: {
            color: accentColor,
            fontSize: isMobile ? '1.125rem' : '1.5rem',
            fontWeight: 700
        },
        statsRow: {
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: isMobile ? '1rem' : '2rem',
            justifyContent: 'center',
            padding: isMobile ? '1rem' : '1.5rem'
        },
        statusBadge: (color) => ({
            background:
                color === 'success'
                    ? '#dcfce7'
                    : color === 'info'
                      ? '#dbeafe'
                      : color === 'warning'
                        ? '#fef3c7'
                        : color === 'error'
                          ? '#fee2e2'
                          : 'var(--bg-tertiary)',
            borderRadius: '8px',
            color:
                color === 'success'
                    ? '#16a34a'
                    : color === 'info'
                      ? '#3b82f6'
                      : color === 'warning'
                        ? '#f59e0b'
                        : color === 'error'
                          ? '#ef4444'
                          : 'var(--text-secondary)',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
            textTransform: 'uppercase'
        }),
        timeInputs: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '0.5rem' : '1rem'
        },
        timeTo: {
            color: 'var(--text-tertiary)',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600
        }
    }
    return (
        <div style={styles.container}>
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}
            </style>
            <div style={styles.sectionHeader}>
                <div style={styles.headerTitle}>
                    <i className="fas fa-tachometer-alt" style={{ color: accentColor }}></i>
                    <span>Yardage Per Hour</span>
                </div>
                <div style={styles.modeToggle}>
                    <button
                        style={styles.modeButton(!isOngoing, false)}
                        onClick={() => setIsOngoing(false)}
                        onMouseEnter={(e) => {
                            if (isOngoing) e.currentTarget.style.background = 'var(--bg-tertiary)'
                        }}
                        onMouseLeave={(e) => {
                            if (isOngoing) e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        Completed
                    </button>
                    <button
                        style={styles.modeButton(isOngoing, true)}
                        onClick={() => setIsOngoing(true)}
                        onMouseEnter={(e) => {
                            if (!isOngoing) e.currentTarget.style.background = 'var(--bg-tertiary)'
                        }}
                        onMouseLeave={(e) => {
                            if (!isOngoing) e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        <i className="fas fa-circle" style={{ fontSize: '0.5rem' }}></i>
                        Live
                    </button>
                </div>
            </div>
            <div style={styles.mainLayout}>
                <div style={styles.equation}>
                    <div style={styles.fraction}>
                        <div style={styles.fractionPart}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>{isOngoing ? 'Poured' : 'Total'}</label>
                                <div style={styles.inputWrap}>
                                    <input
                                        type="number"
                                        value={isOngoing ? values.yardsPoured : values.totalYards}
                                        onChange={(e) =>
                                            handleChange(isOngoing ? 'yardsPoured' : 'totalYards', e.target.value)
                                        }
                                        placeholder="0"
                                        style={styles.input}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = accentColor
                                            e.target.style.boxShadow = `0 0 0 3px ${accentColor}1a`
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'var(--border-color)'
                                            e.target.style.boxShadow = 'none'
                                        }}
                                    />
                                    <span style={styles.inputUnit}>yd</span>
                                </div>
                            </div>
                        </div>
                        <div style={styles.fractionBar}></div>
                        <div style={styles.fractionPart}>
                            <div style={styles.timeInputs}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>First Load</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="time"
                                            value={values.firstLoadTime}
                                            onChange={(e) => handleChange('firstLoadTime', e.target.value)}
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = accentColor
                                                e.target.style.boxShadow = `0 0 0 3px ${accentColor}1a`
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border-color)'
                                                e.target.style.boxShadow = 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                                <span style={styles.timeTo}>to</span>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>{isOngoing ? 'Now' : 'Last Poured'}</label>
                                    {isOngoing ? (
                                        <div style={styles.liveTime}>
                                            <i className="fas fa-circle" style={styles.liveIcon}></i>
                                            <span>{values.completionTime}</span>
                                        </div>
                                    ) : (
                                        <div style={styles.inputWrap}>
                                            <input
                                                type="time"
                                                value={values.completionTime}
                                                onChange={(e) => handleChange('completionTime', e.target.value)}
                                                style={styles.input}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = accentColor
                                                    e.target.style.boxShadow = `0 0 0 3px ${accentColor}1a`
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border-color)'
                                                    e.target.style.boxShadow = 'none'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <span style={styles.equals}>=</span>
                    <div style={styles.resultBox(!!result, status?.color)}>
                        {result ? (
                            <>
                                <span style={styles.resultValue}>{result.yardsPerHour}</span>
                                <span style={styles.resultUnit}>yd/hr</span>
                            </>
                        ) : (
                            <span style={styles.resultEmpty}>—</span>
                        )}
                    </div>
                </div>
                {result && (
                    <div style={styles.statsRow}>
                        <div style={styles.statItem}>
                            <span style={styles.statValue}>{result.loadsPerHour}</span>
                            <span style={styles.statLabel}>loads/hr</span>
                        </div>
                        <div style={styles.statDivider}></div>
                        <div style={styles.statItem}>
                            <span style={styles.statValue}>{result.totalYards}</span>
                            <span style={styles.statLabel}>{isOngoing ? 'poured' : 'total'}</span>
                        </div>
                        <div style={styles.statDivider}></div>
                        <div style={styles.statItem}>
                            <span style={styles.statValue}>{result.elapsedTime}</span>
                            <span style={styles.statLabel}>elapsed</span>
                        </div>
                        {status && (
                            <>
                                <div style={styles.statDivider}></div>
                                <div style={styles.statusBadge(status.color)}>{status.label}</div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {!result && (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>
                        <i className="fas fa-truck-loading"></i>
                    </div>
                    <span style={styles.emptyText}>Enter yardage and times to calculate production rate</span>
                </div>
            )}
            <div style={styles.footer}>
                <button
                    onClick={clearForm}
                    style={styles.resetButton}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-secondary)'
                        e.currentTarget.style.borderColor = 'var(--border-color)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--card-background)'
                        e.currentTarget.style.borderColor = 'var(--border-color)'
                    }}
                >
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}
export default YardagePerHourCalculator
