import React, { useEffect, useRef, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import ProportionsCalculator from './types/ProportionsCalculator'
import SetTimeCalculator from './types/SetTimeCalculator'
import SlumpAdjustmentCalculator from './types/SlumpAdjustmentCalculator'
import WaterCementCalculator from './types/WaterCementCalculator'
import YardagePerHourCalculator from './types/YardagePerHourCalculator'
/** Tab definitions for each available calculator type with display metadata. */
const CALCULATOR_TYPES = [
    { icon: 'fa-tachometer-alt', id: 'yardage-hour', name: 'Yd/Hr' },
    { icon: 'fa-balance-scale', id: 'proportions', name: 'Overweight Fix' },
    { icon: 'fa-arrows-alt-v', id: 'slump', name: 'Slump Adjust' },
    { icon: 'fa-tint', id: 'water-cement', name: 'W/C Ratio' },
    { icon: 'fa-clock', id: 'set-time', name: 'Set Time' }
]
/** Subtle grid overlay for the header background, tinted to the user's accent color. */
const GRID_PATTERN_STYLE = (accentColor) => ({
    backgroundImage: `
        linear-gradient(${accentColor}10 1px, transparent 1px),
        linear-gradient(90deg, ${accentColor}10 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px'
})
/**
 * Main calculator hub view. Renders a tab bar for switching between concrete
 * industry calculators (Yd/Hr, Overweight Fix, Slump, W/C Ratio, Set Time).
 */
const CalculatorView = () => {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [selectedCalculator, setSelectedCalculator] = useState('yardage-hour')
    const isMobile = useIsMobile()
    const [initialLoading, setInitialLoading] = useState(true)
    const hasRevealedRef = useRef(false)
    const [revealControls, setRevealControls] = useState(false)
    useEffect(() => {
        const timer = setTimeout(() => setInitialLoading(false), 150)
        return () => clearTimeout(timer)
    }, [])
    useEffect(() => {
        if (!initialLoading && !hasRevealedRef.current) {
            hasRevealedRef.current = true
            setRevealControls(true)
            const timer = setTimeout(() => setRevealControls(false), 1200)
            return () => clearTimeout(timer)
        }
    }, [initialLoading])
    const hideRealContent = initialLoading
    const renderCalculator = () => {
        switch (selectedCalculator) {
            case 'yardage-hour':
                return <YardagePerHourCalculator />
            case 'proportions':
                return <ProportionsCalculator />
            case 'slump':
                return <SlumpAdjustmentCalculator />
            case 'water-cement':
                return <WaterCementCalculator />
            case 'set-time':
                return <SetTimeCalculator />
            default:
                return (
                    <div className="bg-white border border-slate-200 rounded-xl text-center p-8 md:p-16">
                        <div className="text-slate-300 text-4xl md:text-6xl mb-4 md:mb-6">
                            <i className="fas fa-hard-hat" />
                        </div>
                        <h3 className="text-slate-900 text-lg md:text-2xl font-bold m-0">Coming Soon</h3>
                        <p className="text-slate-500 text-sm md:text-base mt-2 mb-0">
                            This calculator is under development
                        </p>
                    </div>
                )
        }
    }
    const headerSkeleton = (
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
            <div className="mb-6">
                <div className="h-8 w-44 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-4 w-64 rounded bg-slate-100 animate-pulse mt-2" />
            </div>
            <div className={`flex ${isMobile ? 'flex-wrap' : ''} gap-2`}>
                {[72, 112, 104, 80, 72].map((w, i) => (
                    <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" style={{ width: w }} />
                ))}
            </div>
        </div>
    )
    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
            <style>{`
                @keyframes calcRevealFromLeft {
                    from { opacity: 0; transform: translateX(-18px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes calcRevealFromRight {
                    from { opacity: 0; transform: translateX(18px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .calc-reveal-left {
                    animation: calcRevealFromLeft 0.5s ease-out both;
                }
                .calc-reveal-right {
                    animation: calcRevealFromRight 0.5s ease-out both;
                }
            `}</style>
            <header
                className="border-b border-slate-200 bg-white shadow-sm"
                style={GRID_PATTERN_STYLE(accentColor)}
            >
                {hideRealContent && headerSkeleton}
                <div
                    className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8"
                    style={hideRealContent ? { display: 'none' } : undefined}
                >
                    <div
                        className={`mb-6${revealControls ? ' calc-reveal-left' : ''}`}
                        style={revealControls ? { animationDelay: '0ms' } : undefined}
                    >
                        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl m-0">Calculators</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Concrete industry tools and quick-reference calculators
                        </p>
                    </div>
                    <div
                        className={`flex flex-wrap gap-2${revealControls ? ' calc-reveal-left' : ''}`}
                        style={revealControls ? { animationDelay: '120ms' } : undefined}
                    >
                        {CALCULATOR_TYPES.map((calc) => {
                            const isActive = selectedCalculator === calc.id
                            return (
                                <button
                                    key={calc.id}
                                    type="button"
                                    onClick={() => setSelectedCalculator(calc.id)}
                                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all md:px-4 ${isActive ? '' : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    style={
                                        isActive
                                            ? {
                                                  background: accentColor,
                                                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                                  color: '#fff'
                                              }
                                            : {}
                                    }
                                >
                                    <i className={`fas ${calc.icon} text-xs`} />
                                    <span>{calc.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
                {renderCalculator()}
            </main>
        </div>
    )
}
export default CalculatorView
