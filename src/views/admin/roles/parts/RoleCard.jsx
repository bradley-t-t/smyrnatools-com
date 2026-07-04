/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react'

import Badge from '../../../../app/components/common/Badge'
import { getNamespace, NAMESPACE_ICONS } from './permissionMeta'
import PermissionRow from './PermissionRow'

const PASTE_STATUS_TIMEOUT_MS = 2000
const COPY_STATUS_TIMEOUT_MS = 1500
const ELEVATED_WEIGHT_THRESHOLD = 75

/** Expandable role card showing name, weight, permission count, and permission list. */
const RoleCard = ({
    role,
    isExpanded,
    onToggle,
    hasITAccess,
    accentColor,
    onRemovePermission,
    onAddPermission,
    onPastePermissions,
    onEditWeight,
    savingPerms
}) => {
    const [addingPerm, setAddingPerm] = useState(false)
    const [newPerm, setNewPerm] = useState('')
    const [copied, setCopied] = useState(false)
    const [pasteStatus, setPasteStatus] = useState(null)
    const permissions = Array.isArray(role.permissions) ? [...role.permissions].sort() : []
    const namespaces = [...new Set(permissions.map(getNamespace))].sort()
    const isElevated = (role.weight || 0) > ELEVATED_WEIGHT_THRESHOLD

    const handleAddPerm = () => {
        const trimmed = newPerm.trim()
        if (!trimmed) return
        onAddPermission(role.id, trimmed)
        setNewPerm('')
        setAddingPerm(false)
    }

    const handlePastePermissions = async () => {
        try {
            const text = await navigator.clipboard.readText()
            const incoming = text
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
            if (incoming.length === 0) {
                setPasteStatus({ text: 'Clipboard is empty', type: 'error' })
                setTimeout(() => setPasteStatus(null), PASTE_STATUS_TIMEOUT_MS)
                return
            }
            const existing = new Set(permissions)
            const toAdd = incoming.filter((p) => !existing.has(p))
            if (toAdd.length === 0) {
                setPasteStatus({ text: 'Already has all', type: 'info' })
                setTimeout(() => setPasteStatus(null), PASTE_STATUS_TIMEOUT_MS)
                return
            }
            await onPastePermissions(role.id, [...permissions, ...toAdd])
            setPasteStatus({ text: `Added ${toAdd.length}`, type: 'success' })
            setTimeout(() => setPasteStatus(null), PASTE_STATUS_TIMEOUT_MS)
        } catch {
            setPasteStatus({ text: 'Paste failed', type: 'error' })
            setTimeout(() => setPasteStatus(null), PASTE_STATUS_TIMEOUT_MS)
        }
    }

    const handleCopyPermissions = async () => {
        if (permissions.length === 0) return
        try {
            await navigator.clipboard.writeText(permissions.join('\n'))
            setCopied(true)
            setTimeout(() => setCopied(false), COPY_STATUS_TIMEOUT_MS)
        } catch {
            const textarea = document.createElement('textarea')
            textarea.value = permissions.join('\n')
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), COPY_STATUS_TIMEOUT_MS)
        }
    }

    return (
        <div className="overflow-hidden rounded-card border border-border-light bg-bg-primary shadow-sm transition-shadow duration-200 hover:shadow-card">
            {/* Header — asset-card visual rhythm: 40x40 accent icon + bold name + stat pills + chevron. */}
            <button type="button"
                aria-expanded={isExpanded}
                onClick={onToggle}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-base text-white shadow-sm"
                    style={{ background: accentColor }}
                >
                    <i className="fas fa-shield-alt" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-heading text-lg font-bold tracking-tight text-text-primary">
                            {role.name}
                        </span>
                        {isElevated && (
                            <Badge
                                tone="warning"
                                size="xs"
                                shape="pill"
                                weight="bold"
                                icon="bolt"
                                title="Weight exceeds elevated threshold"
                            >
                                Elevated
                            </Badge>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge
                            tone="neutral"
                            size="sm"
                            shape="rounded-md"
                            weight="semibold"
                            icon="scale-balanced"
                            uppercase={false}
                        >
                            <span className="font-mono tabular-nums">{role.weight || 0}</span>
                        </Badge>
                        <Badge tone="accent" size="sm" shape="rounded-md" weight="semibold" uppercase={false}>
                            <span className="font-mono tabular-nums">{permissions.length}</span>
                            <span className="ml-1">perms</span>
                        </Badge>
                        <Badge tone="success" size="sm" shape="rounded-md" weight="semibold" uppercase={false}>
                            <span className="font-mono tabular-nums">{namespaces.length}</span>
                            <span className="ml-1">namespaces</span>
                        </Badge>
                    </div>
                </div>
                <i
                    className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-xs text-text-tertiary transition-transform duration-200`}
                    aria-hidden="true"
                />
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="border-t border-border-light animate-fade-in motion-reduce:animate-none">
                    {/* Actions bar */}
                    <div className="flex items-center gap-2 border-b border-border-light bg-bg-secondary px-5 py-3">
                        {hasITAccess && (
                            <>
                                <button type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setAddingPerm(true)
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-all duration-150 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary active:scale-[0.97]"
                                >
                                    <i className="fas fa-plus text-[9px]" aria-hidden="true" />
                                    Add Permission
                                </button>
                                <button type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEditWeight(role)
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary active:scale-[0.97]"
                                >
                                    <i className="fas fa-balance-scale text-[9px]" aria-hidden="true" />
                                    Edit Weight
                                </button>
                            </>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            {pasteStatus && (
                                <span
                                    className={`text-[11px] font-semibold animate-fade-in-fast motion-reduce:animate-none ${
                                        pasteStatus.type === 'error'
                                            ? 'text-status-danger'
                                            : pasteStatus.type === 'success'
                                              ? 'text-status-active'
                                              : 'text-text-secondary'
                                    }`}
                                    role="status"
                                    aria-live="polite"
                                >
                                    {pasteStatus.text}
                                </span>
                            )}
                            <button type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyPermissions()
                                }}
                                disabled={permissions.length === 0}
                                className="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                                title="Copy all permission nodes — one per line"
                            >
                                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-[9px]`} aria-hidden="true" />
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                            {hasITAccess && (
                                <button type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handlePastePermissions()
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary active:scale-[0.97]"
                                    title="Paste permissions from clipboard — merges with existing"
                                >
                                    <i className="fas fa-paste text-[9px]" aria-hidden="true" />
                                    Paste
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Add permission inline */}
                    {addingPerm && (
                        <div className="flex items-center gap-2 border-b border-border-light bg-accent/5 px-5 py-3 animate-fade-slide-in motion-reduce:animate-none">
                            <input
                                type="text"
                                value={newPerm}
                                onChange={(e) => setNewPerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddPerm()}
                                placeholder="e.g. reports.qc_strength"
                                autoFocus
                                className="flex-1 rounded-md border border-border-light bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-150 hover:border-border-medium focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                                aria-label="New permission node"
                            />
                            <button type="button"
                                onClick={handleAddPerm}
                                disabled={!newPerm.trim()}
                                className="rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
                                style={{ background: accentColor }}
                            >
                                Add
                            </button>
                            <button type="button"
                                onClick={() => {
                                    setAddingPerm(false)
                                    setNewPerm('')
                                }}
                                className="rounded-md bg-bg-tertiary px-3 py-2 text-xs font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97]"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Permissions grouped by namespace */}
                    <div className="px-4 py-3">
                        {permissions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-text-tertiary">
                                <i className="fas fa-lock mb-2 block text-2xl" aria-hidden="true" />
                                No permissions assigned
                            </div>
                        ) : (
                            namespaces.map((ns) => {
                                const nsPerms = permissions.filter((p) => getNamespace(p) === ns)
                                const icon = NAMESPACE_ICONS[ns] || 'fa-key'
                                return (
                                    <div key={ns} className="mb-3 last:mb-0">
                                        <div className="mb-1 flex items-center gap-2 px-1">
                                            <i
                                                className={`fas ${icon} text-[10px] text-text-tertiary`}
                                                aria-hidden="true"
                                            />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                                                {ns}
                                            </span>
                                            <span className="text-[10px] text-text-tertiary opacity-70">
                                                {nsPerms.length}
                                            </span>
                                        </div>
                                        {nsPerms.map((perm) => (
                                            <PermissionRow
                                                key={perm}
                                                permission={perm}
                                                hasITAccess={hasITAccess}
                                                isSaving={savingPerms.has(`${role.id}:${perm}`)}
                                                onRemove={(p) => onRemovePermission(role.id, p)}
                                            />
                                        ))}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default RoleCard
