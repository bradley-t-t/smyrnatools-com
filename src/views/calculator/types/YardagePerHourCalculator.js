import React, { useCallback, useEffect, useState } from 'react'

const YardagePerHourCalculator = () => {
    const [values, setValues] = useState({
        firstLoadTime: '',
        totalYards: '',
        completionTime: '',
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
    }, [])

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
        if (elapsedMins <= 0) {
            elapsedMins += 24 * 60
        }

        const elapsedHours = elapsedMins / 60
        const yardsPerHour = yards / elapsedHours
        const loadsPerHour = yardsPerHour / 10

        const hours = Math.floor(elapsedMins / 60)
        const mins = elapsedMins % 60

        setResult({
            yardsPerHour: yardsPerHour.toFixed(1),
            loadsPerHour: loadsPerHour.toFixed(2),
            elapsedTime: `${hours}h ${mins}m`,
            elapsedMins,
            totalYards: yards
        })
    }, [values, isOngoing])

    useEffect(() => {
        calculate()
    }, [calculate])

    const clearForm = () => {
        setValues({
            firstLoadTime: '',
            totalYards: '',
            completionTime: getCurrentTimeString(),
            yardsPoured: ''
        })
        setIsOngoing(false)
        setResult(null)
    }

    const getPerformanceStatus = () => {
        if (!result) return null
        const yph = parseFloat(result.yardsPerHour)
        if (yph >= 40) return { label: 'Excellent', color: 'success' }
        if (yph >= 30) return { label: 'Good', color: 'success' }
        if (yph >= 20) return { label: 'Average', color: 'info' }
        if (yph >= 10) return { label: 'Below Avg', color: 'warning' }
        return { label: 'Slow', color: 'error' }
    }

    const status = getPerformanceStatus()
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const styles = {
        container: {
            background: 'white',
            borderRadius: isMobile ? '8px' : '12px',
            padding: isMobile ? '1rem' : '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb'
        },
        sectionHeader: {
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '0',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #f1f5f9'
        },
        headerTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: isMobile ? '1rem' : '1.25rem',
            fontWeight: 700,
            color: '#1e293b'
        },
        modeToggle: {
            display: 'flex',
            gap: '0.5rem',
            padding: '0.25rem',
            background: '#f8fafc',
            borderRadius: '8px'
        },
        modeButton: (active, isLive) => ({
            padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
            border: 'none',
            borderRadius: '6px',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: active ? '#1e3a5f' : 'transparent',
            color: active ? 'white' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        }),
        mainLayout: {
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        equation: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '1rem' : '2rem',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row'
        },
        fraction: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: isMobile ? '100%' : '300px',
            width: isMobile ? '100%' : 'auto'
        },
        fractionPart: {
            width: '100%',
            padding: isMobile ? '0.75rem' : '1rem'
        },
        fractionBar: {
            width: '100%',
            height: '3px',
            background: '#1e3a5f',
            margin: '0.5rem 0'
        },
        inputGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            flex: 1
        },
        label: {
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        inputWrap: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
        },
        input: {
            width: '100%',
            padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 600,
            color: '#1e293b',
            outline: 'none',
            transition: 'all 0.2s'
        },
        inputUnit: {
            position: 'absolute',
            right: '1rem',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            color: '#94a3b8'
        },
        timeInputs: {
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '1rem',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
        },
        timeTo: {
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            color: '#94a3b8'
        },
        liveTime: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
            background: '#dcfce7',
            borderRadius: '8px',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            color: '#16a34a'
        },
        liveIcon: {
            fontSize: '0.5rem',
            animation: 'pulse 2s infinite'
        },
        equals: {
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        resultBox: (hasResult, statusColor) => ({
            minWidth: isMobile ? '100%' : '200px',
            width: isMobile ? '100%' : 'auto',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '12px',
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
                          : '#e5e7eb'
                : '#e5e7eb',
            background: hasResult
                ? statusColor === 'success'
                    ? '#f0fdf4'
                    : statusColor === 'info'
                      ? '#eff6ff'
                      : statusColor === 'warning'
                        ? '#fffbeb'
                        : statusColor === 'error'
                          ? '#fef2f2'
                          : 'white'
                : 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s'
        }),
        resultValue: {
            fontSize: isMobile ? '2rem' : '3rem',
            fontWeight: 700,
            color: '#1e3a5f',
            lineHeight: 1
        },
        resultUnit: {
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            color: '#64748b',
            marginTop: '0.5rem'
        },
        resultEmpty: {
            fontSize: isMobile ? '2rem' : '3rem',
            color: '#cbd5e1'
        },
        statsRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '1rem' : '2rem',
            padding: isMobile ? '1rem' : '1.5rem',
            background: '#f8fafc',
            borderRadius: '12px',
            flexWrap: 'wrap'
        },
        statItem: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem'
        },
        statValue: {
            fontSize: isMobile ? '1.125rem' : '1.5rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        statLabel: {
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        statDivider: {
            width: '1px',
            height: isMobile ? '30px' : '40px',
            background: '#e5e7eb',
            display: isMobile ? 'none' : 'block'
        },
        statusBadge: (color) => ({
            padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background:
                color === 'success'
                    ? '#dcfce7'
                    : color === 'info'
                      ? '#dbeafe'
                      : color === 'warning'
                        ? '#fef3c7'
                        : color === 'error'
                          ? '#fee2e2'
                          : '#f1f5f9',
            color:
                color === 'success'
                    ? '#16a34a'
                    : color === 'info'
                      ? '#3b82f6'
                      : color === 'warning'
                        ? '#f59e0b'
                        : color === 'error'
                          ? '#ef4444'
                          : '#64748b'
        }),
        emptyState: {
            textAlign: 'center',
            padding: isMobile ? '2rem 1rem' : '3rem 2rem',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '2px dashed #e5e7eb',
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        emptyIcon: {
            fontSize: isMobile ? '2rem' : '3rem',
            color: '#cbd5e1',
            marginBottom: '1rem'
        },
        emptyText: {
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            color: '#64748b'
        },
        footer: {
            display: 'flex',
            justifyContent: 'center'
        },
        resetButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: 600,
            color: '#64748b',
            background: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
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
                    <i className="fas fa-tachometer-alt" style={{ color: '#1e3a5f' }}></i>
                    <span>Yardage Per Hour</span>
                </div>
                <div style={styles.modeToggle}>
                    <button
                        style={styles.modeButton(!isOngoing, false)}
                        onClick={() => setIsOngoing(false)}
                        onMouseEnter={(e) => {
                            if (isOngoing) e.currentTarget.style.background = '#f1f5f9'
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
                            if (!isOngoing) e.currentTarget.style.background = '#f1f5f9'
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
                                            e.target.style.borderColor = '#1e3a5f'
                                            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb'
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
                                                e.target.style.borderColor = '#1e3a5f'
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb'
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
                                                    e.target.style.borderColor = '#1e3a5f'
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = '#e5e7eb'
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
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#e5e7eb'
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
