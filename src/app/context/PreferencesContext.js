import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { logSupabaseError, supabase } from '../../services/DatabaseService'
import { RegionService } from '../../services/RegionService'
import { UserPreferencesService } from '../../services/UserPreferencesService'
import { UserService } from '../../services/UserService'
/**
 * User preferences context managing per-entity filter states, region selection,
 * view modes, accent color, and tutorial toggles. Persists to Supabase on change.
 * Auto-resolves the user's default region from their plant assignment on first load.
 */
const PreferencesContext = createContext()
/**
 * Hook to access user preferences (filters, region, theme).
 * @throws If used outside PreferencesProvider.
 */
export function usePreferences() {
    const context = useContext(PreferencesContext)
    if (!context) throw new Error('usePreferences must be used within a PreferencesProvider')
    return context
}
/** Default preference values used for new users or when DB fetch fails. */
const defaultPreferences = {
    accentColor: '#1e3a5f',
    acceptReportSubmittedEmails: true,
    defaultViewMode: null,
    equipmentFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'list'
    },
    lastViewedFilters: null,
    managerFilters: {
        roleFilter: '',
        searchText: '',
        selectedPlant: '',
        viewMode: 'list'
    },
    mixerFilters: {
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'list'
    },
    operatorFilters: {
        positionFilter: '',
        searchText: '',
        selectedPlant: '',
        statusFilter: '',
        viewMode: 'list'
    },
    regionOverlayMinimized: true,
    selectedRegion: { code: '', name: '', type: '' },
    themeMode: 'light',
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
    tutorials: true
}
/**
 * Preferences provider that loads/saves user preferences to the database.
 * Provides per-entity filter update/reset helpers and region selection methods.
 */
export const PreferencesProvider = ({ children }) => {
    const [preferences, setPreferences] = useState(defaultPreferences)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState(null)
    const [_authTrigger, setAuthTrigger] = useState(0)
    const updatePreferencesRef = useRef(null)
    const updatePreferences = useCallback(
        async (keyOrObject, value) => {
            let updatedPreferences
            if (typeof keyOrObject === 'string') {
                updatedPreferences = { ...preferences, [keyOrObject]: value }
                if (keyOrObject === 'tutorials') {
                    window.dispatchEvent(
                        new CustomEvent('preferences-updated', { detail: { key: 'tutorials', value } })
                    )
                }
            } else {
                updatedPreferences = { ...preferences, ...keyOrObject }
                if (keyOrObject.tutorials !== undefined) {
                    window.dispatchEvent(
                        new CustomEvent('preferences-updated', {
                            detail: { key: 'tutorials', value: keyOrObject.tutorials }
                        })
                    )
                }
            }
            setPreferences(updatedPreferences)
            if (userId) {
                const now = new Date().toISOString()
                const upsertData = {
                    accent_color: updatedPreferences.accentColor,
                    created_at: now,
                    default_view_mode: updatedPreferences.defaultViewMode,
                    equipment_filters: updatedPreferences.equipmentFilters,
                    last_viewed_filters: updatedPreferences.lastViewedFilters,
                    manager_filters: updatedPreferences.managerFilters,
                    mixer_filters: updatedPreferences.mixerFilters,
                    operator_filters: updatedPreferences.operatorFilters,
                    selected_region: updatedPreferences.selectedRegion,
                    theme_mode: updatedPreferences.themeMode,
                    tractor_filters: updatedPreferences.tractorFilters,
                    trailer_filters: updatedPreferences.trailerFilters,
                    tutorials: updatedPreferences.tutorials,
                    updated_at: now,
                    user_id: userId
                }
                try {
                    await supabase.from('users_preferences').upsert(upsertData, { onConflict: 'user_id' })
                } catch (e) {
                    logSupabaseError('upserting preferences', e)
                }
            }
        },
        [preferences, userId]
    )
    useEffect(() => {
        updatePreferencesRef.current = updatePreferences
    }, [updatePreferences])
    useEffect(() => {
        const handleAuthSuccess = () => {
            setAuthTrigger((prev) => prev + 1)
        }
        window.addEventListener('authSuccess', handleAuthSuccess)
        return () => {
            window.removeEventListener('authSuccess', handleAuthSuccess)
        }
    }, [])
    useEffect(() => {
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
                            accentColor: data.accent_color || defaultPreferences.accentColor,
                            accept_report_submitted_emails:
                                data.accept_report_submitted_emails === undefined
                                    ? true
                                    : data.accept_report_submitted_emails,
                            defaultViewMode: data.default_view_mode === undefined ? null : data.default_view_mode,
                            equipmentFilters: data.equipment_filters
                                ? {
                                      ...data.equipment_filters,
                                      viewMode: data.equipment_filters.viewMode || 'list'
                                  }
                                : { ...defaultPreferences.equipmentFilters },
                            lastViewedFilters: data.last_viewed_filters,
                            managerFilters: data.manager_filters
                                ? {
                                      ...data.manager_filters,
                                      viewMode: data.manager_filters.viewMode || 'list'
                                  }
                                : { ...defaultPreferences.managerFilters },
                            mixerFilters: data.mixer_filters
                                ? {
                                      ...data.mixer_filters,
                                      viewMode: data.mixer_filters.viewMode || 'list'
                                  }
                                : { ...defaultPreferences.mixerFilters },
                            operatorFilters: data.operator_filters
                                ? {
                                      ...data.operator_filters,
                                      positionFilter:
                                          data.operator_filters.positionFilter === undefined
                                              ? ''
                                              : data.operator_filters.positionFilter,
                                      viewMode: data.operator_filters.viewMode || 'list'
                                  }
                                : { ...defaultPreferences.operatorFilters },
                            regionOverlayMinimized:
                                data.region_overlay_minimized === undefined
                                    ? defaultPreferences.regionOverlayMinimized
                                    : data.region_overlay_minimized,
                            selectedRegion: data.selected_region
                                ? { ...defaultPreferences.selectedRegion, ...data.selected_region }
                                : defaultPreferences.selectedRegion,
                            themeMode: data.theme_mode || defaultPreferences.themeMode,
                            tractorFilters: data.tractor_filters
                                ? {
                                      ...data.tractor_filters,
                                      viewMode: data.tractor_filters.viewMode || 'list'
                                  }
                                : { ...defaultPreferences.tractorFilters },
                            trailerFilters: data.trailer_filters
                                ? {
                                      ...data.trailer_filters,
                                      viewMode: data.trailer_filters.viewMode || 'list'
                                  }
                                : { ...defaultPreferences.trailerFilters },
                            tutorials: data.tutorials === undefined ? true : data.tutorials
                        }
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
                        const plantCode = (
                            typeof plant === 'string' ? plant : plant?.plant_code || plant?.plantCode || ''
                        ).trim()
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
                    } catch (e) {}
                }
                if (cancelled) return
                setPreferences(prefs)
                if (!originalSelectedRegion.code && prefs.selectedRegion.code) {
                    if (updatePreferencesRef.current) {
                        updatePreferencesRef.current('selectedRegion', prefs.selectedRegion)
                    }
                }
            } else {
                setUserId(null)
                setPreferences(defaultPreferences)
            }
            setLoading(false)
        }
        initialize()
        return () => {
            cancelled = true
        }
    }, [userId])
    const updateManagerFilter = (key, value) => {
        const newFilters = { ...preferences.managerFilters, [key]: value }
        updatePreferences('managerFilters', newFilters)
    }
    const resetManagerFilters = (options = {}) => {
        let newFilters = { ...defaultPreferences.managerFilters }
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('managerFilters', newFilters)
    }
    const updateTractorFilter = (key, value) => {
        const newFilters = { ...preferences.tractorFilters, [key]: value }
        updatePreferences('tractorFilters', newFilters)
    }
    const resetTractorFilters = (options = {}) => {
        let newFilters = { ...defaultPreferences.tractorFilters }
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('tractorFilters', newFilters)
    }
    const updateTrailerFilter = (key, value) => {
        const newFilters = { ...preferences.trailerFilters, [key]: value }
        updatePreferences('trailerFilters', newFilters)
    }
    const resetTrailerFilters = (options = {}) => {
        let newFilters = { ...defaultPreferences.trailerFilters }
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('trailerFilters', newFilters)
    }
    const updateEquipmentFilter = (key, value) => {
        const newFilters = { ...preferences.equipmentFilters, [key]: value }
        updatePreferences('equipmentFilters', newFilters)
    }
    const resetEquipmentFilters = (options = {}) => {
        let newFilters = { ...defaultPreferences.equipmentFilters }
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('equipmentFilters', newFilters)
    }
    const updateMixerFilter = (key, value) => {
        const newFilters = { ...preferences.mixerFilters, [key]: value }
        updatePreferences('mixerFilters', newFilters)
    }
    const resetMixerFilters = (options = {}) => {
        let newFilters = { ...defaultPreferences.mixerFilters }
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('mixerFilters', newFilters)
    }
    const updateOperatorFilter = (key, value) => {
        const newFilters = { ...preferences.operatorFilters, [key]: value }
        updatePreferences('operatorFilters', newFilters)
    }
    const resetOperatorFilters = (options = {}) => {
        let newFilters = { ...defaultPreferences.operatorFilters }
        if (options.keepViewMode && options.currentViewMode !== undefined) {
            newFilters.viewMode = options.currentViewMode
        }
        updatePreferences('operatorFilters', newFilters)
    }
    const setSelectedRegion = (code, name = '', type = '') => {
        updatePreferences('selectedRegion', { code: code || '', name: name || '', type: type || '' })
    }
    const setRegionOverlayMinimized = (minimized) => {
        updatePreferences('regionOverlayMinimized', !!minimized)
    }
    const saveLastViewedFilters = async (filters) => {
        try {
            if (!userId) return
            const finalFilters = filters || {
                equipment: preferences.equipmentFilters,
                mixer: preferences.mixerFilters,
                tractor: preferences.tractorFilters,
                trailer: preferences.trailerFilters
            }
            await UserPreferencesService.saveLastViewedFilters(userId, finalFilters)
            setPreferences((prev) => ({
                ...prev,
                lastViewedFilters: finalFilters
            }))
        } catch (error) {
            logSupabaseError('saving last viewed filters', error)
        }
    }
    const contextValue = {
        loading,
        preferences,
        resetEquipmentFilters,
        resetManagerFilters,
        resetMixerFilters,
        resetOperatorFilters,
        resetTractorFilters,
        resetTrailerFilters,
        saveLastViewedFilters,
        setRegionOverlayMinimized,
        setSelectedRegion,
        updateEquipmentFilter,
        updateManagerFilter,
        updateMixerFilter,
        updateOperatorFilter,
        updatePreferences,
        updateTractorFilter,
        updateTrailerFilter
    }
    return <PreferencesContext.Provider value={contextValue}>{!loading && children}</PreferencesContext.Provider>
}
