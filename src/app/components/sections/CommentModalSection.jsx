import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import ErrorMessage from '../common/ErrorMessage'
import LoadingScreen from '../common/LoadingScreen'

function CommentModalSection({ itemId, itemNumber, itemType, onClose, service }) {
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [userNames, setUserNames] = useState({})

    useEffect(() => {
        if (itemId) {
            fetchComments()
        }
    }, [itemId])

    const fetchComments = async () => {
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
    }

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
            'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)',
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

    return ReactDOM.createPortal(
        <>
            <style>{`
                @keyframes commentSlideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes commentFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .comment-card-hover:hover {
                    transform: translateX(4px);
                    box-shadow: -4px 0 0 0 #94a3b8, 0 4px 20px rgba(0,0,0,0.08);
                }
            `}</style>
            <div
                onClick={handleBackdropClick}
                style={{
                    alignItems: 'center',
                    animation: 'commentFadeIn 0.2s ease',
                    backdropFilter: 'blur(8px)',
                    background: 'rgba(15, 23, 42, 0.7)',
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    left: 0,
                    padding: '1rem',
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    zIndex: 2000
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        animation: 'commentSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        background: '#f8fafc',
                        borderRadius: '20px',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '90vh',
                        maxWidth: '580px',
                        overflow: 'hidden',
                        width: '100%'
                    }}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                            borderBottom: '1px solid #e2e8f0',
                            padding: '1.5rem',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                alignItems: 'center',
                                background: '#e2e8f0',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '1rem',
                                height: '36px',
                                justifyContent: 'center',
                                position: 'absolute',
                                right: '1rem',
                                top: '1rem',
                                transition: 'all 0.2s',
                                width: '36px'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#cbd5e1')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}>
                            <div
                                style={{
                                    alignItems: 'center',
                                    background: '#e2e8f0',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    height: '52px',
                                    justifyContent: 'center',
                                    width: '52px'
                                }}
                            >
                                <i className="fas fa-comments" style={{ color: '#475569', fontSize: '1.5rem' }}></i>
                            </div>
                            <div>
                                <div
                                    style={{
                                        color: '#64748b',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        letterSpacing: '1px',
                                        marginBottom: '2px',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {itemType}
                                </div>
                                <div style={{ color: '#1e293b', fontSize: '1.375rem', fontWeight: 700 }}>
                                    {itemNumber || itemId}
                                </div>
                            </div>
                        </div>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <span
                                style={{
                                    background: '#e2e8f0',
                                    borderRadius: '8px',
                                    color: '#475569',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    padding: '0.5rem 0.875rem'
                                }}
                            >
                                <i className="fas fa-comment" style={{ marginRight: '0.5rem' }}></i>
                                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                            </span>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                        <ErrorMessage message={error} onDismiss={() => setError(null)} />

                        <form onSubmit={handleAddComment} style={{ marginBottom: '1.25rem' }}>
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: '14px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    padding: '1rem'
                                }}
                            >
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    disabled={isSubmitting}
                                    rows="2"
                                    style={{
                                        background: '#f8fafc',
                                        border: '2px solid transparent',
                                        borderRadius: '10px',
                                        color: '#1e293b',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9375rem',
                                        outline: 'none',
                                        padding: '0.875rem',
                                        resize: 'none',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#dc2626'
                                        e.currentTarget.style.background = 'white'
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'transparent'
                                        e.currentTarget.style.background = '#f8fafc'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !newComment.trim()}
                                        style={{
                                            alignItems: 'center',
                                            background:
                                                isSubmitting || !newComment.trim()
                                                    ? '#cbd5e1'
                                                    : 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            boxShadow:
                                                isSubmitting || !newComment.trim()
                                                    ? 'none'
                                                    : '0 4px 12px rgba(30, 58, 95, 0.3)',
                                            color: 'white',
                                            cursor: isSubmitting || !newComment.trim() ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            gap: '0.375rem',
                                            padding: '0.625rem 1.25rem',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <i className="fas fa-paper-plane" style={{ fontSize: '0.75rem' }}></i>
                                        {isSubmitting ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {isLoading ? (
                            <div
                                style={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    padding: '3rem'
                                }}
                            >
                                <LoadingScreen message="Loading comments..." inline={true} />
                            </div>
                        ) : comments.length === 0 ? (
                            <div
                                style={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '3rem 1rem',
                                    textAlign: 'center'
                                }}
                            >
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: '#e2e8f0',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        height: '64px',
                                        justifyContent: 'center',
                                        marginBottom: '1rem',
                                        width: '64px'
                                    }}
                                >
                                    <i
                                        className="fas fa-comment-dots"
                                        style={{ color: '#64748b', fontSize: '1.5rem' }}
                                    ></i>
                                </div>
                                <p style={{ color: '#64748b', fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>
                                    No comments yet
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: '0.25rem 0 0 0' }}>
                                    Be the first to add a comment
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                {sortedComments.map((comment) => {
                                    const authorName = getAuthorName(comment)
                                    const avatarGradient = getAvatarGradient(authorName)
                                    return (
                                        <div
                                            key={comment.id}
                                            className="comment-card-hover"
                                            style={{
                                                background: 'white',
                                                borderRadius: '12px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                padding: '1rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ alignItems: 'flex-start', display: 'flex', gap: '0.75rem' }}>
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        background: avatarGradient,
                                                        border: '2px solid rgba(255, 255, 255, 0.2)',
                                                        borderRadius: '50%',
                                                        boxShadow: '0 2px 8px rgba(30, 58, 95, 0.25)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        flexShrink: 0,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        height: '36px',
                                                        justifyContent: 'center',
                                                        width: '36px'
                                                    }}
                                                >
                                                    {getInitials(authorName)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            alignItems: 'center',
                                                            display: 'flex',
                                                            gap: '0.5rem',
                                                            marginBottom: '0.375rem'
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                color: '#1e293b',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            {authorName}
                                                        </span>
                                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                                            {formatDate(comment.createdAt || comment.created_at)}
                                                        </span>
                                                    </div>
                                                    <p
                                                        style={{
                                                            color: '#475569',
                                                            fontSize: '0.9375rem',
                                                            lineHeight: 1.5,
                                                            margin: 0,
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word'
                                                        }}
                                                    >
                                                        {comment.text}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    title="Delete"
                                                    style={{
                                                        alignItems: 'center',
                                                        background: '#fef2f2',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexShrink: 0,
                                                        fontSize: '0.75rem',
                                                        height: '32px',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s',
                                                        width: '32px'
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
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
            </div>
        </>,
        document.body
    )
}

export default CommentModalSection
