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

const defaultPreferences = {
    themeMode: 'light',
    accentColor: 'red',
    showTips: true,
    showOnlineOverlay: true,
    defaultViewMode: null,
    mixerFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'grid'
    },
    operatorFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        positionFilter: '',
        viewMode: 'grid'
    },
    managerFilters: {
        searchText: '',
        selectedPlant: '',
        roleFilter: '',
        viewMode: 'grid'
    },
    tractorFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'grid'
    },
    trailerFilters: {
        searchText: '',
        selectedPlant: '',
        typeFilter: '',
        viewMode: 'grid'
    },
    equipmentFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'grid'
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

    useEffect(() => {
        let themeTimeout
        const initialize = async () => {
            setLoading(true)
            const user = await UserService.getCurrentUser()
            if (user && user.id) {
                setUserId(user.id)
                let prefs = defaultPreferences
                try {
                    const data = await UserPreferencesService.getUserPreferences(user.id)
                    if (data) {
                        prefs = {
                            themeMode: data.theme_mode,
                            accentColor: data.accent_color,
                            showTips: data.show_tips === undefined ? true : data.show_tips,
                            showOnlineOverlay: data.show_online_overlay === undefined ? true : data.show_online_overlay,
                            defaultViewMode: data.default_view_mode === undefined ? null : data.default_view_mode,
                            mixerFilters: data.mixer_filters ? {
                                ...data.mixer_filters,
                                viewMode: data.mixer_filters.viewMode || 'grid'
                            } : {...defaultPreferences.mixerFilters},
                            operatorFilters: data.operator_filters ? {
                                ...data.operator_filters,
                                viewMode: data.operator_filters.viewMode || 'grid',
                                positionFilter: data.operator_filters.positionFilter === undefined ? '' : data.operator_filters.positionFilter
                            } : {...defaultPreferences.operatorFilters},
                            managerFilters: data.manager_filters ? {
                                ...data.manager_filters,
                                viewMode: data.manager_filters.viewMode || 'grid'
                            } : {...defaultPreferences.managerFilters},
                            tractorFilters: data.tractor_filters ? {
                                ...data.tractor_filters,
                                viewMode: data.tractor_filters.viewMode || 'grid'
                            } : {...defaultPreferences.tractorFilters},
                            trailerFilters: data.trailer_filters ? {
                                ...data.trailer_filters,
                                viewMode: data.trailer_filters.viewMode || 'grid'
                            } : {...defaultPreferences.trailerFilters},
                            equipmentFilters: data.equipment_filters ? {
                                ...data.equipment_filters,
                                viewMode: data.equipment_filters.viewMode || 'grid'
                            } : {...defaultPreferences.equipmentFilters},
                            lastViewedFilters: data.last_viewed_filters,
                            selectedRegion: data.selected_region ? {...defaultPreferences.selectedRegion, ...data.selected_region} : defaultPreferences.selectedRegion,
                            regionOverlayMinimized: data.region_overlay_minimized === undefined ? defaultPreferences.regionOverlayMinimized : data.region_overlay_minimized,
                            accept_report_submitted_emails: data.accept_report_submitted_emails === undefined ? true : data.accept_report_submitted_emails
                        }
                    }
                } catch {
                    prefs = defaultPreferences
                }
                const originalSelectedRegion = prefs.selectedRegion
                if (!prefs.selectedRegion.code) {
                    try {
                        const plant = await UserService.getUserPlant(user.id)
                        const plantCode = (typeof plant === 'string' ? plant : (plant?.plant_code || plant?.plantCode || '')).trim()
                        if (plantCode) {
                            const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
                            if (regions && regions.length > 0) {
                                const region = regions[0]
                                prefs.selectedRegion = {
                                    code: region.regionCode || region.region_code,
                                    name: region.regionName || region.region_name,
                                    type: region.type
                                }
                            }
                        }
                    } catch (e) {}
                }
                setPreferences(prefs)
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
        document.documentElement.classList.remove('dark-mode', 'old-dark-mode', 'red-dark-mode', 'blue-light-mode', 'red-light-mode')
        if (preferences.themeMode === 'dark') {
            document.documentElement.classList.add('dark-mode')
        } else if (preferences.themeMode === 'old-dark') {
            document.documentElement.classList.add('old-dark-mode')
        } else if (preferences.themeMode === 'red-dark') {
            document.documentElement.classList.add('red-dark-mode')
        } else if (preferences.themeMode === 'blue-light') {
            document.documentElement.classList.add('blue-light-mode')
        } else if (preferences.themeMode === 'red-light') {
            document.documentElement.classList.add('red-light-mode')
        }
        document.documentElement.classList.remove('accent-blue', 'accent-red', 'accent-orange', 'accent-green', 'accent-darkgrey')
        document.documentElement.classList.add(`accent-${preferences.accentColor}`)
    }, [preferences])

    const updatePreferences = async (keyOrObject, value) => {
        let updatedPreferences
        if (typeof keyOrObject === 'string') {
            updatedPreferences = {...preferences, [keyOrObject]: value}
        } else {
            updatedPreferences = {...preferences, ...keyOrObject}
        }
        setPreferences(updatedPreferences)
        if (userId) {
            const now = new Date().toISOString()
            const upsertData = {
                user_id: userId,
                theme_mode: updatedPreferences.themeMode,
                accent_color: updatedPreferences.accentColor,
                show_tips: updatedPreferences.showTips,
                show_online_overlay: updatedPreferences.showOnlineOverlay,
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

    const toggleShowTips = () => updatePreferences('showTips', !preferences.showTips)
    const toggleShowOnlineOverlay = () => updatePreferences('showOnlineOverlay', !preferences.showOnlineOverlay)
    const setThemeMode = mode => (['light', 'dark', 'old-dark', 'red-dark', 'blue-light', 'red-light'].includes(mode)) && updatePreferences('themeMode', mode)
    const setAccentColor = color => (color === 'red' || color === 'blue') && updatePreferences('accentColor', color)
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
                toggleShowTips,
                toggleShowOnlineOverlay,
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