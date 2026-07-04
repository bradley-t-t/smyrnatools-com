import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

/**
 * Portal-rendered modal for selecting a tractor to assign to a trailer.
 * Filters by the trailer's assigned plant, highlights already-assigned
 * tractors as unavailable, and supports an "available first" sort toggle.
 * Excludes the current trailer from the assignment check to allow re-selection.
 */
function TractorSelectModal({
    isOpen,
    onClose,
    onSelect,
    currentValue,
    trailers,
    assignedPlant,
    readOnly,
    tractors,
    onRefresh,
    trailerId
}) {
    const [searchText, setSearchText] = useState('')
    const [sortAvailableFirst, setSortAvailableFirst] = useState(true)
    const modalRef = useRef(null)
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }
        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [isOpen])
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) onClose()
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])
    function isTractorAssigned(tractorId) {
        if (!tractorId || tractorId === '0' || !Array.isArray(trailers)) return false
        return trailers.some((trailer) => trailer.assignedTractor === tractorId && trailer.id !== trailerId)
    }
    const filteredTractors = (tractors || [])
        .filter(
            (tractor) =>
                tractor.id === currentValue ||
                searchText.trim() === '' ||
                (tractor.truckNumber && tractor.truckNumber.toLowerCase().includes(searchText.toLowerCase())) ||
                (tractor.assignedPlant && tractor.assignedPlant.toLowerCase().includes(searchText.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortAvailableFirst) {
                const aAssigned = isTractorAssigned(a.id)
                const bAssigned = isTractorAssigned(b.id)
                if (!aAssigned && bAssigned) return -1
                if (aAssigned && !bAssigned) return 1
            }
            return (a.truckNumber || '').localeCompare(b.truckNumber || '')
        })
    if (!isOpen) return null
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div
                ref={modalRef}
                className="relative w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl bg-bg-primary border border-border-light"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-accent">
                    <h2 className="text-lg font-bold text-white">Select Tractor</h2>
                    <button type="button"
                        aria-label="Close"
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="px-6 py-4 border-b border-border-light bg-bg-secondary">
                    <div className="relative mb-3">
                        <i className="fas fa-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
                        <input
                            type="search"
                            aria-label="Search tractors"
                            className="w-full pl-11 pr-10 py-3 rounded-xl text-sm bg-bg-primary border border-border-light text-text-primary placeholder:text-text-tertiary hover:border-border-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition-colors duration-150 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
                            placeholder="Search tractors..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            autoFocus
                        />
                        {searchText && (
                            <button type="button"
                                aria-label="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                onClick={() => setSearchText('')}
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button"
                            aria-pressed={sortAvailableFirst}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                                sortAvailableFirst
                                    ? 'bg-accent text-white'
                                    : 'bg-bg-primary border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                            }`}
                            onClick={() => setSortAvailableFirst(!sortAvailableFirst)}
                        >
                            <i className="fas fa-sort-amount-down"></i>
                            <span>Available First</span>
                        </button>
                        <button type="button"
                            aria-label="Refresh tractor list"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-bg-primary border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            onClick={() => onRefresh && onRefresh()}
                        >
                            <i className="fas fa-sync"></i>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-3 bg-bg-secondary border-b border-border-light flex flex-wrap items-center gap-2">
                        <span className="text-sm text-text-secondary">
                            <strong className="text-text-primary">
                                {
                                    filteredTractors.filter(
                                        (t) => readOnly || !isTractorAssigned(t.id) || t.id === currentValue
                                    ).length
                                }
                            </strong>{' '}
                            tractor
                            {filteredTractors.filter(
                                (t) => readOnly || !isTractorAssigned(t.id) || t.id === currentValue
                            ).length !== 1
                                ? 's'
                                : ''}{' '}
                            found
                        </span>
                        {assignedPlant && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-bg-tertiary text-text-primary rounded-md text-xs font-medium">
                                <i className="fas fa-building"></i>
                                Plant: {assignedPlant}
                            </span>
                        )}
                    </div>
                    {filteredTractors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <i className="fas fa-truck text-5xl text-text-tertiary opacity-60 mb-4"></i>
                            <p className="text-text-primary font-medium mb-2">No tractors found</p>
                            <p className="text-sm text-text-secondary mb-6">Try adjusting your search</p>
                            <div className="flex items-center gap-2">
                                <button type="button"
                                    className="px-4 py-2 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                    onClick={() => setSearchText('')}
                                >
                                    Reset Search
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-light">
                            <div
                                className={`px-6 py-4 cursor-pointer transition-colors duration-150 ${
                                    currentValue === null || currentValue === '' || currentValue === '0'
                                        ? 'bg-accent/10 border-l-4 border-l-accent'
                                        : 'hover:bg-bg-hover'
                                }`}
                                onClick={() => {
                                    if (!readOnly) {
                                        onSelect('0')
                                        onClose()
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-text-primary">None</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                                    <span className="inline-flex items-center gap-1">
                                        <i className="fas fa-times-circle"></i>
                                        Unassign Tractor
                                    </span>
                                    {(currentValue === null || currentValue === '' || currentValue === '0') && (
                                        <span className="inline-flex items-center gap-1 text-accent font-medium">
                                            <i className="fas fa-check-circle"></i>
                                            Currently Selected
                                        </span>
                                    )}
                                </div>
                            </div>
                            {filteredTractors.map((tractor) => {
                                const isAssigned = isTractorAssigned(tractor.id)
                                const isUnavailable = isAssigned && !readOnly
                                const isSelected = tractor.id === currentValue
                                if (isAssigned && !readOnly && tractor.id !== currentValue) return null
                                return (
                                    <div
                                        key={tractor.id}
                                        className={`px-6 py-4 transition-colors duration-150 ${
                                            isSelected
                                                ? 'bg-accent/10 border-l-4 border-l-accent cursor-pointer'
                                                : isUnavailable
                                                  ? 'bg-bg-secondary opacity-60 cursor-not-allowed'
                                                  : 'hover:bg-bg-hover cursor-pointer'
                                        }`}
                                        onClick={() => {
                                            if (readOnly || !isUnavailable) {
                                                onSelect(tractor.id)
                                                onClose()
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-text-primary">
                                                Tractor #{tractor.truckNumber || 'Unknown'}
                                            </span>
                                            {tractor.status && tractor.status !== 'Active' && (
                                                <span className="text-xs font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                                                    {tractor.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                                            {tractor.assignedPlant && (
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="fas fa-building"></i>
                                                    {tractor.assignedPlant}
                                                </span>
                                            )}
                                            {isAssigned && (
                                                <span className="inline-flex items-center gap-1 text-text-primary">
                                                    <i className="fas fa-link"></i>
                                                    Already Assigned
                                                </span>
                                            )}
                                            {isSelected && (
                                                <span className="inline-flex items-center gap-1 text-accent font-medium">
                                                    <i className="fas fa-check-circle"></i>
                                                    Currently Selected
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-border-light bg-bg-secondary">
                    <button type="button"
                        className="w-full py-3 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
export default TractorSelectModal
