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

    const slumpDiff = (parseFloat(values.targetSlump) || 0) - (parseFloat(values.currentSlump) || 0)
    const batchSize = parseFloat(values.batchSize) || 0
    const hasResult = parseFloat(values.currentSlump) > 0 && parseFloat(values.targetSlump) > 0 && batchSize > 0

    return (
        <div className="slump-calculator">
            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-tint"></i>
                    <span>Water Adjustment Formula</span>
                </div>
                <div className="slump-main-formula">
                    <div className="slump-equation">
                        <div className="equation-part">
                            <div className="equation-bracket">(</div>
                            <div className="equation-inputs">
                                <div className="eq-input">
                                    <label>Target</label>
                                    <div className="input-wrap compact">
                                        <input
                                            type="number"
                                            value={values.targetSlump}
                                            onChange={(e) => handleChange('targetSlump', e.target.value)}
                                            placeholder="0"
                                            step="0.5"
                                        />
                                    </div>
                                </div>
                                <span className="eq-op">−</span>
                                <div className="eq-input">
                                    <label>Current</label>
                                    <div className="input-wrap compact">
                                        <input
                                            type="number"
                                            value={values.currentSlump}
                                            onChange={(e) => handleChange('currentSlump', e.target.value)}
                                            placeholder="0"
                                            step="0.5"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="equation-bracket">)</div>
                            <span className="eq-unit">in</span>
                        </div>
                        
                        <span className="eq-op main">×</span>
                        
                        <div className="equation-constant">
                            <span className="const-num">3</span>
                            <span className="const-unit">gal/yd/in</span>
                        </div>
                        
                        <span className="eq-op main">×</span>
                        
                        <div className="equation-part">
                            <div className="eq-input">
                                <label>Batch</label>
                                <div className="input-wrap compact">
                                    <input
                                        type="number"
                                        value={values.batchSize}
                                        onChange={(e) => handleChange('batchSize', e.target.value)}
                                        placeholder="10"
                                    />
                                </div>
                            </div>
                            <span className="eq-unit">yd</span>
                        </div>
                        
                        <span className="eq-op main">=</span>
                        
                        <div className={`equation-result ${hasResult ? (slumpDiff > 0 ? 'add' : slumpDiff < 0 ? 'reduce' : 'none') : ''}`}>
                            {hasResult ? (
                                <>
                                    <span className="res-action">{slumpDiff > 0 ? 'Add' : slumpDiff < 0 ? 'Remove' : ''}</span>
                                    <span className="res-value">{Math.abs(slumpDiff * 3 * batchSize).toFixed(1)}</span>
                                    <span className="res-unit">gal</span>
                                </>
                            ) : (
                                <span className="res-value">—</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {hasResult && parseFloat(values.currentWater) > 0 && (
                <div className="calc-section">
                    <div className="calc-section-header">
                        <i className="fas fa-calculator"></i>
                        <span>New Total</span>
                    </div>
                    <div className="slump-total-formula">
                        <div className="total-equation">
                            <div className="total-input">
                                <label>Current Water</label>
                                <div className="input-wrap compact">
                                    <input
                                        type="number"
                                        value={values.currentWater}
                                        onChange={(e) => handleChange('currentWater', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <span className="eq-unit">gal</span>
                            </div>
                            <span className="eq-op main">{slumpDiff >= 0 ? '+' : '−'}</span>
                            <div className="total-adjust">
                                <span className="adjust-value">{Math.abs(slumpDiff * 3 * batchSize).toFixed(1)}</span>
                                <span className="eq-unit">gal</span>
                            </div>
                            <span className="eq-op main">=</span>
                            <div className="total-result">
                                <span className="total-value">{result?.newWater.toFixed(1)}</span>
                                <span className="eq-unit">gal</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!hasResult && (
                <div className="calc-section">
                    <div className="calc-section-header">
                        <i className="fas fa-water"></i>
                        <span>Current Water (optional)</span>
                    </div>
                    <div className="calc-inputs-grid single">
                        <div className="calc-input-row">
                            <label>Current Batch Water</label>
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
            )}

            {result && result.strengthImpact > 0 && (
                <div className="slump-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Adding water may reduce strength by ~{result.strengthImpact}%</span>
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

export default SlumpAdjustmentCalculator
