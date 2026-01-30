import React, { useEffect, useMemo, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { RegionService } from '../../services/RegionService'
import { UserService } from '../../services/UserService'

function RegionOverlay() {
    const { preferences, setSelectedRegion, setRegionOverlayMinimized } = usePreferences()
    const [userId, setUserId] = useState(sessionStorage.getItem('userId') || '')
    const [canSelectRegion, setCanSelectRegion] = useState(false)
    const [allRegions, setAllRegions] = useState([])
    const [loading, setLoading] = useState(true)

    const currentRegionCode = preferences.selectedRegion?.code || ''
    const currentRegionName = preferences.selectedRegion?.name || ''
    const isMinimized = !!preferences.regionOverlayMinimized

    const currentRegionDisplay = useMemo(() => {
        if (!currentRegionCode && !currentRegionName) return 'Select Region'
        if (currentRegionCode && currentRegionName) return `${currentRegionCode} • ${currentRegionName}`
        return currentRegionName || currentRegionCode
    }, [currentRegionCode, currentRegionName])

    useEffect(() => {
        let mounted = true

        async function init() {
            try {
                let uid = userId
                if (!uid) {
                    const user = await UserService.getCurrentUser()
                    uid = user?.id || ''
                    if (uid) setUserId(uid)
                }
                if (!uid) {
                    setLoading(false)
                    return
                }
                const hasPerm = await UserService.hasPermission(uid, 'region.select')
                if (mounted) setCanSelectRegion(!!hasPerm)
                const plantCode = await UserService.getUserPlant(uid)
                let defaultRegion = { code: '', name: '' }
                if (plantCode) {
                    try {
                        const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
                        if (Array.isArray(regions) && regions.length > 0) {
                            const r = regions[0]
                            defaultRegion = {
                                code: r.regionCode || r.region_code || '',
                                name: r.regionName || r.region_name || '',
                                type: r.type || r.region_type || ''
                            }
                        }
                    } catch {}
                }
                if (!preferences.selectedRegion?.code && defaultRegion.code) {
                    setSelectedRegion(defaultRegion.code, defaultRegion.name, defaultRegion.type)
                }
                if (preferences.selectedRegion?.code && !preferences.selectedRegion?.type) {
                    try {
                        const region = await RegionService.fetchRegionByCode(preferences.selectedRegion.code)
                        if (region && region.type) {
                            setSelectedRegion(
                                preferences.selectedRegion.code,
                                preferences.selectedRegion.name,
                                region.type
                            )
                        }
                    } catch {}
                }
                try {
                    const regions = await RegionService.fetchRegions()
                    if (mounted) setAllRegions(regions)
                } catch {}
            } finally {
                if (mounted) setLoading(false)
            }
        }

        init()
        return () => {
            mounted = false
        }
    }, [])

    const handleChangeRegion = (e) => {
        const code = e.target.value
        if (!code) {
            setSelectedRegion('', '', '')
            return
        }
        const r = allRegions.find((x) => (x.region_code || x.regionCode) === code)
        const name = r ? r.region_name || r.regionName || '' : ''
        const type = r ? r.type || r.region_type || '' : ''
        setSelectedRegion(code, name, type)
    }

    const toggleMinimize = () => setRegionOverlayMinimized(!isMinimized)

    if (!userId || loading) return null

    const overlayStyle = {
        bottom: '24px',
        left: '24px',
        position: 'fixed',
        zIndex: 1000
    }

    const minimizedPillStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        gap: '10px',
        padding: '10px 16px'
    }

    const panelStyle = {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        minWidth: '260px',
        overflow: 'hidden'
    }

    const headerStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        borderRadius: '16px 16px 0 0',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px'
    }

    const headerTitleStyle = {
        alignItems: 'center',
        display: 'flex',
        fontSize: '14px',
        fontWeight: 600,
        gap: '10px'
    }

    const actionButtonStyle = {
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        borderRadius: '50%',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '12px',
        height: '28px',
        justifyContent: 'center',
        width: '28px'
    }

    const bodyStyle = {
        backgroundColor: 'white',
        padding: '16px'
    }

    const selectStyle = {
        appearance: 'none',
        backgroundColor: '#f8fafc',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundPosition: 'right 12px center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        color: '#374151',
        cursor: canSelectRegion ? 'pointer' : 'not-allowed',
        fontSize: '14px',
        opacity: canSelectRegion ? 1 : 0.7,
        padding: '12px 16px',
        width: '100%'
    }

    const noteStyle = {
        color: '#94a3b8',
        fontSize: '12px',
        marginTop: '10px',
        textAlign: 'center'
    }

    return (
        <div style={overlayStyle}>
            {isMinimized ? (
                <div style={minimizedPillStyle} onClick={toggleMinimize} title={currentRegionDisplay}>
                    <i className="fas fa-globe" />
                    <span
                        style={{
                            fontSize: '13px',
                            fontWeight: 500
                        }}
                    >
                        {currentRegionName || currentRegionCode || 'Region'}
                    </span>
                </div>
            ) : (
                <div style={panelStyle}>
                    <div style={headerStyle}>
                        <div style={headerTitleStyle}>
                            <i className="fas fa-globe" />
                            <span>Region</span>
                        </div>
                        <div>
                            <button style={actionButtonStyle} onClick={toggleMinimize} title="Minimize">
                                <i className="fas fa-xmark" />
                            </button>
                        </div>
                    </div>
                    <div style={bodyStyle}>
                        <select
                            style={selectStyle}
                            value={currentRegionCode}
                            onChange={handleChangeRegion}
                            disabled={!canSelectRegion}
                        >
                            <option value="">Select a region</option>
                            {allRegions.map((r) => {
                                const code = r.region_code || r.regionCode
                                const name = r.region_name || r.regionName || ''
                                return (
                                    <option key={code} value={code}>
                                        {code} • {name}
                                    </option>
                                )
                            })}
                        </select>
                        {!canSelectRegion && <div style={noteStyle}>Locked to your plant region</div>}
                    </div>
                </div>
            )}
        </div>
    )
}

export default RegionOverlay
