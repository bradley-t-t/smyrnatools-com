import React, {useEffect, useState} from 'react';
import {OperatorService} from '../../services/OperatorService';
import LoadingScreen from '../common/LoadingScreen';
import UserLabel from '../common/UserLabel';
import {FormatUtility} from '../../utils/FormatUtility';
import {HistoryUtility} from '../../utils/HistoryUtility';
import {supabase} from '../../services/DatabaseService';
import './styles/HistoryView.css';

function HistoryViewSection({item, type, onClose}) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [operators, setOperators] = useState([]);
    const [sortConfig] = useState({
        key: 'changedAt',
        direction: 'descending'
    });

    useEffect(() => {
        fetchHistory();
        fetchOperators();
    }, [item.id]);

    const fetchOperators = async () => {
        try {
            const operatorsData = await OperatorService.fetchOperators();
            setOperators(operatorsData);
        } catch (err) {
        }
    };

    const fetchHistory = async () => {
        setIsLoading(true);
        const serviceMap = {
            mixer: {service: 'MixerService', method: 'getMixerHistory'},
            tractor: {service: 'TractorService', method: 'getTractorHistory'},
            equipment: {service: 'EquipmentService', method: 'getEquipmentHistory'},
            trailer: {service: 'TrailerService', method: 'getTrailerHistory'},
            operator: {service: 'OperatorService', method: 'getOperatorHistory'}
        };
        const tableMap = {
            mixer: 'mixers_history',
            tractor: 'tractors_history',
            equipment: 'heavy_equipment_history',
            trailer: 'trailers_history',
            operator: 'operators_history'
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
                const {data, error} = await supabase
                    .from(tableName)
                    .select('*')
                    .eq(`${type}_id`, id)
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
        } finally {
            setIsLoading(false);
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
        return value;
    };

    const sortedHistory = React.useMemo(() => {
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

    const itemName = type === 'mixer' || type === 'tractor' ? `Truck #${item.truckNumber}` : item.name || 'Item';

    return (
        <div className="history-modal-backdrop">
            <div className="history-modal">
                <div className="history-modal-header"
                     style={{backgroundColor: 'var(--accent)'}}>
                    <h2>History for {itemName}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="history-modal-content">
                    {isLoading ? (
                        <div className="loading-spinner-container">
                            <LoadingScreen message="Loading history..." inline={true}/>
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            <p>{error}</p>
                            <button className="retry-button" onClick={fetchHistory}>Retry</button>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="empty-history">
                            <p>No history records found for this {type}.</p>
                            <p className="empty-subtext">History entries will appear here when changes are made to
                                this {type}.</p>
                        </div>
                    ) : (
                        <div className="history-timeline">
                            {sortedHistory.map((entry, index) => (
                                <div
                                    key={entry.id || index}
                                    className="history-item"
                                >
                                    <div className="history-item-header">
                                        <div
                                            className="history-field-name">{formatFieldName(entry.fieldName || entry.field_name)}</div>
                                        <div
                                            className="history-timestamp">{formatTimestamp(entry.changedAt || entry.changed_at)}</div>
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
                                        <UserLabel userId={entry.changedBy || entry.changed_by}
                                                   showInitials={type === 'tractor'}/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="history-modal-footer">
                    <button className="cancel-button" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default HistoryViewSection;
