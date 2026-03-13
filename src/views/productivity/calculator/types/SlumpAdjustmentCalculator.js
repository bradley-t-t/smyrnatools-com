import React, { useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '../../../../app/hooks/useIsMobile'
/**
 * Slump adjustment calculator for concrete batching. Determines how much
 * water to add or remove to achieve a target slump, using the industry-standard
 * approximation of ~3 gallons per yard per inch of slump change.
 * Optionally shows the resulting total batch water and warns about
 * potential strength reduction from added water.
 */
const SlumpAdjustmentCalculator = () => {
    const isMobile = useIsMobile()
    const [values, setValues] = useState({
        batchSize: '',
        currentSlump: '',
        currentWater: '',
        targetSlump: ''
    })
    const [result, setResult] = useState(null)
    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
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
        // Industry rule of thumb: ~3 gallons of water per yard per inch of slump change.
        const waterPerInch = 3
        const waterAdjustment = slumpDiff * waterPerInch * batch
        const newWater = water + waterAdjustment
        // Rough estimate: each % increase in batch water reduces strength by ~0.5%.
        const strengthImpact = waterAdjustment > 0 ? Math.round((waterAdjustment / (water || 1)) * 100 * 0.5) : 0
        setResult({
            direction: slumpDiff > 0 ? 'add' : slumpDiff < 0 ? 'reduce' : 'none',
            newWater,
            slumpDiff,
            strengthImpact,
            waterAdjustment
        })
    }, [values])
    useEffect(() => {
        calculate()
    }, [calculate])
    const clearForm = () => {
        setValues({ batchSize: '', currentSlump: '', currentWater: '', targetSlump: '' })
        setResult(null)
    }
    const slumpDiff = (parseFloat(values.targetSlump) || 0) - (parseFloat(values.currentSlump) || 0)
    const batchSize = parseFloat(values.batchSize) || 0
    const hasResult = parseFloat(values.currentSlump) > 0 && parseFloat(values.targetSlump) > 0 && batchSize > 0

    const containerClass = `bg-[var(--card-background)] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${isMobile ? 'rounded-lg p-4' : 'rounded-xl p-8'}`
    const sectionClass = isMobile ? 'mb-6' : 'mb-8'
    const sectionHeaderClass = `flex items-center gap-3 font-bold border-b-2 border-[var(--border-light)] pb-4 text-[var(--text-primary)] ${isMobile ? 'text-base mb-4' : 'text-lg mb-6'}`
    const labelClass = `text-[var(--text-secondary)] font-semibold uppercase tracking-wide text-center ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`
    const inputClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 text-center focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${isMobile ? 'text-sm py-2 px-2.5' : 'text-base py-2.5 px-3'}`
    const inputLargeClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${isMobile ? 'text-sm py-2.5 pl-3 pr-12' : 'text-base py-3 pl-4 pr-14'}`
    const eqOpClass = `text-accent font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`
    const eqUnitClass = `text-[var(--text-tertiary)] font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`

    const getResultDirection = () => {
        if (!hasResult) return ''
        return slumpDiff > 0 ? 'add' : slumpDiff < 0 ? 'reduce' : 'none'
    }
    const direction = getResultDirection()
    const resultBg =
        direction === 'add' ? 'bg-green-100' : direction === 'reduce' ? 'bg-red-50' : 'bg-[var(--card-background)]'
    const resultBorder =
        direction === 'add'
            ? 'border-green-600'
            : direction === 'reduce'
              ? 'border-red-500'
              : 'border-[var(--border-color)]'

    return (
        <div className={containerClass}>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-tint text-accent"></i>
                    <span>Water Adjustment Formula</span>
                </div>
                <div
                    className={`flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] ${isMobile ? 'flex-col gap-2 p-4' : 'flex-row flex-wrap gap-4 p-8'}`}
                >
                    <div
                        className={`flex items-center ${isMobile ? 'flex-wrap justify-center gap-2' : 'flex-nowrap gap-3'}`}
                    >
                        <div className={`text-accent font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>(</div>
                        <div
                            className={`flex items-center ${isMobile ? 'flex-wrap justify-center gap-2' : 'flex-nowrap gap-3'}`}
                        >
                            <div className={`flex flex-col gap-2 ${isMobile ? 'min-w-[80px]' : 'min-w-[100px]'}`}>
                                <label className={labelClass}>Target</label>
                                <div className="flex items-center relative">
                                    <input
                                        type="number"
                                        value={values.targetSlump}
                                        onChange={(e) => handleChange('targetSlump', e.target.value)}
                                        placeholder="0"
                                        step="0.5"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <span className={eqOpClass}>&minus;</span>
                            <div className={`flex flex-col gap-2 ${isMobile ? 'min-w-[80px]' : 'min-w-[100px]'}`}>
                                <label className={labelClass}>Current</label>
                                <div className="flex items-center relative">
                                    <input
                                        type="number"
                                        value={values.currentSlump}
                                        onChange={(e) => handleChange('currentSlump', e.target.value)}
                                        placeholder="0"
                                        step="0.5"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={`text-accent font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>)</div>
                        <span className={eqUnitClass}>in</span>
                    </div>
                    <span className={eqOpClass}>&times;</span>
                    <div
                        className={`flex flex-col items-center gap-1 rounded-lg bg-blue-50 border-2 border-blue-100 ${isMobile ? 'py-3 px-4' : 'py-4 px-4'}`}
                    >
                        <span className={`text-accent font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>3</span>
                        <span
                            className={`text-[var(--text-secondary)] font-semibold ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`}
                        >
                            gal/yd/in
                        </span>
                    </div>
                    <span className={eqOpClass}>&times;</span>
                    <div className={`flex items-center ${isMobile ? 'flex-wrap justify-center gap-2' : 'gap-2'}`}>
                        <div className={`flex flex-col gap-2 ${isMobile ? 'min-w-[80px]' : 'min-w-[100px]'}`}>
                            <label className={labelClass}>Batch</label>
                            <div className="flex items-center relative">
                                <input
                                    type="number"
                                    value={values.batchSize}
                                    onChange={(e) => handleChange('batchSize', e.target.value)}
                                    placeholder="10"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <span className={eqUnitClass}>yd</span>
                    </div>
                    <span className={eqOpClass}>=</span>
                    <div
                        className={`flex flex-col items-center gap-2 rounded-xl border-[3px] ${resultBg} ${resultBorder} ${isMobile ? 'min-w-full p-4' : 'min-w-[150px] p-6'}`}
                    >
                        {hasResult ? (
                            <>
                                <span
                                    className={`font-bold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'} ${slumpDiff > 0 ? 'text-green-600' : 'text-red-500'}`}
                                >
                                    {slumpDiff > 0 ? 'Add' : slumpDiff < 0 ? 'Remove' : ''}
                                </span>
                                <span className={`text-accent font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                                    {Math.abs(slumpDiff * 3 * batchSize).toFixed(1)}
                                </span>
                                <span
                                    className={`text-[var(--text-secondary)] font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}
                                >
                                    gal
                                </span>
                            </>
                        ) : (
                            <span className={`text-[var(--text-tertiary)] ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                                &mdash;
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {hasResult && parseFloat(values.currentWater) > 0 && (
                <div className={sectionClass}>
                    <div className={sectionHeaderClass}>
                        <i className="fas fa-calculator text-accent"></i>
                        <span>New Total</span>
                    </div>
                    <div
                        className={`flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] ${isMobile ? 'flex-col gap-4 p-4' : 'flex-row flex-wrap gap-6 p-8'}`}
                    >
                        <div className={`flex flex-col items-center gap-2 ${isMobile ? 'w-full' : 'w-auto'}`}>
                            <label className={labelClass}>Current Water</label>
                            <div className="flex items-center relative">
                                <input
                                    type="number"
                                    value={values.currentWater}
                                    onChange={(e) => handleChange('currentWater', e.target.value)}
                                    placeholder="0"
                                    className={inputClass}
                                />
                            </div>
                            <span className={eqUnitClass}>gal</span>
                        </div>
                        <span className={eqOpClass}>{slumpDiff >= 0 ? '+' : '\u2212'}</span>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--card-background)] border-2 border-[var(--border-color)] p-3 md:p-4">
                            <span className={`text-accent font-bold ${isMobile ? 'text-base' : 'text-xl'}`}>
                                {Math.abs(slumpDiff * 3 * batchSize).toFixed(1)}
                            </span>
                            <span className={eqUnitClass}>gal</span>
                        </div>
                        <span className={eqOpClass}>=</span>
                        <div
                            className={`flex flex-col items-center gap-1 rounded-xl bg-green-100 border-[3px] border-green-600 ${isMobile ? 'w-full p-4' : 'w-auto p-6'}`}
                        >
                            <span className={`text-green-600 font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                                {result?.newWater.toFixed(1)}
                            </span>
                            <span className={eqUnitClass}>gal</span>
                        </div>
                    </div>
                </div>
            )}
            {!hasResult && (
                <div className={sectionClass}>
                    <div className={sectionHeaderClass}>
                        <i className="fas fa-water text-accent"></i>
                        <span>Current Water (optional)</span>
                    </div>
                    <div className={`flex flex-col gap-2 ${isMobile ? 'w-full' : 'w-auto'}`}>
                        <label className={`${labelClass} !text-left`}>Current Batch Water</label>
                        <div className="flex items-center relative">
                            <input
                                type="number"
                                value={values.currentWater}
                                onChange={(e) => handleChange('currentWater', e.target.value)}
                                placeholder="0"
                                className={inputLargeClass}
                            />
                            <span
                                className={`absolute text-[var(--text-tertiary)] font-semibold ${isMobile ? 'text-xs right-3' : 'text-sm right-4'}`}
                            >
                                gal
                            </span>
                        </div>
                    </div>
                </div>
            )}
            {result && result.strengthImpact > 0 && (
                <div
                    className={`flex gap-3 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-800 text-[0.9375rem] font-semibold mb-8 ${isMobile ? 'items-start py-3 px-4' : 'items-center py-4 px-6'}`}
                >
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Adding water may reduce strength by ~{result.strengthImpact}%</span>
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
export default SlumpAdjustmentCalculator
