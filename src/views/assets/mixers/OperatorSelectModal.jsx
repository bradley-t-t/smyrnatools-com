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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div
                ref={modalRef}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
                <div
                    className="flex items-center justify-between px-6 py-4 border-b border-slate-200"
                    style={{ backgroundColor: accentColor }}
                >
                    <h2 className="text-lg font-bold text-white">Select Operator</h2>
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
                            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                            placeholder="Search operators..."
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
                                    ? 'text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            style={sortAvailableFirst ? { backgroundColor: accentColor } : {}}
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
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                <i className="fas fa-building"></i>
                                Plant: {assignedPlant}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
                                <i className="fas fa-exclamation-triangle"></i>
                                No plant selected
                            </span>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
                            <p className="text-sm">Loading operators...</p>
                        </div>
                    ) : filteredOperators.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <i className="fas fa-user-slash text-5xl text-slate-300 mb-4"></i>
                            <p className="text-slate-600 font-medium mb-2">
                                {assignedPlant
                                    ? `No operators found for plant (${assignedPlant})`
                                    : 'No plant selected. Please select a plant first.'}
                            </p>
                            <p className="text-sm text-slate-400 mb-6">
                                Please add operators with this plant code in the Operators section
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                                    onClick={() => {
                                        setFilterPosition('')
                                        setSearchText('')
                                    }}
                                >
                                    Reset Search
                                </button>
                                <a
                                    href="/operators/add"
                                    className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
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
                        <div className="divide-y divide-slate-100">
                            {filteredOperators.map((operator) => {
                                const isAssigned = isOperatorAssigned(operator.employeeId)
                                const isInactive = operator.status !== 'Active'
                                const isUnavailable = (isAssigned && !readOnly) || isInactive
                                const isSelected = operator.employeeId === currentValue
                                if (isAssigned && !readOnly && operator.employeeId !== currentValue) return null
                                return (
                                    <div
                                        key={operator.employeeId}
                                        className={`px-6 py-4 cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'border-l-4'
                                                : isUnavailable
                                                  ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                                                  : 'hover:bg-slate-50'
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
                                            <span className="font-semibold text-slate-800">{operator.name}</span>
                                            {operator.smyrnaId && (
                                                <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                                    {operator.smyrnaId}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                                                <span className="inline-flex items-center gap-1 text-amber-600">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    {operator.status}
                                                </span>
                                            )}
                                            {isAssigned && operator.status === 'Active' && (
                                                <span className="inline-flex items-center gap-1 text-red-500">
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
export default OperatorSelectModal
