import React, {useCallback, useEffect, useState} from 'react'

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
            setValues(prev => ({...prev, completionTime: getCurrentTimeString()}))
        }
    }, [])

    useEffect(() => {
        if (isOngoing) {
            setValues(prev => ({...prev, completionTime: getCurrentTimeString()}))
            const interval = setInterval(() => {
                setValues(prev => ({...prev, completionTime: getCurrentTimeString()}))
            }, 60000)
            return () => clearInterval(interval)
        }
    }, [isOngoing])

    const handleChange = (field, value) => {
        setValues(prev => ({...prev, [field]: value}))
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
        if (yph >= 40) return {label: 'Excellent', color: 'success'}
        if (yph >= 30) return {label: 'Good', color: 'success'}
        if (yph >= 20) return {label: 'Average', color: 'info'}
        if (yph >= 10) return {label: 'Below Avg', color: 'warning'}
        return {label: 'Slow', color: 'error'}
    }

    const status = getPerformanceStatus()

    return (
        <div className="yph-calculator">
            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-tachometer-alt"></i>
                    <span>Yardage Per Hour</span>
                    <div className="yph-mode-toggle">
                        <button
                            className={`mode-btn ${!isOngoing ? 'active' : ''}`}
                            onClick={() => setIsOngoing(false)}
                        >
                            Completed
                        </button>
                        <button
                            className={`mode-btn ${isOngoing ? 'active live' : ''}`}
                            onClick={() => setIsOngoing(true)}
                        >
                            <i className="fas fa-circle"></i>
                            Live
                        </button>
                    </div>
                </div>

                <div className="yph-main-layout">
                    <div className="yph-equation">
                        <div className="yph-fraction">
                            <div className="yph-numerator">
                                <div className="yph-input-group">
                                    <label>{isOngoing ? 'Poured' : 'Total'}</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={isOngoing ? values.yardsPoured : values.totalYards}
                                            onChange={(e) => handleChange(isOngoing ? 'yardsPoured' : 'totalYards', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">yd</span>
                                    </div>
                                </div>
                            </div>
                            <div className="yph-fraction-bar"></div>
                            <div className="yph-denominator">
                                <div className="yph-time-inputs">
                                    <div className="yph-input-group time">
                                        <label>First Load</label>
                                        <div className="input-wrap">
                                            <input
                                                type="time"
                                                value={values.firstLoadTime}
                                                onChange={(e) => handleChange('firstLoadTime', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <span className="yph-time-to">to</span>
                                    <div className={`yph-input-group time ${isOngoing ? 'live' : ''}`}>
                                        <label>{isOngoing ? 'Now' : 'Last Poured'}</label>
                                        {isOngoing ? (
                                            <div className="yph-live-time">
                                                <i className="fas fa-circle"></i>
                                                <span>{values.completionTime}</span>
                                            </div>
                                        ) : (
                                            <div className="input-wrap">
                                                <input
                                                    type="time"
                                                    value={values.completionTime}
                                                    onChange={(e) => handleChange('completionTime', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <span className="yph-equals">=</span>

                        <div className={`yph-result-box ${result ? (status?.color || '') : 'empty'}`}>
                            {result ? (
                                <>
                                    <span className="yph-result-value">{result.yardsPerHour}</span>
                                    <span className="yph-result-unit">yd/hr</span>
                                </>
                            ) : (
                                <span className="yph-result-empty">—</span>
                            )}
                        </div>
                    </div>

                    {result && (
                        <div className="yph-stats-row">
                            <div className="yph-stat-item">
                                <span className="stat-value">{result.loadsPerHour}</span>
                                <span className="stat-label">loads/hr</span>
                            </div>
                            <div className="yph-stat-divider"></div>
                            <div className="yph-stat-item">
                                <span className="stat-value">{result.totalYards}</span>
                                <span className="stat-label">{isOngoing ? 'poured' : 'total'}</span>
                            </div>
                            <div className="yph-stat-divider"></div>
                            <div className="yph-stat-item">
                                <span className="stat-value">{result.elapsedTime}</span>
                                <span className="stat-label">elapsed</span>
                            </div>
                            {status && (
                                <>
                                    <div className="yph-stat-divider"></div>
                                    <div className={`yph-status-badge ${status.color}`}>
                                        {status.label}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!result && (
                <div className="calc-empty-state">
                    <i className="fas fa-truck-loading"></i>
                    <span>Enter yardage and times to calculate production rate</span>
                </div>
            )}

            <div className="calc-footer">
                <button onClick={clearForm} className="btn-reset">
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}

export default YardagePerHourCalculator
