import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { supabase } from '../../services/DatabaseService'

function VerificationCardSection({
    isVerified,
    verificationLabel,
    verificationItems = [],
    onVerify,
    canEdit = true,
    verificationDisabled = false,
    noticeText = null,
    lastVerifiedDate = null,
    lastChangedDate = null,
    assetId = null,
    assetType = null
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [recentHistory, setRecentHistory] = useState([])
    const [resolvedNames, setResolvedNames] = useState({})

    useEffect(() => {
        if (!assetId || !assetType) return
        const tableName = assetType === 'mixer' ? 'mixers_history' : assetType === 'tractor' ? 'tractors_history' : null
        if (!tableName) return

        const fetchHistory = async () => {
            const idCol = assetType === 'mixer' ? 'mixer_id' : 'tractor_id'
            const { data } = await supabase
                .from(tableName)
                .select('*')
                .eq(idCol, assetId)
                .order('changed_at', { ascending: false })
                .limit(5)
            if (data && data.length > 0) {
                const names = await resolveUUIDs(data)
                setResolvedNames(names)
                setRecentHistory(data)
            }
        }
        fetchHistory()
    }, [assetId, assetType])

    const resolveUUIDs = async (historyData) => {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const uuidsToResolve = new Set()

        historyData.forEach((entry) => {
            if (entry.old_value && uuidPattern.test(entry.old_value)) uuidsToResolve.add(entry.old_value)
            if (entry.new_value && uuidPattern.test(entry.new_value)) uuidsToResolve.add(entry.new_value)
        })

        if (uuidsToResolve.size === 0) return {}

        const uuidArray = Array.from(uuidsToResolve)
        const names = {}

        try {
            const { data: operators } = await supabase
                .from('operators')
                .select('employee_id, name')
                .in('employee_id', uuidArray)
            if (operators) {
                operators.forEach((op) => {
                    names[op.employee_id] = op.name || 'Unknown Operator'
                })
            }
        } catch {}

        try {
            const { data: plants } = await supabase
                .from('plants')
                .select('id, plant_name, plant_code')
                .in('id', uuidArray)
            if (plants) {
                plants.forEach((p) => {
                    names[p.id] = p.plant_name || p.plant_code || 'Unknown Plant'
                })
            }
        } catch {}

        try {
            const { data: users } = await supabase
                .from('users_profiles')
                .select('id, first_name, last_name')
                .in('id', uuidArray)
            if (users) {
                users.forEach((u) => {
                    if (!names[u.id]) {
                        names[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User'
                    }
                })
            }
        } catch {}

        return names
    }

    const formatFieldName = (fieldName) => {
        if (!fieldName) return 'Unknown'
        const fieldLabels = {
            assigned_operator: 'Operator',
            assigned_plant: 'Plant',
            cleanliness_rating: 'Cleanliness',
            drum_type: 'Drum Type',
            last_service: 'Last Service',
            status: 'Status',
            truck_number: 'Truck #',
            tractor_number: 'Tractor #',
            vin: 'VIN',
            make: 'Make',
            model: 'Model',
            year: 'Year'
        }
        return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }

    const formatValue = (value, fieldName) => {
        if (!value || value === 'null') return 'None'
        if (resolvedNames[value]) return resolvedNames[value]
        if (fieldName === 'cleanliness_rating') return `${value} stars`
        return value
    }

    const getDaysSince = (dateStr) => {
        if (!dateStr) return null
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return 'Never'
        const days = getDaysSince(dateStr)
        if (days === 0) return 'Today'
        if (days === 1) return 'Yesterday'
        if (days < 7) return `${days} days ago`
        if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
        return new Date(dateStr).toLocaleDateString()
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ alignItems: 'center', display: 'flex', gap: 16 }}>
                    <div
                        style={{
                            alignItems: 'center',
                            background: isVerified ? accentColor : 'white',
                            border: `2px solid ${accentColor}`,
                            borderRadius: 12,
                            display: 'flex',
                            height: 48,
                            justifyContent: 'center',
                            width: 48
                        }}
                    >
                        <i
                            className={isVerified ? 'fas fa-check' : 'fas fa-hourglass-half'}
                            style={{ color: isVerified ? 'white' : accentColor, fontSize: 20 }}
                        ></i>
                    </div>
                    <div>
                        <div style={{ color: '#1e293b', fontSize: 16, fontWeight: 700 }}>
                            {isVerified ? 'Verified' : verificationLabel || 'Needs Verification'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                            {lastVerifiedDate
                                ? `Last verified ${formatRelativeTime(lastVerifiedDate)}`
                                : 'Never verified'}{' '}
                            · Changed {formatRelativeTime(lastChangedDate)}
                        </div>
                    </div>
                </div>
                {!isVerified && canEdit && !verificationDisabled && (
                    <button
                        onClick={onVerify}
                        data-verify-trigger="true"
                        style={{
                            alignItems: 'center',
                            background: accentColor,
                            border: 'none',
                            borderRadius: 10,
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            fontSize: 14,
                            fontWeight: 600,
                            gap: 8,
                            padding: '12px 20px'
                        }}
                    >
                        <i className="fas fa-check"></i>
                        Verify Now
                    </button>
                )}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {verificationItems.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            alignItems: 'center',
                            borderBottom: index < verificationItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                            display: 'flex',
                            gap: 14,
                            padding: '14px 0'
                        }}
                        title={item.title || ''}
                    >
                        <i
                            className={item.icon}
                            style={{ color: accentColor, fontSize: 14, textAlign: 'center', width: 20 }}
                        ></i>
                        <div style={{ color: '#64748b', fontSize: 12, fontWeight: 500, width: 90 }}>{item.label}</div>
                        <div style={{ color: '#1e293b', flex: 1, fontSize: 13, fontWeight: 600 }}>{item.value}</div>
                    </div>
                ))}
            </div>

            {recentHistory.length > 0 && (
                <>
                    <div style={{ borderTop: '1px solid #e2e8f0' }}></div>
                    <div>
                        <div
                            style={{
                                color: '#64748b',
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: 0.5,
                                marginBottom: 12,
                                textTransform: 'uppercase'
                            }}
                        >
                            Recent Changes
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {recentHistory.slice(0, 4).map((entry, index) => (
                                <div
                                    key={index}
                                    style={{
                                        borderBottom:
                                            index < Math.min(recentHistory.length, 4) - 1
                                                ? '1px solid #f1f5f9'
                                                : 'none',
                                        display: 'flex',
                                        gap: 12,
                                        padding: '10px 0'
                                    }}
                                >
                                    <div style={{ color: '#94a3b8', flexShrink: 0, fontSize: 11, width: 70 }}>
                                        {formatRelativeTime(entry.changed_at)}
                                    </div>
                                    <div style={{ color: '#475569', flex: 1, fontSize: 12 }}>
                                        <span style={{ fontWeight: 600 }}>{formatFieldName(entry.field_name)}</span>
                                        <span style={{ color: '#94a3b8' }}> changed from </span>
                                        <span>{formatValue(entry.old_value, entry.field_name)}</span>
                                        <span style={{ color: '#94a3b8' }}> to </span>
                                        <span>{formatValue(entry.new_value, entry.field_name)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {noticeText && (
                <>
                    <div style={{ borderTop: '1px solid #e2e8f0' }}></div>
                    <div style={{ alignItems: 'flex-start', display: 'flex', gap: 10 }}>
                        <i
                            className="fas fa-info-circle"
                            style={{ color: accentColor, fontSize: 12, marginTop: 2 }}
                        ></i>
                        <p
                            style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, margin: 0 }}
                            dangerouslySetInnerHTML={{ __html: noticeText }}
                        ></p>
                    </div>
                </>
            )}
        </div>
    )
}

export default VerificationCardSection
