import React, { useState, useEffect, useCallback } from 'react'

const SetTimeCalculator = () => {
    const [weather, setWeather] = useState(null)
    const [loading, setLoading] = useState(false)
    const [locationError, setLocationError] = useState(null)
    const [useManual, setUseManual] = useState(false)
    const [manualWeather, setManualWeather] = useState({
        temperature: '',
        cloudCover: '',
        humidity: ''
    })

    const [mixData, setMixData] = useState({
        batchSize: '',
        slump: '',
        cement: '',
        supplemental: '',
        water: '',
        addedWater: '',
        coarseAgg: '',
        fineAgg: ''
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
                    temperature: data.current.temperature_2m,
                    cloudCover: data.current.cloud_cover,
                    humidity: data.current.relative_humidity_2m,
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
        setManualWeather(prev => ({ ...prev, [field]: value }))
    }

    const WATER_LBS_PER_GALLON = 8.34

    const calculateSetTime = useCallback(() => {
        const temp = useManual ? parseFloat(manualWeather.temperature) : weather?.temperature
        const batchSize = parseFloat(mixData.batchSize)
        const slump = parseFloat(mixData.slump)
        const cement = parseFloat(mixData.cement)
        const designWaterGalPerYd = parseFloat(mixData.water)
        const addedWaterGal = parseFloat(mixData.addedWater) || 0
        
        if (!temp || isNaN(batchSize) || batchSize <= 0 || isNaN(slump) || isNaN(cement) || cement <= 0 || isNaN(designWaterGalPerYd) || designWaterGalPerYd <= 0) {
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
        
        const cloudCover = useManual ? (parseFloat(manualWeather.cloudCover) || 50) : (weather?.cloudCover || 50)
        const humidity = useManual ? (parseFloat(manualWeather.humidity) || 50) : (weather?.humidity || 50)
        const windSpeed = weather?.windSpeed || 5

        let baseInitialSet = 120
        let baseFinalSet = 480

        if (temp < 50) {
            const coldFactor = 1 + ((50 - temp) * 0.03)
            baseInitialSet *= coldFactor
            baseFinalSet *= coldFactor
        } else if (temp > 77) {
            const hotFactor = 1 - ((temp - 77) * 0.015)
            baseInitialSet *= Math.max(hotFactor, 0.5)
            baseFinalSet *= Math.max(hotFactor, 0.5)
        }

        if (wc > 0.5) {
            const wcFactor = 1 + ((wc - 0.5) * 0.5)
            baseInitialSet *= wcFactor
            baseFinalSet *= wcFactor
        } else if (wc < 0.4) {
            const wcFactor = 1 - ((0.4 - wc) * 0.3)
            baseInitialSet *= wcFactor
            baseFinalSet *= wcFactor
        }

        if (slump > 6) {
            const slumpFactor = 1 + ((slump - 6) * 0.04)
            baseInitialSet *= slumpFactor
            baseFinalSet *= slumpFactor
        } else if (slump < 3) {
            const slumpFactor = 1 - ((3 - slump) * 0.03)
            baseInitialSet *= Math.max(slumpFactor, 0.85)
            baseFinalSet *= Math.max(slumpFactor, 0.9)
        }

        if (totalCementPerYd > 600) {
            const cementFactor = 1 - ((totalCementPerYd - 600) * 0.0003)
            baseInitialSet *= Math.max(cementFactor, 0.7)
            baseFinalSet *= Math.max(cementFactor, 0.75)
        } else if (totalCementPerYd < 400 && totalCementPerYd > 0) {
            const cementFactor = 1 + ((400 - totalCementPerYd) * 0.0005)
            baseInitialSet *= Math.min(cementFactor, 1.3)
            baseFinalSet *= Math.min(cementFactor, 1.25)
        }

        if (cement > 0 && supplemental > 0) {
            const supplementalRatio = supplemental / totalCementPerYd
            if (supplementalRatio > 0.2) {
                baseInitialSet *= 1 + (supplementalRatio * 0.3)
                baseFinalSet *= 1 + (supplementalRatio * 0.2)
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

        if (humidity < 40) {
            baseInitialSet *= 0.95
        } else if (humidity > 80) {
            baseInitialSet *= 1.05
        }

        if (windSpeed > 15) {
            baseInitialSet *= 0.9
        }

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
            initialSet: { hours: initialSetHours, mins: initialSetMins, total: baseInitialSet },
            finalSet: { hours: finalSetHours, mins: finalSetMins, total: baseFinalSet },
            riskLevel,
            riskMessage,
            timeOfDay,
            conditions: {
                temp: temp,
                humidity,
                cloudCover,
                windSpeed
            },
            mix: {
                wc: Math.round(wc * 100) / 100,
                slump,
                cementPerYd: Math.round(totalCementPerYd),
                waterLbsPerYd: Math.round(totalWaterLbsPerYd),
                addedWaterGal,
                batchSize
            }
        })
    }, [weather, mixData, manualWeather, useManual])

    useEffect(() => {
        calculateSetTime()
    }, [calculateSetTime])

    const handleMixChange = (field, value) => {
        setMixData(prev => ({ ...prev, [field]: value }))
    }

    const clearForm = () => {
        setMixData({
            batchSize: '',
            slump: '',
            cement: '',
            supplemental: '',
            water: '',
            addedWater: '',
            coarseAgg: '',
            fineAgg: ''
        })
        setManualWeather({ temperature: '', cloudCover: '', humidity: '' })
        setResult(null)
    }

    const getRiskColor = (level) => {
        switch (level) {
            case 'cold': return 'info'
            case 'cool': return 'info'
            case 'warm': return 'warning'
            case 'hot': return 'error'
            default: return 'success'
        }
    }

    return (
        <div className="settime-calculator">
            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-cloud-sun"></i>
                    <span>Weather Conditions</span>
                    <button 
                        className={`toggle-btn ${useManual ? 'active' : ''}`}
                        onClick={() => setUseManual(!useManual)}
                    >
                        {useManual ? 'Use Location' : 'Manual Entry'}
                    </button>
                </div>
                <div className="weather-content">
                    {useManual ? (
                        <div className="manual-weather-inputs">
                            <div className="manual-weather-row">
                                <label>Temperature</label>
                                <div className="input-wrap">
                                    <input
                                        type="number"
                                        value={manualWeather.temperature}
                                        onChange={(e) => handleManualWeatherChange('temperature', e.target.value)}
                                        placeholder="72"
                                    />
                                    <span className="input-unit">°F</span>
                                </div>
                            </div>
                            <div className="manual-weather-row">
                                <label>Cloud Cover</label>
                                <div className="input-wrap">
                                    <input
                                        type="number"
                                        value={manualWeather.cloudCover}
                                        onChange={(e) => handleManualWeatherChange('cloudCover', e.target.value)}
                                        placeholder="50"
                                        min="0"
                                        max="100"
                                    />
                                    <span className="input-unit">%</span>
                                </div>
                            </div>
                            <div className="manual-weather-row">
                                <label>Humidity</label>
                                <div className="input-wrap">
                                    <input
                                        type="number"
                                        value={manualWeather.humidity}
                                        onChange={(e) => handleManualWeatherChange('humidity', e.target.value)}
                                        placeholder="50"
                                        min="0"
                                        max="100"
                                    />
                                    <span className="input-unit">%</span>
                                </div>
                            </div>
                            <div className="manual-weather-info">
                                <i className={`fas ${(() => {
                                    const hour = new Date().getHours()
                                    if (hour >= 10 && hour < 16) return 'fa-sun'
                                    if (hour >= 6 && hour < 10) return 'fa-cloud-sun'
                                    if (hour >= 16 && hour < 20) return 'fa-cloud-sun'
                                    return 'fa-moon'
                                })()}`}></i>
                                <span>{(() => {
                                    const hour = new Date().getHours()
                                    if (hour >= 10 && hour < 16) return 'Peak Sun Hours (10am-4pm)'
                                    if (hour >= 6 && hour < 10) return 'Morning (6am-10am)'
                                    if (hour >= 16 && hour < 20) return 'Evening (4pm-8pm)'
                                    return 'Night (8pm-6am)'
                                })()}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="weather-display">
                            {loading && (
                                <div className="weather-loading">
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Getting weather...</span>
                                </div>
                            )}
                            {locationError && (
                                <div className="weather-error">
                                    <i className="fas fa-exclamation-circle"></i>
                                    <span>{locationError}</span>
                                    <button onClick={getLocation} className="retry-btn">
                                        <i className="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            )}
                            {weather && !loading && (
                                <div className="weather-stats">
                                    <div className="weather-stat main">
                                        <i className="fas fa-thermometer-half"></i>
                                        <span className="stat-value">{Math.round(weather.temperature)}°F</span>
                                    </div>
                                    <div className="weather-stat">
                                        <i className={`fas ${(() => {
                                            const hour = new Date().getHours()
                                            if (hour >= 10 && hour < 16) return 'fa-sun'
                                            if (hour >= 6 && hour < 10) return 'fa-cloud-sun'
                                            if (hour >= 16 && hour < 20) return 'fa-cloud-sun'
                                            return 'fa-moon'
                                        })()}`}></i>
                                        <span>{(() => {
                                            const hour = new Date().getHours()
                                            if (hour >= 10 && hour < 16) return 'Peak Sun'
                                            if (hour >= 6 && hour < 10) return 'Morning'
                                            if (hour >= 16 && hour < 20) return 'Evening'
                                            return 'Night'
                                        })()}</span>
                                    </div>
                                    <div className="weather-stat">
                                        <i className="fas fa-cloud"></i>
                                        <span>{weather.cloudCover}%</span>
                                    </div>
                                    <div className="weather-stat">
                                        <i className="fas fa-tint"></i>
                                        <span>{weather.humidity}%</span>
                                    </div>
                                    <div className="weather-stat">
                                        <i className="fas fa-wind"></i>
                                        <span>{Math.round(weather.windSpeed)} mph</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-flask"></i>
                    <span>Mix Design (per yard)</span>
                </div>
                <div className="calc-inputs-grid">
                    <div className="calc-input-row">
                        <label>Primary Powder</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={mixData.cement}
                                onChange={(e) => handleMixChange('cement', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">lbs/yd</span>
                        </div>
                    </div>
                    <div className="calc-input-row">
                        <label>Supplemental</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={mixData.supplemental}
                                onChange={(e) => handleMixChange('supplemental', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">lbs/yd</span>
                        </div>
                    </div>
                    <div className="calc-input-row">
                        <label>Design Water</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={mixData.water}
                                onChange={(e) => handleMixChange('water', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">gal/yd</span>
                        </div>
                    </div>
                    <div className="calc-input-row">
                        <label>Slump</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={mixData.slump}
                                onChange={(e) => handleMixChange('slump', e.target.value)}
                                placeholder="4"
                                step="0.5"
                            />
                            <span className="input-unit">in</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="calc-section">
                <div className="calc-section-header">
                    <i className="fas fa-truck"></i>
                    <span>Batch Info</span>
                </div>
                <div className="calc-inputs-grid">
                    <div className="calc-input-row">
                        <label>Batch Size</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={mixData.batchSize}
                                onChange={(e) => handleMixChange('batchSize', e.target.value)}
                                placeholder="10"
                                step="0.5"
                            />
                            <span className="input-unit">yd</span>
                        </div>
                    </div>
                    <div className="calc-input-row">
                        <label>Added Water</label>
                        <div className="input-wrap">
                            <input
                                type="number"
                                value={mixData.addedWater}
                                onChange={(e) => handleMixChange('addedWater', e.target.value)}
                                placeholder="0"
                            />
                            <span className="input-unit">gal</span>
                        </div>
                    </div>
                </div>
                {(() => {
                    const designWaterGal = parseFloat(mixData.water) || 0
                    const addedGal = parseFloat(mixData.addedWater) || 0
                    const batchSize = parseFloat(mixData.batchSize) || 0
                    const cement = parseFloat(mixData.cement) || 0
                    const supplemental = parseFloat(mixData.supplemental) || 0
                    const totalCite = cement + supplemental
                    
                    if (designWaterGal > 0 && totalCite > 0 && batchSize > 0) {
                        const designWaterLbsPerYd = designWaterGal * 8.34
                        const addedLbsPerYd = (addedGal * 8.34) / batchSize
                        const totalWaterLbsPerYd = designWaterLbsPerYd + addedLbsPerYd
                        const wc = totalWaterLbsPerYd / totalCite
                        return (
                            <div className="settime-wc-display">
                                <span className="wc-label">W/C Ratio:</span>
                                <span className="wc-value">{wc.toFixed(2)}</span>
                                <span className="wc-breakdown">({Math.round(totalWaterLbsPerYd)} lbs/yd ÷ {Math.round(totalCite)} lbs/yd)</span>
                            </div>
                        )
                    }
                    return null
                })()}
            </div>

            {result ? (
                <div className={`calc-result ${getRiskColor(result.riskLevel)}`}>
                    <div className="result-header">
                        <i className="fas fa-clock"></i>
                        <span>Estimated Set Time</span>
                    </div>
                    <div className="settime-factors">
                        <div className={`factor-badge ${result.conditions.temp > 80 ? 'hot' : result.conditions.temp < 50 ? 'cold' : ''}`}>
                            <i className="fas fa-thermometer-half"></i>
                            <span>{Math.round(result.conditions.temp)}°F</span>
                        </div>
                        <div className={`factor-badge ${result.conditions.cloudCover < 30 ? 'sunny' : result.conditions.cloudCover > 70 ? 'cloudy' : ''}`}>
                            <i className={`fas ${result.conditions.cloudCover < 30 ? 'fa-sun' : result.conditions.cloudCover > 70 ? 'fa-cloud' : 'fa-cloud-sun'}`}></i>
                            <span>{result.conditions.cloudCover}% clouds</span>
                        </div>
                        <div className={`factor-badge ${result.timeOfDay === 'peak-sun' ? 'peak' : result.timeOfDay === 'night' ? 'night' : ''}`}>
                            <i className={`fas ${result.timeOfDay === 'peak-sun' ? 'fa-sun' : result.timeOfDay === 'night' ? 'fa-moon' : 'fa-cloud-sun'}`}></i>
                            <span>{result.timeOfDay === 'peak-sun' ? 'Peak Sun' : result.timeOfDay === 'morning' ? 'Morning' : result.timeOfDay === 'evening' ? 'Evening' : 'Night'}</span>
                        </div>
                        {result.mix && (
                            <>
                                <div className={`factor-badge ${result.mix.cementPerYd > 600 ? 'high-cement' : result.mix.cementPerYd < 400 ? 'low-cement' : ''}`}>
                                    <i className="fas fa-box"></i>
                                    <span>{result.mix.cementPerYd} lbs/yd</span>
                                </div>
                                <div className={`factor-badge ${result.mix.wc > 0.5 ? 'high-wc' : result.mix.wc < 0.4 ? 'low-wc' : ''}`}>
                                    <i className="fas fa-tint"></i>
                                    <span>W/C {result.mix.wc}</span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="settime-results">
                        <div className="settime-box">
                            <span className="settime-label">Initial Set</span>
                            <span className="settime-value">
                                {result.initialSet.hours > 0 && `${result.initialSet.hours}h `}
                                {result.initialSet.mins}m
                            </span>
                            <span className="settime-sublabel">~{Math.round(result.initialSet.total)} mins</span>
                        </div>
                        <div className="settime-divider">
                            <i className="fas fa-arrow-right"></i>
                        </div>
                        <div className="settime-box primary">
                            <span className="settime-label">Final Set</span>
                            <span className="settime-value">
                                {result.finalSet.hours}h {result.finalSet.mins}m
                            </span>
                            <span className="settime-sublabel">~{Math.round(result.finalSet.total)} mins</span>
                        </div>
                    </div>
                    {result.riskMessage && (
                        <div className={`settime-warning ${result.riskLevel}`}>
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>{result.riskMessage}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="calc-empty-state">
                    <i className="fas fa-clock"></i>
                    <span>Enter weather and mix design to calculate set time</span>
                    <div className="required-fields">
                        <span className="required-label">Required:</span>
                        <span>Temperature, Batch Size, Primary Powder, Design Water, Slump</span>
                    </div>
                </div>
            )}

            <div className="calc-footer">
                <button onClick={clearForm} className="btn-reset">
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
                <div className="calc-note">
                    <i className="fas fa-info-circle"></i>
                    <span>Estimates only. Actual set times vary by mix design and conditions.</span>
                </div>
            </div>
        </div>
    )
}

export default SetTimeCalculator
