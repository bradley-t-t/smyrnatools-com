import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../services/UserService'
import ErrorMessage from '../common/ErrorMessage'
import LoadingScreen from '../common/LoadingScreen'

function IssueModalSection({ itemId, itemNumber, itemType, onClose, service }) {
    const [issues, setIssues] = useState([])
    const [newIssue, setNewIssue] = useState('')
    const [severity, setSeverity] = useState('Medium')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [userNames, setUserNames] = useState({})
    const [canDelete, setCanDelete] = useState(false)

    useEffect(() => {
        if (itemId) {
            fetchIssues()
        }
    }, [itemId])

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

    const sortedIssues = [...issues].sort((a, b) => {
        return new Date(b.time_created) - new Date(a.time_created)
    })

    const openIssues = sortedIssues.filter((issue) => !issue.time_completed)
    const resolvedIssues = sortedIssues.filter((issue) => issue.time_completed)

    const fetchIssues = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const fetchedIssues = await service.fetchIssues(itemId)
            setIssues(Array.isArray(fetchedIssues) ? fetchedIssues : [])

            const userIds = new Set()
            fetchedIssues.forEach((issue) => {
                if (issue.created_by) {
                    userIds.add(issue.created_by)
                }
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
        } catch (err) {
            setError('Failed to load issues. Please try again.')
            setIssues([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteIssue = async (issueId) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) {
            return
        }
        try {
            await service.deleteIssue(issueId)
            fetchIssues()
        } catch (err) {
            setError('Failed to delete issue. Please try again.')
        }
    }

    const handleCompleteIssue = async (issueId) => {
        try {
            await service.completeIssue(issueId)
            fetchIssues()
        } catch (err) {
            setError('Failed to complete issue. Please try again.')
        }
    }

    const handleAddIssue = async (e) => {
        e.preventDefault()
        if (!newIssue.trim()) {
            setError('Please enter an issue description')
            return
        }
        setIsSubmitting(true)
        setError(null)
        try {
            const currentUser = await UserService.getCurrentUser()
            const userId = currentUser?.id || null
            if (!userId) {
                throw new Error('You must be logged in to add an issue')
            }
            await service.addIssue(itemId, newIssue, severity, userId)
            setNewIssue('')
            setSeverity('Medium')
            fetchIssues()
        } catch (err) {
            setError(err.message || 'Failed to add issue. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Not completed'
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    const getCreatorName = (issue) => {
        if (issue.created_by && userNames[issue.created_by]) {
            return userNames[issue.created_by]
        }
        return 'Unknown'
    }

    const getSeverityStyles = (severityLevel) => {
        switch (severityLevel) {
            case 'High':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'Medium':
                return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'Low':
                return 'bg-green-100 text-green-800 border-green-200'
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200'
        }
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-[600px] w-full max-h-[85vh] flex flex-col border border-gray-200">
                <div className="bg-slate-50 flex justify-between items-center px-6 py-5 border-b border-gray-200 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-exclamation-triangle text-xl text-amber-500"></i>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 m-0">
                                {itemType} {itemNumber || itemId}
                            </h2>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                Issue Management
                            </span>
                        </div>
                    </div>
                    <button
                        className="bg-transparent border-none text-xl text-slate-500 cursor-pointer p-2 flex items-center justify-center rounded-md hover:bg-gray-200 hover:text-slate-800 w-8 h-8"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <ErrorMessage message={error} onDismiss={() => setError(null)} />

                    <form onSubmit={handleAddIssue} className="mb-6 p-4 bg-slate-50 rounded-lg border border-gray-200">
                        <div className="flex flex-col gap-3">
                            <textarea
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                                value={newIssue}
                                onChange={(e) => setNewIssue(e.target.value)}
                                placeholder="Describe the issue..."
                                disabled={isSubmitting}
                                rows="3"
                            ></textarea>
                            <div className="flex items-center gap-3">
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value)}
                                    disabled={isSubmitting}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-[#2d4a6f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={isSubmitting || !newIssue.trim()}
                                >
                                    <i className="fas fa-plus"></i>
                                    {isSubmitting ? 'Adding...' : 'Add Issue'}
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="flex flex-col gap-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <LoadingScreen message="Loading issues..." inline={true} />
                            </div>
                        ) : issues.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <i className="fas fa-clipboard-check text-4xl mb-3 opacity-50"></i>
                                <p className="m-0 text-sm">No issues reported</p>
                            </div>
                        ) : (
                            <>
                                {openIssues.length > 0 && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <h4 className="m-0 text-sm font-bold text-slate-800 uppercase tracking-wide">
                                                Open
                                            </h4>
                                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {openIssues.length}
                                            </span>
                                        </div>
                                        {openIssues.map((issue) => (
                                            <div
                                                key={issue.id}
                                                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <span
                                                        className={`text-xs font-bold px-2 py-1 rounded border ${getSeverityStyles(issue.severity)}`}
                                                    >
                                                        {issue.severity}
                                                    </span>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <i className="fas fa-user"></i>
                                                            {getCreatorName(issue)}
                                                        </span>
                                                        <span>{formatDate(issue.time_created)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                                            onClick={() => handleCompleteIssue(issue.id)}
                                                            title="Mark as resolved"
                                                        >
                                                            <i className="fas fa-check text-xs"></i>
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                                onClick={() => handleDeleteIssue(issue.id)}
                                                                title="Delete issue"
                                                            >
                                                                <i className="fas fa-trash text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-slate-700 leading-relaxed">
                                                    {issue.issue}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resolvedIssues.length > 0 && (
                                    <div className="flex flex-col gap-3 mt-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <h4 className="m-0 text-sm font-bold text-slate-800 uppercase tracking-wide">
                                                Resolved
                                            </h4>
                                            <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {resolvedIssues.length}
                                            </span>
                                        </div>
                                        {resolvedIssues.map((issue) => (
                                            <div
                                                key={issue.id}
                                                className="bg-slate-50 border border-gray-200 rounded-lg p-4 opacity-75"
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <span
                                                        className={`text-xs font-bold px-2 py-1 rounded border ${getSeverityStyles(issue.severity)}`}
                                                    >
                                                        {issue.severity}
                                                    </span>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <i className="fas fa-user"></i>
                                                            {getCreatorName(issue)}
                                                        </span>
                                                        <span>{formatDate(issue.time_created)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {canDelete && (
                                                            <button
                                                                className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                                onClick={() => handleDeleteIssue(issue.id)}
                                                                title="Delete issue"
                                                            >
                                                                <i className="fas fa-trash text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-slate-700 leading-relaxed">
                                                    {issue.issue}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
                                                    <i className="fas fa-check-circle"></i>
                                                    {formatDate(issue.time_completed)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default IssueModalSection
