import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import LoadingScreen from '../common/LoadingScreen';
import ErrorMessage from '../common/ErrorMessage';
import {UserService} from '../../services/UserService';

function CommentModalSection({
                                 itemId,
                                 itemNumber,
                                 itemType,
                                 onClose,
                                 service
                             }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [userNames, setUserNames] = useState({});

    useEffect(() => {
        if (itemId) {
            fetchComments();
        }
    }, [itemId]);

    const fetchComments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedComments = await service.fetchComments(itemId);
            setComments(Array.isArray(fetchedComments) ? fetchedComments : []);

            const userIds = new Set();
            fetchedComments.forEach(comment => {
                if (comment.author) {
                    userIds.add(comment.author);
                }
            });

            const names = {};
            for (const userId of userIds) {
                try {
                    const displayName = await UserService.getUserDisplayName(userId);
                    names[userId] = displayName || 'Unknown';
                } catch {
                    names[userId] = 'Unknown';
                }
            }
            setUserNames(prevNames => ({...prevNames, ...names}));
        } catch (err) {
            setError('Failed to load comments. Please try again.');
            setComments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return;
        }
        try {
            await service.deleteComment(commentId);
            fetchComments();
        } catch (err) {
            setError('Failed to delete comment. Please try again.');
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) {
            setError('Please enter a comment');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const currentUser = await UserService.getCurrentUser();
            const userId = currentUser?.id || null;
            if (!userId) {
                throw new Error('You must be logged in to add comments');
            }
            await service.addComment(itemId, newComment, userId);
            setNewComment('');
            fetchComments();
        } catch (err) {
            setError(err.message || 'Failed to add comment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toLocaleString();
    };

    const getAuthorName = (comment) => {
        if (comment.author && userNames[comment.author]) {
            return userNames[comment.author];
        }
        return 'Loading...';
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('comment-modal-backdrop')) {
            onClose();
        }
    };

    const sortedComments = [...comments].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return dateB - dateA;
    });

    const styles = {
        backdrop: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
        },
        modal: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            border: '1px solid #e5e7eb'
        },
        header: {
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            borderRadius: '12px 12px 0 0'
        },
        headerContent: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem'
        },
        headerIcon: {
            fontSize: '1.25rem',
            color: '#1e3a5f'
        },
        title: {
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#1e293b',
            lineHeight: 1.2
        },
        subtitle: {
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        closeButton: {
            background: 'transparent',
            border: 'none',
            fontSize: '1.25rem',
            color: '#64748b',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.2s',
            width: '2rem',
            height: '2rem'
        },
        content: {
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem'
        },
        addSection: {
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: '1px solid #e5e7eb'
        },
        formRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        },
        textarea: {
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontFamily: 'inherit',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            resize: 'vertical',
            transition: 'all 0.2s',
            background: 'white',
            color: '#1e293b'
        },
        addButton: (disabled) => ({
            background: disabled ? '#94a3b8' : '#1e3a5f',
            color: 'white',
            border: 'none',
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            alignSelf: 'flex-end',
            opacity: disabled ? 0.4 : 1
        }),
        loading: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        },
        empty: {
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: '#64748b'
        },
        emptyIcon: {
            fontSize: '2.5rem',
            marginBottom: '0.75rem',
            opacity: 0.3
        },
        emptyText: {
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 500
        },
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb'
        },
        sectionTitle: {
            margin: 0,
            fontWeight: 700,
            color: '#1e293b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.75rem'
        },
        count: {
            background: '#e5e7eb',
            color: '#1e293b',
            padding: '0.25rem 0.625rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700
        },
        item: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '0.875rem',
            marginBottom: '0.625rem',
            transition: 'all 0.2s'
        },
        itemTop: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.625rem',
            flexWrap: 'wrap'
        },
        meta: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: 1
        },
        author: {
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
        },
        date: {
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 500
        },
        actions: {
            marginLeft: 'auto',
            display: 'flex',
            gap: '0.375rem'
        },
        deleteButton: {
            border: 'none',
            padding: '0.375rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.875rem',
            height: '1.875rem',
            transition: 'all 0.2s',
            fontSize: '0.75rem',
            background: '#ef4444',
            color: 'white'
        },
        text: {
            color: '#1e293b',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.875rem'
        }
    };

    if (typeof document === 'undefined' || !document.body) {
        return null;
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
                                <h2 style={styles.title}>{itemType} {itemNumber || itemId}</h2>
                                <span style={styles.subtitle}>Comments</span>
                            </div>
                        </div>
                        <button
                            style={styles.closeButton}
                            onClick={onClose}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e5e7eb';
                                e.currentTarget.style.color = '#1e293b';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#64748b';
                            }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div style={styles.content}>
                        <ErrorMessage message={error} onDismiss={() => setError(null)}/>
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
                                        e.currentTarget.style.borderColor = '#1e3a5f';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                ></textarea>
                                <button
                                    type="submit"
                                    style={styles.addButton(isSubmitting || !newComment.trim())}
                                    disabled={isSubmitting || !newComment.trim()}
                                    onMouseEnter={(e) => {
                                        if (!isSubmitting && newComment.trim()) {
                                            e.currentTarget.style.background = '#163352';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 58, 95, 0.25)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSubmitting && newComment.trim()) {
                                            e.currentTarget.style.background = '#1e3a5f';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    <i className="fas fa-plus" style={{fontSize: '0.75rem'}}></i>
                                    {isSubmitting ? 'Adding...' : 'Add Comment'}
                                </button>
                            </div>
                        </form>
                        <div>
                            {isLoading ? (
                                <div style={styles.loading}>
                                    <LoadingScreen message="Loading comments..." inline={true}/>
                                </div>
                            ) : comments.length === 0 ? (
                                <div style={styles.empty}>
                                    <i className="fas fa-comment-slash" style={styles.emptyIcon}></i>
                                    <p style={styles.emptyText}>No comments yet</p>
                                </div>
                            ) : (
                                <div style={{marginBottom: '1.5rem'}}>
                                    <div style={styles.sectionHeader}>
                                        <h4 style={styles.sectionTitle}>All Comments</h4>
                                        <span style={styles.count}>{comments.length}</span>
                                    </div>
                                    {sortedComments.map(comment => (
                                        <div
                                            key={comment.id}
                                            style={styles.item}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#93c5fd';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={styles.itemTop}>
                                                <div style={styles.meta}>
                                                    <span style={styles.author}>
                                                        <i className="fas fa-user" style={{fontSize: '0.625rem'}}></i>
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
                                                            e.currentTarget.style.background = '#dc2626';
                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#ef4444';
                                                            e.currentTarget.style.transform = 'translateY(0)';
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
    );
}

export default CommentModalSection;

