import React, {useCallback, useEffect, useState} from 'react'

const SlumpAdjustmentCalculator = () => {
    const [values, setValues] = useState({
        currentSlump: '',
        targetSlump: '',
        batchSize: '',
        currentWater: ''
    })

    const [result, setResult] = useState(null)

    const handleChange = (field, value) => {
        setValues(prev => ({...prev, [field]: value}))
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
        const waterPerInch = 3
        const waterAdjustment = slumpDiff * waterPerInch * batch
        const newWater = water + waterAdjustment

        const strengthImpact = waterAdjustment > 0
            ? Math.round((waterAdjustment / (water || 1)) * 100 * 0.5)
            : 0

        setResult({
            slumpDiff,
            waterAdjustment,
            newWater,
            strengthImpact,
            direction: slumpDiff > 0 ? 'add' : slumpDiff < 0 ? 'reduce' : 'none'
        })
    }, [values])

    useEffect(() => {
        calculate()
    }, [calculate])

    const clearForm = () => {
        setValues({currentSlump: '', targetSlump: '', batchSize: '', currentWater: ''})
        setResult(null)
    }

    const slumpDiff = (parseFloat(values.targetSlump) || 0) - (parseFloat(values.currentSlump) || 0)
    const batchSize = parseFloat(values.batchSize) || 0
    const hasResult = parseFloat(values.currentSlump) > 0 && parseFloat(values.targetSlump) > 0 && batchSize > 0

    const styles = {
        container: {
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb'
        },
        section: {
            marginBottom: '2rem'
        },
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #f1f5f9',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#1e293b'
        },
        equation: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            padding: '2rem',
            background: '#f8fafc',
            borderRadius: '12px'
        },
        equationPart: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        bracket: {
            fontSize: '2rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        equationInputs: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        },
        eqInput: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: '100px'
        },
        label: {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center'
        },
        inputWrap: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
        },
        input: {
            width: '100%',
            padding: '0.625rem 0.75rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1e293b',
            outline: 'none',
            transition: 'all 0.2s',
            textAlign: 'center'
        },
        inputLarge: {
            width: '100%',
            padding: '0.75rem 3.5rem 0.75rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1e293b',
            outline: 'none',
            transition: 'all 0.2s'
        },
        inputUnit: {
            position: 'absolute',
            right: '1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#94a3b8'
        },
        eqOp: {
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        eqUnit: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#94a3b8'
        },
        constant: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '1rem',
            background: '#eff6ff',
            borderRadius: '8px',
            border: '2px solid #dbeafe'
        },
        constantNum: {
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        constantUnit: {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#64748b'
        },
        result: (direction) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1.5rem',
            minWidth: '150px',
            background: direction === 'add' ? '#dcfce7' : direction === 'reduce' ? '#fef2f2' : 'white',
            border: `3px solid ${direction === 'add' ? '#16a34a' : direction === 'reduce' ? '#ef4444' : '#e5e7eb'}`,
            borderRadius: '12px'
        }),
        resAction: (direction) => ({
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: direction === 'add' ? '#16a34a' : '#ef4444'
        }),
        resValue: {
            fontSize: '2rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        resUnit: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#64748b'
        },
        resEmpty: {
            fontSize: '2rem',
            color: '#cbd5e1'
        },
        totalEquation: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
            padding: '2rem',
            background: '#f8fafc',
            borderRadius: '12px'
        },
        totalInput: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center'
        },
        totalAdjust: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            border: '2px solid #e5e7eb'
        },
        adjustValue: {
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        totalResult: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '1.5rem',
            background: '#dcfce7',
            borderRadius: '12px',
            border: '3px solid #16a34a'
        },
        totalValue: {
            fontSize: '2rem',
            fontWeight: 700,
            color: '#16a34a'
        },
        inputRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        warning: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            background: '#fef3c7',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            marginBottom: '2rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#92400e'
        },
        footer: {
            display: 'flex',
            justifyContent: 'center'
        },
        resetButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#64748b',
            background: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
        }
    }

    const inputFocusHandlers = {
        onFocus: (e) => {
            e.target.style.borderColor = '#1e3a5f';
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
        },
        onBlur: (e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.boxShadow = 'none';
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-tint" style={{color: '#1e3a5f'}}></i>
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

                    <div style={styles.result(hasResult ? (slumpDiff > 0 ? 'add' : slumpDiff < 0 ? 'reduce' : 'none') : '')}>
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
                        <i className="fas fa-calculator" style={{color: '#1e3a5f'}}></i>
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
                        <i className="fas fa-water" style={{color: '#1e3a5f'}}></i>
                        <span>Current Water (optional)</span>
                    </div>
                    <div style={styles.inputRow}>
                        <label style={{...styles.label, textAlign: 'left'}}>Current Batch Water</label>
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
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e5e7eb';
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