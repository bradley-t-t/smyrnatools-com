import { useCallback, useEffect, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { UserService } from '../../services/UserService'

const INITIAL_SECTIONS_READY = {
    checklist: false,
    comments: false,
    issues: false,
    operator: false
}

/**
 * Loads operator, issues, and comments data for the verification modal and
 * orchestrates staggered "section ready" reveals after the modal opens.
 * Returns state, fetch helpers, and the section-ready map.
 */
export default function useVerificationModalData({ assignedOperator, itemId, open, service }) {
    const [operatorData, setOperatorData] = useState(null)
    const [operatorPhone, setOperatorPhone] = useState('')
    const [operatorRating, setOperatorRating] = useState(0)
    const [issues, setIssues] = useState([])
    const [isLoadingOperator, setIsLoadingOperator] = useState(false)
    const [isLoadingIssues, setIsLoadingIssues] = useState(false)
    const [userNames, setUserNames] = useState({})
    const [comments, setComments] = useState([])
    const [isLoadingComments, setIsLoadingComments] = useState(false)
    const [canDelete, setCanDelete] = useState(false)
    const [sectionsReady, setSectionsReady] = useState(INITIAL_SECTIONS_READY)

    useEffect(() => {
        async function checkDeletePermission() {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || null
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.bypass.plantrestriction')
                    setCanDelete(hasPermission)
                }
            } catch {
                setCanDelete(false)
            }
        }
        checkDeletePermission()
    }, [])

    const fetchOperatorData = useCallback(async () => {
        setIsLoadingOperator(true)
        try {
            const { data, error } = await Database.from('operators')
                .select('*')
                .eq('employee_id', assignedOperator)
                .single()
            if (error) {
                console.error('Failed to fetch operator:', error)
                setOperatorData(null)
            } else if (data) {
                setOperatorData(data)
                setOperatorPhone(data.phone || '')
                setOperatorRating(typeof data.rating === 'number' ? data.rating : Number(data.rating) || 0)
            }
        } catch (error) {
            console.error('Failed to fetch operator:', error)
            setOperatorData(null)
        } finally {
            setIsLoadingOperator(false)
        }
    }, [assignedOperator])

    const fetchIssues = useCallback(async () => {
        setIsLoadingIssues(true)
        try {
            const fetchedIssues = await service.fetchIssues(itemId)
            setIssues(Array.isArray(fetchedIssues) ? fetchedIssues : [])
            const userIds = new Set()
            fetchedIssues.forEach((issue) => {
                if (issue.created_by) userIds.add(issue.created_by)
            })
            const names = {}
            for (const userId of userIds) {
                try {
                    const displayName = await UserService.getUserDisplayName(userId)
                    names[userId] = displayName || 'Unknown'
                } catch {
                    names[userId] = 'Unknown'
                }
            }
            setUserNames((prevNames) => ({ ...prevNames, ...names }))
        } catch (error) {
            console.error('Failed to fetch issues:', error)
            setIssues([])
        } finally {
            setIsLoadingIssues(false)
        }
    }, [service, itemId])

    const fetchComments = useCallback(async () => {
        setIsLoadingComments(true)
        try {
            const fetchedComments = await service.fetchComments(itemId)
            setComments(Array.isArray(fetchedComments) ? fetchedComments : [])
            const userIds = new Set()
            fetchedComments.forEach((comment) => {
                if (comment.author) userIds.add(comment.author)
            })
            const names = {}
            for (const userId of userIds) {
                try {
                    const displayName = await UserService.getUserDisplayName(userId)
                    names[userId] = displayName || 'Unknown'
                } catch {
                    names[userId] = 'Unknown'
                }
            }
            setUserNames((prevNames) => ({ ...prevNames, ...names }))
        } catch (error) {
            console.error('Failed to fetch comments:', error)
            setComments([])
        } finally {
            setIsLoadingComments(false)
        }
    }, [service, itemId])

    useEffect(() => {
        if (!open) {
            setSectionsReady(INITIAL_SECTIONS_READY)
            return
        }
        const timers = []
        const delay = (fn, ms) => {
            const id = setTimeout(fn, ms)
            timers.push(id)
        }
        delay(() => setSectionsReady((prev) => ({ ...prev, checklist: true })), 50)
        if (assignedOperator) {
            fetchOperatorData().then(() => {
                delay(() => setSectionsReady((prev) => ({ ...prev, operator: true })), 150)
            })
        } else {
            delay(() => setSectionsReady((prev) => ({ ...prev, operator: true })), 150)
        }
        if (itemId && service) {
            fetchIssues().then(() => {
                delay(() => setSectionsReady((prev) => ({ ...prev, issues: true })), 250)
            })
            fetchComments().then(() => {
                delay(() => setSectionsReady((prev) => ({ ...prev, comments: true })), 350)
            })
        } else {
            delay(() => setSectionsReady((prev) => ({ ...prev, comments: true, issues: true })), 250)
        }
        return () => timers.forEach(clearTimeout)
    }, [open, assignedOperator, itemId, fetchOperatorData, fetchIssues, fetchComments, service])

    return {
        canDelete,
        comments,
        fetchComments,
        fetchIssues,
        fetchOperatorData,
        isLoadingComments,
        isLoadingIssues,
        isLoadingOperator,
        issues,
        operatorData,
        operatorPhone,
        operatorRating,
        sectionsReady,
        setOperatorPhone,
        setOperatorRating,
        userNames
    }
}
