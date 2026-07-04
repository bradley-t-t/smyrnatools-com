/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useState } from 'react'

import { Database } from '../../../services/DatabaseService'
import { usePreferences } from '../../context/PreferencesContext'

/**
 * Verification status card shown in asset detail views.
 * Displays verification checklist items, verify/unverify button,
 * last verified/changed dates, and a recent history timeline.
 */
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
            const { data } = await Database.from(tableName)
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
            const { data: operators } = await Database.from('operators')
                .select('employee_id, name')
                .in('employee_id', uuidArray)
            if (operators) {
                operators.forEach((op) => {
                    names[op.employee_id] = op.name || 'Unknown Operator'
                })
            }
        } catch (e) {
            console.error('Failed to resolve operator UUIDs:', e)
        }
        try {
            const { data: plants } = await Database.from('plants')
                .select('id, plant_name, plant_code')
                .in('id', uuidArray)
            if (plants) {
                plants.forEach((p) => {
                    names[p.id] = p.plant_name || p.plant_code || 'Unknown Plant'
                })
            }
        } catch (e) {
            console.error('Failed to resolve plant UUIDs:', e)
        }
        try {
            const { data: users } = await Database.from('users_profiles')
                .select('id, first_name, last_name')
                .in('id', uuidArray)
            if (users) {
                users.forEach((u) => {
                    if (!names[u.id]) {
                        names[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User'
                    }
                })
            }
        } catch (e) {
            console.error('Failed to resolve user profile UUIDs:', e)
        }
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
            make: 'Make',
            model: 'Model',
            status: 'Status',
            tractor_number: 'Tractor #',
            truck_number: 'Truck #',
            vin: 'VIN',
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
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div
                        className="flex items-center justify-center w-12 h-12 rounded-xl border-2"
                        style={{
                            background: isVerified ? accentColor : 'var(--bg-primary)',
                            borderColor: accentColor
                        }}
                    >
                        <i
                            className={isVerified ? 'fas fa-check' : 'fas fa-hourglass-half'}
                            style={{ color: isVerified ? 'white' : accentColor, fontSize: 20 }}
                        ></i>
                    </div>
                    <div>
                        <div className="text-text-primary text-base font-bold">
                            {isVerified ? 'Verified' : verificationLabel || 'Needs Verification'}
                        </div>
                        <div className="text-text-secondary text-xs">
                            {lastVerifiedDate
                                ? `Last verified ${formatRelativeTime(lastVerifiedDate)}`
                                : 'Never verified'}{' '}
                            · Changed {formatRelativeTime(lastChangedDate)}
                        </div>
                    </div>
                </div>
                {!isVerified && canEdit && !verificationDisabled && (
                    <button type="button"
                        onClick={onVerify}
                        data-verify-trigger="true"
                        className="flex items-center gap-2 border-none rounded-[10px] text-white cursor-pointer text-sm font-semibold py-3 px-5"
                        style={{ background: accentColor }}
                    >
                        <i className="fas fa-check"></i>
                        Verify Now
                    </button>
                )}
            </div>
            <div className="border-t border-border-light"></div>
            <div className="flex flex-col">
                {verificationItems.map((item, index) => (
                    <div
                        key={index}
                        className={`flex items-center gap-3.5 py-3.5 ${index < verificationItems.length - 1 ? 'border-b border-bg-tertiary' : ''}`}
                        title={item.title || ''}
                    >
                        <i className={`${item.icon} text-sm text-center w-5`} style={{ color: accentColor }}></i>
                        <div className="text-text-secondary text-xs font-medium w-[90px]">{item.label}</div>
                        <div className="text-text-primary flex-1 text-[13px] font-semibold">{item.value}</div>
                    </div>
                ))}
            </div>
            {recentHistory.length > 0 && (
                <>
                    <div className="border-t border-border-light"></div>
                    <div>
                        <div className="text-text-secondary text-[11px] font-semibold tracking-wide uppercase mb-3">
                            Recent Changes
                        </div>
                        <div className="flex flex-col">
                            {recentHistory.slice(0, 4).map((entry, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-3 py-2.5 ${index < Math.min(recentHistory.length, 4) - 1 ? 'border-b border-bg-tertiary' : ''}`}
                                >
                                    <div className="text-text-secondary shrink-0 text-[11px] w-[70px]">
                                        {formatRelativeTime(entry.changed_at)}
                                    </div>
                                    <div className="text-text-secondary flex-1 text-xs">
                                        <span className="font-semibold">{formatFieldName(entry.field_name)}</span>
                                        <span className="text-text-secondary"> changed from </span>
                                        <span>{formatValue(entry.old_value, entry.field_name)}</span>
                                        <span className="text-text-secondary"> to </span>
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
                    <div className="border-t border-border-light"></div>
                    <div className="flex items-start gap-2.5">
                        <i className="fas fa-info-circle text-xs mt-0.5" style={{ color: accentColor }}></i>
                        <p className="text-text-secondary text-xs leading-relaxed m-0">{noticeText}</p>
                    </div>
                </>
            )}
        </div>
    )
}
export default VerificationCardSection
