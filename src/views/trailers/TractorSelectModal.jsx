import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div
                ref={modalRef}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#1e3a5f]">
                    <h2 className="text-lg font-bold text-white">Select Tractor</h2>
                    <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="relative mb-3">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="text"
                            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
                            placeholder="Search tractors..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            autoFocus
                        />
                        {searchText && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500"
                                onClick={() => setSearchText('')}
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                sortAvailableFirst
                                    ? 'bg-[#1e3a5f] text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            onClick={() => setSortAvailableFirst(!sortAvailableFirst)}
                        >
                            <i className="fas fa-sort-amount-down"></i>
                            <span>Available First</span>
                        </button>
                        <button
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            onClick={() => onRefresh && onRefresh()}
                        >
                            <i className="fas fa-sync"></i>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-slate-600">
                            <strong>
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
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                <i className="fas fa-building"></i>
                                Plant: {assignedPlant}
                            </span>
                        )}
                    </div>

                    {filteredTractors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <i className="fas fa-truck text-5xl text-slate-300 mb-4"></i>
                            <p className="text-slate-600 font-medium mb-2">No tractors found</p>
                            <p className="text-sm text-slate-400 mb-6">Try adjusting your search</p>
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                                    onClick={() => setSearchText('')}
                                >
                                    Reset Search
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            <div
                                className={`px-6 py-4 cursor-pointer transition-colors ${
                                    currentValue === null || currentValue === '' || currentValue === '0'
                                        ? 'bg-[#1e3a5f]/10 border-l-4 border-l-[#1e3a5f]'
                                        : 'hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                    if (!readOnly) {
                                        onSelect('0')
                                        onClose()
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-slate-800">None</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span className="inline-flex items-center gap-1">
                                        <i className="fas fa-times-circle"></i>
                                        Unassign Tractor
                                    </span>
                                    {(currentValue === null || currentValue === '' || currentValue === '0') && (
                                        <span className="inline-flex items-center gap-1 text-[#1e3a5f] font-medium">
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
                                        className={`px-6 py-4 cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-[#1e3a5f]/10 border-l-4 border-l-[#1e3a5f]'
                                                : isUnavailable
                                                  ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                                                  : 'hover:bg-slate-50'
                                        }`}
                                        onClick={() => {
                                            if (readOnly || !isUnavailable) {
                                                onSelect(tractor.id)
                                                onClose()
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-slate-800">
                                                Tractor #{tractor.truckNumber || 'Unknown'}
                                            </span>
                                            {tractor.status && tractor.status !== 'Active' && (
                                                <span className="text-xs font-mono bg-amber-100 text-amber-600 px-2 py-0.5 rounded">
                                                    {tractor.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                            {tractor.assignedPlant && (
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="fas fa-building"></i>
                                                    {tractor.assignedPlant}
                                                </span>
                                            )}
                                            {isAssigned && (
                                                <span className="inline-flex items-center gap-1 text-red-500">
                                                    <i className="fas fa-link"></i>
                                                    Already Assigned
                                                </span>
                                            )}
                                            {isSelected && (
                                                <span className="inline-flex items-center gap-1 text-[#1e3a5f] font-medium">
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

                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <button
                        className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
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
