/* eslint-disable react/forbid-dom-props */
import React, { useMemo, useState } from 'react'

import Badge from '../common/Badge'

/* Validation for free-form alias codes typed in by the user. Accepts
 * alphanumerics, dashes, and underscores; trims and normalises to
 * uppercase letters for consistency with dispatch's existing code
 * format ("403", "14008B", etc.). Rejects empty / whitespace input. */
const normalizeCustomCode = (raw) => {
    const trimmed = String(raw ?? '').trim()
    if (!trimmed) return ''
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return ''
    return trimmed.toUpperCase().replace(/[A-Z]/g, (ch) => ch) // preserve digits + case-fold any letters
}

/**
 * Co-location editor for one plant. The caller owns the
 * `selectedCodes` array (codes that share this physical site, excluding
 * the current plant) and a single `onChange(nextCodes)` setter. Save
 * is the caller's responsibility — this component just mutates the
 * in-memory selection.
 *
 * Three sections:
 *
 *   1. **Currently co-located with** — chips for every selected code
 *      with explicit × remove buttons. Real plants show their name;
 *      phantom codes (not in `candidates`) show as "Custom code".
 *   2. **Add a sibling plant** — filterable list of real plant rows.
 *   3. **Add a custom code** — free-form input for codes that aren't
 *      tracked as plant rows (e.g. dispatch's "404"). Saved on the
 *      target plant's `colocated_alias_codes` server-side; the picker
 *      surface treats it identically to a real sibling.
 */
export default function PlantColocationEditor({ candidates = [], disabled = false, onChange, selectedCodes = [] }) {
    const [filterText, setFilterText] = useState('')
    const [customCodeInput, setCustomCodeInput] = useState('')
    const [customCodeError, setCustomCodeError] = useState('')
    const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes])
    const candidateByCode = useMemo(() => new Map(candidates.map((c) => [c.plantCode, c])), [candidates])

    /* Resolve display info per selected code. Real plants get their
     * registered name; codes with no matching candidate render as
     * phantom aliases so the dispatcher can tell them apart. */
    const selectedRows = useMemo(
        () =>
            [...selectedCodes].sort().map((code) => {
                const candidate = candidateByCode.get(code)
                return {
                    isCustom: !candidate,
                    plantCode: code,
                    plantName: candidate?.plantName || ''
                }
            }),
        [selectedCodes, candidateByCode]
    )

    const addableCandidates = useMemo(() => {
        const trimmed = filterText.trim().toLowerCase()
        const base = candidates.filter((c) => !selectedSet.has(c.plantCode))
        if (!trimmed) return base
        return base.filter((c) => {
            const code = String(c.plantCode || '').toLowerCase()
            const name = String(c.plantName || '').toLowerCase()
            return code.includes(trimmed) || name.includes(trimmed)
        })
    }, [candidates, filterText, selectedSet])

    const add = (code) => {
        if (disabled || selectedSet.has(code)) return
        onChange?.([...selectedCodes, code])
    }

    const remove = (code) => {
        if (disabled) return
        onChange?.(selectedCodes.filter((c) => c !== code))
    }

    const handleAddCustom = () => {
        if (disabled) return
        const normalized = normalizeCustomCode(customCodeInput)
        if (!normalized) {
            setCustomCodeError('Enter a plant code (letters, digits, dashes, underscores).')
            return
        }
        if (selectedSet.has(normalized)) {
            setCustomCodeError(`${normalized} is already selected.`)
            return
        }
        setCustomCodeError('')
        setCustomCodeInput('')
        onChange?.([...selectedCodes, normalized])
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ── Selected siblings ─────────────────────────────────── */}
            <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                    Currently co-located with
                </div>
                {selectedRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-light bg-bg-secondary px-4 py-3 text-[12px] text-text-tertiary">
                        This plant stands alone. Add a sibling or custom code below to mark it as the same physical
                        location as another plant.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {selectedRows.map((row) => (
                            <span
                                key={row.plantCode}
                                className="inline-flex items-center gap-2 rounded-full border border-border-light bg-bg-primary pl-3 pr-1.5 py-1 text-[12.5px]"
                                title={
                                    row.isCustom
                                        ? `${row.plantCode} — custom code (no plant row, treated as same physical location)`
                                        : `${row.plantCode}${row.plantName ? ` — ${row.plantName}` : ''}`
                                }
                            >
                                <span className="font-mono tabular-nums font-semibold text-text-primary">
                                    {row.plantCode}
                                </span>
                                {row.isCustom ? (
                                    <Badge tone="neutral" size="sm" weight="bold">
                                        Custom
                                    </Badge>
                                ) : (
                                    row.plantName && <span className="text-text-secondary">{row.plantName}</span>
                                )}
                                <button type="button"
                                    className="flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.92] disabled:active:scale-100"
                                    onClick={() => remove(row.plantCode)}
                                    disabled={disabled}
                                    aria-label={`Remove ${row.plantCode} from co-location`}
                                    title="Remove from co-location"
                                >
                                    <i className="fas fa-times text-[11px]" aria-hidden="true" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add a sibling plant (existing plant row) ──────────── */}
            <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                    Add a sibling plant
                </div>
                <div className="relative">
                    <i
                        aria-hidden="true"
                        className="fas fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary"
                    />
                    <input
                        type="search"
                        className="w-full rounded-xl border border-border-light bg-bg-secondary pl-9 pr-9 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden"
                        placeholder="Filter plants by code or name…"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        disabled={disabled}
                        aria-label="Filter sibling plant candidates"
                    />
                    {filterText && !disabled && (
                        <button type="button"
                            aria-label="Clear filter"
                            onClick={() => setFilterText('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
                        >
                            <i className="fas fa-times text-[10px]" />
                        </button>
                    )}
                </div>
                <div className="rounded-xl border border-border-light bg-bg-secondary max-h-64 overflow-y-auto">
                    {addableCandidates.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[12px] text-text-tertiary">
                            {candidates.length === selectedRows.filter((r) => !r.isCustom).length
                                ? 'Every other plant is already selected.'
                                : 'No plants match the filter.'}
                        </div>
                    ) : (
                        addableCandidates.map((candidate, idx) => (
                            <button type="button"
                                key={candidate.plantCode}
                                disabled={disabled}
                                onClick={() => add(candidate.plantCode)}
                                className="flex w-full items-center gap-3 border-none bg-transparent px-4 py-2.5 text-left cursor-pointer hover:bg-bg-hover transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97] disabled:active:scale-100"
                                style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border-light)' }}
                            >
                                <i className="fas fa-plus text-[11px] text-text-tertiary" aria-hidden="true" />
                                <span className="font-mono tabular-nums font-semibold text-text-primary w-12 shrink-0">
                                    {candidate.plantCode}
                                </span>
                                <span className="truncate text-[13px] text-text-secondary">
                                    {candidate.plantName || 'Unnamed plant'}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── Add a custom code (phantom — not a real plant row) ── */}
            <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                    Add a custom code
                </div>
                <div className="text-[11.5px] text-text-secondary">
                    For dispatch codes that share this site but aren&apos;t set up as their own plant in Tools (e.g.
                    Baytown&apos;s <span className="font-mono tabular-nums">404</span>, Conroe&apos;s{' '}
                    <span className="font-mono tabular-nums">409</span>).
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        className="flex-1 rounded-xl border border-border-light bg-bg-secondary px-4 py-2.5 text-sm font-mono tabular-nums text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-border-medium focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60"
                        placeholder="e.g. 404"
                        value={customCodeInput}
                        onChange={(e) => {
                            setCustomCodeInput(e.target.value)
                            if (customCodeError) setCustomCodeError('')
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCustom()
                            }
                        }}
                        disabled={disabled}
                    />
                    <button type="button"
                        className="rounded-xl border border-border-light bg-bg-primary px-5 py-2.5 text-sm font-semibold text-text-primary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97] disabled:active:scale-100"
                        onClick={handleAddCustom}
                        disabled={disabled || !customCodeInput.trim()}
                    >
                        <i className="fas fa-plus mr-2 text-[11px]" aria-hidden="true" />
                        Add code
                    </button>
                </div>
                {customCodeError && <div className="text-[11.5px] text-text-primary">{customCodeError}</div>}
            </div>
        </div>
    )
}
