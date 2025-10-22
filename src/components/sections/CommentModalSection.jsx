import React, {useEffect, useState} from 'react';
import LoadingScreen from '../common/LoadingScreen';
import ErrorMessage from '../common/ErrorMessage';
import {UserService} from '../../services/UserService';
import './styles/CommentModal.css';

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

    return (
        <div className="comment-modal-backdrop" onClick={handleBackdropClick}>
            <div className="comment-modal">
                <div className="comment-modal-header">
                    <div className="comment-modal-header-content">
                        <i className="fas fa-comment-dots"></i>
                        <div>
                            <h2>{itemType} {itemNumber || itemId}</h2>
                            <span className="comment-modal-subtitle">Comments</span>
                        </div>
                    </div>
                    <button className="comment-modal-close-button" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="comment-modal-content">
                    <ErrorMessage message={error} onDismiss={() => setError(null)} />
                    <form onSubmit={handleAddComment} className="comment-modal-add-section">
                        <div className="comment-modal-form-row">
                            <textarea
                                className="comment-modal-textarea"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write your comment..."
                                disabled={isSubmitting}
                                rows="3"
                            ></textarea>
                            <button
                                type="submit"
                                className="comment-modal-add-button"
                                disabled={isSubmitting || !newComment.trim()}
                            >
                                <i className="fas fa-plus"></i>
                                {isSubmitting ? 'Adding...' : 'Add Comment'}
                            </button>
                        </div>
                    </form>
                    <div className="comment-modal-list">
                        {isLoading ? (
                            <div className="comment-modal-loading">
                                <LoadingScreen message="Loading comments..." inline={true}/>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="comment-modal-empty">
                                <i className="fas fa-comment-slash"></i>
                                <p>No comments yet</p>
                            </div>
                        ) : (
                            <div className="comment-modal-section">
                                <div className="comment-modal-section-header">
                                    <h4>All Comments</h4>
                                    <span className="comment-modal-count">{comments.length}</span>
                                </div>
                                {sortedComments.map(comment => (
                                    <div key={comment.id} className="comment-modal-item">
                                        <div className="comment-modal-item-top">
                                            <div className="comment-modal-meta">
                                                <span className="comment-modal-author">
                                                    <i className="fas fa-user"></i>
                                                    {getAuthorName(comment)}
                                                </span>
                                                <span className="comment-modal-date">
                                                    {formatDate(comment.createdAt || comment.created_at)}
                                                </span>
                                            </div>
                                            <div className="comment-modal-actions">
                                                <button
                                                    className="comment-modal-action-btn delete"
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    title="Delete comment"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="comment-modal-text">{comment.text}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CommentModalSection;

