import React, { useState, useEffect, useCallback } from 'react'

const MATERIALS = [
    { key: 'limestone', label: 'Coarse Aggregate', icon: 'fa-mountain' },
    { key: 'sand', label: 'Fine Aggregate', icon: 'fa-water' },
    { key: 'cement', label: 'Primary Powder', icon: 'fa-box' },
    { key: 'additive', label: 'Supplemental Powder', icon: 'fa-flask' }
]

const ProportionsCalculator = () => {
    const [target, setTarget] = useState({
        limestone: '',
        cement: '',
        sand: '',
        additive: '',
        additiveType: 'flyash'
    })

    const [actual, setActual] = useState({
        limestone: '',
        cement: '',
        sand: '',
        additive: ''
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
            limestone: parseFloat(target.limestone) || 0,
            cement: parseFloat(target.cement) || 0,
            sand: parseFloat(target.sand) || 0,
            additive: parseFloat(target.additive) || 0
        }

        const a = {
            limestone: parseFloat(actual.limestone) || 0,
            cement: parseFloat(actual.cement) || 0,
            sand: parseFloat(actual.sand) || 0,
            additive: parseFloat(actual.additive) || 0
        }

        const hasTargetData = t.limestone > 0 && t.sand > 0 && (t.cement > 0 || t.additive > 0)
        const hasActualData = a.limestone > 0 || a.sand > 0 || a.cement > 0 || a.additive > 0

        if (!hasTargetData || !hasActualData) {
            setAdjustments(null)
            return
        }

        let workingLimestone = Math.max(a.limestone, t.limestone)
        let workingSand = Math.max(a.sand, t.sand)
        let workingCement = Math.max(a.cement, t.cement)
        let workingAdditive = Math.max(a.additive, t.additive)

        const targetAggRatio = t.limestone / t.sand
        const targetTotalAgg = t.limestone + t.sand
        const targetTotalCite = t.cement + t.additive
        const targetAggToCiteRatio = targetTotalCite > 0 ? targetTotalAgg / targetTotalCite : 0
        const targetCementToAdditiveRatio = t.additive > 0 ? t.cement / t.additive : 0

        let iterations = 0
        const maxIterations = 10

        while (iterations < maxIterations) {
            iterations++
            let changed = false

            const currentAggRatio = workingSand > 0 ? workingLimestone / workingSand : 0
            
            if (Math.abs(currentAggRatio - targetAggRatio) > 0.001) {
                if (currentAggRatio > targetAggRatio) {
                    const neededSand = workingLimestone / targetAggRatio
                    if (neededSand > workingSand) {
                        workingSand = neededSand
                        changed = true
                    }
                } else {
                    const neededLimestone = workingSand * targetAggRatio
                    if (neededLimestone > workingLimestone) {
                        workingLimestone = neededLimestone
                        changed = true
                    }
                }
            }

            const currentTotalAgg = workingLimestone + workingSand
            const currentTotalCite = workingCement + workingAdditive
            const currentAggToCiteRatio = currentTotalCite > 0 ? currentTotalAgg / currentTotalCite : 0

            if (targetAggToCiteRatio > 0 && Math.abs(currentAggToCiteRatio - targetAggToCiteRatio) > 0.001) {
                const neededTotalCite = currentTotalAgg / targetAggToCiteRatio

                if (neededTotalCite > currentTotalCite) {
                    if (targetCementToAdditiveRatio > 0) {
                        const citeRatioSum = targetCementToAdditiveRatio + 1
                        const neededAdditive = neededTotalCite / citeRatioSum
                        const neededCement = neededAdditive * targetCementToAdditiveRatio

                        if (neededCement > workingCement) {
                            workingCement = neededCement
                            changed = true
                        }
                        if (neededAdditive > workingAdditive) {
                            workingAdditive = neededAdditive
                            changed = true
                        }
                    } else {
                        if (neededTotalCite > workingCement) {
                            workingCement = neededTotalCite
                            changed = true
                        }
                    }
                }
            }

            if (targetCementToAdditiveRatio > 0) {
                const currentCementToAdditiveRatio = workingAdditive > 0 ? workingCement / workingAdditive : 0
                
                if (Math.abs(currentCementToAdditiveRatio - targetCementToAdditiveRatio) > 0.001) {
                    if (currentCementToAdditiveRatio > targetCementToAdditiveRatio) {
                        const neededAdditive = workingCement / targetCementToAdditiveRatio
                        if (neededAdditive > workingAdditive) {
                            workingAdditive = neededAdditive
                            changed = true
                        }
                    } else {
                        const neededCement = workingAdditive * targetCementToAdditiveRatio
                        if (neededCement > workingCement) {
                            workingCement = neededCement
                            changed = true
                        }
                    }
                }
            }

            if (!changed) break
        }

        const adjustLimestone = workingLimestone - a.limestone
        const adjustSand = workingSand - a.sand
        const adjustCement = workingCement - a.cement
        const adjustAdditive = workingAdditive - a.additive

        const totalTargetWeight = t.limestone + t.cement + t.sand + t.additive
        const totalAdjustedWeight = workingLimestone + workingSand + workingCement + workingAdditive

        const targetYards = totalTargetWeight > 0 ? totalTargetWeight / 3800 : 0
        const adjustedYards = totalAdjustedWeight > 0 ? totalAdjustedWeight / 3800 : 0

        setAdjustments({
            limestone: adjustLimestone,
            cement: adjustCement,
            sand: adjustSand,
            additive: adjustAdditive,
            targetYards,
            adjustedYards
        })
    }, [target, actual])

    useEffect(() => {
        calculateAdjustments()
    }, [calculateAdjustments])

    const clearForm = () => {
        setTarget({ limestone: '', cement: '', sand: '', additive: '', additiveType: 'flyash' })
        setActual({ limestone: '', cement: '', sand: '', additive: '' })
        setAdjustments(null)
    }

    const getAdjustmentDisplay = (key) => {
        if (!adjustments) return null
        const value = adjustments[key]
        if (value < 0.5) {
            return (
                <div className="adjust-result ok">
                    <i className="fas fa-check-circle"></i>
                    <span>No change</span>
                </div>
            )
        }
        return (
            <div className="adjust-result add">
                <i className="fas fa-plus-circle"></i>
                <span>+{value.toFixed(0)} lbs</span>
            </div>
        )
    }

    return (
        <div className="mix-fixer">
            <div className="mix-fixer-grid">
                {MATERIALS.map((mat) => (
                    <div key={mat.key} className="material-card">
                        <div className="material-header">
                            <i className={`fas ${mat.icon}`}></i>
                            <span className="material-name">{mat.label}</span>
                        </div>
                        <div className="material-inputs">
                            <div className="input-group">
                                <label>Target</label>
                                <div className="input-wrap">
                                    <input
                                        type="number"
                                        value={target[mat.key]}
                                        onChange={(e) => handleTargetChange(mat.key, e.target.value)}
                                        placeholder="0"
                                    />
                                    <span className="input-unit">lbs</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Actual</label>
                                <div className="input-wrap">
                                    <input
                                        type="number"
                                        value={actual[mat.key]}
                                        onChange={(e) => handleActualChange(mat.key, e.target.value)}
                                        placeholder="0"
                                    />
                                    <span className="input-unit">lbs</span>
                                </div>
                            </div>
                        </div>
                        <div className="material-result">
                            {getAdjustmentDisplay(mat.key)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mix-summary">
                <div className="summary-left">
                    <button onClick={clearForm} className="btn-reset">
                        <i className="fas fa-redo"></i>
                        <span>Reset All</span>
                    </button>
                </div>
                <div className="summary-right">
                    {adjustments ? (
                        <div className="yardage-summary">
                            <div className="yardage-item">
                                <span className="yardage-label">Target Batch</span>
                                <span className="yardage-value">{adjustments.targetYards.toFixed(2)} yd</span>
                            </div>
                            <i className="fas fa-arrow-right yardage-arrow"></i>
                            <div className="yardage-item highlight">
                                <span className="yardage-label">Adjusted Batch</span>
                                <span className="yardage-value">{adjustments.adjustedYards.toFixed(2)} yd</span>
                            </div>
                        </div>
                    ) : (
                        <div className="yardage-empty">
                            <i className="fas fa-info-circle"></i>
                            <span>Enter target and actual values to see adjustments</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProportionsCalculator
