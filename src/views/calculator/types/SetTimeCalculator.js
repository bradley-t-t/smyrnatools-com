import React, { useCallback, useEffect, useState } from 'react'

const SetTimeCalculator = () => {
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

    const WATER_LBS_PER_GALLON = 8.34

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
            conditions: {
                cloudCover,
                humidity,
                temp: temp,
                windSpeed
            },
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

    const getRiskColor = (level) => {
        switch (level) {
            case 'cold':
                return 'info'
            case 'cool':
                return 'info'
            case 'warm':
                return 'warning'
            case 'hot':
                return 'error'
            default:
                return 'success'
        }
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const styles = {
        container: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: isMobile ? '1rem' : '2rem'
        },
        emptyIcon: {
            color: '#cbd5e1',
            fontSize: isMobile ? '2rem' : '3rem',
            marginBottom: '1rem'
        },
        emptyState: {
            background: '#f8fafc',
            border: '2px dashed #e5e7eb',
            borderRadius: '12px',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '2rem 1rem' : '3rem 2rem',
            textAlign: 'center'
        },
        emptyText: {
            color: '#64748b',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            marginBottom: '1rem'
        },
        factorBadge: (type) => ({
            alignItems: 'center',
            background:
                type === 'hot' || type === 'low-cement' || type === 'high-wc'
                    ? '#fef2f2'
                    : type === 'cold' || type === 'low-wc'
                      ? '#eff6ff'
                      : type === 'sunny' || type === 'peak'
                        ? '#fef3c7'
                        : type === 'cloudy' || type === 'night'
                          ? '#f1f5f9'
                          : type === 'high-cement'
                            ? '#f0fdf4'
                            : 'white',
            border: `1px solid ${
                type === 'hot' || type === 'low-cement' || type === 'high-wc'
                    ? '#fee2e2'
                    : type === 'cold' || type === 'low-wc'
                      ? '#dbeafe'
                      : type === 'sunny' || type === 'peak'
                        ? '#fef3c7'
                        : type === 'cloudy' || type === 'night'
                          ? '#e5e7eb'
                          : type === 'high-cement'
                            ? '#dcfce7'
                            : '#e5e7eb'
            }`,
            borderRadius: '8px',
            color:
                type === 'hot' || type === 'low-cement' || type === 'high-wc'
                    ? '#ef4444'
                    : type === 'cold' || type === 'low-wc'
                      ? '#3b82f6'
                      : type === 'sunny' || type === 'peak'
                        ? '#f59e0b'
                        : type === 'cloudy' || type === 'night'
                          ? '#64748b'
                          : type === 'high-cement'
                            ? '#16a34a'
                            : '#1e293b',
            display: 'flex',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem'
        }),
        factors: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: isMobile ? '0.5rem' : '0.75rem',
            justifyContent: 'center',
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        footer: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: isMobile ? 'center' : 'space-between'
        },
        input: {
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            outline: 'none',
            padding: isMobile ? '0.625rem 3rem 0.625rem 0.75rem' : '0.75rem 4rem 0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        },
        inputRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        inputUnit: {
            color: '#94a3b8',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            position: 'absolute',
            right: isMobile ? '0.75rem' : '1rem'
        },
        inputWrap: {
            alignItems: 'center',
            display: 'flex',
            position: 'relative'
        },
        inputsGrid: {
            display: 'grid',
            gap: isMobile ? '1rem' : '1.5rem',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'
        },
        label: {
            color: '#64748b',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        manualWeatherInfo: {
            alignItems: 'center',
            background: '#eff6ff',
            borderRadius: '8px',
            color: '#1e3a5f',
            display: 'flex',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: 600,
            gap: '0.75rem',
            gridColumn: '1 / -1',
            justifyContent: 'center',
            padding: isMobile ? '0.75rem' : '1rem',
            textAlign: 'center'
        },
        manualWeatherInputs: {
            display: 'grid',
            gap: isMobile ? '1rem' : '1.5rem',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'
        },
        manualWeatherRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        note: {
            alignItems: 'center',
            color: '#94a3b8',
            display: 'flex',
            fontSize: '0.8125rem',
            fontStyle: 'italic',
            gap: '0.5rem'
        },
        requiredFields: {
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            gap: '0.5rem'
        },
        requiredLabel: {
            color: '#64748b',
            fontWeight: 700
        },
        resetButton: {
            alignItems: 'center',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            gap: '0.5rem',
            outline: 'none',
            padding: '0.75rem 1.5rem',
            transition: 'all 0.2s'
        },
        resultContainer: (riskLevel) => ({
            background:
                riskLevel === 'cold' || riskLevel === 'cool'
                    ? '#eff6ff'
                    : riskLevel === 'warm'
                      ? '#fffbeb'
                      : riskLevel === 'hot'
                        ? '#fef2f2'
                        : '#f0fdf4',
            border: `2px solid ${
                riskLevel === 'cold' || riskLevel === 'cool'
                    ? '#dbeafe'
                    : riskLevel === 'warm'
                      ? '#fef3c7'
                      : riskLevel === 'hot'
                        ? '#fee2e2'
                        : '#dcfce7'
            }`,
            borderRadius: isMobile ? '8px' : '12px',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '1rem' : '2rem'
        }),
        resultHeader: {
            alignItems: 'center',
            color: '#1e293b',
            display: 'flex',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        retryButton: {
            background: 'white',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            outline: 'none',
            padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
            transition: 'all 0.2s'
        },
        section: {
            marginBottom: isMobile ? '1.5rem' : '2rem'
        },
        sectionHeader: {
            alignItems: isMobile ? 'flex-start' : 'center',
            borderBottom: '2px solid #f1f5f9',
            color: '#1e293b',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700,
            gap: isMobile ? '0.75rem' : '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            paddingBottom: '1rem'
        },
        settimeBox: (isPrimary) => ({
            alignItems: 'center',
            background: isPrimary ? '#dcfce7' : 'white',
            border: `3px solid ${isPrimary ? '#16a34a' : '#e5e7eb'}`,
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: isMobile ? '100%' : '180px',
            padding: isMobile ? '1rem' : '1.5rem',
            width: isMobile ? '100%' : 'auto'
        }),
        settimeDivider: {
            color: '#cbd5e1',
            display: isMobile ? 'none' : 'block',
            fontSize: isMobile ? '1.25rem' : '1.5rem'
        },
        settimeLabel: {
            color: '#64748b',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        settimeResults: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '1rem' : '2rem',
            justifyContent: 'center',
            marginBottom: isMobile ? '1rem' : '1.5rem'
        },
        settimeSublabel: {
            color: '#94a3b8',
            fontSize: isMobile ? '0.625rem' : '0.75rem'
        },
        settimeValue: {
            color: '#1e3a5f',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700
        },
        toggleButton: (active) => ({
            background: active ? '#f0f7ff' : 'white',
            border: active ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '8px',
            color: active ? '#1e3a5f' : '#64748b',
            cursor: 'pointer',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            marginLeft: isMobile ? 0 : 'auto',
            outline: 'none',
            padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
            transition: 'all 0.2s'
        }),
        warning: (level) => ({
            alignItems: isMobile ? 'flex-start' : 'center',
            background:
                level === 'cold' || level === 'cool'
                    ? '#eff6ff'
                    : level === 'warm'
                      ? '#fffbeb'
                      : level === 'hot'
                        ? '#fef2f2'
                        : 'white',
            border: `2px solid ${
                level === 'cold' || level === 'cool'
                    ? '#3b82f6'
                    : level === 'warm'
                      ? '#f59e0b'
                      : level === 'hot'
                        ? '#ef4444'
                        : '#e5e7eb'
            }`,
            borderRadius: '12px',
            color:
                level === 'cold' || level === 'cool'
                    ? '#1e40af'
                    : level === 'warm'
                      ? '#92400e'
                      : level === 'hot'
                        ? '#991b1b'
                        : '#1e293b',
            display: 'flex',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: 600,
            gap: '0.75rem',
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem'
        }),
        wcBreakdown: {
            color: '#64748b',
            fontSize: isMobile ? '0.75rem' : '0.875rem'
        },
        wcDisplay: {
            alignItems: 'center',
            background: '#f0fdf4',
            borderRadius: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            marginTop: '1rem',
            padding: isMobile ? '0.75rem' : '1rem'
        },
        wcLabel: {
            color: '#64748b',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600
        },
        wcValue: {
            color: '#16a34a',
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: 700
        },
        weatherDisplay: {
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            minHeight: isMobile ? '100px' : '120px',
            padding: isMobile ? '1.5rem 1rem' : '2rem'
        },
        weatherError: {
            alignItems: 'center',
            color: '#ef4444',
            display: 'flex',
            flexDirection: 'column',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            gap: '1rem',
            textAlign: 'center'
        },
        weatherLoading: {
            alignItems: 'center',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            gap: '1rem'
        },
        weatherStat: (isMain) => ({
            alignItems: 'center',
            color: isMain ? '#1e3a5f' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            fontSize: isMain ? (isMobile ? '1.25rem' : '1.5rem') : isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: isMain ? 700 : 600,
            gap: '0.5rem'
        }),
        weatherStats: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: isMobile ? '1rem' : '2rem',
            justifyContent: 'center'
        }
    }

    const inputFocusHandlers = {
        onBlur: (e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
        },
        onFocus: (e) => {
            e.target.style.borderColor = '#1e3a5f'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-cloud-sun" style={{ color: '#1e3a5f' }}></i>
                    <span>Weather Conditions</span>
                    <button
                        style={styles.toggleButton(useManual)}
                        onClick={() => setUseManual(!useManual)}
                        onMouseEnter={(e) => {
                            if (!useManual) e.currentTarget.style.background = '#f8fafc'
                        }}
                        onMouseLeave={(e) => {
                            if (!useManual) e.currentTarget.style.background = 'white'
                        }}
                    >
                        {useManual ? 'Use Location' : 'Manual Entry'}
                    </button>
                </div>
                <div>
                    {useManual ? (
                        <div style={styles.manualWeatherInputs}>
                            <div style={styles.manualWeatherRow}>
                                <label style={styles.label}>Temperature</label>
                                <div style={styles.inputWrap}>
                                    <input
                                        type="number"
                                        value={manualWeather.temperature}
                                        onChange={(e) => handleManualWeatherChange('temperature', e.target.value)}
                                        placeholder="72"
                                        style={styles.input}
                                        {...inputFocusHandlers}
                                    />
                                    <span style={styles.inputUnit}>°F</span>
                                </div>
                            </div>
                            <div style={styles.manualWeatherRow}>
                                <label style={styles.label}>Cloud Cover</label>
                                <div style={styles.inputWrap}>
                                    <input
                                        type="number"
                                        value={manualWeather.cloudCover}
                                        onChange={(e) => handleManualWeatherChange('cloudCover', e.target.value)}
                                        placeholder="50"
                                        min="0"
                                        max="100"
                                        style={styles.input}
                                        {...inputFocusHandlers}
                                    />
                                    <span style={styles.inputUnit}>%</span>
                                </div>
                            </div>
                            <div style={styles.manualWeatherRow}>
                                <label style={styles.label}>Humidity</label>
                                <div style={styles.inputWrap}>
                                    <input
                                        type="number"
                                        value={manualWeather.humidity}
                                        onChange={(e) => handleManualWeatherChange('humidity', e.target.value)}
                                        placeholder="50"
                                        min="0"
                                        max="100"
                                        style={styles.input}
                                        {...inputFocusHandlers}
                                    />
                                    <span style={styles.inputUnit}>%</span>
                                </div>
                            </div>
                            <div style={styles.manualWeatherInfo}>
                                <i
                                    className={`fas ${(() => {
                                        const hour = new Date().getHours()
                                        if (hour >= 10 && hour < 16) return 'fa-sun'
                                        if (hour >= 6 && hour < 10) return 'fa-cloud-sun'
                                        if (hour >= 16 && hour < 20) return 'fa-cloud-sun'
                                        return 'fa-moon'
                                    })()}`}
                                ></i>
                                <span>
                                    {(() => {
                                        const hour = new Date().getHours()
                                        if (hour >= 10 && hour < 16) return 'Peak Sun Hours (10am-4pm)'
                                        if (hour >= 6 && hour < 10) return 'Morning (6am-10am)'
                                        if (hour >= 16 && hour < 20) return 'Evening (4pm-8pm)'
                                        return 'Night (8pm-6am)'
                                    })()}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div style={styles.weatherDisplay}>
                            {loading && (
                                <div style={styles.weatherLoading}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                                    <span>Getting weather...</span>
                                </div>
                            )}
                            {locationError && (
                                <div style={styles.weatherError}>
                                    <i className="fas fa-exclamation-circle" style={{ fontSize: '2rem' }}></i>
                                    <span>{locationError}</span>
                                    <button
                                        onClick={getLocation}
                                        style={styles.retryButton}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#fef2f2'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white'
                                        }}
                                    >
                                        <i className="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            )}
                            {weather && !loading && (
                                <div style={styles.weatherStats}>
                                    <div style={styles.weatherStat(true)}>
                                        <i className="fas fa-thermometer-half"></i>
                                        <span>{Math.round(weather.temperature)}°F</span>
                                    </div>
                                    <div style={styles.weatherStat(false)}>
                                        <i
                                            className={`fas ${(() => {
                                                const hour = new Date().getHours()
                                                if (hour >= 10 && hour < 16) return 'fa-sun'
                                                if (hour >= 6 && hour < 10) return 'fa-cloud-sun'
                                                if (hour >= 16 && hour < 20) return 'fa-cloud-sun'
                                                return 'fa-moon'
                                            })()}`}
                                        ></i>
                                        <span>
                                            {(() => {
                                                const hour = new Date().getHours()
                                                if (hour >= 10 && hour < 16) return 'Peak Sun'
                                                if (hour >= 6 && hour < 10) return 'Morning'
                                                if (hour >= 16 && hour < 20) return 'Evening'
                                                return 'Night'
                                            })()}
                                        </span>
                                    </div>
                                    <div style={styles.weatherStat(false)}>
                                        <i className="fas fa-cloud"></i>
                                        <span>{weather.cloudCover}%</span>
                                    </div>
                                    <div style={styles.weatherStat(false)}>
                                        <i className="fas fa-tint"></i>
                                        <span>{weather.humidity}%</span>
                                    </div>
                                    <div style={styles.weatherStat(false)}>
                                        <i className="fas fa-wind"></i>
                                        <span>{Math.round(weather.windSpeed)} mph</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-flask" style={{ color: '#1e3a5f' }}></i>
                    <span>Mix Design (per yard)</span>
                </div>
                <div style={styles.inputsGrid}>
                    {[
                        { field: 'cement', label: 'Primary Powder', placeholder: '0', unit: 'lbs/yd' },
                        { field: 'supplemental', label: 'Supplemental', placeholder: '0', unit: 'lbs/yd' },
                        { field: 'water', label: 'Design Water', placeholder: '0', unit: 'gal/yd' },
                        { field: 'slump', label: 'Slump', placeholder: '4', step: '0.5', unit: 'in' }
                    ].map((input) => (
                        <div key={input.field} style={styles.inputRow}>
                            <label style={styles.label}>{input.label}</label>
                            <div style={styles.inputWrap}>
                                <input
                                    type="number"
                                    value={mixData[input.field]}
                                    onChange={(e) => handleMixChange(input.field, e.target.value)}
                                    placeholder={input.placeholder}
                                    step={input.step}
                                    style={styles.input}
                                    {...inputFocusHandlers}
                                />
                                <span style={styles.inputUnit}>{input.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <i className="fas fa-truck" style={{ color: '#1e3a5f' }}></i>
                    <span>Batch Info</span>
                </div>
                <div style={styles.inputsGrid}>
                    <div style={styles.inputRow}>
                        <label style={styles.label}>Batch Size</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="number"
                                value={mixData.batchSize}
                                onChange={(e) => handleMixChange('batchSize', e.target.value)}
                                placeholder="10"
                                step="0.5"
                                style={styles.input}
                                {...inputFocusHandlers}
                            />
                            <span style={styles.inputUnit}>yd</span>
                        </div>
                    </div>
                    <div style={styles.inputRow}>
                        <label style={styles.label}>Added Water</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="number"
                                value={mixData.addedWater}
                                onChange={(e) => handleMixChange('addedWater', e.target.value)}
                                placeholder="0"
                                style={styles.input}
                                {...inputFocusHandlers}
                            />
                            <span style={styles.inputUnit}>gal</span>
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
                            <div style={styles.wcDisplay}>
                                <span style={styles.wcLabel}>W/C Ratio:</span>
                                <span style={styles.wcValue}>{wc.toFixed(2)}</span>
                                <span style={styles.wcBreakdown}>
                                    ({Math.round(totalWaterLbsPerYd)} lbs/yd ÷ {Math.round(totalCite)} lbs/yd)
                                </span>
                            </div>
                        )
                    }
                    return null
                })()}
            </div>

            {result ? (
                <div style={styles.resultContainer(result.riskLevel)}>
                    <div style={styles.resultHeader}>
                        <i className="fas fa-clock"></i>
                        <span>Estimated Set Time</span>
                    </div>
                    <div style={styles.factors}>
                        <div
                            style={styles.factorBadge(
                                result.conditions.temp > 80 ? 'hot' : result.conditions.temp < 50 ? 'cold' : ''
                            )}
                        >
                            <i className="fas fa-thermometer-half"></i>
                            <span>{Math.round(result.conditions.temp)}°F</span>
                        </div>
                        <div
                            style={styles.factorBadge(
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
                            style={styles.factorBadge(
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
                                    style={styles.factorBadge(
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
                                    style={styles.factorBadge(
                                        result.mix.wc > 0.5 ? 'high-wc' : result.mix.wc < 0.4 ? 'low-wc' : ''
                                    )}
                                >
                                    <i className="fas fa-tint"></i>
                                    <span>W/C {result.mix.wc}</span>
                                </div>
                            </>
                        )}
                    </div>
                    <div style={styles.settimeResults}>
                        <div style={styles.settimeBox(false)}>
                            <span style={styles.settimeLabel}>Initial Set</span>
                            <span style={styles.settimeValue}>
                                {result.initialSet.hours > 0 && `${result.initialSet.hours}h `}
                                {result.initialSet.mins}m
                            </span>
                            <span style={styles.settimeSublabel}>~{Math.round(result.initialSet.total)} mins</span>
                        </div>
                        <div style={styles.settimeDivider}>
                            <i className="fas fa-arrow-right"></i>
                        </div>
                        <div style={styles.settimeBox(true)}>
                            <span style={styles.settimeLabel}>Final Set</span>
                            <span style={styles.settimeValue}>
                                {result.finalSet.hours}h {result.finalSet.mins}m
                            </span>
                            <span style={styles.settimeSublabel}>~{Math.round(result.finalSet.total)} mins</span>
                        </div>
                    </div>
                    {result.riskMessage && (
                        <div style={styles.warning(result.riskLevel)}>
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>{result.riskMessage}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>
                        <i className="fas fa-clock"></i>
                    </div>
                    <span style={styles.emptyText}>Enter weather and mix design to calculate set time</span>
                    <div style={styles.requiredFields}>
                        <span style={styles.requiredLabel}>Required:</span>
                        <span>Temperature, Batch Size, Primary Powder, Design Water, Slump</span>
                    </div>
                </div>
            )}

            <div style={styles.footer}>
                <button
                    onClick={clearForm}
                    style={styles.resetButton}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#e5e7eb'
                    }}
                >
                    <i className="fas fa-redo"></i>
                    <span>Reset</span>
                </button>
                <div style={styles.note}>
                    <i className="fas fa-info-circle"></i>
                    <span>Estimates only. Actual set times vary by mix design and conditions.</span>
                </div>
            </div>
        </div>
    )
}

export default SetTimeCalculator
