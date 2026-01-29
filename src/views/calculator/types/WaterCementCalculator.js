import React, { useEffect, useState } from 'react'

const WaterCementCalculator = () => {
    const [values, setValues] = useState({
        batchSize: '',
        waterGallons: '',
        cementLbs: '',
        supplementalLbs: ''
    })

    const [result, setResult] = useState(null)

    const WATER_LBS_PER_GALLON = 8.34

    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
    }

    const clearForm = () => {
        setValues({ batchSize: '', waterGallons: '', cementLbs: '', supplementalLbs: '' })
        setResult(null)
    }

    useEffect(() => {
        const batchSize = parseFloat(values.batchSize) || 0
        const waterGal = parseFloat(values.waterGallons) || 0
        const cement = parseFloat(values.cementLbs) || 0
        const supplemental = parseFloat(values.supplementalLbs) || 0
        const totalCite = cement + supplemental

        if (waterGal > 0 && totalCite > 0) {
            const waterLbs = waterGal * WATER_LBS_PER_GALLON
            const ratio = waterLbs / totalCite

            const waterPerYd = batchSize > 0 ? Math.round(waterLbs / batchSize) : null
            const citePerYd = batchSize > 0 ? Math.round(totalCite / batchSize) : null

            setResult({
                ratio: ratio.toFixed(2),
                waterLbs: Math.round(waterLbs),
                totalCite: Math.round(totalCite),
                waterPerYd,
                citePerYd,
                batchSize: batchSize > 0 ? batchSize : null
            })
        } else {
            setResult(null)
        }
    }, [values])

    const getRatioStatus = () => {
        if (!result) return null
        const r = parseFloat(result.ratio)
        if (r < 0.35) return { label: 'Low', color: 'warning' }
        if (r <= 0.45) return { label: 'Optimal', color: 'success' }
        if (r <= 0.55) return { label: 'Standard', color: 'info' }
        return { label: 'High', color: 'error' }
    }

    const status = getRatioStatus()

    const waterGal = parseFloat(values.waterGallons) || 0
    const waterLbs = waterGal * WATER_LBS_PER_GALLON
    const totalCite = (parseFloat(values.cementLbs) || 0) + (parseFloat(values.supplementalLbs) || 0)
    const hasData = waterGal > 0 && totalCite > 0
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const styles = {
        container: {
            background: 'white',
            borderRadius: isMobile ? '8px' : '12px',
            padding: isMobile ? '1rem' : '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb'
        },
        section: {
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #f1f5f9',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            color: '#1e293b'
        },
        formulaLayout: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        formulaRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '1rem' : '2rem',
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row',
            padding: isMobile ? '1rem' : '2rem',
            background: '#f8fafc',
            borderRadius: '12px'
        },
        fraction: {
            display: 'flex',
            flexDirection: 'column',
            minWidth: isMobile ? '100%' : '300px',
            width: isMobile ? '100%' : 'auto'
        },
        fractionTop: {
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
            padding: isMobile ? '0.75rem' : '1rem',
            justifyContent: 'center',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
        },
        fractionBar: {
            height: '3px',
            background: '#1e3a5f'
        },
        fractionBottom: {
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
            padding: isMobile ? '0.75rem' : '1rem',
            justifyContent: 'center',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
        },
        formulaInputBlock: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: isMobile ? '90px' : '120px'
        },
        label: {
            fontSize: isMobile ? '0.625rem' : '0.75rem',
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
            padding: isMobile ? '0.5rem 2.5rem 0.5rem 0.625rem' : '0.625rem 3rem 0.625rem 0.75rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            color: '#1e293b',
            outline: 'none',
            transition: 'all 0.2s'
        },
        inputLarge: {
            width: '100%',
            padding: isMobile ? '0.625rem 3rem 0.625rem 0.75rem' : '0.75rem 3.5rem 0.75rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            color: '#1e293b',
            outline: 'none',
            transition: 'all 0.2s'
        },
        inputUnit: {
            position: 'absolute',
            right: '0.75rem',
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 600,
            color: '#94a3b8'
        },
        formulaOp: {
            fontSize: isMobile ? '1rem' : '1.25rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        constant: {
            padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.75rem',
            background: '#eff6ff',
            borderRadius: '6px',
            border: '1px solid #dbeafe',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        resultBlock: (hasData, statusColor) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: isMobile ? '1rem' : '1.5rem',
            minWidth: isMobile ? '100%' : '200px',
            width: isMobile ? '100%' : 'auto',
            background: hasData
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
            border: `3px solid ${
                hasData
                    ? statusColor === 'success'
                        ? '#16a34a'
                        : statusColor === 'info'
                          ? '#3b82f6'
                          : statusColor === 'warning'
                            ? '#f59e0b'
                            : statusColor === 'error'
                              ? '#ef4444'
                              : '#e5e7eb'
                    : '#e5e7eb'
            }`,
            borderRadius: '12px'
        }),
        resultNum: {
            fontSize: '3rem',
            fontWeight: 700,
            color: '#1e3a5f',
            lineHeight: 1
        },
        resultBadge: (color) => ({
            padding: '0.375rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
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
        breakdown: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#64748b'
        },
        inputRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        perYardDisplay: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
        },
        perYardItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '1rem',
            background: '#f0fdf4',
            border: '2px solid #dcfce7',
            borderRadius: '8px'
        },
        perYardLabel: {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        perYardValue: {
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#16a34a'
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
            e.target.style.borderColor = '#1e3a5f'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
        },
        onBlur: (e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-percentage" style={{ color: '#1e3a5f' }}></i>
                    <span>W/C Ratio Formula</span>
                </div>
                <div style={styles.formulaLayout}>
                    <div style={styles.formulaRow}>
                        <div style={styles.fraction}>
                            <div style={styles.fractionTop}>
                                <div style={styles.formulaInputBlock}>
                                    <label style={styles.label}>Water</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="number"
                                            value={values.waterGallons}
                                            onChange={(e) => handleChange('waterGallons', e.target.value)}
                                            placeholder="0"
                                            style={styles.input}
                                            {...inputFocusHandlers}
                                        />
                                        <span style={styles.inputUnit}>gal</span>
                                    </div>
                                </div>
                                <span style={styles.formulaOp}>×</span>
                                <div style={styles.constant}>
                                    <span>8.34</span>
                                </div>
                            </div>
                            <div style={styles.fractionBar}></div>
                            <div style={styles.fractionBottom}>
                                <div style={styles.formulaInputBlock}>
                                    <label style={styles.label}>Primary Powder</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="number"
                                            value={values.cementLbs}
                                            onChange={(e) => handleChange('cementLbs', e.target.value)}
                                            placeholder="0"
                                            style={styles.input}
                                            {...inputFocusHandlers}
                                        />
                                        <span style={styles.inputUnit}>lbs</span>
                                    </div>
                                </div>
                                <span style={styles.formulaOp}>+</span>
                                <div style={styles.formulaInputBlock}>
                                    <label style={styles.label}>Supplemental</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="number"
                                            value={values.supplementalLbs}
                                            onChange={(e) => handleChange('supplementalLbs', e.target.value)}
                                            placeholder="0"
                                            style={styles.input}
                                            {...inputFocusHandlers}
                                        />
                                        <span style={styles.inputUnit}>lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span style={{ ...styles.formulaOp, fontSize: '2rem' }}>=</span>
                        <div style={styles.resultBlock(hasData, status?.color)}>
                            <span style={styles.resultNum}>{hasData ? result?.ratio : '—'}</span>
                            {hasData && status && <span style={styles.resultBadge(status.color)}>{status.label}</span>}
                        </div>
                    </div>
                    {hasData && (
                        <div style={styles.breakdown}>
                            <span>{Math.round(waterLbs)} lbs</span>
                            <span>÷</span>
                            <span>{Math.round(totalCite)} lbs</span>
                        </div>
                    )}
                </div>
            </div>

            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-truck" style={{ color: '#1e3a5f' }}></i>
                    <span>Per Yard (optional)</span>
                </div>
                <div style={styles.inputRow}>
                    <label style={{ ...styles.label, textAlign: 'left' }}>Batch Size</label>
                    <div style={styles.inputWrap}>
                        <input
                            type="number"
                            value={values.batchSize}
                            onChange={(e) => handleChange('batchSize', e.target.value)}
                            placeholder="10"
                            step="0.5"
                            style={styles.inputLarge}
                            {...inputFocusHandlers}
                        />
                        <span style={styles.inputUnit}>yd</span>
                    </div>
                </div>
                {result?.batchSize && (
                    <div style={styles.perYardDisplay}>
                        <div style={styles.perYardItem}>
                            <span style={styles.perYardLabel}>Water</span>
                            <span style={styles.perYardValue}>{result.waterPerYd} lbs/yd</span>
                        </div>
                        <div style={styles.perYardItem}>
                            <span style={styles.perYardLabel}>Cementitious</span>
                            <span style={styles.perYardValue}>{result.citePerYd} lbs/yd</span>
                        </div>
                    </div>
                )}
            </div>

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

export default WaterCementCalculator
