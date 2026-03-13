import React, { useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '../../../../app/hooks/useIsMobile'
import { WATER_LBS_PER_GALLON } from './calculatorConstants'

/** Maps factor badge types to Tailwind background/border/text classes. */
const FACTOR_BADGE_STYLES = {
    cloudy: 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)]',
    cold: 'bg-blue-50 border-blue-100 text-blue-500',
    'high-cement': 'bg-green-50 border-green-200 text-green-600',
    'high-wc': 'bg-red-50 border-red-100 text-red-500',
    hot: 'bg-red-50 border-red-100 text-red-500',
    'low-cement': 'bg-red-50 border-red-100 text-red-500',
    'low-wc': 'bg-blue-50 border-blue-100 text-blue-500',
    night: 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)]',
    peak: 'bg-amber-50 border-amber-100 text-amber-500',
    sunny: 'bg-amber-50 border-amber-100 text-amber-500'
}
const FACTOR_BADGE_DEFAULT = 'bg-[var(--card-background)] border-[var(--border-color)] text-[var(--text-primary)]'

/** Maps risk levels to result container Tailwind classes. */
const RISK_CONTAINER = {
    cold: 'bg-blue-50 border-2 border-blue-100',
    cool: 'bg-blue-50 border-2 border-blue-100',
    hot: 'bg-red-50 border-2 border-red-100',
    normal: 'bg-green-50 border-2 border-green-200',
    warm: 'bg-amber-50 border-2 border-amber-100'
}

/** Maps risk levels to warning box Tailwind classes. */
const RISK_WARNING = {
    cold: 'bg-blue-50 border-2 border-blue-500 text-blue-800',
    cool: 'bg-blue-50 border-2 border-blue-500 text-blue-800',
    hot: 'bg-red-50 border-2 border-red-500 text-red-900',
    warm: 'bg-amber-50 border-2 border-amber-500 text-amber-800'
}

/**
 * Concrete set time estimator. Uses real-time geolocation weather data
 * (or manual entry) combined with mix design parameters to predict
 * initial and final set times. Accounts for temperature, W/C ratio,
 * slump, cementitious content, supplemental ratio, time of day / sun
 * exposure, humidity, and wind speed as adjustment factors.
 */
const SetTimeCalculator = () => {
    const isMobile = useIsMobile()
    const [weather, setWeather] = useState(null)
    const [loading, setLoading] = useState(false)
    const [locationError, setLocationError] = useState(null)
    const [useManual, setUseManual] = useState(false)
    const [manualWeather, setManualWeather] = useState({
        cloudCover: '',
        humidity: '',
        temperature: ''
    })
    const [mixData, setMixData] = useState({
        addedWater: '',
        batchSize: '',
        cement: '',
        coarseAgg: '',
        fineAgg: '',
        slump: '',
        supplemental: '',
        water: ''
    })
    const [result, setResult] = useState(null)
    const fetchWeather = useCallback(async (lat, lon) => {
        setLoading(true)
        setLocationError(null)
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover,relative_humidity_2m,wind_speed_10m&temperature_unit=fahrenheit`
            )
            const data = await response.json()
            if (data.current) {
                setWeather({
                    cloudCover: data.current.cloud_cover,
                    humidity: data.current.relative_humidity_2m,
                    temperature: data.current.temperature_2m,
                    windSpeed: data.current.wind_speed_10m
                })
            }
        } catch (err) {
            setLocationError('Failed to fetch weather data')
        }
        setLoading(false)
    }, [])
    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported')
            return
        }
        setLoading(true)
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather(position.coords.latitude, position.coords.longitude)
            },
            () => {
                setLocationError('Location access denied')
                setLoading(false)
            }
        )
    }, [fetchWeather])
    useEffect(() => {
        if (!useManual) {
            getLocation()
        }
    }, [useManual, getLocation])
    const handleManualWeatherChange = (field, value) => {
        setManualWeather((prev) => ({ ...prev, [field]: value }))
    }
    const calculateSetTime = useCallback(() => {
        const temp = useManual ? parseFloat(manualWeather.temperature) : weather?.temperature
        const batchSize = parseFloat(mixData.batchSize)
        const slump = parseFloat(mixData.slump)
        const cement = parseFloat(mixData.cement)
        const designWaterGalPerYd = parseFloat(mixData.water)
        const addedWaterGal = parseFloat(mixData.addedWater) || 0
        if (
            !temp ||
            isNaN(batchSize) ||
            batchSize <= 0 ||
            isNaN(slump) ||
            isNaN(cement) ||
            cement <= 0 ||
            isNaN(designWaterGalPerYd) ||
            designWaterGalPerYd <= 0
        ) {
            setResult(null)
            return
        }
        const supplemental = parseFloat(mixData.supplemental) || 0
        const totalCementPerYd = cement + supplemental
        const designWaterLbsPerYd = designWaterGalPerYd * WATER_LBS_PER_GALLON
        const addedWaterLbs = addedWaterGal * WATER_LBS_PER_GALLON
        const addedWaterLbsPerYd = addedWaterLbs / batchSize
        const totalWaterLbsPerYd = designWaterLbsPerYd + addedWaterLbsPerYd
        const wc = totalCementPerYd > 0 ? totalWaterLbsPerYd / totalCementPerYd : 0
        const cloudCover = useManual ? parseFloat(manualWeather.cloudCover) || 50 : weather?.cloudCover || 50
        const humidity = useManual ? parseFloat(manualWeather.humidity) || 50 : weather?.humidity || 50
        const windSpeed = weather?.windSpeed || 5
        // Base set times in minutes under standard conditions (70F, 0.45 W/C, 4" slump).
        let baseInitialSet = 120
        let baseFinalSet = 480
        if (temp < 50) {
            const coldFactor = 1 + (50 - temp) * 0.03
            baseInitialSet *= coldFactor
            baseFinalSet *= coldFactor
        } else if (temp > 77) {
            const hotFactor = 1 - (temp - 77) * 0.015
            baseInitialSet *= Math.max(hotFactor, 0.5)
            baseFinalSet *= Math.max(hotFactor, 0.5)
        }
        if (wc > 0.5) {
            const wcFactor = 1 + (wc - 0.5) * 0.5
            baseInitialSet *= wcFactor
            baseFinalSet *= wcFactor
        } else if (wc < 0.4) {
            const wcFactor = 1 - (0.4 - wc) * 0.3
            baseInitialSet *= wcFactor
            baseFinalSet *= wcFactor
        }
        if (slump > 6) {
            const slumpFactor = 1 + (slump - 6) * 0.04
            baseInitialSet *= slumpFactor
            baseFinalSet *= slumpFactor
        } else if (slump < 3) {
            const slumpFactor = 1 - (3 - slump) * 0.03
            baseInitialSet *= Math.max(slumpFactor, 0.85)
            baseFinalSet *= Math.max(slumpFactor, 0.9)
        }
        if (totalCementPerYd > 600) {
            const cementFactor = 1 - (totalCementPerYd - 600) * 0.0003
            baseInitialSet *= Math.max(cementFactor, 0.7)
            baseFinalSet *= Math.max(cementFactor, 0.75)
        } else if (totalCementPerYd < 400 && totalCementPerYd > 0) {
            const cementFactor = 1 + (400 - totalCementPerYd) * 0.0005
            baseInitialSet *= Math.min(cementFactor, 1.3)
            baseFinalSet *= Math.min(cementFactor, 1.25)
        }
        // SCMs (fly ash, slag) react more slowly than Portland cement.
        if (cement > 0 && supplemental > 0) {
            const supplementalRatio = supplemental / totalCementPerYd
            if (supplementalRatio > 0.2) {
                baseInitialSet *= 1 + supplementalRatio * 0.3
                baseFinalSet *= 1 + supplementalRatio * 0.2
            }
        }
        const currentHour = new Date().getHours()
        const isPeakSun = currentHour >= 10 && currentHour < 16
        const isMorning = currentHour >= 6 && currentHour < 10
        const isEvening = currentHour >= 16 && currentHour < 20
        const isNight = currentHour >= 20 || currentHour < 6
        if (isPeakSun && cloudCover < 25 && temp > 70) {
            baseInitialSet *= 0.85
            baseFinalSet *= 0.8
        } else if (isPeakSun && cloudCover < 50 && temp > 65) {
            baseInitialSet *= 0.9
            baseFinalSet *= 0.85
        } else if ((isMorning || isEvening) && cloudCover < 30 && temp > 70) {
            baseInitialSet *= 0.95
            baseFinalSet *= 0.92
        } else if (isNight) {
            baseInitialSet *= 1.1
            baseFinalSet *= 1.08
        }
        if (humidity < 40) baseInitialSet *= 0.95
        else if (humidity > 80) baseInitialSet *= 1.05
        if (windSpeed > 15) baseInitialSet *= 0.9
        const initialSetHours = Math.floor(baseInitialSet / 60)
        const initialSetMins = Math.round(baseInitialSet % 60)
        const finalSetHours = Math.floor(baseFinalSet / 60)
        const finalSetMins = Math.round(baseFinalSet % 60)
        let riskLevel = 'normal'
        let riskMessage = ''
        if (temp < 40) {
            riskLevel = 'cold'
            riskMessage = 'Cold weather may significantly delay set. Consider heated enclosures or accelerators.'
        } else if (temp < 50) {
            riskLevel = 'cool'
            riskMessage = 'Cool conditions will extend set time. Monitor closely.'
        } else if (temp > 90) {
            riskLevel = 'hot'
            riskMessage = 'Hot weather may cause rapid set. Consider retarders or ice water.'
        } else if (temp > 80 && cloudCover < 30) {
            riskLevel = 'warm'
            riskMessage = 'Direct sun exposure will accelerate set. Plan accordingly.'
        } else if (isNight && temp < 60) {
            riskLevel = 'cool'
            riskMessage = 'Nighttime placement with cooler temps will extend set time.'
        }
        let timeOfDay = 'night'
        if (isPeakSun) timeOfDay = 'peak-sun'
        else if (isMorning) timeOfDay = 'morning'
        else if (isEvening) timeOfDay = 'evening'
        setResult({
            conditions: { cloudCover, humidity, temp, windSpeed },
            finalSet: { hours: finalSetHours, mins: finalSetMins, total: baseFinalSet },
            initialSet: { hours: initialSetHours, mins: initialSetMins, total: baseInitialSet },
            mix: {
                addedWaterGal,
                batchSize,
                cementPerYd: Math.round(totalCementPerYd),
                slump,
                waterLbsPerYd: Math.round(totalWaterLbsPerYd),
                wc: Math.round(wc * 100) / 100
            },
            riskLevel,
            riskMessage,
            timeOfDay
        })
    }, [weather, mixData, manualWeather, useManual])
    useEffect(() => {
        calculateSetTime()
    }, [calculateSetTime])
    const handleMixChange = (field, value) => {
        setMixData((prev) => ({ ...prev, [field]: value }))
    }
    const clearForm = () => {
        setMixData({
            addedWater: '',
            batchSize: '',
            cement: '',
            coarseAgg: '',
            fineAgg: '',
            slump: '',
            supplemental: '',
            water: ''
        })
        setManualWeather({ cloudCover: '', humidity: '', temperature: '' })
        setResult(null)
    }

    const containerClass = `bg-[var(--card-background)] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${isMobile ? 'rounded-lg p-4' : 'rounded-xl p-8'}`
    const sectionClass = isMobile ? 'mb-6' : 'mb-8'
    const sectionHeaderClass = `flex border-b-2 border-[var(--border-light)] pb-4 text-[var(--text-primary)] font-bold gap-3 ${isMobile ? 'flex-col items-start text-base mb-4' : 'flex-row items-center text-lg mb-6'}`
    const labelClass = `text-[var(--text-secondary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'}`
    const inputClass = `w-full border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-semibold outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${isMobile ? 'text-sm py-2.5 pl-3 pr-16' : 'text-base py-3 pl-4 pr-16'}`
    const inputUnitClass = `absolute text-[var(--text-tertiary)] font-semibold ${isMobile ? 'text-xs right-3' : 'text-sm right-4'}`

    const getFactorBadgeClass = (type) => {
        const base = `flex items-center gap-2 font-semibold rounded-lg border ${isMobile ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4'}`
        return `${base} ${FACTOR_BADGE_STYLES[type] || FACTOR_BADGE_DEFAULT}`
    }

    const getTimeOfDayIcon = () => {
        const hour = new Date().getHours()
        if (hour >= 10 && hour < 16) return 'fa-sun'
        if ((hour >= 6 && hour < 10) || (hour >= 16 && hour < 20)) return 'fa-cloud-sun'
        return 'fa-moon'
    }

    const getTimeOfDayLabel = () => {
        const hour = new Date().getHours()
        if (hour >= 10 && hour < 16) return 'Peak Sun Hours (10am-4pm)'
        if (hour >= 6 && hour < 10) return 'Morning (6am-10am)'
        if (hour >= 16 && hour < 20) return 'Evening (4pm-8pm)'
        return 'Night (8pm-6am)'
    }

    const getTimeOfDayShortLabel = () => {
        const hour = new Date().getHours()
        if (hour >= 10 && hour < 16) return 'Peak Sun'
        if (hour >= 6 && hour < 10) return 'Morning'
        if (hour >= 16 && hour < 20) return 'Evening'
        return 'Night'
    }

    return (
        <div className={containerClass}>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <div className="flex items-center gap-3">
                        <i className="fas fa-cloud-sun text-accent"></i>
                        <span>Weather Conditions</span>
                    </div>
                    <button
                        className={`font-semibold rounded-lg cursor-pointer outline-none transition-all duration-200 ${isMobile ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4 ml-auto'} ${useManual ? 'bg-blue-50 border-2 border-[var(--accent)] text-accent' : 'bg-[var(--card-background)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                        onClick={() => setUseManual(!useManual)}
                    >
                        {useManual ? 'Use Location' : 'Manual Entry'}
                    </button>
                </div>
                <div>
                    {useManual ? (
                        <div
                            className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'}`}
                        >
                            {[
                                { field: 'temperature', label: 'Temperature', placeholder: '72', unit: '\u00B0F' },
                                {
                                    field: 'cloudCover',
                                    label: 'Cloud Cover',
                                    max: '100',
                                    min: '0',
                                    placeholder: '50',
                                    unit: '%'
                                },
                                {
                                    field: 'humidity',
                                    label: 'Humidity',
                                    max: '100',
                                    min: '0',
                                    placeholder: '50',
                                    unit: '%'
                                }
                            ].map((item) => (
                                <div key={item.field} className="flex flex-col gap-2">
                                    <label className={labelClass}>{item.label}</label>
                                    <div className="flex items-center relative">
                                        <input
                                            type="number"
                                            value={manualWeather[item.field]}
                                            onChange={(e) => handleManualWeatherChange(item.field, e.target.value)}
                                            placeholder={item.placeholder}
                                            min={item.min}
                                            max={item.max}
                                            className={inputClass}
                                        />
                                        <span className={inputUnitClass}>{item.unit}</span>
                                    </div>
                                </div>
                            ))}
                            <div
                                className={`col-span-full flex items-center justify-center gap-3 rounded-lg bg-blue-50 text-accent font-semibold text-center ${isMobile ? 'text-[0.8125rem] p-3' : 'text-[0.9375rem] p-4'}`}
                            >
                                <i className={`fas ${getTimeOfDayIcon()}`}></i>
                                <span>{getTimeOfDayLabel()}</span>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] ${isMobile ? 'min-h-[100px] p-6 px-4' : 'min-h-[120px] p-8'}`}
                        >
                            {loading && (
                                <div
                                    className={`flex flex-col items-center gap-4 text-[var(--text-secondary)] ${isMobile ? 'text-[0.8125rem]' : 'text-[0.9375rem]'}`}
                                >
                                    <i className="fas fa-spinner fa-spin text-3xl"></i>
                                    <span>Getting weather...</span>
                                </div>
                            )}
                            {locationError && (
                                <div
                                    className={`flex flex-col items-center gap-4 text-red-500 text-center ${isMobile ? 'text-[0.8125rem]' : 'text-[0.9375rem]'}`}
                                >
                                    <i className="fas fa-exclamation-circle text-3xl"></i>
                                    <span>{locationError}</span>
                                    <button
                                        onClick={getLocation}
                                        className={`bg-[var(--card-background)] border border-red-500 rounded-lg text-red-500 cursor-pointer font-semibold outline-none transition-all duration-200 hover:bg-red-50 ${isMobile ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4'}`}
                                    >
                                        <i className="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            )}
                            {weather && !loading && (
                                <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                                    <div
                                        className={`flex flex-col items-center gap-2 text-accent font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}
                                    >
                                        <i className="fas fa-thermometer-half"></i>
                                        <span>
                                            {Math.round(weather.temperature)}
                                            {'\u00B0'}F
                                        </span>
                                    </div>
                                    {[
                                        { icon: getTimeOfDayIcon(), label: getTimeOfDayShortLabel() },
                                        { icon: 'fa-cloud', label: `${weather.cloudCover}%` },
                                        { icon: 'fa-tint', label: `${weather.humidity}%` },
                                        { icon: 'fa-wind', label: `${Math.round(weather.windSpeed)} mph` }
                                    ].map((stat, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex flex-col items-center gap-2 text-[var(--text-secondary)] font-semibold ${isMobile ? 'text-[0.8125rem]' : 'text-[0.9375rem]'}`}
                                        >
                                            <i className={`fas ${stat.icon}`}></i>
                                            <span>{stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-flask text-accent"></i>
                    <span>Mix Design (per yard)</span>
                </div>
                <div
                    className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'}`}
                >
                    {[
                        { field: 'cement', label: 'Primary Powder', placeholder: '0', unit: 'lbs/yd' },
                        { field: 'supplemental', label: 'Supplemental', placeholder: '0', unit: 'lbs/yd' },
                        { field: 'water', label: 'Design Water', placeholder: '0', unit: 'gal/yd' },
                        { field: 'slump', label: 'Slump', placeholder: '4', step: '0.5', unit: 'in' }
                    ].map((input) => (
                        <div key={input.field} className="flex flex-col gap-2">
                            <label className={labelClass}>{input.label}</label>
                            <div className="flex items-center relative">
                                <input
                                    type="number"
                                    value={mixData[input.field]}
                                    onChange={(e) => handleMixChange(input.field, e.target.value)}
                                    placeholder={input.placeholder}
                                    step={input.step}
                                    className={inputClass}
                                />
                                <span className={inputUnitClass}>{input.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <i className="fas fa-truck text-accent"></i>
                    <span>Batch Info</span>
                </div>
                <div
                    className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'}`}
                >
                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Batch Size</label>
                        <div className="flex items-center relative">
                            <input
                                type="number"
                                value={mixData.batchSize}
                                onChange={(e) => handleMixChange('batchSize', e.target.value)}
                                placeholder="10"
                                step="0.5"
                                className={inputClass}
                            />
                            <span className={inputUnitClass}>yd</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Added Water</label>
                        <div className="flex items-center relative">
                            <input
                                type="number"
                                value={mixData.addedWater}
                                onChange={(e) => handleMixChange('addedWater', e.target.value)}
                                placeholder="0"
                                className={inputClass}
                            />
                            <span className={inputUnitClass}>gal</span>
                        </div>
                    </div>
                </div>
                {(() => {
                    const designWaterGal = parseFloat(mixData.water) || 0
                    const addedGal = parseFloat(mixData.addedWater) || 0
                    const batchSz = parseFloat(mixData.batchSize) || 0
                    const ite = parseFloat(mixData.cement) || 0
                    const supp = parseFloat(mixData.supplemental) || 0
                    const totalCite = ite + supp
                    if (designWaterGal > 0 && totalCite > 0 && batchSz > 0) {
                        const designWaterLbsPerYd = designWaterGal * 8.34
                        const addedLbsPerYd = (addedGal * 8.34) / batchSz
                        const totalWaterLbsPerYd = designWaterLbsPerYd + addedLbsPerYd
                        const wc = totalWaterLbsPerYd / totalCite
                        return (
                            <div
                                className={`flex items-center flex-wrap gap-3 justify-center rounded-lg bg-green-50 mt-4 ${isMobile ? 'p-3' : 'p-4'}`}
                            >
                                <span
                                    className={`text-[var(--text-secondary)] font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}
                                >
                                    W/C Ratio:
                                </span>
                                <span className={`text-green-600 font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                                    {wc.toFixed(2)}
                                </span>
                                <span className={`text-[var(--text-secondary)] ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                    ({Math.round(totalWaterLbsPerYd)} lbs/yd {'\u00F7'} {Math.round(totalCite)} lbs/yd)
                                </span>
                            </div>
                        )
                    }
                    return null
                })()}
            </div>
            {result ? (
                <div
                    className={`${RISK_CONTAINER[result.riskLevel] || RISK_CONTAINER.normal} ${isMobile ? 'rounded-lg mb-6 p-4' : 'rounded-xl mb-8 p-8'}`}
                >
                    <div
                        className={`flex items-center gap-3 text-[var(--text-primary)] font-bold ${isMobile ? 'text-base mb-4' : 'text-lg mb-6'}`}
                    >
                        <i className="fas fa-clock"></i>
                        <span>Estimated Set Time</span>
                    </div>
                    <div className={`flex flex-wrap justify-center ${isMobile ? 'gap-2 mb-4' : 'gap-3 mb-6'}`}>
                        <div
                            className={getFactorBadgeClass(
                                result.conditions.temp > 80 ? 'hot' : result.conditions.temp < 50 ? 'cold' : ''
                            )}
                        >
                            <i className="fas fa-thermometer-half"></i>
                            <span>
                                {Math.round(result.conditions.temp)}
                                {'\u00B0'}F
                            </span>
                        </div>
                        <div
                            className={getFactorBadgeClass(
                                result.conditions.cloudCover < 30
                                    ? 'sunny'
                                    : result.conditions.cloudCover > 70
                                      ? 'cloudy'
                                      : ''
                            )}
                        >
                            <i
                                className={`fas ${result.conditions.cloudCover < 30 ? 'fa-sun' : result.conditions.cloudCover > 70 ? 'fa-cloud' : 'fa-cloud-sun'}`}
                            ></i>
                            <span>{result.conditions.cloudCover}% clouds</span>
                        </div>
                        <div
                            className={getFactorBadgeClass(
                                result.timeOfDay === 'peak-sun' ? 'peak' : result.timeOfDay === 'night' ? 'night' : ''
                            )}
                        >
                            <i
                                className={`fas ${result.timeOfDay === 'peak-sun' ? 'fa-sun' : result.timeOfDay === 'night' ? 'fa-moon' : 'fa-cloud-sun'}`}
                            ></i>
                            <span>
                                {result.timeOfDay === 'peak-sun'
                                    ? 'Peak Sun'
                                    : result.timeOfDay === 'morning'
                                      ? 'Morning'
                                      : result.timeOfDay === 'evening'
                                        ? 'Evening'
                                        : 'Night'}
                            </span>
                        </div>
                        {result.mix && (
                            <>
                                <div
                                    className={getFactorBadgeClass(
                                        result.mix.cementPerYd > 600
                                            ? 'high-cement'
                                            : result.mix.cementPerYd < 400
                                              ? 'low-cement'
                                              : ''
                                    )}
                                >
                                    <i className="fas fa-box"></i>
                                    <span>{result.mix.cementPerYd} lbs/yd</span>
                                </div>
                                <div
                                    className={getFactorBadgeClass(
                                        result.mix.wc > 0.5 ? 'high-wc' : result.mix.wc < 0.4 ? 'low-wc' : ''
                                    )}
                                >
                                    <i className="fas fa-tint"></i>
                                    <span>W/C {result.mix.wc}</span>
                                </div>
                            </>
                        )}
                    </div>
                    <div
                        className={`flex items-center flex-wrap justify-center ${isMobile ? 'flex-col gap-4 mb-4' : 'flex-row gap-8 mb-6'}`}
                    >
                        <div
                            className={`flex flex-col items-center gap-2 rounded-xl bg-[var(--card-background)] border-[3px] border-[var(--border-color)] ${isMobile ? 'min-w-full p-4' : 'min-w-[180px] p-6'}`}
                        >
                            <span
                                className={`text-[var(--text-secondary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'}`}
                            >
                                Initial Set
                            </span>
                            <span className={`text-accent font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                                {result.initialSet.hours > 0 && `${result.initialSet.hours}h `}
                                {result.initialSet.mins}m
                            </span>
                            <span className={`text-[var(--text-tertiary)] ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`}>
                                ~{Math.round(result.initialSet.total)} mins
                            </span>
                        </div>
                        <div className={`text-[var(--text-tertiary)] ${isMobile ? 'hidden' : 'block text-2xl'}`}>
                            <i className="fas fa-arrow-right"></i>
                        </div>
                        <div
                            className={`flex flex-col items-center gap-2 rounded-xl bg-green-100 border-[3px] border-green-600 ${isMobile ? 'min-w-full p-4' : 'min-w-[180px] p-6'}`}
                        >
                            <span
                                className={`text-[var(--text-secondary)] font-semibold uppercase tracking-wide ${isMobile ? 'text-xs' : 'text-sm'}`}
                            >
                                Final Set
                            </span>
                            <span className={`text-accent font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                                {result.finalSet.hours}h {result.finalSet.mins}m
                            </span>
                            <span className={`text-[var(--text-tertiary)] ${isMobile ? 'text-[0.625rem]' : 'text-xs'}`}>
                                ~{Math.round(result.finalSet.total)} mins
                            </span>
                        </div>
                    </div>
                    {result.riskMessage && (
                        <div
                            className={`flex gap-3 rounded-xl font-semibold ${isMobile ? 'items-start text-[0.8125rem] py-3 px-4' : 'items-center text-[0.9375rem] py-4 px-6'} ${RISK_WARNING[result.riskLevel] || 'bg-[var(--card-background)] border-2 border-[var(--border-color)] text-[var(--text-primary)]'}`}
                        >
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>{result.riskMessage}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    className={`bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-xl text-center ${isMobile ? 'mb-6 py-8 px-4' : 'mb-8 py-12 px-8'}`}
                >
                    <div className={`text-[var(--text-tertiary)] mb-4 ${isMobile ? 'text-3xl' : 'text-5xl'}`}>
                        <i className="fas fa-clock"></i>
                    </div>
                    <span
                        className={`text-[var(--text-secondary)] block mb-4 ${isMobile ? 'text-[0.8125rem]' : 'text-[0.9375rem]'}`}
                    >
                        Enter weather and mix design to calculate set time
                    </span>
                    <div
                        className={`flex flex-col gap-2 text-[var(--text-tertiary)] ${isMobile ? 'text-xs' : 'text-sm'}`}
                    >
                        <span className="text-[var(--text-secondary)] font-bold">Required:</span>
                        <span>Temperature, Batch Size, Primary Powder, Design Water, Slump</span>
                    </div>
                </div>
            )}
            <div
                className={`flex flex-wrap gap-4 ${isMobile ? 'flex-col items-center justify-center' : 'flex-row items-center justify-between'}`}
            >
                <button
                    onClick={clearForm}
                    className="flex items-center gap-2 bg-[var(--card-background)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] cursor-pointer text-[0.9375rem] font-semibold outline-none py-3 px-6 transition-all duration-200 hover:bg-[var(--bg-secondary)]"
                >
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[0.8125rem] italic">
                    <i className="fas fa-info-circle"></i>
                    <span>Estimates only. Actual set times vary by mix design and conditions.</span>
                </div>
            </div>
        </div>
    )
}
export default SetTimeCalculator
