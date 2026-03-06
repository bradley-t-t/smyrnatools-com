import React, { useEffect, useState } from 'react'

import { useIsMobile } from '../../../app/hooks/useIsMobile'
/**
 * Water-to-cementitious (W/C) ratio calculator. Converts water from gallons
 * to pounds (at 8.34 lbs/gal) and divides by total cementitious content
 * (primary + supplemental powder) to determine the W/C ratio. Grades the
 * result as Low / Optimal / Standard / High for quick quality assessment.
 * Optionally computes per-yard breakdowns when batch size is provided.
 */
const WaterCementCalculator = () => {
    const isMobile = useIsMobile()
    const [values, setValues] = useState({
        batchSize: '',
        cementLbs: '',
        supplementalLbs: '',
        waterGallons: ''
    })
    const [result, setResult] = useState(null)
    /** Standard weight of water: 8.34 lbs per gallon at 60°F. */
    const WATER_LBS_PER_GALLON = 8.34
    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
    }
    const clearForm = () => {
        setValues({ batchSize: '', cementLbs: '', supplementalLbs: '', waterGallons: '' })
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
                batchSize: batchSize > 0 ? batchSize : null,
                citePerYd,
                ratio: ratio.toFixed(2),
                totalCite: Math.round(totalCite),
                waterLbs: Math.round(waterLbs),
                waterPerYd
            })
        } else {
            setResult(null)
        }
    }, [values])
    /**
     * Classifies the W/C ratio into quality tiers per ACI 318 guidelines:
     * < 0.35 Low (very stiff), 0.35-0.45 Optimal, 0.45-0.55 Standard, > 0.55 High (weak).
     */
    const getRatioStatus = () => {
        if (!result) return null
        const r = parseFloat(result.ratio)
        if (r < 0.35) return { color: 'warning', label: 'Low' }
        if (r <= 0.45) return { color: 'success', label: 'Optimal' }
        if (r <= 0.55) return { color: 'info', label: 'Standard' }
        return { color: 'error', label: 'High' }
    }
    const status = getRatioStatus()
    const waterGal = parseFloat(values.waterGallons) || 0
    const waterLbs = waterGal * WATER_LBS_PER_GALLON
    const totalCite = (parseFloat(values.cementLbs) || 0) + (parseFloat(values.supplementalLbs) || 0)
    const hasData = waterGal > 0 && totalCite > 0
    const styles = {
        breakdown: {
            alignItems: 'center',
            color: '#64748b',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '1rem',
            justifyContent: 'center',
            padding: '1rem'
        },
        constant: {
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: '6px',
            color: 'var(--accent)',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 700,
            padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.75rem'
        },
        container: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: isMobile ? '1rem' : '2rem'
        },
        footer: {
            display: 'flex',
            justifyContent: 'center'
        },
        formulaInputBlock: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: isMobile ? '90px' : '120px'
        },
        formulaLayout: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        formulaOp: {
            color: 'var(--accent)',
            fontSize: isMobile ? '1rem' : '1.25rem',
            fontWeight: 700
        },
        formulaRow: {
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '1rem' : '2rem',
            justifyContent: 'center',
            padding: isMobile ? '1rem' : '2rem'
        },
        fraction: {
            display: 'flex',
            flexDirection: 'column',
            minWidth: isMobile ? '100%' : '300px',
            width: isMobile ? '100%' : 'auto'
        },
        fractionBar: {
            background: 'var(--accent)',
            height: '3px'
        },
        fractionBottom: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '0.5rem' : '0.75rem',
            justifyContent: 'center',
            padding: isMobile ? '0.75rem' : '1rem'
        },
        fractionTop: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '0.5rem' : '0.75rem',
            justifyContent: 'center',
            padding: isMobile ? '0.75rem' : '1rem'
        },
        input: {
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            outline: 'none',
            padding: isMobile ? '0.5rem 2.5rem 0.5rem 0.625rem' : '0.625rem 3rem 0.625rem 0.75rem',
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
            gap: '0.5rem'
        },
        inputUnit: {
            color: '#94a3b8',
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 600,
            position: 'absolute',
            right: '0.75rem'
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
        perYardDisplay: {
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginTop: '1rem'
        },
        perYardItem: {
            background: '#f0fdf4',
            border: '2px solid #dcfce7',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '1rem'
        },
        perYardLabel: {
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        perYardValue: {
            color: '#16a34a',
            fontSize: '1.25rem',
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
        resultBadge: (color) => ({
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
            borderRadius: '6px',
            color:
                color === 'success'
                    ? '#16a34a'
                    : color === 'info'
                      ? '#3b82f6'
                      : color === 'warning'
                        ? '#f59e0b'
                        : color === 'error'
                          ? '#ef4444'
                          : '#64748b',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            padding: '0.375rem 0.75rem',
            textTransform: 'uppercase'
        }),
        resultBlock: (hasData, statusColor) => ({
            alignItems: 'center',
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
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: isMobile ? '100%' : '200px',
            padding: isMobile ? '1rem' : '1.5rem',
            width: isMobile ? '100%' : 'auto'
        }),
        resultNum: {
            color: 'var(--accent)',
            fontSize: '3rem',
            fontWeight: 700,
            lineHeight: 1
        },
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
                    <i className="fas fa-percentage" style={{ color: 'var(--accent)' }}></i>
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
                    <i className="fas fa-truck" style={{ color: 'var(--accent)' }}></i>
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
