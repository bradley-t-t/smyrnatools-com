import React, {useEffect, useMemo, useState} from 'react';
import ReactDOM from 'react-dom';
import {OperatorService} from '../../services/OperatorService';
import LoadingScreen from '../common/LoadingScreen';
import UserLabel from '../common/UserLabel';
import ErrorMessage from '../common/ErrorMessage';
import {UserService} from '../../services/UserService';
import {FormatUtility} from '../../utils/FormatUtility';
import {HistoryUtility} from '../../utils/HistoryUtility';
import {supabase} from '../../services/DatabaseService';
import './styles/HistoryView.css';

function HistoryViewSection({item, type, onClose}) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [operators, setOperators] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('timeline');
    const [sortConfig] = useState({
        key: 'changedAt',
        direction: 'descending'
    });
    const [issues, setIssues] = useState([]);
    const [newIssue, setNewIssue] = useState('');
    const [severity, setSeverity] = useState('Medium');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userNames, setUserNames] = useState({});

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchHistory(), fetchOperators(), fetchUsers(), fetchIssues()]);
            setIsLoading(false);
        };
        loadData();
    }, [item.id]);

    const fetchOperators = async () => {
        try {
            const operatorsData = await OperatorService.fetchOperators();
            setOperators(operatorsData);
        } catch (err) {
        }
    };

    const fetchUsers = async () => {
        try {
            const {data} = await supabase.from('profiles').select('id, name, email');
            setUsers(data || []);
        } catch (err) {
        }
    };

    const fetchIssues = async () => {
        if (type === 'operator') return;

        try {
            const serviceMap = {
                mixer: 'MixerService',
                tractor: 'TractorService',
                equipment: 'EquipmentService',
                trailer: 'TrailerService',
                'pickup-truck': 'PickupTruckService'
            };

            const serviceName = serviceMap[type];
            if (!serviceName) return;

            const {[serviceName]: Service} = await import(`../../services/${serviceName}`);
            const fetchedIssues = await Service.fetchIssues(item.id);
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
            setIssues([]);
        }
    };

    const fetchHistory = async () => {
        const serviceMap = {
            mixer: {service: 'MixerService', method: 'getMixerHistory'},
            tractor: {service: 'TractorService', method: 'getTractorHistory'},
            equipment: {service: 'EquipmentService', method: 'getEquipmentHistory'},
            trailer: {service: 'TrailerService', method: 'getTrailerHistory'},
            operator: {service: 'OperatorService', method: 'getOperatorHistory'},
            'pickup-truck': {service: 'PickupTruckService', method: 'fetchHistory'}
        };
        const tableMap = {
            mixer: 'mixers_history',
            tractor: 'tractors_history',
            equipment: 'heavy_equipment_history',
            trailer: 'trailers_history',
            operator: 'operators_history',
            'pickup-truck': 'pickup_trucks_history'
        };
        try {
            const {service, method} = serviceMap[type];
            const {[service]: Service} = await import(`../../services/${service}`);
            const id = type === 'operator' ? item.employeeId : item.id;
            let historyData = await Service[method](id);
            let filtered = historyData || [];
            try {
                filtered = filtered.filter(entry => !HistoryUtility.areEquivalent(entry.fieldName || entry.field_name, entry.oldValue || entry.old_value, entry.newValue || entry.new_value));
            } catch (_) {
            }
            setHistory(filtered);
            setError(null);
        } catch (err) {
            try {
                const tableName = tableMap[type];
                const id = type === 'operator' ? item.employeeId : item.id;
                const idField = type === 'pickup-truck' ? 'truck_id' : `${type}_id`;
                const {data, error} = await supabase
                    .from(tableName)
                    .select('*')
                    .eq(idField, id)
                    .order('changed_at', {ascending: false});
                if (error) throw error;
                let rows = data || [];
                try {
                    rows = rows.filter(entry => !HistoryUtility.areEquivalent(entry.field_name, entry.old_value, entry.new_value));
                } catch (_) {
                }
                setHistory(rows);
                setError(null);
            } catch (_) {
                setError('Failed to load history. Please try again.');
            }
        }
    };

    const formatFieldName = (fieldName) => {
        const snakeCaseField = fieldName.includes('_') ? fieldName : fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
        const commonFields = {
            'truck_number': 'Truck Number',
            'assigned_plant': 'Plant',
            'assigned_operator': 'Operator',
            'status': 'Status',
            'last_service_date': 'Service Date',
            'last_chip_date': 'Chip Date',
            'cleanliness_rating': 'Cleanliness',
            'verification': 'Verification'
        };
        if (type === 'tractor') {
            commonFields['has_blower'] = 'Has Blower';
        }
        if (type === 'operator') {
            commonFields['assigned_mixer'] = 'Assigned Mixer';
            commonFields['assigned_tractor'] = 'Assigned Tractor';
            commonFields['assigned_trainer'] = 'Assigned Trainer';
        }
        return commonFields[snakeCaseField] || snakeCaseField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatTimestamp = (dateString) => {
        if (!dateString) return 'Not Assigned';
        return FormatUtility.formatDateTime(dateString);
    };

    const getOperatorName = (operatorId) => {
        if (!operatorId || operatorId === '0') return 'None';
        const operator = operators.find(op => op.employeeId === operatorId);
        return operator ? operator.name : 'Unknown';
    };

    const getUserName = (userId) => {
        if (!userId) return 'Unknown';
        const operator = operators.find(op => op.employeeId === userId);
        if (operator) return operator.name;
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Unknown';
    };

    const formatValue = (fieldName, value) => {
        const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
        if (value === null || value === undefined || value === '') return 'Not Assigned';
        if (key === 'assigned_operator') {
            return getOperatorName(value);
        }
        if (key === 'cleanliness_rating') {
            const n = parseInt(value, 10);
            return Number.isFinite(n) && n > 0 ? '\u2605'.repeat(n) : String(value);
        }
        if (key === 'last_service_date' || key === 'last_chip_date') {
            return value ? FormatUtility.formatDate(value) : 'Not Assigned';
        }
        if (type === 'tractor' && key === 'has_blower') {
            return value ? 'Yes' : 'No';
        }
        if (key.includes('date') && value) {
            return FormatUtility.formatDate(value);
        }
        if (key === 'assigned_trainer') {
            return getUserName(value);
        }
        return value;
    };

    const sortedHistory = useMemo(() => {
        let sortableItems = [...history];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue, bValue;
                if (sortConfig.key === 'changedAt') {
                    aValue = a.changedAt || a.changed_at;
                    bValue = b.changedAt || b.changed_at;
                } else if (sortConfig.key === 'fieldName') {
                    aValue = a.fieldName || a.field_name;
                    bValue = b.fieldName || b.field_name;
                } else if (sortConfig.key === 'oldValue') {
                    aValue = a.oldValue || a.old_value;
                    bValue = b.oldValue || b.old_value;
                } else if (sortConfig.key === 'newValue') {
                    aValue = a.newValue || a.new_value;
                    bValue = b.newValue || b.new_value;
                } else if (sortConfig.key === 'changedBy') {
                    aValue = a.changedBy || a.changed_by;
                    bValue = b.changedBy || b.changed_by;
                }
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [history, sortConfig]);

    const cleanlinessData = useMemo(() => {
        const cleanlinessEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'cleanliness_rating';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return cleanlinessEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            rating: parseInt(entry.newValue || entry.new_value, 10),
            timestamp: entry.changedAt || entry.changed_at
        })).filter(d => !isNaN(d.rating) && d.rating > 0);
    }, [history]);

    const conditionData = useMemo(() => {
        const conditionEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'condition_rating';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return conditionEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            rating: parseInt(entry.newValue || entry.new_value, 10),
            timestamp: entry.changedAt || entry.changed_at
        })).filter(d => !isNaN(d.rating) && d.rating > 0);
    }, [history]);

    const operatorData = useMemo(() => {
        const operatorEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'assigned_operator';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return operatorEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            operator: getOperatorName(entry.newValue || entry.new_value),
            operatorId: entry.newValue || entry.new_value,
            timestamp: entry.changedAt || entry.changed_at
        })).filter(entry => entry.operator !== 'Unknown' && entry.operator !== 'None');
    }, [history, operators]);

    const serviceData = useMemo(() => {
        const serviceEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'last_service_date' || key === 'last_chip_date';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return serviceEntries.map(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            const serviceDate = entry.newValue || entry.new_value;

            return {
                date: new Date(entry.changedAt || entry.changed_at),
                serviceDate: serviceDate,
                serviceType: key === 'last_chip_date' ? 'Chip' : 'Service',
                timestamp: entry.changedAt || entry.changed_at,
                changedBy: entry.changedBy || entry.changed_by
            };
        }).filter(entry => entry.serviceDate);
    }, [history]);

    const plantData = useMemo(() => {
        const plantEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'assigned_plant';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return plantEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            plant: entry.newValue || entry.new_value,
            timestamp: entry.changedAt || entry.changed_at,
            changedBy: entry.changedBy || entry.changed_by
        })).filter(entry => entry.plant && entry.plant !== 'null' && entry.plant !== '');
    }, [history]);

    const statusData = useMemo(() => {
        const statusEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'status';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return statusEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            status: entry.newValue || entry.new_value,
            timestamp: entry.changedAt || entry.changed_at,
            changedBy: entry.changedBy || entry.changed_by
        })).filter(entry => entry.status && entry.status !== 'null' && entry.status !== '');
    }, [history]);

    const positionData = useMemo(() => {
        const positionEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'position';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return positionEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            position: entry.newValue || entry.new_value,
            timestamp: entry.changedAt || entry.changed_at,
            changedBy: entry.changedBy || entry.changed_by
        })).filter(entry => entry.position && entry.position !== 'null' && entry.position !== '');
    }, [history]);

    const ratingsData = useMemo(() => {
        const ratingEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'rating';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return ratingEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            rating: parseInt(entry.newValue || entry.new_value, 10),
            timestamp: entry.changedAt || entry.changed_at,
            changedBy: entry.changedBy || entry.changed_by
        })).filter(d => !isNaN(d.rating) && d.rating >= 0);
    }, [history]);

    const mileageData = useMemo(() => {
        const mileageEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'mileage';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return mileageEntries.map(entry => ({
            date: new Date(entry.changedAt || entry.changed_at),
            mileage: parseInt(entry.newValue || entry.new_value, 10),
            timestamp: entry.changedAt || entry.changed_at,
            changedBy: entry.changedBy || entry.changed_by
        })).filter(entry => !isNaN(entry.mileage) && entry.mileage >= 0);
    }, [history]);

    const assignmentsData = useMemo(() => {
        const assignmentEntries = history.filter(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            return key === 'assigned_mixer' || key === 'assigned_tractor';
        }).sort((a, b) => {
            const aTime = new Date(a.changedAt || a.changed_at);
            const bTime = new Date(b.changedAt || b.changed_at);
            return aTime - bTime;
        });

        return assignmentEntries.map(entry => {
            const fieldName = entry.fieldName || entry.field_name;
            const key = fieldName && fieldName.includes('_') ? fieldName : String(fieldName || '').replace(/([A-Z])/g, '_$1').toLowerCase();
            const assignmentType = key === 'assigned_mixer' ? 'Mixer' : 'Tractor';
            const newValue = entry.newValue || entry.new_value;
            const oldValue = entry.oldValue || entry.old_value;

            return {
                date: new Date(entry.changedAt || entry.changed_at),
                assignmentType: assignmentType,
                vehicleNumber: newValue && newValue !== 'null' && newValue !== '' ? newValue : null,
                previousVehicleNumber: oldValue && oldValue !== 'null' && oldValue !== '' ? oldValue : null,
                timestamp: entry.changedAt || entry.changed_at,
                changedBy: entry.changedBy || entry.changed_by,
                isAssignment: newValue && newValue !== 'null' && newValue !== '',
                isUnassignment: !newValue || newValue === 'null' || newValue === ''
            };
        });
    }, [history]);

    const itemName = type === 'mixer' || type === 'tractor' ? `Truck #${item.truckNumber}` : type === 'pickup-truck' ? `${item.make || ''} ${item.model || ''} (${item.vin || 'Unknown'})`.trim() : item.name || 'Item';

    const renderCleanlinessChart = () => {
        if (cleanlinessData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No cleanliness rating history available</p>
                    <p className="empty-subtext">Cleanliness ratings will be charted here once they are recorded.</p>
                </div>
            );
        }

        const maxRating = 5;
        const chartHeight = 300;
        const padding = 40;

        return (
            <div className="chart-container">
                <h3 className="chart-title">Cleanliness Rating Over Time</h3>
                <div className="chart-stats">
                    <div className="stat-item">
                        <span className="stat-label">Average Rating:</span>
                        <span className="stat-value">
                            {(cleanlinessData.reduce((sum, d) => sum + d.rating, 0) / cleanlinessData.length).toFixed(1)}★
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Ratings:</span>
                        <span className="stat-value">{cleanlinessData.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Current Rating:</span>
                        <span className="stat-value">{cleanlinessData[cleanlinessData.length - 1].rating}★</span>
                    </div>
                </div>
                <div className="chart-scroll-container">
                    <svg className="chart-svg-fullwidth" viewBox={`0 0 ${1000} ${chartHeight + padding * 2}`}
                         preserveAspectRatio="xMidYMid meet">
                        <g transform={`translate(${padding}, ${padding})`}>
                            {[5, 4, 3, 2, 1].map(rating => (
                                <g key={rating}>
                                    <line
                                        x1="0"
                                        y1={(maxRating - rating) * (chartHeight / maxRating)}
                                        x2={1000 - padding * 2}
                                        y2={(maxRating - rating) * (chartHeight / maxRating)}
                                        stroke="var(--border-light)"
                                        strokeWidth="1"
                                        strokeDasharray="4"
                                    />
                                    <text
                                        x="-10"
                                        y={(maxRating - rating) * (chartHeight / maxRating) + 5}
                                        textAnchor="end"
                                        fontSize="12"
                                        fill="var(--text-secondary)"
                                    >
                                        {rating}★
                                    </text>
                                </g>
                            ))}

                            {cleanlinessData.map((point, index) => {
                                const x = (index / (cleanlinessData.length - 1 || 1)) * (1000 - padding * 2);
                                const y = (maxRating - point.rating) * (chartHeight / maxRating);

                                return (
                                    <g key={index}>
                                        {index < cleanlinessData.length - 1 && (
                                            <line
                                                x1={x}
                                                y1={y}
                                                x2={(index + 1) / (cleanlinessData.length - 1) * (1000 - padding * 2)}
                                                y2={(maxRating - cleanlinessData[index + 1].rating) * (chartHeight / maxRating)}
                                                stroke="var(--accent)"
                                                strokeWidth="3"
                                            />
                                        )}
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="6"
                                            fill="var(--accent)"
                                            stroke="var(--bg-primary)"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x={x}
                                            y={chartHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="var(--text-secondary)"
                                            transform={`rotate(-45, ${x}, ${chartHeight + 20})`}
                                        >
                                            {FormatUtility.formatDate(point.timestamp)}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </div>
            </div>
        );
    };

    const renderConditionChart = () => {
        if (conditionData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No condition rating history available</p>
                    <p className="empty-subtext">Condition ratings will be charted here once they are recorded.</p>
                </div>
            );
        }

        const maxRating = 5;
        const chartHeight = 300;
        const padding = 40;

        return (
            <div className="chart-container">
                <h3 className="chart-title">Condition Rating Over Time</h3>
                <div className="chart-stats">
                    <div className="stat-item">
                        <span className="stat-label">Average Rating:</span>
                        <span className="stat-value">
                            {(conditionData.reduce((sum, d) => sum + d.rating, 0) / conditionData.length).toFixed(1)}★
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Ratings:</span>
                        <span className="stat-value">{conditionData.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Current Rating:</span>
                        <span className="stat-value">{conditionData[conditionData.length - 1].rating}★</span>
                    </div>
                </div>
                <div className="chart-scroll-container">
                    <svg className="chart-svg-fullwidth" viewBox={`0 0 ${1000} ${chartHeight + padding * 2}`}
                         preserveAspectRatio="xMidYMid meet">
                        <g transform={`translate(${padding}, ${padding})`}>
                            {[5, 4, 3, 2, 1].map(rating => (
                                <g key={rating}>
                                    <line
                                        x1="0"
                                        y1={(maxRating - rating) * (chartHeight / maxRating)}
                                        x2={1000 - padding * 2}
                                        y2={(maxRating - rating) * (chartHeight / maxRating)}
                                        stroke="var(--border-light)"
                                        strokeWidth="1"
                                        strokeDasharray="4"
                                    />
                                    <text
                                        x="-10"
                                        y={(maxRating - rating) * (chartHeight / maxRating) + 5}
                                        textAnchor="end"
                                        fontSize="12"
                                        fill="var(--text-secondary)"
                                    >
                                        {rating}★
                                    </text>
                                </g>
                            ))}

                            {conditionData.map((point, index) => {
                                const x = (index / (conditionData.length - 1 || 1)) * (1000 - padding * 2);
                                const y = (maxRating - point.rating) * (chartHeight / maxRating);

                                return (
                                    <g key={index}>
                                        {index < conditionData.length - 1 && (
                                            <line
                                                x1={x}
                                                y1={y}
                                                x2={(index + 1) / (conditionData.length - 1) * (1000 - padding * 2)}
                                                y2={(maxRating - conditionData[index + 1].rating) * (chartHeight / maxRating)}
                                                stroke="var(--accent)"
                                                strokeWidth="3"
                                            />
                                        )}
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="6"
                                            fill="var(--accent)"
                                            stroke="var(--bg-primary)"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x={x}
                                            y={chartHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="var(--text-secondary)"
                                            transform={`rotate(-45, ${x}, ${chartHeight + 20})`}
                                        >
                                            {FormatUtility.formatDate(point.timestamp)}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </div>
            </div>
        );
    };

    const renderOperatorChart = () => {
        if (operatorData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No operator assignment history available</p>
                    <p className="empty-subtext">Operator assignments will be charted here once they are recorded.</p>
                </div>
            );
        }

        const operatorCounts = operatorData.reduce((acc, entry) => {
            acc[entry.operator] = (acc[entry.operator] || 0) + 1;
            return acc;
        }, {});

        const calculateDuration = (startIndex, operatorName) => {
            let endIndex = startIndex + 1;
            while (endIndex < operatorData.length && operatorData[endIndex].operator === operatorName) {
                endIndex++;
            }
            const start = operatorData[startIndex].date;
            const end = endIndex < operatorData.length ? operatorData[endIndex].date : new Date();
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
            return {days, endIndex};
        };

        const operatorDurations = {};
        let i = 0;
        while (i < operatorData.length) {
            const entry = operatorData[i];
            const {days, endIndex} = calculateDuration(i, entry.operator);
            if (!operatorDurations[entry.operator]) {
                operatorDurations[entry.operator] = 0;
            }
            operatorDurations[entry.operator] += days;
            i = endIndex;
        }

        const totalAssignments = operatorData.length;
        const uniqueOperators = Object.keys(operatorCounts).length;
        const isActive = item.status === 'Active';
        const currentOperator = isActive && operatorData.length > 0 ? operatorData[operatorData.length - 1].operator : null;
        const mostFrequentOperator = Object.keys(operatorDurations).length > 0
            ? Object.entries(operatorDurations).reduce((a, b) => a[1] > b[1] ? a : b)[0]
            : null;


        const consolidatedTimeline = [];
        let j = 0;
        while (j < operatorData.length) {
            const entry = operatorData[j];
            const {days, endIndex} = calculateDuration(j, entry.operator);
            consolidatedTimeline.push({
                operator: entry.operator,
                startDate: entry.timestamp,
                days: days,
                isCurrent: endIndex >= operatorData.length
            });
            j = endIndex;
        }

        return (
            <div className="chart-container">
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Current Operator</div>
                        <div className="summary-value">{currentOperator || 'Not Assigned'}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Assignments</div>
                        <div className="summary-value">{totalAssignments}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Unique Operators</div>
                        <div className="summary-value">{uniqueOperators}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Most Frequent</div>
                        <div className="summary-value">{mostFrequentOperator || 'Not Assigned'}</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Assignment Timeline</h3>
                <div className="operator-timeline-modern">
                    {consolidatedTimeline.slice().reverse().map((entry, index) => (
                        <div key={index}
                             className={`timeline-entry ${entry.isCurrent ? 'timeline-entry-current' : ''}`}>
                            <div className="timeline-marker">
                                <div className="timeline-dot"></div>
                                {index < consolidatedTimeline.length - 1 && <div className="timeline-line"></div>}
                            </div>
                            <div className="timeline-card">
                                <div className="timeline-card-header">
                                    <span className="timeline-operator-name">{entry.operator}</span>
                                    {entry.isCurrent && <span className="current-badge">Current</span>}
                                </div>
                                <div className="timeline-card-meta">
                                    <span className="timeline-date">{FormatUtility.formatDate(entry.startDate)}</span>
                                    <span
                                        className="timeline-duration">{entry.days} {entry.days === 1 ? 'day' : 'days'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderServiceHistory = () => {
        const sortedIssues = [...issues].sort((a, b) => {
            return new Date(b.time_created) - new Date(a.time_created);
        });

        const openIssues = sortedIssues.filter(issue => !issue.time_completed);
        const resolvedIssues = sortedIssues.filter(issue => issue.time_completed);

        if (serviceData.length === 0 && issues.length === 0) {
            return (
                <div className="empty-history">
                    <p>No service history or issues available</p>
                    <p className="empty-subtext">Service records and issues will appear here once they are logged.</p>
                </div>
            );
        }

        const servicesByType = serviceData.reduce((acc, entry) => {
            if (!acc[entry.serviceType]) acc[entry.serviceType] = [];
            acc[entry.serviceType].push(entry);
            return acc;
        }, {});

        const calculateAverageDays = (services) => {
            if (services.length < 2) return null;
            const intervals = [];
            for (let i = 1; i < services.length; i++) {
                const date1 = new Date(services[i - 1].serviceDate);
                const date2 = new Date(services[i].serviceDate);
                const days = Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
                if (days > 0) intervals.push(days);
            }
            return intervals.length > 0 ? Math.round(intervals.reduce((sum, d) => sum + d, 0) / intervals.length) : null;
        };

        const actualServices = serviceData.filter(s => s.serviceType === 'Service');
        const lastService = actualServices.length > 0 ? actualServices[actualServices.length - 1] : null;
        const daysSinceLastService = lastService ? Math.round((new Date() - new Date(lastService.serviceDate)) / (1000 * 60 * 60 * 24)) : null;
        const avgDaysService = calculateAverageDays(servicesByType['Service'] || []);

        const combinedTimeline = [];

        serviceData.forEach(service => {
            combinedTimeline.push({
                type: 'service',
                date: service.serviceDate,
                timestamp: service.timestamp,
                serviceType: service.serviceType,
                changedBy: service.changedBy
            });
        });

        issues.forEach(issue => {
            combinedTimeline.push({
                type: 'issue',
                date: issue.time_created,
                timestamp: issue.time_created,
                issue: issue,
                isCompleted: !!issue.time_completed,
                completedDate: issue.time_completed
            });
        });

        combinedTimeline.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });

        return (
            <div className="chart-container">
                {actualServices.length > 0 && (
                    <div className="operator-summary-cards">
                        <div className="summary-card">
                            <div className="summary-label">Last Service</div>
                            <div
                                className="summary-value summary-value-small">{FormatUtility.formatDate(lastService.serviceDate)}</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-label">Days Since Service</div>
                            <div className="summary-value">{daysSinceLastService}</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-label">Total Services</div>
                            <div className="summary-value">{actualServices.length}</div>
                        </div>
                        {avgDaysService && (
                            <div className="summary-card">
                                <div className="summary-label">Avg Service Interval</div>
                                <div className="summary-value">{avgDaysService} <span
                                    style={{fontSize: '0.6rem'}}>days</span></div>
                            </div>
                        )}
                    </div>
                )}

                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Open Issues</div>
                        <div className="summary-value">{openIssues.length}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Resolved Issues</div>
                        <div className="summary-value">{resolvedIssues.length}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Issues</div>
                        <div className="summary-value">{issues.length}</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Service & Issue Timeline</h3>
                <ErrorMessage message={error} onDismiss={() => setError(null)}/>

                <div className="operator-timeline-modern">
                    {combinedTimeline.map((entry, index) => {
                        if (entry.type === 'service') {
                            return (
                                <div key={`service-${index}`} className="timeline-entry">
                                    <div className="timeline-marker">
                                        <div className="timeline-dot" style={{background: 'var(--success)'}}></div>
                                        {index < combinedTimeline.length - 1 && <div className="timeline-line"></div>}
                                    </div>
                                    <div className="timeline-card">
                                        <div className="timeline-card-header">
                                            <span className="timeline-operator-name">
                                                <i className="fas fa-wrench"></i> {entry.serviceType}
                                            </span>
                                        </div>
                                        <div className="timeline-card-meta">
                                            <span
                                                className="timeline-date">{FormatUtility.formatDate(entry.date)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else {
                            const issue = entry.issue;
                            const severityClass = entry.isCompleted ? 'completed' :
                                issue.severity === 'High' ? 'high' :
                                    issue.severity === 'Medium' ? 'medium' : 'low';
                            return (
                                <div key={`issue-${issue.id}`} className={`timeline-entry timeline-issue ${entry.isCompleted ? 'timeline-issue-completed' : ''}`}>
                                    <div className="timeline-marker">
                                        <div className={`timeline-dot timeline-dot-${severityClass}`}></div>
                                        {index < combinedTimeline.length - 1 && <div className="timeline-line"></div>}
                                    </div>
                                    <div className={`timeline-card timeline-card-issue timeline-card-issue-${severityClass}`}>
                                        <div className="timeline-issue-header">
                                            <div className="timeline-issue-content">
                                                <div className="timeline-issue-badges">
                                                    <i className={entry.isCompleted ? "fas fa-check-circle" : "fas fa-exclamation-circle"}></i>
                                                    <span className={`issue-severity-badge ${getSeverityClass(issue.severity)}`}>
                                                        {issue.severity}
                                                    </span>
                                                    {entry.isCompleted && (
                                                        <span className="resolved-badge">RESOLVED</span>
                                                    )}
                                                </div>
                                                <div className="timeline-issue-text">{issue.issue}</div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteIssue(issue.id)}
                                                title="Delete issue"
                                                className="timeline-issue-delete-btn"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                        <div className="timeline-issue-meta">
                                            <div className="timeline-issue-info">
                                                <span className="timeline-issue-creator">
                                                    <i className="fas fa-user"></i> {getCreatorName(issue)}
                                                </span>
                                                <span className="timeline-date">
                                                    <i className="fas fa-calendar-plus"></i> {formatDate(issue.time_created)}
                                                </span>
                                            </div>
                                            {entry.isCompleted && entry.completedDate && (
                                                <span className="timeline-completed-date">
                                                    <i className="fas fa-check"></i> Completed: {formatDate(issue.time_completed)}
                                                </span>
                                            )}
                                            {!entry.isCompleted && (
                                                <button
                                                    onClick={() => handleCompleteIssue(issue.id)}
                                                    title="Mark as resolved"
                                                    className="timeline-issue-resolve-btn"
                                                >
                                                    <i className="fas fa-check"></i> Mark as Resolved
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    })}
                </div>
            </div>
        );
    };

    const renderPlantAssignments = () => {
        if (plantData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No plant assignment history available</p>
                    <p className="empty-subtext">Plant assignments will appear here once they are recorded.</p>
                </div>
            );
        }

        const plantCounts = plantData.reduce((acc, entry) => {
            acc[entry.plant] = (acc[entry.plant] || 0) + 1;
            return acc;
        }, {});

        const totalAssignments = plantData.length;
        const uniquePlants = Object.keys(plantCounts).length;
        const currentPlant = plantData[plantData.length - 1].plant;
        const mostFrequentPlant = Object.entries(plantCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];


        const calculateDuration = (startIndex, plantCode) => {
            let endIndex = startIndex + 1;
            while (endIndex < plantData.length && plantData[endIndex].plant === plantCode) {
                endIndex++;
            }
            const start = plantData[startIndex].date;
            const end = endIndex < plantData.length ? plantData[endIndex].date : new Date();
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
            return {days, endIndex};
        };

        const consolidatedTimeline = [];
        let i = 0;
        while (i < plantData.length) {
            const entry = plantData[i];
            const {days, endIndex} = calculateDuration(i, entry.plant);
            consolidatedTimeline.push({
                plant: entry.plant,
                startDate: entry.timestamp,
                days: days,
                isCurrent: endIndex >= plantData.length
            });
            i = endIndex;
        }

        return (
            <div className="chart-container">
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Current Plant</div>
                        <div className="summary-value">{currentPlant}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Transfers</div>
                        <div className="summary-value">{totalAssignments}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Unique Plants</div>
                        <div className="summary-value">{uniquePlants}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Most Frequent</div>
                        <div className="summary-value summary-value-small">{mostFrequentPlant}</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Assignment Timeline</h3>
                <div className="operator-timeline-modern">
                    {consolidatedTimeline.slice().reverse().map((entry, index) => (
                        <div key={index}
                             className={`timeline-entry ${entry.isCurrent ? 'timeline-entry-current' : ''}`}>
                            <div className="timeline-marker">
                                <div className="timeline-dot"></div>
                                {index < consolidatedTimeline.length - 1 && <div className="timeline-line"></div>}
                            </div>
                            <div className="timeline-card">
                                <div className="timeline-card-header">
                                    <span className="timeline-operator-name">{entry.plant}</span>
                                    {entry.isCurrent && <span className="current-badge">Current</span>}
                                </div>
                                <div className="timeline-card-meta">
                                    <span className="timeline-date">{FormatUtility.formatDate(entry.startDate)}</span>
                                    <span
                                        className="timeline-duration">{entry.days} {entry.days === 1 ? 'day' : 'days'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderStatusHistory = () => {
        if (statusData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No status history available</p>
                    <p className="empty-subtext">Status changes will appear here once they are recorded.</p>
                </div>
            );
        }

        const statusCounts = statusData.reduce((acc, entry) => {
            acc[entry.status] = (acc[entry.status] || 0) + 1;
            return acc;
        }, {});

        const totalChanges = statusData.length;
        const uniqueStatuses = Object.keys(statusCounts).length;
        const currentStatus = statusData[statusData.length - 1].status;
        const mostFrequentStatus = Object.entries(statusCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

        const calculateDuration = (startIndex, statusValue) => {
            let endIndex = startIndex + 1;
            while (endIndex < statusData.length && statusData[endIndex].status === statusValue) {
                endIndex++;
            }
            const start = statusData[startIndex].date;
            const end = endIndex < statusData.length ? statusData[endIndex].date : new Date();
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
            return {days, endIndex};
        };

        const consolidatedTimeline = [];
        let i = 0;
        while (i < statusData.length) {
            const entry = statusData[i];
            const {days, endIndex} = calculateDuration(i, entry.status);
            consolidatedTimeline.push({
                status: entry.status,
                startDate: entry.timestamp,
                days: days,
                isCurrent: endIndex >= statusData.length,
                changedBy: entry.changedBy
            });
            i = endIndex;
        }

        return (
            <div className="chart-container">
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Current Status</div>
                        <div className="summary-value">{currentStatus}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Changes</div>
                        <div className="summary-value">{totalChanges}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Unique Statuses</div>
                        <div className="summary-value">{uniqueStatuses}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Most Frequent</div>
                        <div className="summary-value">{mostFrequentStatus}</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Status Timeline</h3>
                <div className="operator-timeline-modern">
                    {consolidatedTimeline.slice().reverse().map((entry, index) => (
                        <div key={index}
                             className={`timeline-entry ${entry.isCurrent ? 'timeline-entry-current' : ''}`}>
                            <div className="timeline-marker">
                                <div className="timeline-dot"></div>
                                {index < consolidatedTimeline.length - 1 && <div className="timeline-line"></div>}
                            </div>
                            <div className="timeline-card">
                                <div className="timeline-card-header">
                                    <span className="timeline-operator-name">{entry.status}</span>
                                    {entry.isCurrent && <span className="current-badge">Current</span>}
                                </div>
                                <div className="timeline-card-meta">
                                    <span className="timeline-date">{FormatUtility.formatDate(entry.startDate)}</span>
                                    <span
                                        className="timeline-duration">{entry.days} {entry.days === 1 ? 'day' : 'days'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderPositionHistory = () => {
        if (positionData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No position history available</p>
                    <p className="empty-subtext">Position changes will appear here once they are recorded.</p>
                </div>
            );
        }

        const positionCounts = positionData.reduce((acc, entry) => {
            acc[entry.position] = (acc[entry.position] || 0) + 1;
            return acc;
        }, {});

        const totalChanges = positionData.length;
        const uniquePositions = Object.keys(positionCounts).length;
        const currentPosition = positionData[positionData.length - 1].position;
        const mostFrequentPosition = Object.entries(positionCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

        const chartData = Object.entries(positionCounts).map(([position, count]) => ({
            position,
            count,
            percentage: (count / totalChanges * 100).toFixed(1)
        })).sort((a, b) => b.count - a.count);

        const calculateDuration = (startIndex, positionValue) => {
            let endIndex = startIndex + 1;
            while (endIndex < positionData.length && positionData[endIndex].position === positionValue) {
                endIndex++;
            }
            const start = positionData[startIndex].date;
            const end = endIndex < positionData.length ? positionData[endIndex].date : new Date();
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
            return {days, endIndex};
        };

        const consolidatedTimeline = [];
        let i = 0;
        while (i < positionData.length) {
            const entry = positionData[i];
            const {days, endIndex} = calculateDuration(i, entry.position);
            consolidatedTimeline.push({
                position: entry.position,
                startDate: entry.timestamp,
                days: days,
                isCurrent: endIndex >= positionData.length,
                changedBy: entry.changedBy
            });
            i = endIndex;
        }

        return (
            <div className="chart-container">
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Current Position</div>
                        <div className="summary-value summary-value-small">{currentPosition}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Changes</div>
                        <div className="summary-value">{totalChanges}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Unique Positions</div>
                        <div className="summary-value">{uniquePositions}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Most Frequent</div>
                        <div className="summary-value summary-value-small">{mostFrequentPosition}</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Position Timeline</h3>
                <div className="operator-timeline-modern">
                    {consolidatedTimeline.slice().reverse().map((entry, index) => (
                        <div key={index}
                             className={`timeline-entry ${entry.isCurrent ? 'timeline-entry-current' : ''}`}>
                            <div className="timeline-marker">
                                <div className="timeline-dot"></div>
                                {index < consolidatedTimeline.length - 1 && <div className="timeline-line"></div>}
                            </div>
                            <div className="timeline-card">
                                <div className="timeline-card-header">
                                    <span className="timeline-operator-name">{entry.position}</span>
                                    {entry.isCurrent && <span className="current-badge">Current</span>}
                                </div>
                                <div className="timeline-card-meta">
                                    <span className="timeline-date">{FormatUtility.formatDate(entry.startDate)}</span>
                                    <span
                                        className="timeline-duration">{entry.days} {entry.days === 1 ? 'day' : 'days'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <h3 className="chart-section-title">Position Distribution</h3>
                <div className="operator-distribution-modern">
                    {chartData.map((data, index) => {
                        const isTopPosition = index === 0;
                        return (
                            <div key={index}
                                 className={`distribution-row ${isTopPosition ? 'distribution-row-top' : ''}`}>
                                <div className="distribution-info">
                                    <div className="distribution-operator-name">{data.position}</div>
                                    <div className="distribution-stats">
                                        <span
                                            className="distribution-assignments">{data.count} {data.count === 1 ? 'time' : 'times'}</span>
                                        <span className="distribution-percentage">{data.percentage}%</span>
                                    </div>
                                </div>
                                <div className="distribution-bar-bg">
                                    <div className="distribution-bar-fill" style={{width: `${data.percentage}%`}}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderRatingsHistory = () => {
        if (ratingsData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No rating history available</p>
                    <p className="empty-subtext">Rating changes will be charted here once they are recorded.</p>
                </div>
            );
        }

        const maxRating = 5;
        const chartHeight = 300;
        const padding = 40;

        const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        const avgRating = ratingsData.reduce((sum, d) => sum + d.rating, 0) / ratingsData.length;
        const currentRating = ratingsData[ratingsData.length - 1].rating;
        const highestRating = Math.max(...ratingsData.map(d => d.rating));


        return (
            <div className="chart-container">
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Current Rating</div>
                        <div className="summary-value">{currentRating > 0 ? `${currentRating}★` : 'None'}</div>
                        {currentRating > 0 && (
                            <div className="summary-subtext">{ratingLabels[currentRating]}</div>
                        )}
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Average Rating</div>
                        <div className="summary-value">{avgRating.toFixed(1)}★</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Highest Rating</div>
                        <div className="summary-value">{highestRating}★</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Changes</div>
                        <div className="summary-value">{ratingsData.length}</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Rating Over Time</h3>
                <div className="chart-scroll-container">
                    <svg className="chart-svg_fullwidth" viewBox={`0 0 ${1000} ${chartHeight + padding * 2}`}
                         preserveAspectRatio="xMidYMid meet">
                        <g transform={`translate(${padding}, ${padding})`}>
                            {[5, 4, 3, 2, 1].map(rating => (
                                <g key={rating}>
                                    <line
                                        x1="0"
                                        y1={(maxRating - rating) * (chartHeight / maxRating)}
                                        x2={1000 - padding * 2}
                                        y2={(maxRating - rating) * (chartHeight / maxRating)}
                                        stroke="var(--border-light)"
                                        strokeWidth="1"
                                        strokeDasharray="4"
                                    />
                                    <text
                                        x="-10"
                                        y={(maxRating - rating) * (chartHeight / maxRating) + 5}
                                        textAnchor="end"
                                        fontSize="12"
                                        fill="var(--text-secondary)"
                                    >
                                        {rating}★
                                    </text>
                                </g>
                            ))}

                            {ratingsData.map((point, index) => {
                                const x = (index / (ratingsData.length - 1 || 1)) * (1000 - padding * 2);
                                const y = (maxRating - point.rating) * (chartHeight / maxRating);

                                return (
                                    <g key={index}>
                                        {index < ratingsData.length - 1 && (
                                            <line
                                                x1={x}
                                                y1={y}
                                                x2={(index + 1) / (ratingsData.length - 1) * (1000 - padding * 2)}
                                                y2={(maxRating - ratingsData[index + 1].rating) * (chartHeight / maxRating)}
                                                stroke="var(--accent)"
                                                strokeWidth="3"
                                            />
                                        )}
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="6"
                                            fill="var(--accent)"
                                            stroke="var(--bg-primary)"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x={x}
                                            y={chartHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="var(--text-secondary)"
                                            transform={`rotate(-45, ${x}, ${chartHeight + 20})`}
                                        >
                                            {FormatUtility.formatDate(point.timestamp)}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </div>


                <h3 className="chart-section-title">Rating Timeline</h3>
                <div className="operator-timeline-modern">
                    {ratingsData.slice().reverse().map((entry, index) => (
                        <div key={index} className={`timeline-entry ${index === 0 ? 'timeline-entry-current' : ''}`}>
                            <div className="timeline-marker">
                                <div className="timeline-dot"></div>
                                {index < ratingsData.length - 1 && <div className="timeline-line"></div>}
                            </div>
                            <div className="timeline-card">
                                <div className="timeline-card-header">
                                    <span
                                        className="timeline-operator-name">{entry.rating}★ - {ratingLabels[entry.rating]}</span>
                                    {index === 0 && <span className="current-badge">Current</span>}
                                </div>
                                <div className="timeline-card-meta">
                                    <span className="timeline-date">{FormatUtility.formatDate(entry.timestamp)}</span>
                                    <UserLabel userId={entry.changedBy} showIcon={true}/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderMileageTracking = () => {
        if (mileageData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No mileage history available</p>
                    <p className="empty-subtext">Mileage updates will be tracked here once they are recorded.</p>
                </div>
            );
        }

        const currentMileage = mileageData[mileageData.length - 1].mileage;
        const totalMileageChange = currentMileage - mileageData[0].mileage;
        const avgMileage = mileageData.reduce((sum, d) => sum + d.mileage, 0) / mileageData.length;

        const calculateMilesPerPeriod = () => {
            if (mileageData.length < 2) return {perWeek: 0, perMonth: 0, perYear: 0};

            const intervals = [];
            for (let i = 1; i < mileageData.length; i++) {
                const prevEntry = mileageData[i - 1];
                const currEntry = mileageData[i];
                const milesDriven = currEntry.mileage - prevEntry.mileage;
                const timeDiff = currEntry.date - prevEntry.date;
                const days = timeDiff / (1000 * 60 * 60 * 24);

                if (days > 0 && milesDriven > 0) {
                    intervals.push({milesDriven, days});
                }
            }

            if (intervals.length === 0) return {perWeek: 0, perMonth: 0, perYear: 0};

            const totalMiles = intervals.reduce((sum, int) => sum + int.milesDriven, 0);
            const totalDays = intervals.reduce((sum, int) => sum + int.days, 0);
            const milesPerDay = totalMiles / totalDays;

            return {
                perWeek: Math.round(milesPerDay * 7),
                perMonth: Math.round(milesPerDay * 30.44),
                perYear: Math.round(milesPerDay * 365.25)
            };
        };

        const {perWeek, perMonth, perYear} = calculateMilesPerPeriod();

        const maxMileage = Math.max(...mileageData.map(d => d.mileage));
        const minMileage = Math.min(...mileageData.map(d => d.mileage));
        const mileageRange = maxMileage - minMileage;
        const chartHeight = 300;
        const padding = 60;

        const getMaintenanceMilestone = (miles) => {
            if (miles >= 300000) return {level: 'critical', label: 'High Mileage'};
            if (miles >= 200000) return {level: 'warning', label: 'Elevated'};
            if (miles >= 100000) return {level: 'info', label: 'Moderate'};
            return {level: 'good', label: 'Low'};
        };

        const milestone = getMaintenanceMilestone(currentMileage);

        return (
            <div className="chart-container">
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Current Mileage</div>
                        <div className="summary-value">{currentMileage.toLocaleString()}</div>
                        <div className="summary-subtext">{milestone.label}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Change</div>
                        <div
                            className="summary-value">{totalMileageChange > 0 ? '+' : ''}{totalMileageChange.toLocaleString()}</div>
                        <div className="summary-subtext">miles tracked</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Average</div>
                        <div className="summary-value">{Math.round(avgMileage).toLocaleString()}</div>
                        <div className="summary-subtext">miles</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Updates</div>
                        <div className="summary-value">{mileageData.length}</div>
                        <div className="summary-subtext">recorded</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Estimated Usage Rates</h3>
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Per Week</div>
                        <div className="summary-value">{perWeek.toLocaleString()}</div>
                        <div className="summary-subtext">miles/week</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Per Month</div>
                        <div className="summary-value">{perMonth.toLocaleString()}</div>
                        <div className="summary-subtext">miles/month</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Per Year</div>
                        <div className="summary-value">{perYear.toLocaleString()}</div>
                        <div className="summary-subtext">miles/year</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Next Service Est.</div>
                        <div className="summary-value">
                            {perWeek > 0 ? Math.round((5000 - (currentMileage % 5000)) / (perWeek / 7)) : '—'}
                        </div>
                        <div className="summary-subtext">days (if 5k interval)</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Mileage Over Time</h3>
                <div className="chart-scroll-container">
                    <svg className="chart-svg-fullwidth" viewBox={`0 0 ${1000} ${chartHeight + padding * 2}`}
                         preserveAspectRatio="xMidYMid meet">
                        <g transform={`translate(${padding}, ${padding})`}>
                            <line
                                x1="0"
                                y1="0"
                                x2="0"
                                y2={chartHeight}
                                stroke="var(--border-light)"
                                strokeWidth="2"
                            />
                            <line
                                x1="0"
                                y1={chartHeight}
                                x2={1000 - padding * 2}
                                y2={chartHeight}
                                stroke="var(--border-light)"
                                strokeWidth="2"
                            />

                            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                                const yPos = chartHeight * (1 - fraction);
                                const mileageValue = Math.round(minMileage + mileageRange * fraction);
                                return (
                                    <g key={fraction}>
                                        <line
                                            x1="0"
                                            y1={yPos}
                                            x2={1000 - padding * 2}
                                            y2={yPos}
                                            stroke="var(--border-light)"
                                            strokeWidth="1"
                                            strokeDasharray="4"
                                        />
                                        <text
                                            x="-10"
                                            y={yPos + 5}
                                            textAnchor="end"
                                            fontSize="12"
                                            fill="var(--text-secondary)"
                                        >
                                            {mileageValue.toLocaleString()}
                                        </text>
                                    </g>
                                );
                            })}

                            {mileageData.map((point, index) => {
                                const x = (index / (mileageData.length - 1 || 1)) * (1000 - padding * 2);
                                const normalizedY = (point.mileage - minMileage) / (mileageRange || 1);
                                const y = chartHeight * (1 - normalizedY);

                                return (
                                    <g key={index}>
                                        {index < mileageData.length - 1 && (
                                            <line
                                                x1={x}
                                                y1={y}
                                                x2={((index + 1) / (mileageData.length - 1)) * (1000 - padding * 2)}
                                                y2={chartHeight * (1 - (mileageData[index + 1].mileage - minMileage) / (mileageRange || 1))}
                                                stroke="var(--accent)"
                                                strokeWidth="3"
                                            />
                                        )}
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="6"
                                            fill="var(--accent)"
                                            stroke="var(--bg-primary)"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x={x}
                                            y={chartHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="var(--text-secondary)"
                                            transform={`rotate(-45, ${x}, ${chartHeight + 20})`}
                                        >
                                            {FormatUtility.formatDate(point.timestamp)}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </div>

                <h3 className="chart-section-title">Mileage Timeline</h3>
                <div className="operator-timeline-modern">
                    {mileageData.slice().reverse().map((entry, index) => {
                        const reversedIndex = mileageData.length - 1 - index;
                        const milesDriven = reversedIndex > 0 ? entry.mileage - mileageData[reversedIndex - 1].mileage : 0;
                        const daysSince = reversedIndex > 0 ? Math.round((entry.date - mileageData[reversedIndex - 1].date) / (1000 * 60 * 60 * 24)) : 0;

                        return (
                            <div key={index}
                                 className={`timeline-entry ${index === 0 ? 'timeline-entry-current' : ''}`}>
                                <div className="timeline-marker">
                                    <div className="timeline-dot"></div>
                                    {index < mileageData.length - 1 && <div className="timeline-line"></div>}
                                </div>
                                <div className="timeline-card">
                                    <div className="timeline-card-header">
                                        <span
                                            className="timeline-operator-name">{entry.mileage.toLocaleString()} miles</span>
                                        {index === 0 && <span className="current-badge">Current</span>}
                                    </div>
                                    <div className="timeline-card-meta">
                                        <span
                                            className="timeline-date">{FormatUtility.formatDate(entry.timestamp)}</span>
                                        {milesDriven > 0 && daysSince > 0 && (
                                            <span className="timeline-duration">
                                                +{milesDriven.toLocaleString()} miles in {daysSince} {daysSince === 1 ? 'day' : 'days'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAssignmentsHistory = () => {
        if (assignmentsData.length === 0) {
            return (
                <div className="empty-history">
                    <p>No assignment history available</p>
                    <p className="empty-subtext">Vehicle assignments will be tracked here once they are recorded.</p>
                </div>
            );
        }

        const mixerAssignments = assignmentsData.filter(a => a.assignmentType === 'Mixer');
        const tractorAssignments = assignmentsData.filter(a => a.assignmentType === 'Tractor');
        const totalAssignments = assignmentsData.filter(a => a.isAssignment).length;
        const currentMixerAssignment = mixerAssignments.length > 0 ? mixerAssignments[mixerAssignments.length - 1] : null;
        const currentTractorAssignment = tractorAssignments.length > 0 ? tractorAssignments[tractorAssignments.length - 1] : null;

        const currentMixer = currentMixerAssignment && currentMixerAssignment.vehicleNumber ? currentMixerAssignment.vehicleNumber : null;
        const currentTractor = currentTractorAssignment && currentTractorAssignment.vehicleNumber ? currentTractorAssignment.vehicleNumber : null;

        const calculateDuration = (startDate, endDate) => {
            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : new Date();
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
            return days;
        };

        const consolidatedTimeline = [];
        let currentMixerEntry = null;
        let currentTractorEntry = null;

        assignmentsData.forEach((entry, index) => {
            if (entry.assignmentType === 'Mixer') {
                if (currentMixerEntry && currentMixerEntry.vehicleNumber) {
                    currentMixerEntry.endDate = entry.timestamp;
                    currentMixerEntry.duration = calculateDuration(currentMixerEntry.startDate, currentMixerEntry.endDate);
                    consolidatedTimeline.push({...currentMixerEntry});
                }
                if (entry.vehicleNumber) {
                    currentMixerEntry = {
                        assignmentType: 'Mixer',
                        vehicleNumber: entry.vehicleNumber,
                        startDate: entry.timestamp,
                        endDate: null,
                        changedBy: entry.changedBy,
                        isCurrent: index === assignmentsData.length - 1 || !assignmentsData.slice(index + 1).some(e => e.assignmentType === 'Mixer')
                    };
                } else {
                    currentMixerEntry = null;
                }
            } else if (entry.assignmentType === 'Tractor') {
                if (currentTractorEntry && currentTractorEntry.vehicleNumber) {
                    currentTractorEntry.endDate = entry.timestamp;
                    currentTractorEntry.duration = calculateDuration(currentTractorEntry.startDate, currentTractorEntry.endDate);
                    consolidatedTimeline.push({...currentTractorEntry});
                }
                if (entry.vehicleNumber) {
                    currentTractorEntry = {
                        assignmentType: 'Tractor',
                        vehicleNumber: entry.vehicleNumber,
                        startDate: entry.timestamp,
                        endDate: null,
                        changedBy: entry.changedBy,
                        isCurrent: index === assignmentsData.length - 1 || !assignmentsData.slice(index + 1).some(e => e.assignmentType === 'Tractor')
                    };
                } else {
                    currentTractorEntry = null;
                }
            }
        });

        if (currentMixerEntry && currentMixerEntry.vehicleNumber) {
            currentMixerEntry.duration = calculateDuration(currentMixerEntry.startDate, new Date());
            currentMixerEntry.isCurrent = true;
            consolidatedTimeline.push(currentMixerEntry);
        }

        if (currentTractorEntry && currentTractorEntry.vehicleNumber) {
            currentTractorEntry.duration = calculateDuration(currentTractorEntry.startDate, new Date());
            currentTractorEntry.isCurrent = true;
            consolidatedTimeline.push(currentTractorEntry);
        }

        consolidatedTimeline.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        return (
            <div className="chart-container">
                <div className="operator-summary-cards">
                    <div className="summary-card">
                        <div className="summary-label">Current Mixer</div>
                        <div className="summary-value">{currentMixer ? `#${currentMixer}` : 'Not Assigned'}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Current Tractor</div>
                        <div className="summary-value">{currentTractor ? `#${currentTractor}` : 'Not Assigned'}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Assignments</div>
                        <div className="summary-value">{totalAssignments}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Assignment Changes</div>
                        <div className="summary-value">{assignmentsData.length}</div>
                    </div>
                </div>

                <h3 className="chart-section-title">Assignment Timeline</h3>
                <div className="operator-timeline-modern">
                    {consolidatedTimeline.map((entry, index) => {
                        const durationText = entry.duration === 0 ? 'Less than a day' :
                            entry.duration === 1 ? '1 day' :
                            entry.duration < 30 ? `${entry.duration} days` :
                            entry.duration < 365 ? `${Math.round(entry.duration / 30.44)} months` :
                            `${(entry.duration / 365.25).toFixed(1)} years`;

                        return (
                            <div key={index} className={`timeline-entry ${entry.isCurrent ? 'timeline-entry-current' : ''}`}>
                                <div className="timeline-marker">
                                    <div className="timeline-dot"></div>
                                    {index < consolidatedTimeline.length - 1 && <div className="timeline-line"></div>}
                                </div>
                                <div className="timeline-card">
                                    <div className="timeline-card-header">
                                        <span className="timeline-operator-name">
                                            {entry.assignmentType} #{entry.vehicleNumber}
                                        </span>
                                        {entry.isCurrent && <span className="current-badge">Current</span>}
                                    </div>
                                    <div className="timeline-card-meta">
                                        <span className="timeline-date">
                                            {FormatUtility.formatDate(entry.startDate)}
                                            {entry.endDate && ` - ${FormatUtility.formatDate(entry.endDate)}`}
                                            {!entry.endDate && ' - Present'}
                                        </span>
                                        <span className="timeline-duration">({durationText})</span>
                                    </div>
                                    <div className="timeline-card-meta">
                                        <UserLabel userId={entry.changedBy} showIcon={true}/>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="loading-spinner-container">
                    <LoadingScreen message="Loading history..." inline={true}/>
                </div>
            );
        }

        if (error) {
            return (
                <div className="error-message">
                    <p>{error}</p>
                    <button className="retry-button" onClick={fetchHistory}>Retry</button>
                </div>
            );
        }

        if (history.length === 0) {
            return (
                <div className="empty-history">
                    <p>No history records found for this {type}.</p>
                    <p className="empty-subtext">History entries will appear here when changes are made to
                        this {type}.</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'timeline':
                return (
                    <div className="history-timeline">
                        {sortedHistory.map((entry, index) => (
                            <div key={entry.id || index} className="history-item">
                                <div className="history-item-header">
                                    <div className="history-field-name">
                                        {formatFieldName(entry.fieldName || entry.field_name)}
                                    </div>
                                    <div className="history-timestamp">
                                        {formatTimestamp(entry.changedAt || entry.changed_at)}
                                    </div>
                                </div>
                                <div className="history-change">
                                    <div className="history-old-value">
                                        <span
                                            className="value-label">From:</span> {formatValue(entry.fieldName || entry.field_name, entry.oldValue || entry.old_value)}
                                    </div>
                                    <div className="history-arrow">→</div>
                                    <div className="history-new-value">
                                        <span
                                            className="value-label">To:</span> {formatValue(entry.fieldName || entry.field_name, entry.newValue || entry.new_value)}
                                    </div>
                                </div>
                                <div className="history-user">
                                    <UserLabel userId={entry.changedBy || entry.changed_by} showIcon={true}/>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'cleanliness':
                return renderCleanlinessChart();
            case 'condition':
                return renderConditionChart();
            case 'operators':
                return renderOperatorChart();
            case 'service':
                return renderServiceHistory();
            case 'plant':
                return renderPlantAssignments();
            case 'status':
                return renderStatusHistory();
            case 'position':
                return renderPositionHistory();
            case 'ratings':
                return renderRatingsHistory();
            case 'mileage':
                return renderMileageTracking();
            case 'assignments':
                return renderAssignmentsHistory();
            default:
                return null;
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
            const serviceMap = {
                mixer: 'MixerService',
                tractor: 'TractorService',
                equipment: 'EquipmentService',
                trailer: 'TrailerService'
            };

            const serviceName = serviceMap[type];
            if (!serviceName) throw new Error('Invalid item type');

            const {[serviceName]: Service} = await import(`../../services/${serviceName}`);
            const currentUser = await UserService.getCurrentUser();
            const userId = currentUser?.id || null;
            if (!userId) {
                throw new Error('You must be logged in to add an issue');
            }
            await Service.addIssue(item.id, newIssue, severity, userId);
            setNewIssue('');
            setSeverity('Medium');
            fetchIssues();
        } catch (err) {
            setError(err.message || 'Failed to add issue. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteIssue = async (issueId) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) {
            return;
        }
        try {
            const serviceMap = {
                mixer: 'MixerService',
                tractor: 'TractorService',
                equipment: 'EquipmentService',
                trailer: 'TrailerService'
            };

            const serviceName = serviceMap[type];
            if (!serviceName) throw new Error('Invalid item type');

            const {[serviceName]: Service} = await import(`../../services/${serviceName}`);
            await Service.deleteIssue(issueId);
            fetchIssues();
        } catch (err) {
            setError('Failed to delete issue. Please try again.');
        }
    };

    const handleCompleteIssue = async (issueId) => {
        try {
            const serviceMap = {
                mixer: 'MixerService',
                tractor: 'TractorService',
                equipment: 'EquipmentService',
                trailer: 'TrailerService'
            };

            const serviceName = serviceMap[type];
            if (!serviceName) throw new Error('Invalid item type');

            const {[serviceName]: Service} = await import(`../../services/${serviceName}`);
            await Service.completeIssue(issueId);
            fetchIssues();
        } catch (err) {
            setError('Failed to complete issue. Please try again.');
        }
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

    const getCreatorName = (issue) => {
        if (issue.created_by && userNames[issue.created_by]) {
            return userNames[issue.created_by];
        }
        return 'Unknown';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not completed';
        return FormatUtility.formatDateTime(dateString);
    };

    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    return ReactDOM.createPortal(
        <div className="history-modal-backdrop">
            <div className="history-modal">
                <div className="history-modal-header">
                    <div className="history-modal-header-content">
                        <i className="fas fa-history"></i>
                        <div>
                            <h2>{itemName}</h2>
                            <span className="history-modal-subtitle">Change History</span>
                        </div>
                    </div>
                    <button className="history-modal-close-button" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="history-tabs">
                    <button
                        className={`history-tab ${activeTab === 'timeline' ? 'active' : ''}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        Timeline
                    </button>
                    {(type === 'mixer' || type === 'tractor') && (
                        <button
                            className={`history-tab ${activeTab === 'operators' ? 'active' : ''}`}
                            onClick={() => setActiveTab('operators')}
                        >
                            Operators
                        </button>
                    )}
                    {(type === 'mixer' || type === 'tractor' || type === 'equipment' || type === 'pickup-truck') && (
                        <button
                            className={`history-tab ${activeTab === 'service' ? 'active' : ''}`}
                            onClick={() => setActiveTab('service')}
                        >
                            Service History
                        </button>
                    )}
                    {(type === 'mixer' || type === 'tractor' || type === 'trailer' || type === 'equipment' || type === 'pickup-truck') && (
                        <button
                            className={`history-tab ${activeTab === 'plant' ? 'active' : ''}`}
                            onClick={() => setActiveTab('plant')}
                        >
                            Plant Assignments
                        </button>
                    )}
                    {(type === 'operator' || type === 'pickup-truck') && (
                        <button
                            className={`history-tab ${activeTab === 'status' ? 'active' : ''}`}
                            onClick={() => setActiveTab('status')}
                        >
                            Status History
                        </button>
                    )}
                    {type === 'operator' && (
                        <button
                            className={`history-tab ${activeTab === 'position' ? 'active' : ''}`}
                            onClick={() => setActiveTab('position')}
                        >
                            Position History
                        </button>
                    )}
                    {type === 'operator' && (
                        <button
                            className={`history-tab ${activeTab === 'ratings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ratings')}
                        >
                            Ratings History
                        </button>
                    )}
                    {type === 'operator' && (
                        <button
                            className={`history-tab ${activeTab === 'assignments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('assignments')}
                        >
                            Assignments
                        </button>
                    )}
                    {type === 'pickup-truck' && (
                        <button
                            className={`history-tab ${activeTab === 'mileage' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mileage')}
                        >
                            Mileage Tracking
                        </button>
                    )}
                    {type === 'equipment' && (
                        <button
                            className={`history-tab ${activeTab === 'condition' ? 'active' : ''}`}
                            onClick={() => setActiveTab('condition')}
                        >
                            Condition
                        </button>
                    )}
                    {(type === 'mixer' || type === 'tractor' || type === 'trailer' || type === 'equipment') && (
                        <button
                            className={`history-tab ${activeTab === 'cleanliness' ? 'active' : ''}`}
                            onClick={() => setActiveTab('cleanliness')}
                        >
                            Cleanliness
                        </button>
                    )}
                </div>

                <div className="history-modal-content">
                    {renderContent()}
                </div>

                <div className="history-modal-footer">
                    <button className="cancel-button" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default HistoryViewSection;
