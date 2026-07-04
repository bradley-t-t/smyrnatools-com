import { useCallback, useState } from 'react'

/**
 * Manages verification workflow state and handlers for asset views.
 * Extracts modal state, form fields, and save/verify logic so the
 * parent component stays focused on list rendering.
 */
export default function useAssetVerification({ config, items, setItems, allItems: _allItems, setAllItems }) {
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [verifyItem, setVerifyItem] = useState(null)
    const [verifyVin, setVerifyVin] = useState('')
    const [verifyMake, setVerifyMake] = useState('')
    const [verifyModel, setVerifyModel] = useState('')
    const [verifyYear, setVerifyYear] = useState('')
    const [verifyHours, setVerifyHours] = useState('')
    const [verifyLastServiceDate, setVerifyLastServiceDate] = useState(null)
    const [verifyLastChipDate, setVerifyLastChipDate] = useState(null)

    // Populate modal fields from the selected item and open the verification modal
    const handleVerify = useCallback(
        (itemId) => {
            if (!config.verification) return
            const item = items.find((m) => m.id === itemId)
            if (!item || item.status === 'Retired') return

            setVerifyItem(item)
            const fieldValues = config.verification.getFieldValues(item)
            setVerifyVin(fieldValues.vin)
            setVerifyMake(fieldValues.make)
            setVerifyModel(fieldValues.model)
            setVerifyYear(fieldValues.year)
            setVerifyHours(fieldValues.hours ?? '')
            setVerifyLastServiceDate(fieldValues.lastServiceDate)
            setVerifyLastChipDate(fieldValues.lastChipDate ?? null)
            setShowVerifyModal(true)
        },
        [items, config.verification]
    )

    // Persist only changed fields, then mark the item as verified
    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyItem || !config.verification) return
        try {
            const updates = {}
            const fieldValues = config.verification.getFieldValues(verifyItem)

            if (verifyVin?.trim() && verifyVin !== fieldValues.vin) updates.vin = verifyVin
            if (verifyMake?.trim() && verifyMake !== fieldValues.make) updates.make = verifyMake
            if (verifyModel?.trim() && verifyModel !== fieldValues.model) updates.model = verifyModel
            if (verifyYear && String(verifyYear).trim() && verifyYear !== fieldValues.year) updates.year = verifyYear
            if (config.verification.hasHours) {
                const trimmedHours = String(verifyHours ?? '').trim()
                if (trimmedHours && trimmedHours !== String(fieldValues.hours ?? '')) {
                    const parsed = Number(trimmedHours)
                    if (Number.isFinite(parsed) && parsed >= 0) updates.hours = parsed
                }
            }
            if (verifyLastServiceDate && verifyLastServiceDate !== fieldValues.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate
            }
            if (
                config.verification.hasLastChipDate &&
                verifyLastChipDate &&
                verifyLastChipDate !== fieldValues.lastChipDate
            ) {
                updates.lastChipDate = verifyLastChipDate
            }

            if (Object.keys(updates).length > 0) {
                await config.verification.updateFn(verifyItem.id, updates)
            }

            const verified = await config.verification.verifyFn(verifyItem.id)
            const updateList = (prev) => prev.map((m) => (m.id === verifyItem.id ? verified : m))
            setItems(updateList)
            if (config.hasVinSearch) setAllItems(updateList)
            setShowVerifyModal(false)
            setVerifyItem(null)
        } catch (error) {
            console.error(`Failed to verify ${config.singularLabel}:`, error)
            // Preserve the original error so the modal can show the real reason
            // (session expired, network failure, server-side rejection, etc.).
            if (error instanceof Error) throw error
            throw new Error(String(error) || `Failed to verify ${config.singularLabel}. Please try again.`)
        }
    }, [
        verifyItem,
        verifyVin,
        verifyMake,
        verifyModel,
        verifyYear,
        verifyHours,
        verifyLastServiceDate,
        verifyLastChipDate,
        config,
        setAllItems,
        setItems
    ])

    return {
        handleSaveAndVerify,
        handleVerify,
        setShowVerifyModal,
        setVerifyHours,
        setVerifyItem,
        setVerifyLastChipDate,
        setVerifyLastServiceDate,
        setVerifyMake,
        setVerifyModel,
        setVerifyVin,
        setVerifyYear,
        showVerifyModal,
        verifyHours,
        verifyItem,
        verifyLastChipDate,
        verifyLastServiceDate,
        verifyMake,
        verifyModel,
        verifyVin,
        verifyYear
    }
}
