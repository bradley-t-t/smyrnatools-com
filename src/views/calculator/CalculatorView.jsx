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
                    <div
                        className="rounded-xl text-center p-8 md:p-16"
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                    >
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6" style={{ color: 'var(--text-secondary)' }}>
                            <i className="fas fa-hard-hat" />
                        </div>
                        <h3 className="text-lg md:text-2xl font-bold m-0" style={{ color: 'var(--text-primary)' }}>
                            Coming Soon
                        </h3>
                        <p className="text-sm md:text-base mt-2 mb-0" style={{ color: 'var(--text-secondary)' }}>
                            This calculator is under development
                        </p>
                    </div>
                )
        }
    }
    const headerSkeleton = (
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
            <div className="mb-6">
                <div className="h-8 w-44 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div
                    className="h-4 w-64 rounded animate-pulse mt-2"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                />
            </div>
            <div className={`flex ${isMobile ? 'flex-wrap' : ''} gap-2`}>
                {[72, 112, 104, 80, 72].map((w, i) => (
                    <div
                        key={i}
                        className="h-9 rounded-lg animate-pulse"
                        style={{ backgroundColor: 'var(--bg-secondary)', width: w }}
                    />
                ))}
            </div>
        </div>
    )
    return (
        <div
            className="min-h-full"
            style={{ background: 'linear-gradient(to bottom right, var(--bg-secondary), var(--bg-tertiary))' }}
        >
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
                className="border-b shadow-sm"
                style={{
                    ...GRID_PATTERN_STYLE(accentColor),
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-light)'
                }}
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
                        <h1 className="text-2xl font-bold md:text-3xl m-0" style={{ color: 'var(--text-primary)' }}>
                            Calculators
                        </h1>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                                    className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all md:px-4"
                                    style={
                                        isActive
                                            ? {
                                                  background: accentColor,
                                                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                                  color: '#fff'
                                              }
                                            : {
                                                  backgroundColor: 'var(--bg-primary)',
                                                  color: 'var(--text-secondary)'
                                              }
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
            <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{renderCalculator()}</main>
        </div>
    )
}
export default CalculatorView
