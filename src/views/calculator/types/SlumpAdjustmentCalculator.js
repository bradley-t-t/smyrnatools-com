import React, { useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '../../../app/hooks/useIsMobile'

/**
 * Slump adjustment calculator for concrete batching. Determines how much
 * water to add or remove to achieve a target slump, using the industry-standard
 * approximation of ~3 gallons per yard per inch of slump change.
 * Optionally shows the resulting total batch water and warns about
 * potential strength reduction from added water.
 */
const SlumpAdjustmentCalculator = () => {
    const isMobile = useIsMobile()
    const [values, setValues] = useState({
        batchSize: '',
        currentSlump: '',
        currentWater: '',
        targetSlump: ''
    })

    const [result, setResult] = useState(null)

    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
    }

    const calculate = useCallback(() => {
        const current = parseFloat(values.currentSlump) || 0
        const target = parseFloat(values.targetSlump) || 0
        const batch = parseFloat(values.batchSize) || 0
        const water = parseFloat(values.currentWater) || 0

        if (current <= 0 || target <= 0 || batch <= 0) {
            setResult(null)
            return
        }

        const slumpDiff = target - current
        // Industry rule of thumb: ~3 gallons of water per yard per inch of slump change.
        const waterPerInch = 3
        const waterAdjustment = slumpDiff * waterPerInch * batch
        const newWater = water + waterAdjustment

        // Rough estimate: each % increase in batch water reduces strength by ~0.5%.
        const strengthImpact = waterAdjustment > 0 ? Math.round((waterAdjustment / (water || 1)) * 100 * 0.5) : 0

        setResult({
            direction: slumpDiff > 0 ? 'add' : slumpDiff < 0 ? 'reduce' : 'none',
            newWater,
            slumpDiff,
            strengthImpact,
            waterAdjustment
        })
    }, [values])

    useEffect(() => {
        calculate()
    }, [calculate])

    const clearForm = () => {
        setValues({ batchSize: '', currentSlump: '', currentWater: '', targetSlump: '' })
        setResult(null)
    }

    const slumpDiff = (parseFloat(values.targetSlump) || 0) - (parseFloat(values.currentSlump) || 0)
    const batchSize = parseFloat(values.batchSize) || 0
    const hasResult = parseFloat(values.currentSlump) > 0 && parseFloat(values.targetSlump) > 0 && batchSize > 0

    const styles = {
        adjustValue: {
            color: 'var(--accent)',
            fontSize: isMobile ? '1rem' : '1.25rem',
            fontWeight: 700
        },
        bracket: {
            color: 'var(--accent)',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700
        },
        constant: {
            alignItems: 'center',
            background: '#eff6ff',
            border: '2px solid #dbeafe',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: isMobile ? '0.75rem' : '1rem'
        },
        constantNum: {
            color: 'var(--accent)',
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: 700
        },
        constantUnit: {
            color: '#64748b',
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 600
        },
        container: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: isMobile ? '1rem' : '2rem'
        },
        eqInput: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: isMobile ? '80px' : '100px'
        },
        eqOp: {
            color: 'var(--accent)',
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: 700
        },
        eqUnit: {
            color: '#94a3b8',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600
        },
        equation: {
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '0.5rem' : '1rem',
            justifyContent: 'center',
            padding: isMobile ? '1rem' : '2rem'
        },
        equationInputs: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '0.5rem' : '0.75rem',
            justifyContent: 'center'
        },
        equationPart: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: '0.5rem',
            justifyContent: 'center'
        },
        footer: {
            display: 'flex',
            justifyContent: 'center'
        },
        input: {
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            outline: 'none',
            padding: isMobile ? '0.5rem 0.625rem' : '0.625rem 0.75rem',
            textAlign: 'center',
            transition: 'all 0.2s',
            width: '100%'
        },
        inputLarge: {
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            outline: 'none',
            padding: isMobile ? '0.625rem 3rem 0.625rem 0.75rem' : '0.75rem 3.5rem 0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        },
        inputRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: isMobile ? '100%' : 'auto'
        },
        inputUnit: {
            color: '#94a3b8',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            position: 'absolute',
            right: isMobile ? '0.75rem' : '1rem'
        },
        inputWrap: {
            alignItems: 'center',
            display: 'flex',
            position: 'relative'
        },
        label: {
            color: '#64748b',
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textAlign: 'center',
            textTransform: 'uppercase'
        },
        resAction: (direction) => ({
            color: direction === 'add' ? '#16a34a' : '#ef4444',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        }),
        resEmpty: {
            color: '#cbd5e1',
            fontSize: isMobile ? '1.5rem' : '2rem'
        },
        resUnit: {
            color: '#64748b',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600
        },
        resValue: {
            color: 'var(--accent)',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700
        },
        resetButton: {
            alignItems: 'center',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '0.5rem',
            outline: 'none',
            padding: '0.75rem 1.5rem',
            transition: 'all 0.2s'
        },
        result: (direction) => ({
            alignItems: 'center',
            background: direction === 'add' ? '#dcfce7' : direction === 'reduce' ? '#fef2f2' : 'white',
            border: `3px solid ${direction === 'add' ? '#16a34a' : direction === 'reduce' ? '#ef4444' : '#e5e7eb'}`,
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: isMobile ? '100%' : '150px',
            padding: isMobile ? '1rem' : '1.5rem',
            width: isMobile ? '100%' : 'auto'
        }),
        section: {
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        sectionHeader: {
            alignItems: 'center',
            borderBottom: '2px solid #f1f5f9',
            color: '#1e293b',
            display: 'flex',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            paddingBottom: '1rem'
        },
        totalAdjust: {
            alignItems: 'center',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: isMobile ? '0.75rem' : '1rem'
        },
        totalEquation: {
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '1rem' : '1.5rem',
            justifyContent: 'center',
            padding: isMobile ? '1rem' : '2rem'
        },
        totalInput: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: isMobile ? '100%' : 'auto'
        },
        totalResult: {
            alignItems: 'center',
            background: '#dcfce7',
            border: '3px solid #16a34a',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: isMobile ? '1rem' : '1.5rem',
            width: isMobile ? '100%' : 'auto'
        },
        totalValue: {
            color: '#16a34a',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700
        },
        warning: {
            alignItems: isMobile ? 'flex-start' : 'center',
            background: '#fef3c7',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            color: '#92400e',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '0.75rem',
            marginBottom: '2rem',
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem'
        }
    }

    const inputFocusHandlers = {
        onBlur: (e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
        },
        onFocus: (e) => {
            e.target.style.borderColor = 'var(--accent)'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-tint" style={{ color: 'var(--accent)' }}></i>
                    <span>Water Adjustment Formula</span>
                </div>
                <div style={styles.equation}>
                    <div style={styles.equationPart}>
                        <div style={styles.bracket}>(</div>
                        <div style={styles.equationInputs}>
                            <div style={styles.eqInput}>
                                <label style={styles.label}>Target</label>
                                <div style={styles.inputWrap}>
                                    <input
                                        type="number"
                                        value={values.targetSlump}
                                        onChange={(e) => handleChange('targetSlump', e.target.value)}
                                        placeholder="0"
                                        step="0.5"
                                        style={styles.input}
                                        {...inputFocusHandlers}
                                    />
                                </div>
                            </div>
                            <span style={styles.eqOp}>−</span>
                            <div style={styles.eqInput}>
                                <label style={styles.label}>Current</label>
                                <div style={styles.inputWrap}>
                                    <input
                                        type="number"
                                        value={values.currentSlump}
                                        onChange={(e) => handleChange('currentSlump', e.target.value)}
                                        placeholder="0"
                                        step="0.5"
                                        style={styles.input}
                                        {...inputFocusHandlers}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={styles.bracket}>)</div>
                        <span style={styles.eqUnit}>in</span>
                    </div>

                    <span style={styles.eqOp}>×</span>

                    <div style={styles.constant}>
                        <span style={styles.constantNum}>3</span>
                        <span style={styles.constantUnit}>gal/yd/in</span>
                    </div>

                    <span style={styles.eqOp}>×</span>

                    <div style={styles.equationPart}>
                        <div style={styles.eqInput}>
                            <label style={styles.label}>Batch</label>
                            <div style={styles.inputWrap}>
                                <input
                                    type="number"
                                    value={values.batchSize}
                                    onChange={(e) => handleChange('batchSize', e.target.value)}
                                    placeholder="10"
                                    style={styles.input}
                                    {...inputFocusHandlers}
                                />
                            </div>
                        </div>
                        <span style={styles.eqUnit}>yd</span>
                    </div>

                    <span style={styles.eqOp}>=</span>

                    <div
                        style={styles.result(
                            hasResult ? (slumpDiff > 0 ? 'add' : slumpDiff < 0 ? 'reduce' : 'none') : ''
                        )}
                    >
                        {hasResult ? (
                            <>
                                <span style={styles.resAction(slumpDiff > 0 ? 'add' : 'reduce')}>
                                    {slumpDiff > 0 ? 'Add' : slumpDiff < 0 ? 'Remove' : ''}
                                </span>
                                <span style={styles.resValue}>{Math.abs(slumpDiff * 3 * batchSize).toFixed(1)}</span>
                                <span style={styles.resUnit}>gal</span>
                            </>
                        ) : (
                            <span style={styles.resEmpty}>—</span>
                        )}
                    </div>
                </div>
            </div>

            {hasResult && parseFloat(values.currentWater) > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <i className="fas fa-calculator" style={{ color: 'var(--accent)' }}></i>
                        <span>New Total</span>
                    </div>
                    <div style={styles.totalEquation}>
                        <div style={styles.totalInput}>
                            <label style={styles.label}>Current Water</label>
                            <div style={styles.inputWrap}>
                                <input
                                    type="number"
                                    value={values.currentWater}
                                    onChange={(e) => handleChange('currentWater', e.target.value)}
                                    placeholder="0"
                                    style={styles.input}
                                    {...inputFocusHandlers}
                                />
                            </div>
                            <span style={styles.eqUnit}>gal</span>
                        </div>
                        <span style={styles.eqOp}>{slumpDiff >= 0 ? '+' : '−'}</span>
                        <div style={styles.totalAdjust}>
                            <span style={styles.adjustValue}>{Math.abs(slumpDiff * 3 * batchSize).toFixed(1)}</span>
                            <span style={styles.eqUnit}>gal</span>
                        </div>
                        <span style={styles.eqOp}>=</span>
                        <div style={styles.totalResult}>
                            <span style={styles.totalValue}>{result?.newWater.toFixed(1)}</span>
                            <span style={styles.eqUnit}>gal</span>
                        </div>
                    </div>
                </div>
            )}

            {!hasResult && (
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <i className="fas fa-water" style={{ color: 'var(--accent)' }}></i>
                        <span>Current Water (optional)</span>
                    </div>
                    <div style={styles.inputRow}>
                        <label style={{ ...styles.label, textAlign: 'left' }}>Current Batch Water</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="number"
                                value={values.currentWater}
                                onChange={(e) => handleChange('currentWater', e.target.value)}
                                placeholder="0"
                                style={styles.inputLarge}
                                {...inputFocusHandlers}
                            />
                            <span style={styles.inputUnit}>gal</span>
                        </div>
                    </div>
                </div>
            )}

            {result && result.strengthImpact > 0 && (
                <div style={styles.warning}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Adding water may reduce strength by ~{result.strengthImpact}%</span>
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

export default SlumpAdjustmentCalculator
