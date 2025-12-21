import React, { useState, useEffect, useCallback } from 'react'

const SlumpAdjustmentCalculator = () => {
    const [values, setValues] = useState({
        currentSlump: '',
        targetSlump: '',
        batchSize: '',
        currentWater: ''
    })

    const [result, setResult] = useState(null)

    const handleChange = (field, value) => {
        setValues(prev => ({ ...prev, [field]: value }))
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
        setValues({ currentSlump: '', targetSlump: '', batchSize: '', currentWater: '' })
        setResult(null)
    }

    return (
        <div className="slump-calculator">
            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-tachometer-alt"></i>
                    <span>Slump Values</span>
                </div>
                <div className="calc-inputs-grid">
                    <div className="calc-input-row">
                        <label>Current Slump</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={values.currentSlump}
                                onChange={(e) => handleChange('currentSlump', e.target.value)}
                                placeholder="0"
                                step="0.25"
                            />
                            <span className="input-unit">in</span>
                        </div>
                    </div>
                    <div className="calc-input-row">
                        <label>Target Slump</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={values.targetSlump}
                                onChange={(e) => handleChange('targetSlump', e.target.value)}
                                placeholder="0"
                                step="0.25"
                            />
                            <span className="input-unit">in</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-cube"></i>
                    <span>Batch Info</span>
                </div>
                <div className="calc-inputs-grid">
                    <div className="calc-input-row">
                        <label>Batch Size</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={values.batchSize}
                                onChange={(e) => handleChange('batchSize', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">yd</span>
                        </div>
                    </div>
                    <div className="calc-input-row">
                        <label>Current Water</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={values.currentWater}
                                onChange={(e) => handleChange('currentWater', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">gal</span>
                        </div>
                    </div>
                </div>
            </div>

            {result && (
                <div className="calc-result">
                    <div className="result-header">
                        <i className="fas fa-calculator"></i>
                        <span>Water Adjustment</span>
                    </div>
                    <div className="result-main">
                        {result.direction === 'none' ? (
                            <div className="result-value neutral">
                                <span className="value-number">No Change Needed</span>
                            </div>
                        ) : (
                            <>
                                <div className={`result-value ${result.direction}`}>
                                    <span className="value-label">{result.direction === 'add' ? 'Add' : 'Reduce'}</span>
                                    <span className="value-number">{Math.abs(result.waterAdjustment).toFixed(1)} gal</span>
                                </div>
                                <div className="result-details">
                                    <div className="detail-row">
                                        <span>New Total Water</span>
                                        <span className="detail-value">{result.newWater.toFixed(1)} gal</span>
                                    </div>
                                    {result.strengthImpact > 0 && (
                                        <div className="detail-row warning">
                                            <span>Est. Strength Impact</span>
                                            <span className="detail-value">-{result.strengthImpact}%</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="calc-footer">
                <button onClick={clearForm} className="btn-reset">
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
                <div className="calc-note">
                    <i className="fas fa-info-circle"></i>
                    <span>Rule of thumb: ~3 gal/yd per inch of slump</span>
                </div>
            </div>
        </div>
    )
}

export default SlumpAdjustmentCalculator
