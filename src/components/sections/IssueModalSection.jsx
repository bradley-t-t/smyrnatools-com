import React, {useEffect, useState} from 'react';
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

    useEffect(() => {
        if (itemId) {
            fetchIssues();
        }
    }, [itemId]);

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

    return (
        <div className="issue-modal-backdrop" onClick={handleBackdropClick}>
            <div className="issue-modal">
                <div className="issue-modal-header">
                    <h2>Issues for {itemType} {itemNumber || itemId}</h2>
                    <button className="issue-modal-close-button" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="issue-modal-content">
                    <ErrorMessage
                        message={error}
                        onDismiss={() => setError(null)}
                    />
                    <div className="issue-modal-add-section">
                        <h3>Add New Issue</h3>
                        <form onSubmit={handleAddIssue}>
                            <textarea
                                className="issue-modal-textarea"
                                value={newIssue}
                                onChange={(e) => setNewIssue(e.target.value)}
                                placeholder="Describe the issue here..."
                                disabled={isSubmitting}
                            ></textarea>
                            <div className="issue-modal-severity-selector">
                                <label>Severity:</label>
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value)}
                                    disabled={isSubmitting}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="issue-modal-add-button"
                                disabled={isSubmitting || !newIssue.trim()}
                            >
                                {isSubmitting ? 'Adding...' : 'Add Issue'}
                            </button>
                        </form>
                    </div>
                    <div className="issue-modal-list">
                        <h3>Issues History</h3>
                        {isLoading ? (
                            <div className="issue-modal-loading">
                                <LoadingScreen message="Loading issues..." inline={true}/>
                            </div>
                        ) : issues.length === 0 ? (
                            <div className="issue-modal-empty">
                                <i className="fas fa-tools issue-modal-empty-icon"></i>
                                <p>No issues yet</p>
                                <p className="issue-modal-empty-subtext">Be the first to add an issue about
                                    this {itemType.toLowerCase()}</p>
                            </div>
                        ) : (
                            <>
                                {openIssues.length > 0 && (
                                    <div className="issue-modal-section">
                                        <h4 className="issue-modal-section-title">Open Issues ({openIssues.length})</h4>
                                        {openIssues.map(issue => (
                                            <div key={issue.id} className="issue-modal-item">
                                                <div className="issue-modal-item-header">
                                                    <span
                                                        className={`issue-modal-severity ${getSeverityClass(issue.severity)}`}>
                                                        {issue.severity}
                                                    </span>
                                                    <span className="issue-modal-date">
                                                        {formatDate(issue.time_created)}
                                                    </span>
                                                    <span className="issue-modal-creator">
                                                        <i className="fas fa-user"></i> {getCreatorName(issue)}
                                                    </span>
                                                    <div className="issue-modal-actions">
                                                        <button
                                                            className="issue-modal-complete-button"
                                                            onClick={() => handleCompleteIssue(issue.id)}
                                                            title="Mark as resolved"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                        <button
                                                            className="issue-modal-delete-button"
                                                            onClick={() => handleDeleteIssue(issue.id)}
                                                            title="Delete issue"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="issue-modal-text">{issue.issue}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {openIssues.length > 0 && resolvedIssues.length > 0 && (
                                    <div className="issue-modal-divider"></div>
                                )}
                                {resolvedIssues.length > 0 && (
                                    <div className="issue-modal-section">
                                        <h4 className="issue-modal-section-title">Resolved Issues
                                            ({resolvedIssues.length})</h4>
                                        {resolvedIssues.map(issue => (
                                            <div key={issue.id} className="issue-modal-item issue-modal-item-resolved">
                                                <div className="issue-modal-item-header">
                                                    <span
                                                        className={`issue-modal-severity ${getSeverityClass(issue.severity)}`}>
                                                        {issue.severity}
                                                    </span>
                                                    <span className="issue-modal-date">
                                                        {formatDate(issue.time_created)}
                                                    </span>
                                                    <span className="issue-modal-creator">
                                                        <i className="fas fa-user"></i> {getCreatorName(issue)}
                                                    </span>
                                                    <div className="issue-modal-actions">
                                                        <button
                                                            className="issue-modal-delete-button"
                                                            onClick={() => handleDeleteIssue(issue.id)}
                                                            title="Delete issue"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="issue-modal-text">{issue.issue}</div>
                                                <div className="issue-modal-completed">
                                                    <i className="fas fa-check-circle"></i>
                                                    Resolved: {formatDate(issue.time_completed)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div className="issue-modal-footer">
                    <button className="issue-modal-cancel-button" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default IssueModalSection;
