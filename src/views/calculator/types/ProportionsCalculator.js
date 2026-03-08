import React, { useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '../../../app/hooks/useIsMobile'
/**
 * Overweight/proportion-fix calculator for concrete batching.
 * Given a target mix design (coarse/fine aggregate, primary/supplemental powder)
 * and actual batched weights, iteratively determines the minimum material
 * additions needed to restore the original design ratios without removing material.
 */
const ProportionsCalculator = () => {
    const isMobile = useIsMobile()
    const [target, setTarget] = useState({
        cement: '',
        coarse: '',
        fine: '',
        supplemental: ''
    })
    const [actual, setActual] = useState({
        cement: '',
        coarse: '',
        fine: '',
        supplemental: ''
    })
    const [adjustments, setAdjustments] = useState(null)
    const handleTargetChange = (field, value) => {
        setTarget((prev) => ({ ...prev, [field]: value }))
    }
    const handleActualChange = (field, value) => {
        setActual((prev) => ({ ...prev, [field]: value }))
    }
    const calculateAdjustments = useCallback(() => {
        const t = {
            cement: parseFloat(target.cement) || 0,
            coarse: parseFloat(target.coarse) || 0,
            fine: parseFloat(target.fine) || 0,
            supplemental: parseFloat(target.supplemental) || 0
        }
        const a = {
            cement: parseFloat(actual.cement) || 0,
            coarse: parseFloat(actual.coarse) || 0,
            fine: parseFloat(actual.fine) || 0,
            supplemental: parseFloat(actual.supplemental) || 0
        }
        const hasTargetData = t.coarse > 0 && t.fine > 0 && (t.cement > 0 || t.supplemental > 0)
        const hasActualData = a.coarse > 0 || a.fine > 0 || a.cement > 0 || a.supplemental > 0
        if (!hasTargetData || !hasActualData) {
            setAdjustments(null)
            return
        }
        // Start from whichever is higher (actual or target) since we can only add material, never remove.
        let workingCoarse = Math.max(a.coarse, t.coarse)
        let workingFine = Math.max(a.fine, t.fine)
        let workingCite = Math.max(a.cement, t.cement)
        let workingSupp = Math.max(a.supplemental, t.supplemental)
        const targetAggRatio = t.coarse / t.fine
        const targetTotalAgg = t.coarse + t.fine
        const targetTotalCite = t.cement + t.supplemental
        const targetAggToCiteRatio = targetTotalCite > 0 ? targetTotalAgg / targetTotalCite : 0
        const targetCiteToSuppRatio = t.supplemental > 0 ? t.cement / t.supplemental : 0
        // Iteratively adjust each material upward until all three ratios converge.
        // Adjusting one ratio may throw off another, so multiple passes are needed.
        let iterations = 0
        const maxIterations = 10
        while (iterations < maxIterations) {
            iterations++
            let changed = false
            // Step 1: Correct the coarse-to-fine aggregate ratio.
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
            // Step 2: Correct the aggregate-to-cementitious ratio by adding powder.
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
            // Step 3: Correct the primary-to-supplemental cementitious ratio.
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
        // ~3800 lbs is the approximate weight of one cubic yard of concrete.
        const targetYards = totalTargetWeight > 0 ? totalTargetWeight / 3800 : 0
        const adjustedYards = totalAdjustedWeight > 0 ? totalAdjustedWeight / 3800 : 0
        setAdjustments({
            adjustedYards,
            cement: adjustCite,
            coarse: adjustCoarse,
            fine: adjustFine,
            ratios: {
                targetAggRatio: targetAggRatio.toFixed(2),
                targetAggToCite: targetAggToCiteRatio.toFixed(2)
            },
            supplemental: adjustSupp,
            targetYards
        })
    }, [target, actual])
    useEffect(() => {
        calculateAdjustments()
    }, [calculateAdjustments])
    const clearForm = () => {
        setTarget({ cement: '', coarse: '', fine: '', supplemental: '' })
        setActual({ cement: '', coarse: '', fine: '', supplemental: '' })
        setAdjustments(null)
    }
    /** Returns the rounded material addition, treating sub-0.5 lb differences as negligible. */
    const getAddition = (key) => {
        if (!adjustments) return null
        const value = adjustments[key]
        if (value < 0.5) return 0
        return Math.round(value)
    }
    const styles = {
        actualGrid: {
            display: 'grid',
            gap: isMobile ? '1rem' : '1.5rem',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'
        },
        actualItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        addLabel: {
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        addValue: (hasAdd) => ({
            color: hasAdd ? '#16a34a' : 'var(--text-tertiary)',
            fontSize: '1.125rem',
            fontWeight: 700
        }),
        additionItem: (hasAdd) => ({
            background: hasAdd ? '#dcfce7' : 'var(--bg-secondary)',
            border: `2px solid ${hasAdd ? '#16a34a' : 'var(--border-color)'}`,
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '1rem'
        }),
        additionsGrid: {
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginBottom: '1.5rem'
        },
        batchChange: {
            color: '#16a34a',
            fontSize: '0.875rem',
            fontWeight: 600
        },
        batchEstimate: {
            alignItems: 'center',
            background: 'var(--card-background)',
            border: '1px solid #dcfce7',
            borderRadius: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            padding: '1rem'
        },
        batchLabel: {
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 600
        },
        batchValue: {
            color: 'var(--accent)',
            fontSize: '1.5rem',
            fontWeight: 700
        },
        container: {
            background: 'var(--card-background)',
            border: '1px solid var(--border-light)',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: isMobile ? '1rem' : '2rem'
        },
        emptyIcon: {
            color: 'var(--text-tertiary)',
            fontSize: '3rem',
            marginBottom: '1rem'
        },
        emptyState: {
            background: 'var(--bg-secondary)',
            border: '2px dashed var(--border-color)',
            borderRadius: '12px',
            marginBottom: '2rem',
            padding: '3rem 2rem',
            textAlign: 'center'
        },
        emptyText: {
            color: 'var(--text-secondary)',
            fontSize: '0.9375rem'
        },
        footer: {
            display: 'flex',
            justifyContent: 'center'
        },
        formulaDivider: {
            color: 'var(--accent)',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700
        },
        formulaInput: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        formulaLabel: {
            color: 'var(--accent)',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        formulaLayout: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '1rem' : '2rem',
            justifyContent: 'center'
        },
        formulaRow: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: isMobile ? '100%' : 'auto'
        },
        fraction: {
            alignItems: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            minWidth: isMobile ? '100%' : '200px',
            width: isMobile ? '100%' : 'auto'
        },
        fractionBar: {
            background: 'var(--accent)',
            height: '2px'
        },
        fractionPart: {
            padding: isMobile ? '0.75rem' : '1rem'
        },
        input: {
            border: '2px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            outline: 'none',
            padding: isMobile ? '0.625rem 3rem 0.625rem 0.75rem' : '0.75rem 3.5rem 0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        },
        inputUnit: {
            color: 'var(--text-tertiary)',
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
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        resetButton: {
            alignItems: 'center',
            background: 'var(--card-background)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '0.5rem',
            outline: 'none',
            padding: '0.75rem 1.5rem',
            transition: 'all 0.2s'
        },
        resultContainer: {
            background: '#f0fdf4',
            border: '2px solid #dcfce7',
            borderRadius: isMobile ? '8px' : '12px',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '1rem' : '2rem'
        },
        resultHeader: {
            alignItems: 'center',
            color: '#16a34a',
            display: 'flex',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        section: {
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        sectionHeader: {
            alignItems: 'center',
            borderBottom: '2px solid var(--border-light)',
            color: 'var(--text-primary)',
            display: 'flex',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            paddingBottom: '1rem'
        }
    }
    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-bullseye" style={{ color: 'var(--accent)' }}></i>
                    <span>Target Mix Design</span>
                </div>
                <div style={styles.formulaLayout}>
                    <div style={styles.formulaRow}>
                        <div style={styles.fraction}>
                            <div style={styles.fractionPart}>
                                <div style={styles.formulaInput}>
                                    <label style={styles.label}>Coarse Agg</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="number"
                                            value={target.coarse}
                                            onChange={(e) => handleTargetChange('coarse', e.target.value)}
                                            placeholder="0"
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--accent)'
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border-color)'
                                                e.target.style.boxShadow = 'none'
                                            }}
                                        />
                                        <span style={styles.inputUnit}>lbs</span>
                                    </div>
                                </div>
                            </div>
                            <div style={styles.fractionBar}></div>
                            <div style={styles.fractionPart}>
                                <div style={styles.formulaInput}>
                                    <label style={styles.label}>Fine Agg</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="number"
                                            value={target.fine}
                                            onChange={(e) => handleTargetChange('fine', e.target.value)}
                                            placeholder="0"
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--accent)'
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border-color)'
                                                e.target.style.boxShadow = 'none'
                                            }}
                                        />
                                        <span style={styles.inputUnit}>lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={styles.formulaLabel}>Agg Ratio</div>
                    </div>
                    <div style={styles.formulaDivider}>
                        <span>:</span>
                    </div>
                    <div style={styles.formulaRow}>
                        <div style={styles.fraction}>
                            <div style={styles.fractionPart}>
                                <div style={styles.formulaInput}>
                                    <label style={styles.label}>Primary Powder</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="number"
                                            value={target.cement}
                                            onChange={(e) => handleTargetChange('cement', e.target.value)}
                                            placeholder="0"
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--accent)'
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border-color)'
                                                e.target.style.boxShadow = 'none'
                                            }}
                                        />
                                        <span style={styles.inputUnit}>lbs</span>
                                    </div>
                                </div>
                            </div>
                            <div style={styles.fractionBar}></div>
                            <div style={styles.fractionPart}>
                                <div style={styles.formulaInput}>
                                    <label style={styles.label}>Supplemental</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type="number"
                                            value={target.supplemental}
                                            onChange={(e) => handleTargetChange('supplemental', e.target.value)}
                                            placeholder="0"
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--accent)'
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border-color)'
                                                e.target.style.boxShadow = 'none'
                                            }}
                                        />
                                        <span style={styles.inputUnit}>lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={styles.formulaLabel}>Cite Ratio</div>
                    </div>
                </div>
            </div>
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-weight-hanging" style={{ color: 'var(--accent)' }}></i>
                    <span>Actual Weights</span>
                </div>
                <div style={styles.actualGrid}>
                    <div style={styles.actualItem}>
                        <label style={styles.label}>Coarse Agg</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="number"
                                value={actual.coarse}
                                onChange={(e) => handleActualChange('coarse', e.target.value)}
                                placeholder="0"
                                style={styles.input}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent)'
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border-color)'
                                    e.target.style.boxShadow = 'none'
                                }}
                            />
                            <span style={styles.inputUnit}>lbs</span>
                        </div>
                    </div>
                    <div style={styles.actualItem}>
                        <label style={styles.label}>Fine Agg</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="number"
                                value={actual.fine}
                                onChange={(e) => handleActualChange('fine', e.target.value)}
                                placeholder="0"
                                style={styles.input}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent)'
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border-color)'
                                    e.target.style.boxShadow = 'none'
                                }}
                            />
                            <span style={styles.inputUnit}>lbs</span>
                        </div>
                    </div>
                    <div style={styles.actualItem}>
                        <label style={styles.label}>Primary Powder</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="number"
                                value={actual.cement}
                                onChange={(e) => handleActualChange('cement', e.target.value)}
                                placeholder="0"
                                style={styles.input}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent)'
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border-color)'
                                    e.target.style.boxShadow = 'none'
                                }}
                            />
                            <span style={styles.inputUnit}>lbs</span>
                        </div>
                    </div>
                    <div style={styles.actualItem}>
                        <label style={styles.label}>Supplemental</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="number"
                                value={actual.supplemental}
                                onChange={(e) => handleActualChange('supplemental', e.target.value)}
                                placeholder="0"
                                style={styles.input}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent)'
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border-color)'
                                    e.target.style.boxShadow = 'none'
                                }}
                            />
                            <span style={styles.inputUnit}>lbs</span>
                        </div>
                    </div>
                </div>
            </div>
            {adjustments ? (
                <div style={styles.resultContainer}>
                    <div style={styles.resultHeader}>
                        <i className="fas fa-plus-circle"></i>
                        <span>Add to Fix Proportions</span>
                    </div>
                    <div style={styles.additionsGrid}>
                        <div style={styles.additionItem(getAddition('coarse') > 0)}>
                            <span style={styles.addLabel}>Coarse Agg</span>
                            <span style={styles.addValue(getAddition('coarse') > 0)}>
                                {getAddition('coarse') > 0 ? `+${getAddition('coarse')} lbs` : 'None'}
                            </span>
                        </div>
                        <div style={styles.additionItem(getAddition('fine') > 0)}>
                            <span style={styles.addLabel}>Fine Agg</span>
                            <span style={styles.addValue(getAddition('fine') > 0)}>
                                {getAddition('fine') > 0 ? `+${getAddition('fine')} lbs` : 'None'}
                            </span>
                        </div>
                        <div style={styles.additionItem(getAddition('cement') > 0)}>
                            <span style={styles.addLabel}>Primary Powder</span>
                            <span style={styles.addValue(getAddition('cement') > 0)}>
                                {getAddition('cement') > 0 ? `+${getAddition('cement')} lbs` : 'None'}
                            </span>
                        </div>
                        <div style={styles.additionItem(getAddition('supplemental') > 0)}>
                            <span style={styles.addLabel}>Supplemental</span>
                            <span style={styles.addValue(getAddition('supplemental') > 0)}>
                                {getAddition('supplemental') > 0 ? `+${getAddition('supplemental')} lbs` : 'None'}
                            </span>
                        </div>
                    </div>
                    <div style={styles.batchEstimate}>
                        <span style={styles.batchLabel}>Estimated Batch:</span>
                        <span style={styles.batchValue}>{adjustments.adjustedYards.toFixed(1)} yd</span>
                        <span style={styles.batchChange}>
                            (+{(adjustments.adjustedYards - adjustments.targetYards).toFixed(1)} yd from target)
                        </span>
                    </div>
                </div>
            ) : (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>
                        <i className="fas fa-balance-scale"></i>
                    </div>
                    <span style={styles.emptyText}>
                        Enter target mix design and actual weights to calculate adjustments
                    </span>
                </div>
            )}
            <div style={styles.footer}>
                <button
                    onClick={clearForm}
                    style={styles.resetButton}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-secondary)'
                        e.currentTarget.style.borderColor = 'var(--border-color)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--card-background)'
                        e.currentTarget.style.borderColor = 'var(--border-color)'
                    }}
                >
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}
export default ProportionsCalculator
