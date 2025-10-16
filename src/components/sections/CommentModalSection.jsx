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
                    <h2>Comments for {itemType} {itemNumber || itemId}</h2>
                    <button className="comment-modal-close-button" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="comment-modal-content">
                    <ErrorMessage
                        message={error}
                        onDismiss={() => setError(null)}
                    />
                    <div className="comment-modal-add-section">
                        <h3>Add New Comment</h3>
                        <form onSubmit={handleAddComment}>
                            <textarea
                                className="comment-modal-textarea"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write your comment here..."
                                disabled={isSubmitting}
                            ></textarea>
                            <button
                                type="submit"
                                className="comment-modal-add-button"
                                disabled={isSubmitting || !newComment.trim()}
                            >
                                {isSubmitting ? 'Adding...' : 'Add Comment'}
                            </button>
                        </form>
                    </div>
                    <div className="comment-modal-list">
                        <h3>Comments History</h3>
                        {isLoading ? (
                            <div className="comment-modal-loading">
                                <LoadingScreen message="Loading comments..." inline={true}/>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="comment-modal-empty">
                                <i className="fas fa-comments comment-modal-empty-icon"></i>
                                <p>No comments yet</p>
                                <p className="comment-modal-empty-subtext">Be the first to add a comment about
                                    this {itemType.toLowerCase()}</p>
                            </div>
                        ) : (
                            <div className="comment-modal-section">
                                {sortedComments.map(comment => (
                                    <div key={comment.id} className="comment-modal-item">
                                        <div className="comment-modal-item-header">
                                            <span className="comment-modal-author">
                                                <i className="fas fa-user"></i> {getAuthorName(comment)}
                                            </span>
                                            <span className="comment-modal-date">
                                                {formatDate(comment.createdAt || comment.created_at)}
                                            </span>
                                            <div className="comment-modal-actions">
                                                <button
                                                    className="comment-modal-delete-button"
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
                <div className="comment-modal-footer">
                    <button className="comment-modal-cancel-button" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default CommentModalSection;

