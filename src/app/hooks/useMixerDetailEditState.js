import { useEffect, useState } from 'react'

import { DateUtility } from '../../utils/DateUtility'
import { parseLocalDateOrNull } from './useMixerDetailData'

const formatDateForComparison = (date) => (date ? (date instanceof Date ? date.toISOString() : date) : '')

/**
 * Owns the editable form state for the mixer detail view: hydrates from the
 * loaded mixer, tracks dirty state vs. the original snapshot, and warns the
 * user on tab close when unsaved changes exist.
 */
export default function useMixerDetailEditState(initialMixer, isLoading) {
    const [truckNumber, setTruckNumber] = useState('')
    const [assignedOperator, setAssignedOperator] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('')
    const [cleanlinessRating, setCleanlinessRating] = useState(0)
    const [lastServiceDate, setLastServiceDate] = useState(null)
    const [lastChipDate, setLastChipDate] = useState(null)
    const [vin, setVin] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [hours, setHours] = useState('')
    const [shopStatus, setShopStatus] = useState(null)
    const [originalValues, setOriginalValues] = useState({})
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    useEffect(() => {
        if (!initialMixer) return
        setTruckNumber(initialMixer.truckNumber || '')
        setAssignedOperator(initialMixer.assignedOperator || '')
        setAssignedPlant(initialMixer.assignedPlant || '')
        setStatus(initialMixer.status || '')
        setCleanlinessRating(initialMixer.cleanlinessRating || 0)
        setLastServiceDate(parseLocalDateOrNull(initialMixer.lastServiceDate))
        setLastChipDate(parseLocalDateOrNull(initialMixer.lastChipDate))
        setVin((initialMixer.vin || '').toUpperCase())
        setMake(initialMixer.make || '')
        setModel(initialMixer.model || '')
        setYear(initialMixer.year || '')
        setHours(initialMixer.hours != null ? String(initialMixer.hours) : '')
        setShopStatus(initialMixer.shopStatus || null)
        setOriginalValues(buildOriginalValues(initialMixer))
        setHasUnsavedChanges(false)
    }, [initialMixer])

    useEffect(() => {
        if (!originalValues.truckNumber || isLoading) return
        const hasChanges =
            truckNumber !== originalValues.truckNumber ||
            assignedPlant !== originalValues.assignedPlant ||
            status !== originalValues.status ||
            cleanlinessRating !== originalValues.cleanlinessRating ||
            formatDateForComparison(lastServiceDate) !== formatDateForComparison(originalValues.lastServiceDate) ||
            formatDateForComparison(lastChipDate) !== formatDateForComparison(originalValues.lastChipDate) ||
            vin !== originalValues.vin ||
            make !== originalValues.make ||
            model !== originalValues.model ||
            year !== originalValues.year ||
            shopStatus !== originalValues.shopStatus ||
            hours !== originalValues.hours
        setHasUnsavedChanges(hasChanges)
    }, [
        truckNumber,
        assignedPlant,
        status,
        cleanlinessRating,
        lastServiceDate,
        lastChipDate,
        vin,
        make,
        model,
        year,
        shopStatus,
        hours,
        originalValues,
        isLoading
    ])

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])

    return {
        assignedOperator,
        assignedPlant,
        cleanlinessRating,
        hasUnsavedChanges,
        hours,
        lastChipDate,
        lastServiceDate,
        make,
        model,
        originalValues,
        setAssignedOperator,
        setAssignedPlant,
        setCleanlinessRating,
        setHasUnsavedChanges,
        setHours,
        setLastChipDate,
        setLastServiceDate,
        setMake,
        setModel,
        setOriginalValues,
        setShopStatus,
        setStatus,
        setTruckNumber,
        setVin,
        setYear,
        shopStatus,
        status,
        truckNumber,
        vin,
        year
    }
}

/**
 * Snapshot of the editable values used to detect unsaved changes. Dates are
 * stored as Date objects to match the form state, hours is a string for
 * input-stable comparison.
 */
export function buildOriginalValues(mixer) {
    return {
        assignedOperator: mixer.assignedOperator || '',
        assignedPlant: mixer.assignedPlant || '',
        cleanlinessRating: mixer.cleanlinessRating || 0,
        hours: mixer.hours != null ? String(mixer.hours) : '',
        lastChipDate: mixer.lastChipDate ? DateUtility.parseLocalDate(mixer.lastChipDate) : null,
        lastServiceDate: mixer.lastServiceDate ? DateUtility.parseLocalDate(mixer.lastServiceDate) : null,
        make: mixer.make || '',
        model: mixer.model || '',
        shopStatus: mixer.shopStatus || null,
        status: mixer.status || '',
        truckNumber: mixer.truckNumber || '',
        vin: (mixer.vin || '').toUpperCase(),
        year: mixer.year || ''
    }
}
