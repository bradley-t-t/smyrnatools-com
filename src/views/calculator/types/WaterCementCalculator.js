import React, { useState, useEffect } from 'react'

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
        setValues(prev => ({ ...prev, [field]: value }))
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

    return (
        <div className="wc-calculator">
            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-percentage"></i>
                    <span>W/C Ratio Formula</span>
                </div>
                <div className="wc-formula-layout">
                    <div className="wc-formula-row">
                        <div className="wc-fraction">
                            <div className="wc-fraction-top">
                                <div className="formula-input-block">
                                    <label>Water</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={values.waterGallons}
                                            onChange={(e) => handleChange('waterGallons', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">gal</span>
                                    </div>
                                </div>
                                <span className="formula-op small">×</span>
                                <div className="formula-constant small">
                                    <span className="constant-value">8.34</span>
                                </div>
                            </div>
                            <div className="wc-fraction-bar"></div>
                            <div className="wc-fraction-bottom">
                                <div className="formula-input-block">
                                    <label>Primary Powder</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={values.cementLbs}
                                            onChange={(e) => handleChange('cementLbs', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">lbs</span>
                                    </div>
                                </div>
                                <span className="formula-op small">+</span>
                                <div className="formula-input-block">
                                    <label>Supplemental</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={values.supplementalLbs}
                                            onChange={(e) => handleChange('supplementalLbs', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span className="formula-op">=</span>
                        <div className={`formula-result-block large ${hasData ? (status?.color || '') : ''}`}>
                            <span className="result-num">{hasData ? result?.ratio : '—'}</span>
                            {hasData && status && <span className={`result-badge ${status.color}`}>{status.label}</span>}
                        </div>
                    </div>
                    {hasData && (
                        <div className="wc-formula-breakdown">
                            <span>{Math.round(waterLbs)} lbs</span>
                            <span>÷</span>
                            <span>{Math.round(totalCite)} lbs</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-truck"></i>
                    <span>Per Yard (optional)</span>
                </div>
                <div className="calc-inputs-grid single">
                    <div className="calc-input-row">
                        <label>Batch Size</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={values.batchSize}
                                onChange={(e) => handleChange('batchSize', e.target.value)}
                                placeholder="10"
                                step="0.5"
                            />
                            <span className="input-unit">yd</span>
                        </div>
                    </div>
                </div>
                {result?.batchSize && (
                    <div className="per-yard-display">
                        <div className="per-yard-item">
                            <span className="per-yard-label">Water</span>
                            <span className="per-yard-value">{result.waterPerYd} lbs/yd</span>
                        </div>
                        <div className="per-yard-item">
                            <span className="per-yard-label">Cementitious</span>
                            <span className="per-yard-value">{result.citePerYd} lbs/yd</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="calc-footer">
                <button onClick={clearForm} className="btn-reset">
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}

export default WaterCementCalculator
