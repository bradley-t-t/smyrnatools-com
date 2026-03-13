import { useEffect, useMemo, useState } from 'react'

/** Creates a debounced wrapper that delays invocation until after `delay` ms of inactivity. */
function debounce(fn, delay) {
    let timer = null
    return (...args) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

/**
 * Manages all filter, sort, and search state for AssetView.
 * Does not compute filtered results — that happens in the parent
 * where both filter state and data are available.
 */
export default function useAssetFilters({
    config,
    embedded,
    initialSearch,
    preferences,
    savedFilters,
    updateFilterRef
}) {
    const [extraTypeFilter, setExtraTypeFilter] = useState(() => {
        if (embedded) return ''
        return savedFilters?.equipmentTypeFilter || savedFilters?.typeFilter || ''
    })
    const [freightFilter, setFreightFilter] = useState(() => {
        if (embedded) return ''
        return savedFilters?.freightFilter || ''
    })
    const [searchInput, setSearchInput] = useState(() => {
        if (initialSearch) return initialSearch
        if (embedded) return ''
        return savedFilters?.searchText || ''
    })
    const [searchText, setSearchText] = useState(() => {
        if (initialSearch) return initialSearch
        if (embedded) return ''
        return savedFilters?.searchText || ''
    })
    const [selectedPlant, setSelectedPlant] = useState(() => {
        if (embedded) return ''
        return savedFilters?.selectedPlant || ''
    })
    const [sortDirection, setSortDirection] = useState('asc')
    const [sortKey, setSortKey] = useState('')
    const [statusFilter, setStatusFilter] = useState(() => {
        if (embedded) return ''
        return savedFilters?.statusFilter || ''
    })
    const [viewMode, setViewMode] = useState(() => {
        if (embedded) return 'list'
        if (savedFilters?.viewMode != null) return savedFilters.viewMode
        if (preferences.defaultViewMode != null) return preferences.defaultViewMode
        return localStorage.getItem(config.viewModeStorageKey) || 'grid'
    })

    // Sync initial search prop into local state
    useEffect(() => {
        if (!initialSearch) return
        const timer = setTimeout(() => {
            setSearchText(initialSearch)
            setSearchInput(initialSearch)
        }, 100)
        return () => clearTimeout(timer)
    }, [initialSearch])

    // Debounced search text with filter persistence
    const debouncedSetSearchText = useMemo(
        () =>
            debounce((value) => {
                setSearchText(value)
                updateFilterRef.current?.('searchText', value)
            }, 300),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    function handleViewModeChange(mode) {
        if (viewMode === mode) return
        setViewMode(mode)
        updateFilterRef.current?.('viewMode', mode)
        localStorage.setItem(config.viewModeStorageKey, mode)
    }

    function handleHeaderClick(label) {
        if (sortKey === label) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    const showReset =
        searchText ||
        selectedPlant ||
        (statusFilter && statusFilter !== 'All Statuses' && statusFilter !== '') ||
        freightFilter ||
        extraTypeFilter

    return {
        debouncedSetSearchText,
        extraTypeFilter,
        freightFilter,
        handleHeaderClick,
        handleViewModeChange,
        searchInput,
        searchText,
        selectedPlant,
        setExtraTypeFilter,
        setFreightFilter,
        setSearchInput,
        setSearchText,
        setSelectedPlant,
        setStatusFilter,
        setViewMode,
        showReset,
        sortDirection,
        sortKey,
        statusFilter,
        viewMode
    }
}
