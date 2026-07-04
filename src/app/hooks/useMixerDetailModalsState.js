import { useState } from 'react'

/**
 * Aggregates the boolean show/hide state for every modal on the mixer detail
 * view, plus the missing-fields list shown by VerificationRequirementsModal.
 */
export default function useMixerDetailModalsState() {
    const [showHistory, setShowHistory] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [showIssues, setShowIssues] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [showOperatorModal, setShowOperatorModal] = useState(false)
    const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false)
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [missingFields, setMissingFields] = useState([])
    const [message, setMessage] = useState('')

    return {
        message,
        missingFields,
        setMessage,
        setMissingFields,
        setShowComments,
        setShowDeleteConfirmation,
        setShowHistory,
        setShowIssues,
        setShowMissingFieldsModal,
        setShowOperatorModal,
        setShowPlantModal,
        showComments,
        showDeleteConfirmation,
        showHistory,
        showIssues,
        showMissingFieldsModal,
        showOperatorModal,
        showPlantModal
    }
}
