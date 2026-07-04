/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { usePreferences } from '../../../app/context/PreferencesContext'

/**
 * Portal-rendered modal for selecting an operator to assign to a mixer.
 * Filters operators to the mixer's assigned plant, highlights already-assigned
 * or inactive operators as unavailable, and supports an "available first" sort
 * toggle. Hidden operators already assigned to other active mixers are excluded
 * unless in read-only mode.
 */
function OperatorSelectModal({
    isOpen,
    onClose,
    onSelect,
    currentValue,
    mixers = [],
    assignedPlant = '',
    readOnly = false,
    operators,
    onRefresh
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [searchText, setSearchText] = useState('')
    const [isLoading] = useState(false)
    const [, setFilterPlant] = useState(assignedPlant)
    const [filterPosition, setFilterPosition] = useState('')
    const [sortAvailableFirst, setSortAvailableFirst] = useState(true)
    const modalRef = useRef(null)
    useEffect(() => {
        if (assignedPlant) setFilterPlant(assignedPlant)
    }, [assignedPlant])
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
    /** Returns true if the operator is already assigned to an active mixer (prevents double-assignment). */
    function isOperatorAssigned(operatorId) {
        if (!operatorId || operatorId === '0' || !Array.isArray(mixers)) return false
        return mixers.some((mixer) => mixer.assignedOperator === operatorId && mixer.status === 'Active')
    }
    const filteredOperators = operators
        .filter(
            (operator) =>
                operator.employeeId === currentValue ||
                ((searchText.trim() === '' ||
                    operator.name.toLowerCase().includes(searchText.toLowerCase()) ||
                    (operator.smyrnaId && operator.smyrnaId.toLowerCase().includes(searchText.toLowerCase())) ||
                    operator.employeeId.toLowerCase().includes(searchText.toLowerCase())) &&
                    (!filterPosition || operator.position === filterPosition) &&
                    operator.plantCode === assignedPlant)
        )
        .sort((a, b) => {
            if (sortAvailableFirst) {
                const aAssigned = isOperatorAssigned(a.employeeId) || a.status !== 'Active'
                const bAssigned = isOperatorAssigned(b.employeeId) || b.status !== 'Active'
                if (!aAssigned && bAssigned) return -1
                if (aAssigned && !bAssigned) return 1
            }
            return a.name.localeCompare(b.name)
        })
    if (!isOpen) return null
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div
                ref={modalRef}
                className="relative w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl bg-bg-primary border border-border-light"
            >
                <div
                    className="flex items-center justify-between px-6 py-4 border-b border-border-light"
                    style={{ backgroundColor: accentColor }}
                >
                    <h2 className="text-lg font-bold text-white">Select Operator</h2>
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
                            aria-label="Search operators"
                            className="w-full pl-11 pr-10 py-3 rounded-xl text-sm bg-bg-primary border border-border-light text-text-primary placeholder:text-text-tertiary hover:border-border-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition-colors duration-150 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
                            placeholder="Search operators..."
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
                                    ? 'text-white'
                                    : 'bg-bg-primary border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                            }`}
                            style={sortAvailableFirst ? { backgroundColor: accentColor } : {}}
                            onClick={() => setSortAvailableFirst(!sortAvailableFirst)}
                        >
                            <i className="fas fa-sort-amount-down"></i>
                            <span>Available First</span>
                        </button>
                        <button type="button"
                            aria-label="Refresh operator list"
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
                                    filteredOperators.filter(
                                        (op) =>
                                            readOnly ||
                                            !isOperatorAssigned(op.employeeId) ||
                                            op.employeeId === currentValue
                                    ).length
                                }
                            </strong>{' '}
                            operator
                            {filteredOperators.filter(
                                (op) => readOnly || !isOperatorAssigned(op.employeeId) || op.employeeId === currentValue
                            ).length !== 1
                                ? 's'
                                : ''}{' '}
                            found
                        </span>
                        {assignedPlant ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-bg-tertiary text-text-primary rounded-md text-xs font-medium">
                                <i className="fas fa-building"></i>
                                Plant: {assignedPlant}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-900 rounded-md text-xs font-medium">
                                <i className="fas fa-exclamation-triangle"></i>
                                No plant selected
                            </span>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                            <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
                            <p className="text-sm">Loading operators...</p>
                        </div>
                    ) : filteredOperators.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <i className="fas fa-user-slash text-5xl text-text-tertiary opacity-60 mb-4"></i>
                            <p className="text-text-primary font-medium mb-2">
                                {assignedPlant
                                    ? `No operators found for plant (${assignedPlant})`
                                    : 'No plant selected. Please select a plant first.'}
                            </p>
                            <p className="text-sm text-text-secondary mb-6">
                                Please add operators with this plant code in the Operators section
                            </p>
                            <div className="flex items-center gap-2">
                                <button type="button"
                                    className="px-4 py-2 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                    onClick={() => {
                                        setFilterPosition('')
                                        setSearchText('')
                                    }}
                                >
                                    Reset Search
                                </button>
                                <a
                                    href="/operators/add"
                                    className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                    style={{ backgroundColor: accentColor }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    Add Operator
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-light">
                            {filteredOperators.map((operator) => {
                                const isAssigned = isOperatorAssigned(operator.employeeId)
                                const isInactive = operator.status !== 'Active'
                                const isUnavailable = (isAssigned && !readOnly) || isInactive
                                const isSelected = operator.employeeId === currentValue
                                if (isAssigned && !readOnly && operator.employeeId !== currentValue) return null
                                return (
                                    <div
                                        key={operator.employeeId}
                                        className={`px-6 py-4 transition-colors duration-150 ${
                                            isSelected
                                                ? 'border-l-4 cursor-pointer'
                                                : isUnavailable
                                                  ? 'bg-bg-secondary opacity-60 cursor-not-allowed'
                                                  : 'hover:bg-bg-hover cursor-pointer'
                                        }`}
                                        style={
                                            isSelected
                                                ? { backgroundColor: `${accentColor}15`, borderLeftColor: accentColor }
                                                : {}
                                        }
                                        onClick={() => {
                                            if (readOnly || !isUnavailable) {
                                                onSelect(operator.employeeId)
                                                onClose()
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-text-primary">{operator.name}</span>
                                            {operator.smyrnaId && (
                                                <span className="text-xs font-mono bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded">
                                                    {operator.smyrnaId}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                                            <span className="inline-flex items-center gap-1">
                                                <i className="fas fa-hard-hat"></i>
                                                {operator.position || 'No Position'}
                                            </span>
                                            {operator.plantCode && (
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="fas fa-building"></i>
                                                    {operator.plantCode}
                                                </span>
                                            )}
                                            {isInactive && (
                                                <span className="inline-flex items-center gap-1 text-text-primary">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    {operator.status}
                                                </span>
                                            )}
                                            {isAssigned && operator.status === 'Active' && (
                                                <span className="inline-flex items-center gap-1 text-text-primary">
                                                    <i className="fas fa-user-slash"></i>
                                                    Already Assigned
                                                </span>
                                            )}
                                            {isSelected && (
                                                <span
                                                    className="inline-flex items-center gap-1 font-medium"
                                                    style={{ color: accentColor }}
                                                >
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
export default OperatorSelectModal
