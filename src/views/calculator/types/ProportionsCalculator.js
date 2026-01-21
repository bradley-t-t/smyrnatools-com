import React, {useCallback, useEffect, useState} from 'react'

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
        setTarget(prev => ({...prev, [field]: value}))
    }

    const handleActualChange = (field, value) => {
        setActual(prev => ({...prev, [field]: value}))
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
        setTarget({coarse: '', fine: '', cement: '', supplemental: ''})
        setActual({coarse: '', fine: '', cement: '', supplemental: ''})
        setAdjustments(null)
    }

    const getAddition = (key) => {
        if (!adjustments) return null
        const value = adjustments[key]
        if (value < 0.5) return 0
        return Math.round(value)
    }

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
        formulaLayout: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
        },
        formulaRow: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
        },
        fraction: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            minWidth: '200px'
        },
        fractionPart: {
            padding: '1rem'
        },
        fractionBar: {
            height: '2px',
            background: '#1e3a5f'
        },
        formulaInput: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        label: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        inputWrap: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
        },
        input: {
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
        formulaLabel: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1e3a5f',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        formulaDivider: {
            fontSize: '2rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        actualGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
        },
        actualItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        resultContainer: {
            background: '#f0fdf4',
            border: '2px solid #dcfce7',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem'
        },
        resultHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#16a34a'
        },
        additionsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
        },
        additionItem: (hasAdd) => ({
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '1rem',
            background: hasAdd ? '#dcfce7' : '#f8fafc',
            border: `2px solid ${hasAdd ? '#16a34a' : '#e5e7eb'}`,
            borderRadius: '8px'
        }),
        addLabel: {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        addValue: (hasAdd) => ({
            fontSize: '1.125rem',
            fontWeight: 700,
            color: hasAdd ? '#16a34a' : '#94a3b8'
        }),
        batchEstimate: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #dcfce7',
            flexWrap: 'wrap'
        },
        batchLabel: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#64748b'
        },
        batchValue: {
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        batchChange: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#16a34a'
        },
        emptyState: {
            textAlign: 'center',
            padding: '3rem 2rem',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '2px dashed #e5e7eb',
            marginBottom: '2rem'
        },
        emptyIcon: {
            fontSize: '3rem',
            color: '#cbd5e1',
            marginBottom: '1rem'
        },
        emptyText: {
            fontSize: '0.9375rem',
            color: '#64748b'
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

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-bullseye" style={{color: '#1e3a5f'}}></i>
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
                                                e.target.style.borderColor = '#1e3a5f';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb';
                                                e.target.style.boxShadow = 'none';
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
                                                e.target.style.borderColor = '#1e3a5f';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb';
                                                e.target.style.boxShadow = 'none';
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
                                                e.target.style.borderColor = '#1e3a5f';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb';
                                                e.target.style.boxShadow = 'none';
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
                                                e.target.style.borderColor = '#1e3a5f';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb';
                                                e.target.style.boxShadow = 'none';
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
                    <i className="fas fa-weight-hanging" style={{color: '#1e3a5f'}}></i>
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
                                    e.target.style.borderColor = '#1e3a5f';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
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
                                    e.target.style.borderColor = '#1e3a5f';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
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
                                    e.target.style.borderColor = '#1e3a5f';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
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
                                    e.target.style.borderColor = '#1e3a5f';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
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
                    <span style={styles.emptyText}>Enter target mix design and actual weights to calculate adjustments</span>
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

export default ProportionsCalculator