import { useCallback, useEffect, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { OperatorService } from '../../services/OperatorService'
import { UserService } from '../../services/UserService'
import { filterEquivalentEntries } from '../../utils/HistoryDataUtility'
import { HistoryUtility } from '../../utils/HistoryUtility'
import { HISTORY_SERVICE_MAP, HISTORY_TABLE_MAP, ISSUE_SERVICE_MAP } from '../constants/historyConstants'

const resolveIssueIdField = (type) => (type === 'pickup-truck' ? 'truck_id' : `${type}_id`)

/**
 * Loads asset history, operators, user profiles, and issues for the history
 * detail view, and exposes issue CRUD handlers that refetch on success.
 */
export function useHistoryDataFetchers({ item, type, assetId }) {
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [operators, setOperators] = useState([])
    const [users, setUsers] = useState([])
    const [issues, setIssues] = useState([])
    const [userNames, setUserNames] = useState({})

    const fetchOperators = useCallback(async () => {
        try {
            setOperators(await OperatorService.fetchOperators())
        } catch (e) {
            console.error('Failed to fetch operators for history:', e)
        }
    }, [])

    const fetchUsers = useCallback(async () => {
        try {
            const { data } = await Database.from('users_profiles').select('id, first_name, last_name')
            const rows = (data ?? []).map((row) => ({
                id: row.id,
                name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Unknown'
            }))
            setUsers(rows)
        } catch (e) {
            console.error('Failed to fetch user profiles for history:', e)
        }
    }, [])

    const fetchIssues = useCallback(async () => {
        if (type === 'operator') return
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) return
        try {
            const Service = await HistoryUtility.loadServiceModule(serviceName)
            const fetchedIssues = await Service.fetchIssues(item.id)
            const issuesList = Array.isArray(fetchedIssues) ? fetchedIssues : []
            setIssues(issuesList)
            const userIds = new Set(issuesList.filter((i) => i.created_by).map((i) => i.created_by))
            const names = {}
            for (const userId of userIds) {
                try {
                    names[userId] = (await UserService.getUserDisplayName(userId)) ?? 'Unknown'
                } catch (e) {
                    console.error(`Failed to resolve display name for user ${userId}:`, e)
                    names[userId] = 'Unknown'
                }
            }
            setUserNames((prev) => ({ ...prev, ...names }))
        } catch (e) {
            console.error(`Failed to fetch issues for ${type} ${item.id}:`, e)
            setIssues([])
        }
    }, [item.id, type])

    const fetchHistory = useCallback(async () => {
        const config = HISTORY_SERVICE_MAP[type]
        if (!config) return
        try {
            const Service = await HistoryUtility.loadServiceModule(config.service)
            const historyData = await Service[config.method](assetId)
            setHistory(filterEquivalentEntries(historyData ?? []))
            setError(null)
        } catch (e) {
            console.error(`Failed to fetch ${type} history via service, falling back to direct query:`, e)
            try {
                const tableName = HISTORY_TABLE_MAP[type]
                const idField = resolveIssueIdField(type)
                const { data, error: queryError } = await Database.from(tableName)
                    .select('*')
                    .eq(idField, assetId)
                    .order('changed_at', { ascending: false })
                if (queryError) throw queryError
                setHistory(filterEquivalentEntries(data ?? []))
                setError(null)
            } catch (e2) {
                console.error(`Failed to fetch ${type} history via direct query:`, e2)
                setError('Failed to load history. Please try again.')
            }
        }
    }, [type, assetId])

    useEffect(() => {
        let cancelled = false
        const loadData = async () => {
            setIsLoading(true)
            await Promise.all([fetchHistory(), fetchOperators(), fetchUsers(), fetchIssues()])
            if (!cancelled) setIsLoading(false)
        }
        loadData()
        return () => {
            cancelled = true
        }
    }, [item.id, fetchHistory, fetchOperators, fetchUsers, fetchIssues])

    const resolveIssueService = useCallback(async () => {
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) throw new Error('Invalid item type')
        return HistoryUtility.loadServiceModule(serviceName)
    }, [type])

    const handleAddIssue = async (newIssue, severity) => {
        const Service = await resolveIssueService()
        const currentUser = await UserService.getCurrentUser()
        if (!currentUser?.id) throw new Error('You must be logged in to add an issue')
        await Service.addIssue(item.id, newIssue, severity, currentUser.id)
        fetchIssues()
    }

    const handleDeleteIssue = async (issueId) => {
        const Service = await resolveIssueService()
        await Service.deleteIssue(issueId)
        fetchIssues()
    }

    const handleCompleteIssue = async (issueId) => {
        const Service = await resolveIssueService()
        await Service.completeIssue(issueId)
        fetchIssues()
    }

    return {
        error,
        fetchHistory,
        handleAddIssue,
        handleCompleteIssue,
        handleDeleteIssue,
        history,
        isLoading,
        issues,
        operators,
        setError,
        userNames,
        users
    }
}
