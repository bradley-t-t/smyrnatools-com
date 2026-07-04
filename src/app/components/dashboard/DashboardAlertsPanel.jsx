import React, { useState } from 'react'

import { Panel } from '../ui/Panel'
import { getAssetViewType } from './shared/DashboardSharedComponents'

const COLLAPSED_LIMIT = 3
const STAGGER_MS = 40

/** Severity → coupled visual treatment. Keeping icon/stripe/tint/chip
 *  styles in one record prevents the row and the header chip from ever
 *  disagreeing on what "warning" looks like. */
const SEVERITY_CONFIG = {
    danger: {
        chipBg: 'bg-status-danger/10',
        chipText: 'text-status-danger',
        icon: 'fas fa-circle-exclamation',
        iconColor: 'text-status-danger',
        label: 'Critical',
        stripe: 'bg-status-danger',
        tint: 'bg-status-danger/[0.045]'
    },
    info: {
        chipBg: 'bg-bg-hover',
        chipText: 'text-text-secondary',
        icon: 'fas fa-circle-info',
        iconColor: 'text-text-tertiary',
        label: 'Info',
        stripe: 'bg-border-medium',
        tint: ''
    },
    warning: {
        chipBg: 'bg-status-warning/10',
        chipText: 'text-status-warning',
        icon: 'fas fa-triangle-exclamation',
        iconColor: 'text-status-warning',
        label: 'Warning',
        stripe: 'bg-status-warning',
        tint: 'bg-status-warning/[0.035]'
    }
}

/** Inline triage row — left rail (color stripe + severity icon), monospace
 *  identifier, message, right-aligned metric, optional chevron when
 *  actionable. Renders as a focusable button when interactive so keyboard
 *  users get the same affordances as mouse users. */
function AlertRow({ id, index, message, metric, onClick, severity = 'info', staggerOffset }) {
    const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
    const Wrapper = onClick ? 'button' : 'div'
    const interactive = !!onClick
    const shouldAnimate = staggerOffset != null && index >= staggerOffset
    const animationStyle = shouldAnimate ? { animationDelay: `${(index - staggerOffset) * STAGGER_MS}ms` } : undefined

    return (
        <Wrapper
            onClick={onClick}
            type={interactive ? 'button' : undefined}
            style={animationStyle}
            className={[
                'group relative flex items-center gap-2.5 w-full pl-3 pr-2 py-1.5 rounded-md text-left bg-transparent border-0',
                config.tint,
                'transition-[background-color,transform] duration-150 ease-out',
                interactive ? 'cursor-pointer hover:bg-bg-hover active:scale-[0.985]' : '',
                interactive
                    ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary'
                    : '',
                shouldAnimate ? 'animate-dv-fade-in motion-reduce:animate-none' : ''
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <span
                aria-hidden="true"
                className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full ${config.stripe}`}
            />
            <i className={`${config.icon} text-[11px] shrink-0 ${config.iconColor}`} aria-label={config.label} />
            {id && (
                <span className="font-mono text-[11.5px] font-semibold shrink-0 min-w-[52px] text-text-primary">
                    {id}
                </span>
            )}
            <span className="text-[12.5px] flex-1 min-w-0 truncate text-text-secondary">{message}</span>
            {metric != null && (
                <span className="font-mono text-[12px] tabular-nums font-semibold shrink-0 text-text-primary">
                    {metric}
                </span>
            )}
            {interactive && (
                <i
                    aria-hidden="true"
                    className="fas fa-chevron-right text-[10px] shrink-0 ml-0.5 text-text-tertiary transition-[transform,color] duration-150 ease-out group-hover:text-text-secondary group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                />
            )}
        </Wrapper>
    )
}

/** Tiny header pill with a colored dot + tabular count + label. Renders
 *  only when the count is > 0 so the breakdown stays clean. */
function SeverityChip({ count, severity }) {
    if (!count) return null
    const config = SEVERITY_CONFIG[severity]
    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold tabular-nums ${config.chipBg} ${config.chipText}`}
        >
            <span className={`w-1 h-1 rounded-full ${config.stripe}`} aria-hidden="true" />
            {count} {config.label}
        </span>
    )
}

/**
 * Active alerts panel — flat row list sourced from `plantNotifications`.
 * Caps at three rows by default; users opt into the full list with a
 * "View more" toggle so the dashboard hero stays compact. Severity chips
 * in the header give triage at a glance without expanding.
 */
export default function DashboardAlertsPanel({
    plantNotifications,
    setEmbeddedView,
    setEmbeddedViewProps,
    setEmbeddedViewSearch
}) {
    const [expanded, setExpanded] = useState(false)
    const {
        longTermShopAssets = [],
        pendingOperators = [],
        shopIssue,
        trainingOperators = [],
        unassignedOperators = []
    } = plantNotifications || {}

    const openOnAsset = (asset) => () => {
        setEmbeddedView?.(getAssetViewType(asset.type))
        setEmbeddedViewSearch?.(asset.identifier || '')
        setEmbeddedViewProps?.(null)
    }
    /* Each Operators alert pre-applies the status filter that matches the
     * row's intent so the popup opens on the relevant subset instead of the
     * full roster. The filter strings must match `OperatorsView`'s status
     * options exactly (see `statuses` / synthetic options in that view). */
    const openOperators = (initialStatusFilter) => () => {
        setEmbeddedView?.('operators')
        setEmbeddedViewSearch?.('')
        setEmbeddedViewProps?.(initialStatusFilter ? { initialStatusFilter } : null)
    }

    /* Single ordered list — fleet bottleneck first, then long-term shop
     * assets, then operator pipeline counts. Per-truck open-issue rollups
     * stay in the asset views where they read better. */
    const allRows = []
    if (shopIssue) {
        allRows.push({
            id: 'FLEET',
            key: 'shop',
            message: 'In-shop count crossed bottleneck threshold',
            metric: `${shopIssue.inShopCount} / ${shopIssue.spareCount}`,
            severity: 'danger'
        })
    }
    longTermShopAssets.forEach((asset, i) => {
        allRows.push({
            id: asset.identifier || asset.type,
            key: `long-${i}`,
            message: `${asset.type} long-term in shop${asset.downInYard ? ' (down in yard)' : ''}`,
            metric: `${asset.daysInShop}d`,
            onClick: openOnAsset(asset),
            severity: 'warning'
        })
    })
    if (unassignedOperators.length > 0) {
        allRows.push({
            id: 'OPS',
            key: 'unassigned',
            message: 'Unassigned operators',
            metric: unassignedOperators.length,
            onClick: openOperators('Unassigned Active'),
            severity: 'warning'
        })
    }
    if (pendingOperators.length > 0) {
        allRows.push({
            id: 'OPS',
            key: 'pending',
            message: 'Operators awaiting start date',
            metric: pendingOperators.length,
            onClick: openOperators('Pending Start'),
            severity: 'info'
        })
    }
    if (trainingOperators.length > 0) {
        allRows.push({
            id: 'OPS',
            key: 'training',
            message: 'Operators currently in training',
            metric: trainingOperators.length,
            onClick: openOperators('Training'),
            severity: 'info'
        })
    }

    const totalCount = allRows.length

    if (totalCount === 0) {
        return (
            <Panel id="alerts" title="Alerts">
                <div className="flex items-center justify-center gap-2 py-1 text-[12.5px] text-text-secondary">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-active/10">
                        <i className="fas fa-check text-[10px] text-status-active" aria-hidden="true" />
                    </span>
                    <span>All clear — no active alerts.</span>
                </div>
            </Panel>
        )
    }

    const counts = allRows.reduce(
        (acc, row) => {
            acc[row.severity] = (acc[row.severity] || 0) + 1
            return acc
        },
        { danger: 0, info: 0, warning: 0 }
    )

    const visibleRows = expanded ? allRows : allRows.slice(0, COLLAPSED_LIMIT)
    const hiddenCount = totalCount - visibleRows.length
    const canExpand = totalCount > COLLAPSED_LIMIT
    /* Stagger only the newly revealed rows on expand — the first batch is
     * already on screen and shouldn't re-animate when the user toggles. */
    const staggerOffset = expanded ? COLLAPSED_LIMIT : visibleRows.length

    const headerRight = (
        <div className="flex items-center gap-1.5">
            <SeverityChip count={counts.danger} severity="danger" />
            <SeverityChip count={counts.warning} severity="warning" />
            <SeverityChip count={counts.info} severity="info" />
        </div>
    )

    return (
        <Panel id="alerts" title="Alerts" right={headerRight}>
            <div className="flex flex-col gap-0.5">
                {visibleRows.map((row, idx) => (
                    <AlertRow
                        key={row.key}
                        id={row.id}
                        index={idx}
                        message={row.message}
                        metric={row.metric}
                        onClick={row.onClick}
                        severity={row.severity}
                        staggerOffset={staggerOffset}
                    />
                ))}
                {canExpand && (
                    <button type="button"
                        onClick={() => setExpanded((prev) => !prev)}
                        aria-expanded={expanded}
                        className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold mt-1.5 px-2 py-1 rounded-md bg-transparent cursor-pointer text-text-secondary transition-[color,background-color,transform] duration-150 ease-out hover:text-text-primary hover:bg-bg-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                    >
                        <span>{expanded ? 'Show less' : `View ${hiddenCount} more`}</span>
                        <i
                            aria-hidden="true"
                            className={`fas fa-chevron-down text-[9px] transition-transform duration-200 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                        />
                    </button>
                )}
            </div>
        </Panel>
    )
}
