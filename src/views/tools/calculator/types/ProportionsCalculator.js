import React, { useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '../../../../app/hooks/useIsMobile'
import {
    MAX_BALANCING_ITERATIONS,
    NEGLIGIBLE_ADDITION_THRESHOLD,
    POUNDS_PER_CUBIC_YARD,
    RATIO_CONVERGENCE_TOLERANCE
} from './calculatorConstants'

const MATERIAL_FIELDS = [
    { key: 'coarse', label: 'Coarse Agg' },
    { key: 'fine', label: 'Fine Agg' },
    { key: 'cement', label: 'Primary Powder' },
    { key: 'supplemental', label: 'Supplemental' }
]

const EMPTY_FORM = { cement: '', coarse: '', fine: '', supplemental: '' }

/** Parse all form fields to floats, defaulting missing/invalid values to 0. */
const parseWeights = (formValues) => ({
    cement: parseFloat(formValues.cement) || 0,
    coarse: parseFloat(formValues.coarse) || 0,
    fine: parseFloat(formValues.fine) || 0,
    supplemental: parseFloat(formValues.supplemental) || 0
})

/**
 * Iteratively bumps each material upward until the three design ratios
 * (coarse:fine, aggregate:cementitious, primary:supplemental) converge.
 * Only adds material — never removes — so the batch grows to the nearest
 * valid proportion set.
 */
const solveProportionAdjustments = (targetWeights, actualWeights) => {
    const hasTargetData =
        targetWeights.coarse > 0 &&
        targetWeights.fine > 0 &&
        (targetWeights.cement > 0 || targetWeights.supplemental > 0)
    const hasActualData =
        actualWeights.coarse > 0 || actualWeights.fine > 0 || actualWeights.cement > 0 || actualWeights.supplemental > 0

    if (!hasTargetData || !hasActualData) return null

    // Start from whichever is higher (actual or target) since we can only add material, never remove.
    let workingCoarse = Math.max(actualWeights.coarse, targetWeights.coarse)
    let workingFine = Math.max(actualWeights.fine, targetWeights.fine)
    let workingCement = Math.max(actualWeights.cement, targetWeights.cement)
    let workingSupplemental = Math.max(actualWeights.supplemental, targetWeights.supplemental)

    const targetAggregateRatio = targetWeights.coarse / targetWeights.fine
    const targetTotalAggregate = targetWeights.coarse + targetWeights.fine
    const targetTotalCite = targetWeights.cement + targetWeights.supplemental
    const targetAggregateToCiteRatio = targetTotalCite > 0 ? targetTotalAggregate / targetTotalCite : 0
    const targetCementToSupplementalRatio =
        targetWeights.supplemental > 0 ? targetWeights.cement / targetWeights.supplemental : 0

    // Iteratively adjust each material upward until all three ratios converge.
    // Adjusting one ratio may throw off another, so multiple passes are needed.
    for (let iteration = 0; iteration < MAX_BALANCING_ITERATIONS; iteration++) {
        let changed = false

        // Step 1: Correct the coarse-to-fine aggregate ratio.
        changed =
            balanceRatio(
                workingCoarse,
                workingFine,
                targetAggregateRatio,
                (val) => {
                    workingFine = val
                },
                (val) => {
                    workingCoarse = val
                }
            ) || changed

        // Step 2: Correct the aggregate-to-cementitious ratio by adding powder.
        const currentTotalAggregate = workingCoarse + workingFine
        const currentTotalCite = workingCement + workingSupplemental

        if (targetAggregateToCiteRatio > 0) {
            const neededTotalCite = currentTotalAggregate / targetAggregateToCiteRatio
            if (neededTotalCite - currentTotalCite > RATIO_CONVERGENCE_TOLERANCE) {
                if (targetCementToSupplementalRatio > 0) {
                    const ratioSum = targetCementToSupplementalRatio + 1
                    const neededSupplemental = neededTotalCite / ratioSum
                    const neededCement = neededSupplemental * targetCementToSupplementalRatio
                    if (neededCement > workingCement) {
                        workingCement = neededCement
                        changed = true
                    }
                    if (neededSupplemental > workingSupplemental) {
                        workingSupplemental = neededSupplemental
                        changed = true
                    }
                } else if (neededTotalCite > workingCement) {
                    workingCement = neededTotalCite
                    changed = true
                }
            }
        }

        // Step 3: Correct the primary-to-supplemental cementitious ratio.
        if (targetCementToSupplementalRatio > 0) {
            changed =
                balanceRatio(
                    workingCement,
                    workingSupplemental,
                    targetCementToSupplementalRatio,
                    (val) => {
                        workingSupplemental = val
                    },
                    (val) => {
                        workingCement = val
                    }
                ) || changed
        }

        if (!changed) break
    }

    const totalTargetWeight =
        targetWeights.coarse + targetWeights.cement + targetWeights.fine + targetWeights.supplemental
    const totalAdjustedWeight = workingCoarse + workingFine + workingCement + workingSupplemental

    return {
        adjustedYards: totalAdjustedWeight > 0 ? totalAdjustedWeight / POUNDS_PER_CUBIC_YARD : 0,
        cement: workingCement - actualWeights.cement,
        coarse: workingCoarse - actualWeights.coarse,
        fine: workingFine - actualWeights.fine,
        ratios: {
            targetAggRatio: targetAggregateRatio.toFixed(2),
            targetAggToCite: targetAggregateToCiteRatio.toFixed(2)
        },
        supplemental: workingSupplemental - actualWeights.supplemental,
        targetYards: totalTargetWeight > 0 ? totalTargetWeight / POUNDS_PER_CUBIC_YARD : 0
    }
}

/**
 * If numerator/denominator deviates from targetRatio, bump the smaller side up.
 * Returns true if an adjustment was made.
 */
const balanceRatio = (numerator, denominator, targetRatio, setDenominator, setNumerator) => {
    const currentRatio = denominator > 0 ? numerator / denominator : 0
    if (Math.abs(currentRatio - targetRatio) <= RATIO_CONVERGENCE_TOLERANCE) return false

    if (currentRatio > targetRatio) {
        const needed = numerator / targetRatio
        if (needed > denominator) {
            setDenominator(needed)
            return true
        }
    } else {
        const needed = denominator * targetRatio
        if (needed > numerator) {
            setNumerator(needed)
            return true
        }
    }
    return false
}

/** Reusable labeled weight input with "lbs" unit suffix. */
const MaterialInput = ({ label, value, onChange, labelClass, inputClass, inputUnitClass }) => (
    <div className="flex flex-col gap-2">
        <label className={labelClass}>{label}</label>
        <div className="flex items-center relative">
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
                className={inputClass}
            />
            <span className={inputUnitClass}>lbs</span>
        </div>
    </div>
)

/**
 * Overweight/proportion-fix calculator for concrete batching.
 * Given a target mix design (coarse/fine aggregate, primary/supplemental powder)
 * and actual batched weights, iteratively determines the minimum material
 * additions needed to restore the original design ratios without removing material.
 */
const ProportionsCalculator = () => {
    const isMobile = useIsMobile()
    const [target, setTarget] = useState(EMPTY_FORM)
    const [actual, setActual] = useState(EMPTY_FORM)
    const [adjustments, setAdjustments] = useState(null)

    const handleFieldChange = (setter) => (field, value) => {
        setter((prev) => ({ ...prev, [field]: value }))
    }
    const handleTargetChange = handleFieldChange(setTarget)
    const handleActualChange = handleFieldChange(setActual)

    const calculateAdjustments = useCallback(() => {
        setAdjustments(solveProportionAdjustments(parseWeights(target), parseWeights(actual)))
    }, [target, actual])

    useEffect(() => {
        calculateAdjustments()
    }, [calculateAdjustments])

    const clearForm = () => {
        setTarget(EMPTY_FORM)
        setActual(EMPTY_FORM)
        setAdjustments(null)
    }

    /** Returns the rounded material addition, treating sub-threshold differences as negligible. */
    const getAddition = (key) => {
        if (!adjustments) return null
        const value = adjustments[key]
        return value < NEGLIGIBLE_ADDITION_THRESHOLD ? 0 : Math.round(value)
    }

    const mobile = isMobile
    const containerClass = `bg-[var(--card-background)] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${mobile ? 'rounded-lg p-4' : 'rounded-xl p-8'}`
    const sectionClass = mobile ? 'mb-6' : 'mb-8'
    const sectionHeaderClass = `flex items-center gap-3 font-bold border-b-2 border-[var(--border-light)] pb-4 text-[var(--text-primary)] ${mobile ? 'text-base mb-4' : 'text-lg mb-6'}`
    const labelClass = `text-[var(--text-secondary)] font-semibold uppercase tracking-wide ${mobile ? 'text-xs' : 'text-sm'}`
    const inputClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${mobile ? 'text-sm py-2.5 pl-3 pr-12' : 'text-base py-3 pl-4 pr-14'}`
    const inputUnitClass = `absolute text-[var(--text-tertiary)] font-semibold ${mobile ? 'text-xs right-3' : 'text-sm right-4'}`
    const ratioLabelClass = `text-accent font-semibold uppercase tracking-wide ${mobile ? 'text-xs' : 'text-sm'}`
    const inputProps = { labelClass, inputClass, inputUnitClass }

    const renderTargetGroup = (fields, ratioLabel) => (
        <div className={`flex flex-col items-center gap-2 ${mobile ? 'w-full' : 'w-auto'}`}>
            <div className={`flex flex-col ${mobile ? 'min-w-full w-full' : 'min-w-[200px] w-auto'}`}>
                {fields.map(({ key, label }, index) => (
                    <React.Fragment key={key}>
                        {index > 0 && <div className="h-0.5 bg-accent" />}
                        <div className={mobile ? 'p-3' : 'p-4'}>
                            <MaterialInput
                                label={label}
                                value={target[key]}
                                onChange={(value) => handleTargetChange(key, value)}
                                {...inputProps}
                            />
                        </div>
                    </React.Fragment>
                ))}
            </div>
            <div className={ratioLabelClass}>{ratioLabel}</div>
        </div>
    )

    const aggregateFields = MATERIAL_FIELDS.slice(0, 2)
    const cementitiousFields = MATERIAL_FIELDS.slice(2)

    return (
        <div className={containerClass}>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-bullseye text-accent" />
                    <span>Target Mix Design</span>
                </div>
                <div
                    className={`flex items-center justify-center flex-wrap ${mobile ? 'flex-col gap-4' : 'flex-row gap-8'}`}
                >
                    {renderTargetGroup(aggregateFields, 'Agg Ratio')}
                    <div className={`text-accent font-bold ${mobile ? 'text-2xl' : 'text-3xl'}`}>:</div>
                    {renderTargetGroup(cementitiousFields, 'Cite Ratio')}
                </div>
            </div>

            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-weight-hanging text-accent" />
                    <span>Actual Weights</span>
                </div>
                <div
                    className={`grid gap-4 ${mobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6'}`}
                >
                    {MATERIAL_FIELDS.map(({ key, label }) => (
                        <MaterialInput
                            key={key}
                            label={label}
                            value={actual[key]}
                            onChange={(value) => handleActualChange(key, value)}
                            {...inputProps}
                        />
                    ))}
                </div>
            </div>

            {adjustments ? (
                <div
                    className={`bg-green-50 border-2 border-green-200 ${mobile ? 'rounded-lg mb-6 p-4' : 'rounded-xl mb-8 p-8'}`}
                >
                    <div
                        className={`flex items-center gap-3 text-green-600 font-bold ${mobile ? 'text-base mb-4' : 'text-lg mb-6'}`}
                    >
                        <i className="fas fa-plus-circle" />
                        <span>Add to Fix Proportions</span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                        {MATERIAL_FIELDS.map(({ key, label }) => {
                            const additionAmount = getAddition(key)
                            const requiresAddition = additionAmount > 0
                            return (
                                <div
                                    key={key}
                                    className={`flex flex-col gap-2 rounded-lg p-4 border-2 ${requiresAddition ? 'bg-green-100 border-green-600' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'}`}
                                >
                                    <span className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wide">
                                        {label}
                                    </span>
                                    <span
                                        className={`text-lg font-bold ${requiresAddition ? 'text-green-600' : 'text-[var(--text-tertiary)]'}`}
                                    >
                                        {requiresAddition ? `+${additionAmount} lbs` : 'None'}
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
                    className={`bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-xl text-center ${mobile ? 'mb-6' : 'mb-8'} py-12 px-8`}
                >
                    <div className="text-[var(--text-tertiary)] text-5xl mb-4">
                        <i className="fas fa-balance-scale" />
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
                    <i className="fas fa-redo" />
                    <span>Reset</span>
                </button>
            </div>
        </div>
    )
}

export default ProportionsCalculator
