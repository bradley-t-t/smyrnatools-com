/* eslint-disable react/forbid-dom-props */
import React from 'react'

import DateUtility from '../../../utils/DateUtility'
import { FIELD_STYLE } from '../../constants/verificationModalConstants'
import { Banner, FieldLabel, Hint, Section, SimpleField, StatusMarker } from './VerificationAtoms'

function checklistStatus({ requiredFieldsOk, serviceOverdue }) {
    if (!requiredFieldsOk) return <StatusMarker tone="attention" />
    if (serviceOverdue) return <StatusMarker tone="warn" />
    return <StatusMarker tone="done" />
}

function buildSubtitle({ missingLabels, requiredFieldsOk, serviceOverdue }) {
    if (!requiredFieldsOk && missingLabels.length > 0) {
        return `Needs ${missingLabels.join(', ')}`
    }
    if (serviceOverdue) return 'Service is overdue'
    return 'All required details are present'
}

function dateInputValue(value) {
    if (!value) return ''
    if (value instanceof Date) return value.toISOString().split('T')[0]
    return String(value).split('T')[0]
}

/** Parses the hours input value and returns the trimmed string and a finite-number check. */
export function parseHoursValue(value) {
    if (value === null || value === undefined) return { raw: '', valid: false }
    const raw = String(value).trim()
    if (!raw) return { raw, valid: false }
    const num = Number(raw)
    return { raw, valid: Number.isFinite(num) && num >= 0 }
}

/** "Asset details" section — VIN/make/model/year, last service/chip dates, and engine hours. */
export default function VerificationChecklistSection({
    expanded,
    hours,
    hoursOk,
    lastChipDate,
    lastServiceDate,
    make,
    makeOk,
    model,
    modelOk,
    needsHours,
    needsMake,
    needsModel,
    needsVin,
    needsYear,
    onToggle,
    requiredFieldsOk,
    serviceOverdue,
    setHours,
    setLastChipDate,
    setLastServiceDate,
    setMake,
    setModel,
    setVin,
    setYear,
    vin,
    vinInfo,
    vinOk,
    year,
    yearOk
}) {
    const missingLabels = [
        needsVin && !vinOk && 'VIN',
        needsMake && !makeOk && 'Make',
        needsModel && !modelOk && 'Model',
        needsYear && !yearOk && 'Year',
        needsHours && !hoursOk && 'Hours'
    ].filter(Boolean)

    return (
        <Section
            title="Asset details"
            subtitle={buildSubtitle({ missingLabels, requiredFieldsOk, serviceOverdue })}
            status={checklistStatus({ requiredFieldsOk, serviceOverdue })}
            expanded={expanded}
            onToggle={onToggle}
        >
            <div className="flex flex-col gap-3.5">
                {needsVin && (
                    <div>
                        <FieldLabel required={!vinOk}>VIN</FieldLabel>
                        <input
                            type="text"
                            placeholder="17 characters (no I, O, Q)"
                            value={vin}
                            onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                            className="w-full rounded-md px-3 py-2 text-[13px] outline-none font-mono tabular-nums transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30 placeholder:text-text-tertiary"
                            style={{
                                ...FIELD_STYLE,
                                borderColor: vin && !vinOk ? '#dc2626' : 'var(--border-light)'
                            }}
                        />
                        <Hint>17 characters. Letters I, O, and Q are not used.</Hint>
                        {vin && !vinOk && (
                            <div className="mt-1.5 space-y-0.5">
                                {vinInfo.reasons.map((reason) => (
                                    <div key={reason} className="text-[11.5px] text-text-primary">
                                        {reason}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {needsMake && (
                    <SimpleField label="Make" required={!makeOk} value={make} onChange={setMake} placeholder="Make" />
                )}
                {needsModel && (
                    <SimpleField
                        label="Model"
                        required={!modelOk}
                        value={model}
                        onChange={setModel}
                        placeholder="Model"
                    />
                )}
                {needsYear && (
                    <SimpleField label="Year" required={!yearOk} value={year} onChange={setYear} placeholder="Year" />
                )}
                {needsHours && (
                    <div>
                        <FieldLabel required={!hoursOk}>Engine hours</FieldLabel>
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            placeholder="Current reading"
                            value={hours ?? ''}
                            onChange={(e) => setHours(e.target.value)}
                            className="w-full rounded-md px-3 py-2 text-[13px] outline-none font-mono tabular-nums transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30 placeholder:text-text-tertiary"
                            style={{
                                ...FIELD_STYLE,
                                borderColor: !hoursOk && String(hours ?? '').trim() ? '#dc2626' : 'var(--border-light)'
                            }}
                        />
                        <Hint>Read the meter on the asset and confirm the current hours.</Hint>
                        {!hoursOk && String(hours ?? '').trim() && (
                            <div className="mt-1.5 text-[11.5px] text-text-primary">
                                Enter a valid number (0 or greater).
                            </div>
                        )}
                    </div>
                )}
                {(!lastServiceDate || serviceOverdue) && (
                    <div>
                        <FieldLabel>Last service date</FieldLabel>
                        <input
                            type="date"
                            value={dateInputValue(lastServiceDate)}
                            onChange={(e) =>
                                setLastServiceDate(e.target.value ? DateUtility.parseLocalDate(e.target.value) : null)
                            }
                            className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30 [color-scheme:light] dark:[color-scheme:dark]"
                            style={FIELD_STYLE}
                        />
                        {lastServiceDate && serviceOverdue && (
                            <div className="mt-2">
                                <Banner tone="warn" icon="fa-clock">
                                    Service is overdue — verification is still allowed, but service is recommended.
                                </Banner>
                            </div>
                        )}
                        <Hint>
                            Service is overdue after six months. Verify by checking hours of service on the asset.
                        </Hint>
                    </div>
                )}
                {typeof lastChipDate !== 'undefined' && !lastChipDate && (
                    <div>
                        <FieldLabel>Last chip date</FieldLabel>
                        <input
                            type="date"
                            value={dateInputValue(lastChipDate)}
                            onChange={(e) =>
                                setLastChipDate(e.target.value ? DateUtility.parseLocalDate(e.target.value) : null)
                            }
                            className="w-full rounded-md px-3 py-2 text-[13px] outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                            style={FIELD_STYLE}
                        />
                    </div>
                )}
            </div>
        </Section>
    )
}
