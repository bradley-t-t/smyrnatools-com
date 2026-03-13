import React, { useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '../../../../app/hooks/useIsMobile'
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
    const containerClass = `bg-[var(--card-background)] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${isMobile ? 'rounded-lg p-4' : 'rounded-xl p-8'}`
    const sectionClass = isMobile ? 'mb-6' : 'mb-8'
    const sectionHeaderClass = `flex items-center gap-3 font-bold border-b-2 border-[var(--border-light)] pb-4 text-[var(--text-primary)] ${isMobile ? 'text-base mb-4' : 'text-lg mb-6'}`
    const labelClass = `text-[var(--text-secondary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'}`
    const inputClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${isMobile ? 'text-sm py-2.5 pl-3 pr-12' : 'text-base py-3 pl-4 pr-14'}`
    const inputUnitClass = `absolute text-[var(--text-tertiary)] font-semibold ${isMobile ? 'text-xs right-3' : 'text-sm right-4'}`
    return (
        <div className={containerClass}>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-bullseye text-accent"></i>
                    <span>Target Mix Design</span>
                </div>
                <div
                    className={`flex items-center justify-center flex-wrap ${isMobile ? 'flex-col gap-4' : 'flex-row gap-8'}`}
                >
                    <div className={`flex flex-col items-center gap-2 ${isMobile ? 'w-full' : 'w-auto'}`}>
                        <div className={`flex flex-col ${isMobile ? 'min-w-full w-full' : 'min-w-[200px] w-auto'}`}>
                            <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Coarse Agg</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={target.coarse}
                                            onChange={(e) => handleTargetChange('coarse', e.target.value)}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>lbs</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-0.5 bg-accent"></div>
                            <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Fine Agg</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={target.fine}
                                            onChange={(e) => handleTargetChange('fine', e.target.value)}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            className={`text-accent font-semibold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'}`}
                        >
                            Agg Ratio
                        </div>
                    </div>
                    <div className={`text-accent font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                        <span>:</span>
                    </div>
                    <div className={`flex flex-col items-center gap-2 ${isMobile ? 'w-full' : 'w-auto'}`}>
                        <div className={`flex flex-col ${isMobile ? 'min-w-full w-full' : 'min-w-[200px] w-auto'}`}>
                            <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Primary Powder</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={target.cement}
                                            onChange={(e) => handleTargetChange('cement', e.target.value)}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>lbs</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-0.5 bg-accent"></div>
                            <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Supplemental</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={target.supplemental}
                                            onChange={(e) => handleTargetChange('supplemental', e.target.value)}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            className={`text-accent font-semibold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'}`}
                        >
                            Cite Ratio
                        </div>
                    </div>
                </div>
            </div>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-weight-hanging text-accent"></i>
                    <span>Actual Weights</span>
                </div>
                <div
                    className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6'}`}
                >
                    {[
                        { field: 'coarse', label: 'Coarse Agg' },
                        { field: 'fine', label: 'Fine Agg' },
                        { field: 'cement', label: 'Primary Powder' },
                        { field: 'supplemental', label: 'Supplemental' }
                    ].map(({ field, label }) => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className={labelClass}>{label}</label>
                            <div className="flex items-center relative">
                                <input
                                    type="number"
                                    value={actual[field]}
                                    onChange={(e) => handleActualChange(field, e.target.value)}
                                    placeholder="0"
                                    className={inputClass}
                                />
                                <span className={inputUnitClass}>lbs</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {adjustments ? (
                <div
                    className={`bg-green-50 border-2 border-green-200 ${isMobile ? 'rounded-lg mb-6 p-4' : 'rounded-xl mb-8 p-8'}`}
                >
                    <div
                        className={`flex items-center gap-3 text-green-600 font-bold ${isMobile ? 'text-base mb-4' : 'text-lg mb-6'}`}
                    >
                        <i className="fas fa-plus-circle"></i>
                        <span>Add to Fix Proportions</span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                        {[
                            { key: 'coarse', label: 'Coarse Agg' },
                            { key: 'fine', label: 'Fine Agg' },
                            { key: 'cement', label: 'Primary Powder' },
                            { key: 'supplemental', label: 'Supplemental' }
                        ].map(({ key, label }) => {
                            const hasAdd = getAddition(key) > 0
                            return (
                                <div
                                    key={key}
                                    className={`flex flex-col gap-2 rounded-lg p-4 border-2 ${hasAdd ? 'bg-green-100 border-green-600' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'}`}
                                >
                                    <span className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wide">
                                        {label}
                                    </span>
                                    <span
                                        className={`text-lg font-bold ${hasAdd ? 'text-green-600' : 'text-[var(--text-tertiary)]'}`}
                                    >
                                        {hasAdd ? `+${getAddition(key)} lbs` : 'None'}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex items-center flex-wrap gap-3 justify-center rounded-lg bg-[var(--card-background)] border border-green-200 p-4">
                        <span className="text-[var(--text-secondary)] text-sm font-semibold">Estimated Batch:</span>
                        <span className="text-accent text-2xl font-bold">
                            {adjustments.adjustedYards.toFixed(1)} yd
                        </span>
                        <span className="text-green-600 text-sm font-semibold">
                            (+{(adjustments.adjustedYards - adjustments.targetYards).toFixed(1)} yd from target)
                        </span>
                    </div>
                </div>
            ) : (
                <div
                    className={`bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-xl text-center ${isMobile ? 'mb-6' : 'mb-8'} py-12 px-8`}
                >
                    <div className="text-[var(--text-tertiary)] text-5xl mb-4">
                        <i className="fas fa-balance-scale"></i>
                    </div>
                    <span className="text-[var(--text-secondary)] text-[0.9375rem]">
                        Enter target mix design and actual weights to calculate adjustments
                    </span>
                </div>
            )}
            <div className="flex justify-center">
                <button
                    onClick={clearForm}
                    className="flex items-center gap-2 bg-[var(--card-background)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] cursor-pointer text-[0.9375rem] font-semibold outline-none py-3 px-6 transition-all duration-200 hover:bg-[var(--bg-secondary)]"
                >
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}
export default ProportionsCalculator
