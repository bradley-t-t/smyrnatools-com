import React, { useState } from 'react'

import ProportionsCalculator from './types/ProportionsCalculator'
import SetTimeCalculator from './types/SetTimeCalculator'
import SlumpAdjustmentCalculator from './types/SlumpAdjustmentCalculator'
import WaterCementCalculator from './types/WaterCementCalculator'
import YardagePerHourCalculator from './types/YardagePerHourCalculator'

const CALCULATOR_TYPES = [
    { icon: 'fa-tachometer-alt', id: 'yardage-hour', name: 'Yd/Hr' },
    { icon: 'fa-balance-scale', id: 'proportions', name: 'Overweight Fix' },
    { icon: 'fa-arrows-alt-v', id: 'slump', name: 'Slump Adjust' },
    { icon: 'fa-tint', id: 'water-cement', name: 'W/C Ratio' },
    { icon: 'fa-clock', id: 'set-time', name: 'Set Time' }
]

const CalculatorView = () => {
    const [selectedCalculator, setSelectedCalculator] = useState('yardage-hour')
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const styles = {
        comingSoon: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            padding: isMobile ? '2rem 1rem' : '4rem 2rem',
            textAlign: 'center'
        },
        comingSoonIcon: {
            color: '#cbd5e1',
            fontSize: isMobile ? '2.5rem' : '4rem',
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        comingSoonText: {
            color: '#64748b',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem'
        },
        comingSoonTitle: {
            color: '#1e293b',
            fontSize: isMobile ? '1.125rem' : '1.5rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
        },
        content: {
            margin: '0 auto',
            maxWidth: '1400px'
        },
        header: {
            background: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundPosition: '0 0, 0 0, 0 0',
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            margin: isMobile ? '0 auto 1rem' : '0 auto 2rem',
            maxWidth: '1400px',
            padding: isMobile ? '1rem' : '2rem'
        },
        tab: (active) => ({
            alignItems: 'center',
            background: active ? '#f0f7ff' : 'white',
            border: active ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '8px',
            color: active ? '#1e3a5f' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: isMobile ? '0.75rem' : '0.9375rem',
            fontWeight: active ? 600 : 500,
            gap: isMobile ? '0.375rem' : '0.5rem',
            outline: 'none',
            padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem',
            transition: 'all 0.2s'
        }),
        tabIcon: {
            fontSize: isMobile ? '0.875rem' : '1rem'
        },
        tabs: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: isMobile ? '0.375rem' : '0.5rem'
        },
        title: {
            color: '#1e293b',
            fontSize: isMobile ? '1.25rem' : '1.75rem',
            fontWeight: 700,
            margin: 0
        },
        titleRow: {
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        view: {
            background: '#f8fafc',
            height: '100%',
            overflowY: 'auto',
            padding: isMobile ? '1rem' : '2rem',
            width: '100%'
        }
    }

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
                    <div style={styles.comingSoon}>
                        <div style={styles.comingSoonIcon}>
                            <i className="fas fa-hard-hat"></i>
                        </div>
                        <h3 style={{ ...styles.comingSoonTitle, margin: 0 }}>Coming Soon</h3>
                        <p style={{ ...styles.comingSoonText, margin: '0.5rem 0 0' }}>
                            This calculator is under development
                        </p>
                    </div>
                )
        }
    }

    return (
        <div style={styles.view}>
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <h1 style={styles.title}>Calculators</h1>
                </div>
                <div style={styles.tabs}>
                    {CALCULATOR_TYPES.map((calc) => (
                        <button
                            key={calc.id}
                            style={styles.tab(selectedCalculator === calc.id)}
                            onClick={() => setSelectedCalculator(calc.id)}
                            onMouseEnter={(e) => {
                                if (selectedCalculator !== calc.id) {
                                    e.currentTarget.style.borderColor = '#cbd5e1'
                                    e.currentTarget.style.background = '#f8fafc'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedCalculator !== calc.id) {
                                    e.currentTarget.style.borderColor = '#e5e7eb'
                                    e.currentTarget.style.background = 'white'
                                }
                            }}
                        >
                            <i className={`fas ${calc.icon}`} style={styles.tabIcon}></i>
                            <span>{calc.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.content}>{renderCalculator()}</div>
        </div>
    )
}

export default CalculatorView
