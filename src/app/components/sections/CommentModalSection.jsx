/* eslint-disable react/forbid-dom-props */
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
import Badge from '../common/Badge'
import ConfirmDialog from '../common/ConfirmDialog'
import ErrorMessage from '../common/ErrorMessage'
import Skeleton, { SkeletonStack } from '../common/Skeleton'
import UserAvatar from '../common/UserAvatar'

function CommentRowSkeleton() {
    return (
        <div className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border-light last:border-b-0">
            <Skeleton className="h-7 w-7 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-6 w-6 shrink-0" />
        </div>
    )
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

/**
 * Comment thread for an asset or person.
 *
 * @param {Object}   props
 * @param {string}   props.itemId       - DB id of the parent record.
 * @param {string}   props.itemNumber   - Human-readable identifier (truck #, name, etc.).
 * @param {string}   props.itemType     - Label like "Mixer" / "Operator".
 * @param {Function} props.onClose      - Invoked when the user dismisses the surface.
 * @param {Object}   props.service      - Service exposing fetchComments/addComment/deleteComment.
 * @param {'modal'|'panel'} [props.displayMode='modal']
 *        'modal' renders a centered portal with overlay (default).
 *        'panel' renders inline as a flush-fitting card — used as a right-side
 *        side panel on the asset/people list views. No portal, no overlay.
 */
function CommentModalSection({ itemId, itemNumber, itemType, onClose, service, displayMode = 'modal' }) {
    const { preferences } = usePreferences()
    const accent = preferences?.accentColor || '#1e3a5f'
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [userNames, setUserNames] = useState({})
    const [pendingDeleteId, setPendingDeleteId] = useState(null)

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
        if (itemId) fetchComments()
    }, [itemId, fetchComments])

    const handleDeleteComment = (commentId) => setPendingDeleteId(commentId)

    const confirmDeleteComment = async () => {
        const commentId = pendingDeleteId
        setPendingDeleteId(null)
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

    const getAuthorName = (comment) => {
        if (comment.author && userNames[comment.author]) return userNames[comment.author]
        return 'Loading...'
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
    const isPanel = displayMode === 'panel'

    const card = (
        <div
            onClick={isPanel ? undefined : (e) => e.stopPropagation()}
            className={
                isPanel
                    ? 'flex flex-col h-full w-full overflow-hidden rounded bg-bg-primary border border-border-light'
                    : 'flex flex-col max-h-[90vh] max-w-[560px] w-full overflow-hidden rounded bg-bg-primary border border-border-light'
            }
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 bg-bg-tertiary text-text-secondary">
                        <i className="fas fa-comments text-[12px]" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                            {itemType} · {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                        </div>
                        <div className="text-[14px] font-semibold font-mono tabular-nums truncate text-text-primary">
                            {itemNumber || itemId}
                        </div>
                    </div>
                </div>
                <button type="button"
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded transition-colors bg-transparent text-text-secondary"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <i className="fas fa-times text-[12px]" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
                <ErrorMessage message={error} onDismiss={() => setError(null)} />

                <form onSubmit={handleAddComment} className="mb-3">
                    <div className="rounded p-2.5 bg-bg-secondary border border-border-light">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            aria-label="Write a comment"
                            disabled={isSubmitting}
                            rows="2"
                            className="w-full rounded outline-none p-2 resize-none text-[12px] bg-bg-primary border border-border-light text-text-primary placeholder:text-text-tertiary transition-colors duration-150 hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex justify-end mt-2">
                            <Badge
                                as="button"
                                type="submit"
                                disabled={isSubmitDisabled}
                                variant="custom"
                                size="md"
                                shape="rounded"
                                weight="semibold"
                                icon="paper-plane"
                                onClick={undefined}
                                className={`gap-1.5 ${isSubmitDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                style={{
                                    background: isSubmitDisabled ? 'var(--bg-tertiary)' : accent,
                                    color: isSubmitDisabled ? 'var(--text-tertiary)' : '#fff'
                                }}
                            >
                                {isSubmitting ? 'Posting' : 'Post'}
                            </Badge>
                        </div>
                    </div>
                </form>

                {isLoading ? (
                    <div className="rounded overflow-hidden bg-bg-primary border border-border-light">
                        <SkeletonStack count={3} gapClassName="gap-0">
                            {() => <CommentRowSkeleton />}
                        </SkeletonStack>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center py-8 px-4 text-center text-text-tertiary">
                        <i className="fas fa-comment-dots text-2xl mb-2" />
                        <p className="text-[12px] m-0 font-semibold text-text-secondary">No comments yet</p>
                        <p className="text-[10.5px] mt-1 mb-0">Be the first to add a comment</p>
                    </div>
                ) : (
                    <div className="rounded overflow-hidden bg-bg-primary border border-border-light">
                        {sortedComments.map((comment) => {
                            const authorName = getAuthorName(comment)
                            return (
                                <div
                                    key={comment.id}
                                    className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border-light"
                                >
                                    <UserAvatar name={authorName} userId={comment.author} size="md" rounded="md" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[12px] font-semibold text-text-primary">
                                                {authorName}
                                            </span>
                                            <span className="text-[10.5px] font-mono tabular-nums text-text-tertiary">
                                                {formatDate(comment.createdAt || comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap break-words text-text-secondary">
                                            {comment.text}
                                        </p>
                                    </div>
                                    <button type="button"
                                        onClick={() => handleDeleteComment(comment.id)}
                                        title="Delete"
                                        className="w-6 h-6 flex items-center justify-center shrink-0 rounded transition-colors bg-transparent text-text-tertiary"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-tertiary)'
                                            e.currentTarget.style.color = '#dc2626'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent'
                                            e.currentTarget.style.color = 'var(--text-tertiary)'
                                        }}
                                    >
                                        <i className="fas fa-trash text-[10px]" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )

    const confirmDialog = (
        <ConfirmDialog
            isOpen={pendingDeleteId !== null}
            onConfirm={confirmDeleteComment}
            onCancel={() => setPendingDeleteId(null)}
            title="Delete Comment"
            message="Are you sure you want to delete this comment?"
            confirmLabel="Delete"
            variant="danger"
        />
    )

    if (isPanel) {
        return (
            <>
                {card}
                {confirmDialog}
            </>
        )
    }

    return ReactDOM.createPortal(
        <>
            <div
                onClick={handleBackdropClick}
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[rgba(15,_23,_42,_0.65)]"
            >
                {card}
            </div>
            {confirmDialog}
        </>,
        document.body
    )
}

export default CommentModalSection
