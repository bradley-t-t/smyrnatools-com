import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import LoadingScreen from '../common/LoadingScreen';
import ErrorMessage from '../common/ErrorMessage';
import {UserService} from '../../services/UserService';
import './styles/IssueModal.css';

function IssueModalSection({
                               itemId,
                               itemNumber,
                               itemType,
                               onClose,
                               service
                           }) {
    const [issues, setIssues] = useState([]);
    const [newIssue, setNewIssue] = useState('');
    const [severity, setSeverity] = useState('Medium');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [userNames, setUserNames] = useState({});
    const [canDelete, setCanDelete] = useState(false);

    useEffect(() => {
        if (itemId) {
            fetchIssues();
        }
    }, [itemId]);

    useEffect(() => {
        async function checkDeletePermission() {
            try {
                const currentUser = await UserService.getCurrentUser();
                const userId = currentUser?.id || null;
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, "detailview.bypass.plantrestriction");
                    setCanDelete(hasPermission);
                }
            } catch {
                setCanDelete(false);
            }
        }
        checkDeletePermission();
    }, []);

    const sortedIssues = [...issues].sort((a, b) => {
        return new Date(b.time_created) - new Date(a.time_created);
    });

    const openIssues = sortedIssues.filter(issue => !issue.time_completed);
    const resolvedIssues = sortedIssues.filter(issue => issue.time_completed);

    const fetchIssues = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedIssues = await service.fetchIssues(itemId);
            setIssues(Array.isArray(fetchedIssues) ? fetchedIssues : []);

            const userIds = new Set();
            fetchedIssues.forEach(issue => {
                if (issue.created_by) {
                    userIds.add(issue.created_by);
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
            setError('Failed to load issues. Please try again.');
            setIssues([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteIssue = async (issueId) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) {
            return;
        }
        try {
            await service.deleteIssue(issueId);
            fetchIssues();
        } catch (err) {
            setError('Failed to delete issue. Please try again.');
        }
    };

    const handleCompleteIssue = async (issueId) => {
        try {
            await service.completeIssue(issueId);
            fetchIssues();
        } catch (err) {
            setError('Failed to complete issue. Please try again.');
        }
    };

    const handleAddIssue = async (e) => {
        e.preventDefault();
        if (!newIssue.trim()) {
            setError('Please enter an issue description');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const currentUser = await UserService.getCurrentUser();
            const userId = currentUser?.id || null;
            if (!userId) {
                throw new Error('You must be logged in to add an issue');
            }
            await service.addIssue(itemId, newIssue, severity, userId);
            setNewIssue('');
            setSeverity('Medium');
            fetchIssues();
        } catch (err) {
            setError(err.message || 'Failed to add issue. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not completed';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getCreatorName = (issue) => {
        if (issue.created_by && userNames[issue.created_by]) {
            return userNames[issue.created_by];
        }
        return 'Unknown';
    };

    const getSeverityClass = (severityLevel) => {
        switch (severityLevel) {
            case 'High':
                return 'severity-high';
            case 'Medium':
                return 'severity-medium';
            case 'Low':
                return 'severity-low';
            default:
                return '';
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('issue-modal-backdrop')) {
            onClose();
        }
    };

    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    return ReactDOM.createPortal(
        <div className="issue-modal-backdrop" onClick={handleBackdropClick}>
            <div className="issue-modal">
                <div className="issue-modal-header">
                    <div className="issue-modal-header-content">
                        <i className="fas fa-exclamation-triangle"></i>
                        <div>
                            <h2>{itemType} {itemNumber || itemId}</h2>
                            <span className="issue-modal-subtitle">Issue Management</span>
                        </div>
                    </div>
                    <button className="issue-modal-close-button" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="issue-modal-content">
                    <ErrorMessage message={error} onDismiss={() => setError(null)} />
                    <form onSubmit={handleAddIssue} className="issue-modal-add-section">
                        <div className="issue-modal-form-row">
                            <textarea
                                className="issue-modal-textarea"
                                value={newIssue}
                                onChange={(e) => setNewIssue(e.target.value)}
                                placeholder="Describe the issue..."
                                disabled={isSubmitting}
                                rows="3"
                            ></textarea>
                            <div className="issue-modal-form-actions">
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value)}
                                    disabled={isSubmitting}
                                    className="issue-modal-severity-select"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                                <button
                                    type="submit"
                                    className="issue-modal-add-button"
                                    disabled={isSubmitting || !newIssue.trim()}
                                >
                                    <i className="fas fa-plus"></i>
                                    {isSubmitting ? 'Adding...' : 'Add Issue'}
                                </button>
                            </div>
                        </div>
                    </form>
                    <div className="issue-modal-list">
                        {isLoading ? (
                            <div className="issue-modal-loading">
                                <LoadingScreen message="Loading issues..." inline={true}/>
                            </div>
                        ) : issues.length === 0 ? (
                            <div className="issue-modal-empty">
                                <i className="fas fa-clipboard-check"></i>
                                <p>No issues reported</p>
                            </div>
                        ) : (
                            <>
                                {openIssues.length > 0 && (
                                    <div className="issue-modal-section">
                                        <div className="issue-modal-section-header">
                                            <h4>Open</h4>
                                            <span className="issue-modal-count">{openIssues.length}</span>
                                        </div>
                                        {openIssues.map(issue => (
                                            <div key={issue.id} className="issue-modal-item">
                                                <div className="issue-modal-item-top">
                                                    <span className={`issue-modal-severity ${getSeverityClass(issue.severity)}`}>
                                                        {issue.severity}
                                                    </span>
                                                    <div className="issue-modal-meta">
                                                        <span className="issue-modal-creator">
                                                            <i className="fas fa-user"></i>
                                                            {getCreatorName(issue)}
                                                        </span>
                                                        <span className="issue-modal-date">
                                                            {formatDate(issue.time_created)}
                                                        </span>
                                                    </div>
                                                    <div className="issue-modal-actions">
                                                        <button
                                                            className="issue-modal-action-btn complete"
                                                            onClick={() => handleCompleteIssue(issue.id)}
                                                            title="Mark as resolved"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                className="issue-modal-action-btn delete"
                                                                onClick={() => handleDeleteIssue(issue.id)}
                                                                title="Delete issue"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="issue-modal-text">{issue.issue}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resolvedIssues.length > 0 && (
                                    <div className="issue-modal-section">
                                        <div className="issue-modal-section-header">
                                            <h4>Resolved</h4>
                                            <span className="issue-modal-count">{resolvedIssues.length}</span>
                                        </div>
                                        {resolvedIssues.map(issue => (
                                            <div key={issue.id} className="issue-modal-item resolved">
                                                <div className="issue-modal-item-top">
                                                    <span className={`issue-modal-severity ${getSeverityClass(issue.severity)}`}>
                                                        {issue.severity}
                                                    </span>
                                                    <div className="issue-modal-meta">
                                                        <span className="issue-modal-creator">
                                                            <i className="fas fa-user"></i>
                                                            {getCreatorName(issue)}
                                                        </span>
                                                        <span className="issue-modal-date">
                                                            {formatDate(issue.time_created)}
                                                        </span>
                                                    </div>
                                                    <div className="issue-modal-actions">
                                                        {canDelete && (
                                                            <button
                                                                className="issue-modal-action-btn delete"
                                                                onClick={() => handleDeleteIssue(issue.id)}
                                                                title="Delete issue"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="issue-modal-text">{issue.issue}</div>
                                                <div className="issue-modal-completed">
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
    );
}

export default IssueModalSection;
