import React, { useState } from 'react'
import YardagePerHourCalculator from './types/YardagePerHourCalculator'
import ProportionsCalculator from './types/ProportionsCalculator'
import SlumpAdjustmentCalculator from './types/SlumpAdjustmentCalculator'
import WaterCementCalculator from './types/WaterCementCalculator'
import SetTimeCalculator from './types/SetTimeCalculator'

const CALCULATOR_TYPES = [
    { id: 'yardage-hour', name: 'Yd/Hr', icon: 'fa-tachometer-alt' },
    { id: 'proportions', name: 'Overweight Fix', icon: 'fa-balance-scale' },
    { id: 'slump', name: 'Slump Adjust', icon: 'fa-arrows-alt-v' },
    { id: 'water-cement', name: 'W/C Ratio', icon: 'fa-tint' },
    { id: 'set-time', name: 'Set Time', icon: 'fa-clock' }
]

const CalculatorView = () => {
    const [selectedCalculator, setSelectedCalculator] = useState('yardage-hour')
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const styles = {
        view: {
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            background: '#f8fafc',
            padding: isMobile ? '1rem' : '2rem'
        },
        header: {
            maxWidth: '1400px',
            margin: isMobile ? '0 auto 1rem' : '0 auto 2rem',
            background: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            backgroundPosition: '0 0, 0 0, 0 0',
            borderRadius: isMobile ? '8px' : '12px',
            padding: isMobile ? '1rem' : '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb'
        },
        titleRow: {
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        title: {
            fontSize: isMobile ? '1.25rem' : '1.75rem',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0
        },
        tabs: {
            display: 'flex',
            gap: isMobile ? '0.375rem' : '0.5rem',
            flexWrap: 'wrap'
        },
        tab: (active) => ({
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.375rem' : '0.5rem',
            padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem',
            border: active ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: isMobile ? '0.75rem' : '0.9375rem',
            fontWeight: active ? 600 : 500,
            color: active ? '#1e3a5f' : '#64748b',
            background: active ? '#f0f7ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
        }),
        tabIcon: {
            fontSize: isMobile ? '0.875rem' : '1rem'
        },
        content: {
            maxWidth: '1400px',
            margin: '0 auto'
        },
        comingSoon: {
            textAlign: 'center',
            padding: isMobile ? '2rem 1rem' : '4rem 2rem',
            background: 'white',
            borderRadius: isMobile ? '8px' : '12px',
            border: '1px solid #e5e7eb'
        },
        comingSoonIcon: {
            fontSize: isMobile ? '2.5rem' : '4rem',
            color: '#cbd5e1',
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        comingSoonTitle: {
            fontSize: isMobile ? '1.125rem' : '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '0.5rem'
        },
        comingSoonText: {
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            color: '#64748b'
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
