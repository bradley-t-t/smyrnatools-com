import React, {createContext, useContext, useEffect, useState} from 'react'
import {logSupabaseError, supabase} from '../../services/DatabaseService'
import {UserPreferencesService} from '../../services/UserPreferencesService'
import {UserService} from '../../services/UserService'
import {RegionService} from '../../services/RegionService'

const PreferencesContext = createContext()

export function usePreferences() {
    const context = useContext(PreferencesContext)
    if (!context) throw new Error('usePreferences must be used within a PreferencesProvider')
    return context
}

const getCachedTheme = () => {
    try {
        const cached = localStorage.getItem('smyrna_theme_cache')
        if (cached) {
            const parsed = JSON.parse(cached)
            return {
                themeMode: parsed.themeMode || 'old-dark',
                accentColor: parsed.accentColor || 'red'
            }
        }
    } catch (e) {
    }
    return {themeMode: 'old-dark', accentColor: 'red'}
}

const setCachedTheme = (themeMode, accentColor) => {
    try {
        localStorage.setItem('smyrna_theme_cache', JSON.stringify({themeMode, accentColor}))
    } catch (e) {
    }
}

const applyThemeClasses = (themeMode, accentColor) => {
    const root = document.documentElement
    const themeClasses = ['dark-mode', 'old-dark-mode', 'red-dark-mode', 'blue-light-mode', 'red-light-mode']
    const accentClasses = ['accent-blue', 'accent-red', 'accent-grey']

    let targetThemeClass = ''
    if (themeMode === 'dark') targetThemeClass = 'dark-mode'
    else if (themeMode === 'old-dark') targetThemeClass = 'old-dark-mode'
    else if (themeMode === 'red-dark') targetThemeClass = 'red-dark-mode'
    else if (themeMode === 'blue-light') targetThemeClass = 'blue-light-mode'
    else if (themeMode === 'red-light') targetThemeClass = 'red-light-mode'

    const targetAccentClass = `accent-${accentColor}`

    themeClasses.forEach(cls => {
        if (cls === targetThemeClass) {
            if (!root.classList.contains(cls)) root.classList.add(cls)
        } else {
            root.classList.remove(cls)
        }
    })

    accentClasses.forEach(cls => {
        if (cls === targetAccentClass) {
            if (!root.classList.contains(cls)) root.classList.add(cls)
        } else {
            root.classList.remove(cls)
        }
    })
}

const cachedTheme = getCachedTheme()
applyThemeClasses(cachedTheme.themeMode, cachedTheme.accentColor)

const defaultPreferences = {
    themeMode: cachedTheme.themeMode,
    accentColor: cachedTheme.accentColor,
    showOnlineOverlay: true,
    showPodcastOverlay: true,
    blurBg: false,
    solidBg: false,
    defaultViewMode: null,
    mixerFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'list'
    },
    operatorFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        positionFilter: '',
        viewMode: 'list'
    },
    managerFilters: {
        searchText: '',
        selectedPlant: '',
        roleFilter: '',
        viewMode: 'list'
    },
    tractorFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'list'
    },
    trailerFilters: {
        searchText: '',
        selectedPlant: '',
        typeFilter: '',
        viewMode: 'list'
    },
    equipmentFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'list'
    },
    lastViewedFilters: null,
    selectedRegion: {code: '', name: '', type: ''},
    regionOverlayMinimized: true,
    acceptReportSubmittedEmails: true
}

export const PreferencesProvider = ({children}) => {
    const [preferences, setPreferences] = useState(defaultPreferences)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState(null)
    const [authTrigger, setAuthTrigger] = useState(0)

    useEffect(() => {
        const handleAuthSuccess = () => {
            setAuthTrigger(prev => prev + 1)
        }
        window.addEventListener('authSuccess', handleAuthSuccess)
        return () => {
            window.removeEventListener('authSuccess', handleAuthSuccess)
        }
    }, [])

    useEffect(() => {
        let themeTimeout
        let cancelled = false
        const initialize = async () => {
            setLoading(true)
            const user = await UserService.getCurrentUser()
            if (cancelled) return
            if (user && user.id) {
                setUserId(user.id)
                let prefs = defaultPreferences
                try {
                    const data = await UserPreferencesService.getUserPreferences(user.id)
                    if (data) {
                        prefs = {
                            themeMode: data.theme_mode || 'old-dark',
                            accentColor: data.accent_color || 'red',
                            showOnlineOverlay: data.show_online_overlay === undefined ? true : data.show_online_overlay,
                            showPodcastOverlay: data.show_podcast_overlay === undefined ? true : data.show_podcast_overlay,
                            blurBg: data.blur_bg === undefined ? false : data.blur_bg,
                            solidBg: data.solid_bg === undefined ? false : data.solid_bg,
                            blurBgIntensity: data.blur_bg_intensity === undefined ? 12 : data.blur_bg_intensity,
                            defaultViewMode: data.default_view_mode === undefined ? null : data.default_view_mode,
                            mixerFilters: data.mixer_filters ? {
                                ...data.mixer_filters,
                                viewMode: data.mixer_filters.viewMode || 'list'
                            } : {...defaultPreferences.mixerFilters},
                            operatorFilters: data.operator_filters ? {
                                ...data.operator_filters,
                                viewMode: data.operator_filters.viewMode || 'list',
                                positionFilter: data.operator_filters.positionFilter === undefined ? '' : data.operator_filters.positionFilter
                            } : {...defaultPreferences.operatorFilters},
                            managerFilters: data.manager_filters ? {
                                ...data.manager_filters,
                                viewMode: data.manager_filters.viewMode || 'list'
                            } : {...defaultPreferences.managerFilters},
                            tractorFilters: data.tractor_filters ? {
                                ...data.tractor_filters,
                                viewMode: data.tractor_filters.viewMode || 'list'
                            } : {...defaultPreferences.tractorFilters},
                            trailerFilters: data.trailer_filters ? {
                                ...data.trailer_filters,
                                viewMode: data.trailer_filters.viewMode || 'list'
                            } : {...defaultPreferences.trailerFilters},
                            equipmentFilters: data.equipment_filters ? {
                                ...data.equipment_filters,
                                viewMode: data.equipment_filters.viewMode || 'list'
                            } : {...defaultPreferences.equipmentFilters},
                            lastViewedFilters: data.last_viewed_filters,
                            selectedRegion: data.selected_region ? {...defaultPreferences.selectedRegion, ...data.selected_region} : defaultPreferences.selectedRegion,
                            regionOverlayMinimized: data.region_overlay_minimized === undefined ? defaultPreferences.regionOverlayMinimized : data.region_overlay_minimized,
                            accept_report_submitted_emails: data.accept_report_submitted_emails === undefined ? true : data.accept_report_submitted_emails
                        }
                        setCachedTheme(prefs.themeMode, prefs.accentColor)
                    }
                } catch {
                    prefs = defaultPreferences
                }
                if (cancelled) return
                const originalSelectedRegion = prefs.selectedRegion
                if (!prefs.selectedRegion.code) {
                    try {
                        const plant = await UserService.getUserPlant(user.id)
                        if (cancelled) return
                        const plantCode = (typeof plant === 'string' ? plant : (plant?.plant_code || plant?.plantCode || '')).trim()
                        if (plantCode) {
                            const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
                            if (cancelled) return
                            if (regions && regions.length > 0) {
                                const region = regions[0]
                                prefs.selectedRegion = {
                                    code: region.regionCode || region.region_code,
                                    name: region.regionName || region.region_name,
                                    type: region.type
                                }
                            }
                        }
                    } catch (e) {
                    }
                }
                if (cancelled) return
                setPreferences(prefs)
                applyThemeClasses(prefs.themeMode, prefs.accentColor)
                if (!originalSelectedRegion.code && prefs.selectedRegion.code) {
                    updatePreferences('selectedRegion', prefs.selectedRegion)
                }
            } else {
                setUserId(null)
                setPreferences(defaultPreferences)
            }
            setLoading(false)
        }
        initialize()
        return () => {
            if (themeTimeout) clearTimeout(themeTimeout)
        }
    }, [userId])

    useEffect(() => {
        const root = document.documentElement
        const themeClasses = ['dark-mode', 'old-dark-mode', 'red-dark-mode', 'blue-light-mode', 'red-light-mode']
        const accentClasses = ['accent-blue', 'accent-red', 'accent-grey']

        let targetThemeClass = ''
        if (preferences.themeMode === 'dark') targetThemeClass = 'dark-mode'
        else if (preferences.themeMode === 'old-dark') targetThemeClass = 'old-dark-mode'
        else if (preferences.themeMode === 'red-dark') targetThemeClass = 'red-dark-mode'
        else if (preferences.themeMode === 'blue-light') targetThemeClass = 'blue-light-mode'
        else if (preferences.themeMode === 'red-light') targetThemeClass = 'red-light-mode'

        const targetAccentClass = `accent-${preferences.accentColor}`

        themeClasses.forEach(cls => {
            if (cls === targetThemeClass) {
                if (!root.classList.contains(cls)) root.classList.add(cls)
            } else {
                root.classList.remove(cls)
            }
        })

        accentClasses.forEach(cls => {
            if (cls === targetAccentClass) {
                if (!root.classList.contains(cls)) root.classList.add(cls)
            } else {
                root.classList.remove(cls)
            }
        })
    }, [preferences.themeMode, preferences.accentColor])

    const updatePreferences = async (keyOrObject, value) => {
        let updatedPreferences
        if (typeof keyOrObject === 'string') {
            updatedPreferences = {...preferences, [keyOrObject]: value}
        } else {
            updatedPreferences = {...preferences, ...keyOrObject}
        }
        setPreferences(updatedPreferences)
        setCachedTheme(updatedPreferences.themeMode, updatedPreferences.accentColor)
        applyThemeClasses(updatedPreferences.themeMode, updatedPreferences.accentColor)
        if (userId) {
            const now = new Date().toISOString()
            const upsertData = {
                user_id: userId,
                theme_mode: updatedPreferences.themeMode,
                accent_color: updatedPreferences.accentColor,
                show_online_overlay: updatedPreferences.showOnlineOverlay,
                show_podcast_overlay: updatedPreferences.showPodcastOverlay,
                blur_bg: updatedPreferences.blurBg,
                solid_bg: updatedPreferences.solidBg,
                blur_bg_intensity: updatedPreferences.blurBgIntensity,
                default_view_mode: updatedPreferences.defaultViewMode,
                mixer_filters: updatedPreferences.mixerFilters,
                operator_filters: updatedPreferences.operatorFilters,
                manager_filters: updatedPreferences.managerFilters,
                tractor_filters: updatedPreferences.tractorFilters,
                trailer_filters: updatedPreferences.trailerFilters,
                equipment_filters: updatedPreferences.equipmentFilters,
                last_viewed_filters: updatedPreferences.lastViewedFilters,
                selected_region: updatedPreferences.selectedRegion,
                accept_report_submitted_emails: updatedPreferences.acceptReportSubmittedEmails,
                updated_at: now,
                created_at: now
            }
            try {
                await supabase
                    .from('users_preferences')
                    .upsert(upsertData, {onConflict: 'user_id'})
            } catch (e) {
                logSupabaseError('upserting preferences', e)
            }
        }
    }

    const updateManagerFilter = (key, value) => {
        const newFilters = {...preferences.managerFilters, [key]: value}
        updatePreferences('managerFilters', newFilters)
    }

    const resetManagerFilters = (options = {}) => {
        let newFilters = {...defaultPreferences.managerFilters}
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('managerFilters', newFilters)
    }

    const updateTractorFilter = (key, value) => {
        const newFilters = {...preferences.tractorFilters, [key]: value}
        updatePreferences('tractorFilters', newFilters)
    }

    const resetTractorFilters = (options = {}) => {
        let newFilters = {...defaultPreferences.tractorFilters}
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('tractorFilters', newFilters)
    }

    const updateTrailerFilter = (key, value) => {
        const newFilters = {...preferences.trailerFilters, [key]: value}
        updatePreferences('trailerFilters', newFilters)
    }

    const resetTrailerFilters = (options = {}) => {
        let newFilters = {...defaultPreferences.trailerFilters}
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('trailerFilters', newFilters)
    }

    const updateEquipmentFilter = (key, value) => {
        const newFilters = {...preferences.equipmentFilters, [key]: value}
        updatePreferences('equipmentFilters', newFilters)
    }

    const resetEquipmentFilters = (options = {}) => {
        let newFilters = {...defaultPreferences.equipmentFilters}
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('equipmentFilters', newFilters)
    }

    const updateMixerFilter = (key, value) => {
        const newFilters = {...preferences.mixerFilters, [key]: value}
        updatePreferences('mixerFilters', newFilters)
    }

    const resetMixerFilters = (options = {}) => {
        let newFilters = {...defaultPreferences.mixerFilters}
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('mixerFilters', newFilters)
    }

    const updateOperatorFilter = (key, value) => {
        const newFilters = {...preferences.operatorFilters, [key]: value}
        updatePreferences('operatorFilters', newFilters)
    }

    const resetOperatorFilters = (options = {}) => {
        let newFilters = {...defaultPreferences.operatorFilters}
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('operatorFilters', newFilters)
    }

    const setSelectedRegion = (code, name = '', type = '') => {
        updatePreferences('selectedRegion', {code: code || '', name: name || '', type: type || ''})
    }

    const setRegionOverlayMinimized = minimized => {
        updatePreferences('regionOverlayMinimized', !!minimized)
    }

    const toggleShowOnlineOverlay = () => updatePreferences('showOnlineOverlay', !preferences.showOnlineOverlay)
    const toggleShowPodcastOverlay = () => updatePreferences('showPodcastOverlay', !preferences.showPodcastOverlay)
    const toggleBlurBg = () => updatePreferences('blurBg', !preferences.blurBg)
    const setBackgroundMode = (mode) => {
        if (mode === 'video') {
            updatePreferences({blurBg: false, solidBg: false})
        } else if (mode === 'blurred') {
            updatePreferences({blurBg: true, solidBg: false})
        } else if (mode === 'solid') {
            updatePreferences({blurBg: false, solidBg: true})
        }
    }
    const setBlurBgIntensity = (intensity) => {
        const value = Math.min(50, Math.max(1, parseInt(intensity) || 12))
        updatePreferences('blurBgIntensity', value)
    }
    const setThemeMode = mode => (['light', 'dark', 'old-dark', 'red-dark', 'blue-light', 'red-light'].includes(mode)) && updatePreferences('themeMode', mode)
    const setAccentColor = color => (color === 'red' || color === 'blue' || color === 'grey') && updatePreferences('accentColor', color)
    const saveLastViewedFilters = async filters => {
        try {
            if (!userId) return
            const finalFilters = filters || {
                mixer: preferences.mixerFilters,
                tractor: preferences.tractorFilters,
                trailer: preferences.trailerFilters,
                equipment: preferences.equipmentFilters
            }
            await UserPreferencesService.saveLastViewedFilters(userId, finalFilters)
            setPreferences(prev => ({
                ...prev,
                lastViewedFilters: finalFilters
            }))
        } catch (error) {
            logSupabaseError('saving last viewed filters', error)
        }
    }

    const toggleAcceptReportSubmittedEmails = () => updatePreferences('acceptReportSubmittedEmails', !preferences.acceptReportSubmittedEmails)

    return (
        <PreferencesContext.Provider
            value={{
                preferences,
                loading,
                toggleShowOnlineOverlay,
                toggleShowPodcastOverlay,
                toggleBlurBg,
                setBackgroundMode,
                setBlurBgIntensity,
                setThemeMode,
                setAccentColor,
                updatePreferences,
                updateManagerFilter,
                resetManagerFilters,
                updateTractorFilter,
                resetTractorFilters,
                updateTrailerFilter,
                resetTrailerFilters,
                updateEquipmentFilter,
                resetEquipmentFilters,
                updateMixerFilter,
                resetMixerFilters,
                updateOperatorFilter,
                resetOperatorFilters,
                saveLastViewedFilters,
                setSelectedRegion,
                setRegionOverlayMinimized,
                toggleAcceptReportSubmittedEmails
            }}
        >
            {!loading && children}
        </PreferencesContext.Provider>
    )
}