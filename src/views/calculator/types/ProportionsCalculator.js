import React, { useState, useEffect, useCallback } from 'react'

const ProportionsCalculator = () => {
    const [target, setTarget] = useState({
        coarse: '',
        fine: '',
        cement: '',
        supplemental: ''
    })

    const [actual, setActual] = useState({
        coarse: '',
        fine: '',
        cement: '',
        supplemental: ''
    })

    const [adjustments, setAdjustments] = useState(null)

    const handleTargetChange = (field, value) => {
        setTarget(prev => ({ ...prev, [field]: value }))
    }

    const handleActualChange = (field, value) => {
        setActual(prev => ({ ...prev, [field]: value }))
    }

    const calculateAdjustments = useCallback(() => {
        const t = {
            coarse: parseFloat(target.coarse) || 0,
            fine: parseFloat(target.fine) || 0,
            cement: parseFloat(target.cement) || 0,
            supplemental: parseFloat(target.supplemental) || 0
        }

        const a = {
            coarse: parseFloat(actual.coarse) || 0,
            fine: parseFloat(actual.fine) || 0,
            cement: parseFloat(actual.cement) || 0,
            supplemental: parseFloat(actual.supplemental) || 0
        }

        const hasTargetData = t.coarse > 0 && t.fine > 0 && (t.cement > 0 || t.supplemental > 0)
        const hasActualData = a.coarse > 0 || a.fine > 0 || a.cement > 0 || a.supplemental > 0

        if (!hasTargetData || !hasActualData) {
            setAdjustments(null)
            return
        }

        let workingCoarse = Math.max(a.coarse, t.coarse)
        let workingFine = Math.max(a.fine, t.fine)
        let workingCite = Math.max(a.cement, t.cement)
        let workingSupp = Math.max(a.supplemental, t.supplemental)

        const targetAggRatio = t.coarse / t.fine
        const targetTotalAgg = t.coarse + t.fine
        const targetTotalCite = t.cement + t.supplemental
        const targetAggToCiteRatio = targetTotalCite > 0 ? targetTotalAgg / targetTotalCite : 0
        const targetCiteToSuppRatio = t.supplemental > 0 ? t.cement / t.supplemental : 0

        let iterations = 0
        const maxIterations = 10

        while (iterations < maxIterations) {
            iterations++
            let changed = false

            const currentAggRatio = workingFine > 0 ? workingCoarse / workingFine : 0
            
            if (Math.abs(currentAggRatio - targetAggRatio) > 0.001) {
                if (currentAggRatio > targetAggRatio) {
                    const neededFine = workingCoarse / targetAggRatio
                    if (neededFine > workingFine) {
                        workingFine = neededFine
                        changed = true
                    }
                } else {
                    const neededCoarse = workingFine * targetAggRatio
                    if (neededCoarse > workingCoarse) {
                        workingCoarse = neededCoarse
                        changed = true
                    }
                }
            }

            const currentTotalAgg = workingCoarse + workingFine
            const currentTotalCite = workingCite + workingSupp
            const currentAggToCiteRatio = currentTotalCite > 0 ? currentTotalAgg / currentTotalCite : 0

            if (targetAggToCiteRatio > 0 && Math.abs(currentAggToCiteRatio - targetAggToCiteRatio) > 0.001) {
                const neededTotalCite = currentTotalAgg / targetAggToCiteRatio

                if (neededTotalCite > currentTotalCite) {
                    if (targetCiteToSuppRatio > 0) {
                        const citeRatioSum = targetCiteToSuppRatio + 1
                        const neededSupp = neededTotalCite / citeRatioSum
                        const neededCite = neededSupp * targetCiteToSuppRatio

                        if (neededCite > workingCite) {
                            workingCite = neededCite
                            changed = true
                        }
                        if (neededSupp > workingSupp) {
                            workingSupp = neededSupp
                            changed = true
                        }
                    } else {
                        if (neededTotalCite > workingCite) {
                            workingCite = neededTotalCite
                            changed = true
                        }
                    }
                }
            }

            if (targetCiteToSuppRatio > 0) {
                const currentCiteToSuppRatio = workingSupp > 0 ? workingCite / workingSupp : 0
                
                if (Math.abs(currentCiteToSuppRatio - targetCiteToSuppRatio) > 0.001) {
                    if (currentCiteToSuppRatio > targetCiteToSuppRatio) {
                        const neededSupp = workingCite / targetCiteToSuppRatio
                        if (neededSupp > workingSupp) {
                            workingSupp = neededSupp
                            changed = true
                        }
                    } else {
                        const neededCite = workingSupp * targetCiteToSuppRatio
                        if (neededCite > workingCite) {
                            workingCite = neededCite
                            changed = true
                        }
                    }
                }
            }

            if (!changed) break
        }

        const adjustCoarse = workingCoarse - a.coarse
        const adjustFine = workingFine - a.fine
        const adjustCite = workingCite - a.cement
        const adjustSupp = workingSupp - a.supplemental

        const totalTargetWeight = t.coarse + t.cement + t.fine + t.supplemental
        const totalAdjustedWeight = workingCoarse + workingFine + workingCite + workingSupp

        const targetYards = totalTargetWeight > 0 ? totalTargetWeight / 3800 : 0
        const adjustedYards = totalAdjustedWeight > 0 ? totalAdjustedWeight / 3800 : 0

        setAdjustments({
            coarse: adjustCoarse,
            fine: adjustFine,
            cement: adjustCite,
            supplemental: adjustSupp,
            targetYards,
            adjustedYards,
            ratios: {
                targetAggRatio: targetAggRatio.toFixed(2),
                targetAggToCite: targetAggToCiteRatio.toFixed(2)
            }
        })
    }, [target, actual])

    useEffect(() => {
        calculateAdjustments()
    }, [calculateAdjustments])

    const clearForm = () => {
        setTarget({ coarse: '', fine: '', cement: '', supplemental: '' })
        setActual({ coarse: '', fine: '', cement: '', supplemental: '' })
        setAdjustments(null)
    }

    const getAddition = (key) => {
        if (!adjustments) return null
        const value = adjustments[key]
        if (value < 0.5) return 0
        return Math.round(value)
    }

    return (
        <div className="proportion-calc">
            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-bullseye"></i>
                    <span>Target Mix Design</span>
                </div>
                <div className="proportion-formula">
                    <div className="formula-row">
                        <div className="formula-fraction">
                            <div className="fraction-top">
                                <div className="formula-input">
                                    <label>Coarse Agg</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={target.coarse}
                                            onChange={(e) => handleTargetChange('coarse', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">lbs</span>
                                    </div>
                                </div>
                            </div>
                            <div className="fraction-bar"></div>
                            <div className="fraction-bottom">
                                <div className="formula-input">
                                    <label>Fine Agg</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={target.fine}
                                            onChange={(e) => handleTargetChange('fine', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="formula-label">Agg Ratio</div>
                    </div>
                    <div className="formula-divider">
                        <span>:</span>
                    </div>
                    <div className="formula-row">
                        <div className="formula-fraction">
                            <div className="fraction-top">
                                <div className="formula-input">
                                    <label>Primary Powder</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={target.cement}
                                            onChange={(e) => handleTargetChange('cement', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">lbs</span>
                                    </div>
                                </div>
                            </div>
                            <div className="fraction-bar"></div>
                            <div className="fraction-bottom">
                                <div className="formula-input">
                                    <label>Supplemental</label>
                                    <div className="input-wrap">
                                        <input
                                            type="number"
                                            value={target.supplemental}
                                            onChange={(e) => handleTargetChange('supplemental', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="input-unit">lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="formula-label">Cite Ratio</div>
                    </div>
                </div>
            </div>

            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-weight-hanging"></i>
                    <span>Actual Weights</span>
                </div>
                <div className="actual-inputs-grid">
                    <div className="actual-input-item">
                        <label>Coarse Agg</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={actual.coarse}
                                onChange={(e) => handleActualChange('coarse', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">lbs</span>
                        </div>
                    </div>
                    <div className="actual-input-item">
                        <label>Fine Agg</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={actual.fine}
                                onChange={(e) => handleActualChange('fine', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">lbs</span>
                        </div>
                    </div>
                    <div className="actual-input-item">
                        <label>Primary Powder</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={actual.cement}
                                onChange={(e) => handleActualChange('cement', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">lbs</span>
                        </div>
                    </div>
                    <div className="actual-input-item">
                        <label>Supplemental</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={actual.supplemental}
                                onChange={(e) => handleActualChange('supplemental', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">lbs</span>
                        </div>
                    </div>
                </div>
            </div>

            {adjustments ? (
                <div className="calc-result">
                    <div className="result-header">
                        <i className="fas fa-plus-circle"></i>
                        <span>Add to Fix Proportions</span>
                    </div>
                    <div className="additions-grid">
                        <div className={`addition-item ${getAddition('coarse') > 0 ? 'has-add' : ''}`}>
                            <span className="add-label">Coarse Agg</span>
                            <span className="add-value">
                                {getAddition('coarse') > 0 ? `+${getAddition('coarse')} lbs` : 'None'}
                            </span>
                        </div>
                        <div className={`addition-item ${getAddition('fine') > 0 ? 'has-add' : ''}`}>
                            <span className="add-label">Fine Agg</span>
                            <span className="add-value">
                                {getAddition('fine') > 0 ? `+${getAddition('fine')} lbs` : 'None'}
                            </span>
                        </div>
                        <div className={`addition-item ${getAddition('cement') > 0 ? 'has-add' : ''}`}>
                            <span className="add-label">Primary Powder</span>
                            <span className="add-value">
                                {getAddition('cement') > 0 ? `+${getAddition('cement')} lbs` : 'None'}
                            </span>
                        </div>
                        <div className={`addition-item ${getAddition('supplemental') > 0 ? 'has-add' : ''}`}>
                            <span className="add-label">Supplemental</span>
                            <span className="add-value">
                                {getAddition('supplemental') > 0 ? `+${getAddition('supplemental')} lbs` : 'None'}
                            </span>
                        </div>
                    </div>
                    <div className="batch-estimate">
                        <span className="batch-label">Estimated Batch:</span>
                        <span className="batch-value">{adjustments.adjustedYards.toFixed(1)} yd</span>
                        <span className="batch-change">
                            (+{(adjustments.adjustedYards - adjustments.targetYards).toFixed(1)} yd from target)
                        </span>
                    </div>
                </div>
            ) : (
                <div className="calc-empty-state">
                    <i className="fas fa-balance-scale"></i>
                    <span>Enter target mix design and actual weights to calculate adjustments</span>
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

export default ProportionsCalculator
