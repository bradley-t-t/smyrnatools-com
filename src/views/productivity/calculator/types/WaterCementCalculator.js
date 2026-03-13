import React, { useEffect, useState } from 'react'

import { useIsMobile } from '../../../../app/hooks/useIsMobile'
import { WATER_LBS_PER_GALLON } from './calculatorConstants'

/** Color mappings for W/C ratio quality tiers. */
const STATUS_STYLES = {
    error: { badge: 'bg-red-100 text-red-500', bg: 'bg-red-50', border: 'border-red-500' },
    info: { badge: 'bg-blue-100 text-blue-500', bg: 'bg-blue-50', border: 'border-blue-500' },
    success: { badge: 'bg-green-100 text-green-600', bg: 'bg-green-50', border: 'border-green-600' },
    warning: { badge: 'bg-amber-100 text-amber-500', bg: 'bg-amber-50', border: 'border-amber-500' }
}

/**
 * Water-to-cementitious (W/C) ratio calculator. Converts water from gallons
 * to pounds (at 8.34 lbs/gal) and divides by total cementitious content
 * (primary + supplemental powder) to determine the W/C ratio. Grades the
 * result as Low / Optimal / Standard / High for quick quality assessment.
 * Optionally computes per-yard breakdowns when batch size is provided.
 */
const WaterCementCalculator = () => {
    const isMobile = useIsMobile()
    const [values, setValues] = useState({
        batchSize: '',
        cementLbs: '',
        supplementalLbs: '',
        waterGallons: ''
    })
    const [result, setResult] = useState(null)
    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
    }
    const clearForm = () => {
        setValues({ batchSize: '', cementLbs: '', supplementalLbs: '', waterGallons: '' })
        setResult(null)
    }
    useEffect(() => {
        const batchSize = parseFloat(values.batchSize) || 0
        const waterGal = parseFloat(values.waterGallons) || 0
        const cement = parseFloat(values.cementLbs) || 0
        const supplemental = parseFloat(values.supplementalLbs) || 0
        const totalCite = cement + supplemental
        if (waterGal > 0 && totalCite > 0) {
            const waterLbs = waterGal * WATER_LBS_PER_GALLON
            const ratio = waterLbs / totalCite
            const waterPerYd = batchSize > 0 ? Math.round(waterLbs / batchSize) : null
            const citePerYd = batchSize > 0 ? Math.round(totalCite / batchSize) : null
            setResult({
                batchSize: batchSize > 0 ? batchSize : null,
                citePerYd,
                ratio: ratio.toFixed(2),
                totalCite: Math.round(totalCite),
                waterLbs: Math.round(waterLbs),
                waterPerYd
            })
        } else {
            setResult(null)
        }
    }, [values])
    /**
     * Classifies the W/C ratio into quality tiers per ACI 318 guidelines:
     * < 0.35 Low (very stiff), 0.35-0.45 Optimal, 0.45-0.55 Standard, > 0.55 High (weak).
     */
    const getRatioStatus = () => {
        if (!result) return null
        const r = parseFloat(result.ratio)
        if (r < 0.35) return { color: 'warning', label: 'Low' }
        if (r <= 0.45) return { color: 'success', label: 'Optimal' }
        if (r <= 0.55) return { color: 'info', label: 'Standard' }
        return { color: 'error', label: 'High' }
    }
    const status = getRatioStatus()
    const waterGal = parseFloat(values.waterGallons) || 0
    const waterLbs = waterGal * WATER_LBS_PER_GALLON
    const totalCite = (parseFloat(values.cementLbs) || 0) + (parseFloat(values.supplementalLbs) || 0)
    const hasData = waterGal > 0 && totalCite > 0

    const containerClass = `bg-[var(--card-background)] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${isMobile ? 'rounded-lg p-4' : 'rounded-xl p-8'}`
    const sectionClass = isMobile ? 'mb-6' : 'mb-8'
    const sectionHeaderClass = `flex items-center gap-3 font-bold border-b-2 border-[var(--border-light)] pb-4 text-[var(--text-primary)] ${isMobile ? 'text-base mb-4' : 'text-lg mb-6'}`
    const labelClass = `text-[var(--text-secondary)] font-semibold uppercase tracking-wide text-center ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`
    const inputClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${isMobile ? 'text-sm py-2 pl-2.5 pr-10' : 'text-base py-2.5 pl-3 pr-12'}`
    const inputLargeClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${isMobile ? 'text-sm py-2.5 pl-3 pr-12' : 'text-base py-3 pl-4 pr-14'}`
    const inputUnitClass = 'absolute right-3 text-[var(--text-tertiary)] font-semibold text-[0.625rem] md:text-xs'
    const formulaOpClass = `text-accent font-bold ${isMobile ? 'text-base' : 'text-xl'}`

    const statusStyle = status ? STATUS_STYLES[status.color] : null
    const resultBlockClass =
        hasData && statusStyle
            ? `${statusStyle.bg} border-[3px] ${statusStyle.border}`
            : 'bg-[var(--card-background)] border-[3px] border-[var(--border-color)]'

    return (
        <div className={containerClass}>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-percentage text-accent"></i>
                    <span>W/C Ratio Formula</span>
                </div>
                <div className="flex flex-col gap-4">
                    <div
                        className={`flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] ${isMobile ? 'flex-col gap-4 p-4' : 'flex-row flex-wrap gap-8 p-8'}`}
                    >
                        <div className={`flex flex-col ${isMobile ? 'min-w-full w-full' : 'min-w-[300px] w-auto'}`}>
                            <div
                                className={`flex items-center justify-center flex-wrap gap-2 md:gap-3 ${isMobile ? 'p-3' : 'p-4'}`}
                            >
                                <div className={`flex flex-col gap-2 ${isMobile ? 'min-w-[90px]' : 'min-w-[120px]'}`}>
                                    <label className={labelClass}>Water</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={values.waterGallons}
                                            onChange={(e) => handleChange('waterGallons', e.target.value)}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>gal</span>
                                    </div>
                                </div>
                                <span className={formulaOpClass}>&times;</span>
                                <div className="rounded-md bg-blue-50 border border-blue-100 text-accent font-bold py-2 px-3 text-sm md:text-base">
                                    <span>8.34</span>
                                </div>
                            </div>
                            <div className="h-[3px] bg-accent"></div>
                            <div
                                className={`flex items-center justify-center flex-wrap gap-2 md:gap-3 ${isMobile ? 'p-3' : 'p-4'}`}
                            >
                                <div className={`flex flex-col gap-2 ${isMobile ? 'min-w-[90px]' : 'min-w-[120px]'}`}>
                                    <label className={labelClass}>Primary Powder</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={values.cementLbs}
                                            onChange={(e) => handleChange('cementLbs', e.target.value)}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>lbs</span>
                                    </div>
                                </div>
                                <span className={formulaOpClass}>+</span>
                                <div className={`flex flex-col gap-2 ${isMobile ? 'min-w-[90px]' : 'min-w-[120px]'}`}>
                                    <label className={labelClass}>Supplemental</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={values.supplementalLbs}
                                            onChange={(e) => handleChange('supplementalLbs', e.target.value)}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span className="text-accent font-bold text-3xl">=</span>
                        <div
                            className={`flex flex-col items-center gap-2 rounded-xl ${resultBlockClass} ${isMobile ? 'min-w-full p-4' : 'min-w-[200px] p-6'}`}
                        >
                            <span className="text-accent text-5xl font-bold leading-none">
                                {hasData ? result?.ratio : '\u2014'}
                            </span>
                            {hasData && status && (
                                <span
                                    className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${statusStyle.badge}`}
                                >
                                    {status.label}
                                </span>
                            )}
                        </div>
                    </div>
                    {hasData && (
                        <div className="flex items-center justify-center gap-4 text-[var(--text-secondary)] text-[0.9375rem] font-semibold p-4">
                            <span>{Math.round(waterLbs)} lbs</span>
                            <span>&divide;</span>
                            <span>{Math.round(totalCite)} lbs</span>
                        </div>
                    )}
                </div>
            </div>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-truck text-accent"></i>
                    <span>Per Yard (optional)</span>
                </div>
                <div className="flex flex-col gap-2">
                    <label className={`${labelClass} !text-left`}>Batch Size</label>
                    <div className="flex items-center relative">
                        <input
                            type="number"
                            value={values.batchSize}
                            onChange={(e) => handleChange('batchSize', e.target.value)}
                            placeholder="10"
                            step="0.5"
                            className={inputLargeClass}
                        />
                        <span className={inputUnitClass}>yd</span>
                    </div>
                </div>
                {result?.batchSize && (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mt-4">
                        <div className="flex flex-col gap-2 rounded-lg bg-green-50 border-2 border-green-200 p-4">
                            <span className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wide">
                                Water
                            </span>
                            <span className="text-green-600 text-xl font-bold">{result.waterPerYd} lbs/yd</span>
                        </div>
                        <div className="flex flex-col gap-2 rounded-lg bg-green-50 border-2 border-green-200 p-4">
                            <span className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wide">
                                Cementitious
                            </span>
                            <span className="text-green-600 text-xl font-bold">{result.citePerYd} lbs/yd</span>
                        </div>
                    </div>
                )}
            </div>
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
export default WaterCementCalculator
