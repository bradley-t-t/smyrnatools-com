/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { FIELD_STYLE, RATING_LABELS } from '../../constants/verificationModalConstants'
import Skeleton, { SkeletonStack } from '../common/Skeleton'
import StarRating from '../common/StarRating'
import { OperatorRow, RequiredHint, Section, StatusMarker } from './VerificationAtoms'

function OperatorRowSkeleton({ valueWidth = 'w-2/3' }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-border-light last:border-b-0">
            <div className="w-[38%] shrink-0 pt-0.5">
                <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex-1">
                <Skeleton className={`h-3.5 ${valueWidth}`} />
            </div>
        </div>
    )
}

function operatorStatus({ operatorOk }) {
    return operatorOk ? <StatusMarker tone="done" /> : <StatusMarker tone="attention" />
}

function buildSubtitle({ operatorOk, phoneOk, ratingOk, operatorData }) {
    if (!operatorData) return 'Operator details unavailable'
    if (operatorOk) return operatorData.name || 'Phone and rating confirmed'
    const missing = [!phoneOk && 'phone', !ratingOk && 'rating'].filter(Boolean)
    return `Needs ${missing.join(' and ')}`
}

function RatingStars({ onSelect, rating }) {
    return <StarRating value={rating} onChange={onSelect} size="md" tone="warning" />
}

function RatingControl({ onSelect, ratingOk, value }) {
    return (
        <div>
            <div className="flex items-center gap-2.5">
                <RatingStars rating={value} onSelect={onSelect} />
                <span className="text-[12px] text-text-secondary">
                    {value > 0 ? `${RATING_LABELS[value]}` : 'Not yet rated'}
                </span>
            </div>
            {!ratingOk && <RequiredHint>Rating is required to verify</RequiredHint>}
        </div>
    )
}

function PhoneControl({ accentColor, isSavingPhone, onChange, onSave, phoneOk, value }) {
    return (
        <div>
            <div className="flex gap-1.5">
                <input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 rounded-md px-3 py-2 text-[13px] outline-none font-mono tabular-nums focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                    style={{
                        ...FIELD_STYLE,
                        borderColor: !phoneOk ? '#dc2626' : 'var(--border-light)'
                    }}
                />
                <button type="button"
                    onClick={onSave}
                    disabled={isSavingPhone || !value.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-white border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:brightness-95 active:scale-[0.92] disabled:active:scale-100"
                    style={{ background: accentColor }}
                    aria-label="Save phone"
                >
                    <i className={`fas ${isSavingPhone ? 'fa-spinner animate-dv-spin' : 'fa-save'} text-[12px]`} />
                </button>
            </div>
            {!phoneOk && <RequiredHint>Phone is required to verify</RequiredHint>}
        </div>
    )
}

/** "Operator" section — name/position/id rows plus editable rating + phone. */
export default function VerificationOperatorSection({
    accentColor,
    expanded,
    isLoadingOperator,
    isSavingPhone,
    onSavePhone,
    onSaveRating,
    onToggle,
    operatorData,
    operatorOk,
    operatorPhone,
    operatorRating,
    phoneOk,
    ratingOk,
    setOperatorPhone
}) {
    return (
        <Section
            title="Operator"
            subtitle={buildSubtitle({ operatorData, operatorOk, phoneOk, ratingOk })}
            status={operatorStatus({ operatorOk })}
            expanded={expanded}
            onToggle={onToggle}
        >
            {isLoadingOperator ? (
                <SkeletonStack count={4} gapClassName="gap-0">
                    {(i) => <OperatorRowSkeleton valueWidth={['w-1/2', 'w-2/3', 'w-1/3', 'w-3/5'][i]} />}
                </SkeletonStack>
            ) : operatorData ? (
                <div>
                    <OperatorRow label="Name" value={operatorData.name || 'N/A'} />
                    {operatorData.position && <OperatorRow label="Position" value={operatorData.position} />}
                    {operatorData.smyrna_id && <OperatorRow label="Employee ID" value={operatorData.smyrna_id} mono />}
                    <OperatorRow
                        label="Performance rating"
                        required={!ratingOk}
                        value={<RatingControl onSelect={onSaveRating} ratingOk={ratingOk} value={operatorRating} />}
                    />
                    <OperatorRow
                        label="Phone number"
                        required={!phoneOk}
                        last
                        value={
                            <PhoneControl
                                accentColor={accentColor}
                                isSavingPhone={isSavingPhone}
                                onChange={setOperatorPhone}
                                onSave={onSavePhone}
                                phoneOk={phoneOk}
                                value={operatorPhone}
                            />
                        }
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 px-3 text-center">
                    <i className="fas fa-user-slash text-[22px] text-text-tertiary mb-2" />
                    <div className="text-[13px] font-medium text-text-primary">Operator details unavailable</div>
                    <div className="text-[11.5px] text-text-tertiary mt-1">
                        The operator may have been removed, or the connection failed.
                    </div>
                </div>
            )}
        </Section>
    )
}
