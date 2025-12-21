import React, { useState } from 'react'

const WaterCementCalculator = () => {
    const [values, setValues] = useState({
        water: '',
        cement: '',
        additionalCite: ''
    })

    const handleChange = (field, value) => {
        setValues(prev => ({ ...prev, [field]: value }))
    }

    const clearForm = () => {
        setValues({ water: '', cement: '', additionalCite: '' })
    }

    const water = parseFloat(values.water) || 0
    const cement = parseFloat(values.cement) || 0
    const additionalCite = parseFloat(values.additionalCite) || 0
    const totalCite = cement + additionalCite

    const ratio = totalCite > 0 ? (water / totalCite).toFixed(3) : null
    const hasData = water > 0 && totalCite > 0

    const getRatioStatus = () => {
        if (!ratio) return null
        const r = parseFloat(ratio)
        if (r < 0.35) return { label: 'Very Low', color: 'warning', desc: 'May be difficult to work with' }
        if (r <= 0.45) return { label: 'Optimal', color: 'success', desc: 'Good strength and workability' }
        if (r <= 0.55) return { label: 'Acceptable', color: 'info', desc: 'Standard mix ratio' }
        return { label: 'High', color: 'error', desc: 'May reduce strength' }
    }

    const status = getRatioStatus()

    return (
        <div className="wc-calculator">
            <div className="wc-inputs">
                <div className="wc-input-group">
                    <label>Water</label>
                    <div className="input-wrap">
                        <input
                            type="number"
                            value={values.water}
                            onChange={(e) => handleChange('water', e.target.value)}
                            placeholder="0"
                        />
                        <span className="input-unit">lbs/yd</span>
                    </div>
                </div>
                <div className="wc-input-group">
                    <label>Primary Powder</label>
                    <div className="input-wrap">
                        <input
                            type="number"
                            value={values.cement}
                            onChange={(e) => handleChange('cement', e.target.value)}
                            placeholder="0"
                        />
                        <span className="input-unit">lbs/yd</span>
                    </div>
                </div>
                <div className="wc-input-group">
                    <label>Supplemental Powder</label>
                    <div className="input-wrap">
                        <input
                            type="number"
                            value={values.additionalCite}
                            onChange={(e) => handleChange('additionalCite', e.target.value)}
                            placeholder="0"
                        />
                        <span className="input-unit">lbs/yd</span>
                    </div>
                </div>
            </div>

            <div className="wc-result">
                {hasData ? (
                    <div className="wc-ratio-display">
                        <div className="wc-ratio-value">
                            <span className="ratio-label">W/C Ratio</span>
                            <span className="ratio-number">{ratio}</span>
                        </div>
                        {status && (
                            <div className={`wc-status ${status.color}`}>
                                <span className="status-label">{status.label}</span>
                                <span className="status-desc">{status.desc}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="wc-empty">
                        <i className="fas fa-info-circle"></i>
                        <span>Enter water and cite values to calculate ratio</span>
                    </div>
                )}
            </div>

            <div className="wc-footer">
                <button onClick={clearForm} className="btn-reset">
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}

export default WaterCementCalculator
