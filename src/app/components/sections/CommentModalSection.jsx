import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import ErrorMessage from '../common/ErrorMessage'
import LoadingScreen from '../common/LoadingScreen'
/**
 * Portal-rendered modal for viewing, adding, and deleting comments on an asset.
 * Resolves author UUIDs to display names and shows relative timestamps.
 * @param {Object} props
 * @param {string} props.itemId - ID of the asset to fetch comments for.
 * @param {string} props.itemNumber - Display number shown in the header.
 * @param {string} props.itemType - Asset type label (e.g. "Mixer", "Tractor").
 * @param {Function} props.onClose - Closes the modal.
 * @param {Object} props.service - Asset service with fetchComments, addComment, deleteComment.
 */
function CommentModalSection({ itemId, itemNumber, itemType, onClose, service }) {
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [userNames, setUserNames] = useState({})
    const fetchComments = useCallback(async () => {
        setIsLoading(true)
        setError(null)
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
            setUserNames((prev) => ({ ...prev, ...names }))
        } catch {
            setError('Failed to load comments. Please try again.')
            setComments([])
        } finally {
            setIsLoading(false)
        }
    }, [itemId, service])
    useEffect(() => {
        if (itemId) {
            fetchComments()
        }
    }, [itemId, fetchComments])
    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return
        try {
            await service.deleteComment(commentId)
            fetchComments()
        } catch {
            setError('Failed to delete comment. Please try again.')
        }
    }
    const handleAddComment = async (e) => {
        e.preventDefault()
        if (!newComment.trim()) {
            setError('Please enter a comment')
            return
        }
        setIsSubmitting(true)
        setError(null)
        try {
            const currentUser = await UserService.getCurrentUser()
            const userId = currentUser?.id || null
            if (!userId) {
                setError('You must be logged in to add comments')
                return
            }
            await service.addComment(itemId, newComment, userId)
            setNewComment('')
            fetchComments()
        } catch (err) {
            setError(err.message || 'Failed to add comment. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }
    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diff = now - date
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString()
    }
    const getAuthorName = (comment) => {
        if (comment.author && userNames[comment.author]) return userNames[comment.author]
        return 'Loading...'
    }
    const getInitials = (name) => {
        if (!name || name === 'Loading...') return '?'
        const parts = name.split(' ')
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return name.slice(0, 2).toUpperCase()
    }
    const getAvatarGradient = (name) => {
        const gradients = [
            'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
        ]
        if (!name) return gradients[0]
        let hash = 0
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        return gradients[Math.abs(hash) % gradients.length]
    }
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose()
    }
    const sortedComments = [...comments].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at)
        const dateB = new Date(b.createdAt || b.created_at)
        return dateB - dateA
    })
    if (typeof document === 'undefined' || !document.body) return null
    const isSubmitDisabled = isSubmitting || !newComment.trim()
    return ReactDOM.createPortal(
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 backdrop-blur-lg animate-comment-fade-in"
            style={{ background: 'rgba(15, 23, 42, 0.7)' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="animate-comment-slide-in bg-bg-secondary rounded-[20px] shadow-modal flex flex-col max-h-[90vh] max-w-[580px] w-full overflow-hidden"
            >
                {/* Header */}
                <div
                    className="relative border-b border-border-light p-6 max-[480px]:p-4"
                    style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-hover) 100%)' }}
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 flex items-center justify-center w-9 h-9 bg-bg-hover border-none rounded-[10px] text-text-secondary text-base cursor-pointer transition-all duration-200 hover:bg-border-medium"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-[52px] h-[52px] bg-bg-hover rounded-[14px] max-[480px]:w-10 max-[480px]:h-10 max-[480px]:rounded-[10px]">
                            <i className="fas fa-comments text-text-secondary text-2xl max-[480px]:text-lg"></i>
                        </div>
                        <div>
                            <div className="text-text-secondary text-xs font-semibold uppercase tracking-[1px] mb-0.5">
                                {itemType}
                            </div>
                            <div className="text-text-primary text-[22px] font-bold max-[480px]:text-lg">
                                {itemNumber || itemId}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="bg-bg-hover rounded-lg text-text-secondary text-[13px] font-semibold py-2 px-3.5">
                            <i className="fas fa-comment mr-2"></i>
                            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                        </span>
                    </div>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 max-[480px]:p-3">
                    <ErrorMessage message={error} onDismiss={() => setError(null)} />
                    {/* Comment form */}
                    <form onSubmit={handleAddComment} className="mb-5">
                        <div className="bg-bg-primary rounded-[14px] shadow-sm p-4 max-[480px]:p-3">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                disabled={isSubmitting}
                                rows="2"
                                className="w-full bg-bg-secondary border-2 border-transparent rounded-[10px] text-text-primary font-[inherit] text-[15px] outline-none p-3.5 resize-none transition-all duration-200 focus:border-red-600 focus:bg-bg-primary"
                            />
                            <div className="flex justify-end mt-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitDisabled}
                                    className={`flex items-center gap-1.5 border-none rounded-[10px] text-white text-[13px] font-semibold py-2.5 px-5 transition-all duration-200 ${isSubmitDisabled ? 'bg-border-medium cursor-not-allowed shadow-none' : 'cursor-pointer'}`}
                                    style={
                                        isSubmitDisabled
                                            ? undefined
                                            : {
                                                  background: 'linear-gradient(135deg, var(--accent), #0f172a)',
                                                  boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)'
                                              }
                                    }
                                >
                                    <i className="fas fa-paper-plane text-xs"></i>
                                    {isSubmitting ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </form>
                    {/* Comments list */}
                    {isLoading ? (
                        <div className="flex items-center justify-center p-12">
                            <LoadingScreen message="Loading comments..." inline={true} />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center py-12 px-4 text-center">
                            <div className="flex items-center justify-center w-16 h-16 bg-bg-hover rounded-full mb-4">
                                <i className="fas fa-comment-dots text-text-secondary text-2xl"></i>
                            </div>
                            <p className="text-text-secondary text-[15px] font-medium m-0">No comments yet</p>
                            <p className="text-text-secondary text-[13px] mt-1 mb-0">Be the first to add a comment</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {sortedComments.map((comment) => {
                                const authorName = getAuthorName(comment)
                                const avatarGradient = getAvatarGradient(authorName)
                                return (
                                    <div
                                        key={comment.id}
                                        className="bg-bg-primary rounded-xl shadow-sm p-4 transition-all duration-200 hover:translate-x-1 hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="flex items-center justify-center shrink-0 w-9 h-9 rounded-full border-2 border-white/20 text-white text-xs font-bold"
                                                style={{
                                                    background: avatarGradient,
                                                    boxShadow: '0 2px 8px rgba(30, 58, 95, 0.25)'
                                                }}
                                            >
                                                {getInitials(authorName)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-text-primary text-sm font-semibold">
                                                        {authorName}
                                                    </span>
                                                    <span className="text-text-secondary text-xs">
                                                        {formatDate(comment.createdAt || comment.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-text-secondary text-[15px] leading-relaxed m-0 whitespace-pre-wrap break-words">
                                                    {comment.text}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                title="Delete"
                                                className="flex items-center justify-center shrink-0 w-8 h-8 bg-red-50 border-none rounded-lg text-red-500 text-xs cursor-pointer transition-all duration-150 hover:bg-red-100"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
export default CommentModalSection
