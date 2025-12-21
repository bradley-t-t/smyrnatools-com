import React, {useState} from 'react'
import './styles/CalculatorView.css'
import YardagePerHourCalculator from './types/YardagePerHourCalculator'
import ProportionsCalculator from './types/ProportionsCalculator'
import SlumpAdjustmentCalculator from './types/SlumpAdjustmentCalculator'
import WaterCementCalculator from './types/WaterCementCalculator'
import SetTimeCalculator from './types/SetTimeCalculator'

const CALCULATOR_TYPES = [
    {id: 'yardage-hour', name: 'Yd/Hr', icon: 'fa-tachometer-alt'},
    {id: 'proportions', name: 'Overweight Fix', icon: 'fa-balance-scale'},
    {id: 'slump', name: 'Slump Adjust', icon: 'fa-arrows-alt-v'},
    {id: 'water-cement', name: 'W/C Ratio', icon: 'fa-tint'},
    {id: 'set-time', name: 'Set Time', icon: 'fa-clock'}
]

const CalculatorView = () => {
    const [selectedCalculator, setSelectedCalculator] = useState('yardage-hour')

    const renderCalculator = () => {
        switch (selectedCalculator) {
            case 'yardage-hour':
                return <YardagePerHourCalculator/>
            case 'proportions':
                return <ProportionsCalculator/>
            case 'slump':
                return <SlumpAdjustmentCalculator/>
            case 'water-cement':
                return <WaterCementCalculator/>
            case 'set-time':
                return <SetTimeCalculator/>
            default:
                return (
                    <div className="coming-soon-panel">
                        <i className="fas fa-hard-hat"></i>
                        <h3>Coming Soon</h3>
                        <p>This calculator is under development</p>
                    </div>
                )
        }
    }

    return (
        <div className="calculators-view">
            <div className="calculators-header">
                <div className="calculators-header-inner">
                    <div className="calculators-title-row">
                        <h1 className="calculators-title">Calculators</h1>
                    </div>
                    <div className="calculators-tabs">
                        {CALCULATOR_TYPES.map(calc => (
                            <button
                                key={calc.id}
                                className={`calc-tab ${selectedCalculator === calc.id ? 'active' : ''}`}
                                onClick={() => setSelectedCalculator(calc.id)}
                            >
                                <i className={`fas ${calc.icon}`}></i>
                                <span>{calc.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="calculators-content">
                {renderCalculator()}
            </div>
        </div>
    )
}

export default CalculatorView