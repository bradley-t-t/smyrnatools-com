import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../services/UserService'
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
                if (comment.author) {
                    userIds.add(comment.author)
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
            setError('Failed to load comments. Please try again.')
            setComments([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return
        }
        try {
            await service.deleteComment(commentId)
            fetchComments()
        } catch (err) {
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
                throw new Error('You must be logged in to add comments')
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
        return isNaN(date.getTime()) ? '' : date.toLocaleString()
    }

    const getAuthorName = (comment) => {
        if (comment.author && userNames[comment.author]) {
            return userNames[comment.author]
        }
        return 'Loading...'
    }

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('comment-modal-backdrop')) {
            onClose()
        }
    }

    const sortedComments = [...comments].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at)
        const dateB = new Date(b.createdAt || b.created_at)
        return dateB - dateA
    })

    const styles = {
        actions: {
            display: 'flex',
            gap: '0.375rem',
            marginLeft: 'auto'
        },
        addButton: (disabled) => ({
            alignItems: 'center',
            alignSelf: 'flex-end',
            background: disabled ? '#94a3b8' : '#1e3a5f',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            opacity: disabled ? 0.4 : 1,
            padding: '0.625rem 1.25rem',
            transition: 'all 0.2s'
        }),
        addSection: {
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            padding: '1rem'
        },
        author: {
            alignItems: 'center',
            color: '#64748b',
            display: 'flex',
            fontSize: '0.75rem',
            fontWeight: 600,
            gap: '0.375rem'
        },
        backdrop: {
            alignItems: 'center',
            animation: 'fadeIn 0.2s ease-out',
            backdropFilter: 'blur(4px)',
            background: 'rgba(0, 0, 0, 0.5)',
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            left: 0,
            padding: '1rem',
            position: 'fixed',
            right: 0,
            top: 0,
            zIndex: 1000
        },
        closeButton: {
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '1.25rem',
            height: '2rem',
            justifyContent: 'center',
            padding: '0.5rem',
            transition: 'all 0.2s',
            width: '2rem'
        },
        content: {
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem'
        },
        count: {
            background: '#e5e7eb',
            borderRadius: '12px',
            color: '#1e293b',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.625rem'
        },
        date: {
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 500
        },
        deleteButton: {
            alignItems: 'center',
            background: '#ef4444',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.75rem',
            height: '1.875rem',
            justifyContent: 'center',
            padding: '0.375rem',
            transition: 'all 0.2s',
            width: '1.875rem'
        },
        empty: {
            color: '#64748b',
            padding: '3rem 1.5rem',
            textAlign: 'center'
        },
        emptyIcon: {
            fontSize: '2.5rem',
            marginBottom: '0.75rem',
            opacity: 0.3
        },
        emptyText: {
            fontSize: '0.9375rem',
            fontWeight: 500,
            margin: 0
        },
        formRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        },
        header: {
            alignItems: 'center',
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem'
        },
        headerContent: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.875rem'
        },
        headerIcon: {
            color: '#1e3a5f',
            fontSize: '1.25rem'
        },
        item: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '0.625rem',
            padding: '0.875rem',
            transition: 'all 0.2s'
        },
        itemTop: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '0.625rem'
        },
        loading: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '2rem'
        },
        meta: {
            alignItems: 'center',
            display: 'flex',
            flex: 1,
            gap: '0.75rem'
        },
        modal: {
            animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            maxWidth: '750px',
            width: '100%'
        },
        sectionHeader: {
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem'
        },
        sectionTitle: {
            color: '#1e293b',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            margin: 0,
            textTransform: 'uppercase'
        },
        subtitle: {
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        text: {
            color: '#1e293b',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        },
        textarea: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontFamily: 'inherit',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            padding: '0.75rem',
            resize: 'vertical',
            transition: 'all 0.2s',
            width: '100%'
        },
        title: {
            color: '#1e293b',
            fontSize: '1.125rem',
            fontWeight: 700,
            lineHeight: 1.2,
            margin: 0
        }
    }

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    return ReactDOM.createPortal(
        <>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes popIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <div style={styles.backdrop} onClick={handleBackdropClick}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.header}>
                        <div style={styles.headerContent}>
                            <i className="fas fa-comment-dots" style={styles.headerIcon}></i>
                            <div>
                                <h2 style={styles.title}>
                                    {itemType} {itemNumber || itemId}
                                </h2>
                                <span style={styles.subtitle}>Comments</span>
                            </div>
                        </div>
                        <button
                            style={styles.closeButton}
                            onClick={onClose}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e5e7eb'
                                e.currentTarget.style.color = '#1e293b'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = '#64748b'
                            }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div style={styles.content}>
                        <ErrorMessage message={error} onDismiss={() => setError(null)} />
                        <form onSubmit={handleAddComment} style={styles.addSection}>
                            <div style={styles.formRow}>
                                <textarea
                                    style={styles.textarea}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write your comment..."
                                    disabled={isSubmitting}
                                    rows="3"
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#1e3a5f'
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                ></textarea>
                                <button
                                    type="submit"
                                    style={styles.addButton(isSubmitting || !newComment.trim())}
                                    disabled={isSubmitting || !newComment.trim()}
                                    onMouseEnter={(e) => {
                                        if (!isSubmitting && newComment.trim()) {
                                            e.currentTarget.style.background = '#163352'
                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 58, 95, 0.25)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSubmitting && newComment.trim()) {
                                            e.currentTarget.style.background = '#1e3a5f'
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            e.currentTarget.style.boxShadow = 'none'
                                        }
                                    }}
                                >
                                    <i className="fas fa-plus" style={{ fontSize: '0.75rem' }}></i>
                                    {isSubmitting ? 'Adding...' : 'Add Comment'}
                                </button>
                            </div>
                        </form>
                        <div>
                            {isLoading ? (
                                <div style={styles.loading}>
                                    <LoadingScreen message="Loading comments..." inline={true} />
                                </div>
                            ) : comments.length === 0 ? (
                                <div style={styles.empty}>
                                    <i className="fas fa-comment-slash" style={styles.emptyIcon}></i>
                                    <p style={styles.emptyText}>No comments yet</p>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={styles.sectionHeader}>
                                        <h4 style={styles.sectionTitle}>All Comments</h4>
                                        <span style={styles.count}>{comments.length}</span>
                                    </div>
                                    {sortedComments.map((comment) => (
                                        <div
                                            key={comment.id}
                                            style={styles.item}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#93c5fd'
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e5e7eb'
                                                e.currentTarget.style.boxShadow = 'none'
                                            }}
                                        >
                                            <div style={styles.itemTop}>
                                                <div style={styles.meta}>
                                                    <span style={styles.author}>
                                                        <i className="fas fa-user" style={{ fontSize: '0.625rem' }}></i>
                                                        {getAuthorName(comment)}
                                                    </span>
                                                    <span style={styles.date}>
                                                        {formatDate(comment.createdAt || comment.created_at)}
                                                    </span>
                                                </div>
                                                <div style={styles.actions}>
                                                    <button
                                                        style={styles.deleteButton}
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        title="Delete comment"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#dc2626'
                                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#ef4444'
                                                            e.currentTarget.style.transform = 'translateY(0)'
                                                        }}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={styles.text}>{comment.text}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}

export default CommentModalSection
