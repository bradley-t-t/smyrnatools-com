import React from 'react'

import Badge from '../../app/components/common/Badge'
import StarRating from '../../app/components/common/StarRating'
import StatusHistoryBar from '../../app/components/common/StatusHistoryBar'

/**
 * Status name → Badge tone. Drives the solid-fill status pill across every
 * asset type so the palette is one mapping, not five duplicated CSS strings.
 */
const STATUS_TO_TONE = {
    Active: 'success',
    'Down In Yard': 'danger',
    'In Shop': 'info',
    'No Hire': 'danger',
    'Pending Start': 'info',
    'Ready For Pickup': 'success',
    Retired: 'neutral',
    Sold: 'neutral',
    Spare: 'neutral',
    Stationary: 'info',
    Terminated: 'danger',
    'Third Party Work': 'neutral',
    Training: 'warning',
    'Waiting For Shop': 'warning'
}

const ICON_BUTTON_CLASS =
    'relative inline-flex items-center justify-center w-[22px] h-[22px] rounded-md border-none bg-transparent text-[11px] text-text-tertiary cursor-pointer transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset'

const CELL_BASE_CLASS = 'border-b border-border-light px-2.5 py-1.5 text-[12px] align-middle text-text-primary'
const CELL_BOLD_CLASS = `${CELL_BASE_CLASS} text-[12.5px] font-bold`

/** 9+ clamp for badge counts (keeps inline icon-button dot visually round). */
const formatBadgeCount = (count) => (count > 9 ? '9+' : count)

const getStatusToneForStatus = (status) => STATUS_TO_TONE[status] || 'neutral'

/**
 * Single table row for the asset list view, driven by column type configs.
 * Visual rhythm matches the schedule-tab table: 12px body, 6/10 cell padding,
 * 9.5px uppercase tracked-wider status pills, 22px borderless action icons.
 *
 * Uses semantic status tokens (`bg-status-*`) for pills + verify buttons —
 * the per-asset palette stays consistent across all 5 asset types and
 * respects all three themes (light/dark/gray).
 */
export default function AssetListRow({
    className,
    config,
    duplicates,
    item,
    onComment,
    onHistory,
    onIssue,
    onOperatorComment,
    onOperatorHistory,
    onSelect,
    onSendMessage,
    onVerify,
    operators,
    plants,
    style,
    tractors
}) {
    const { columns } = config.listConfig

    /** Copies text to clipboard with a 1.5s checkmark confirmation. */
    const handleCopy = (event, text) => {
        event.stopPropagation()
        navigator.clipboard.writeText(text)
        const icon = event.currentTarget.querySelector('i')
        if (!icon) return
        const original = icon.className
        icon.className = 'fas fa-check text-status-active'
        setTimeout(() => {
            icon.className = original
        }, 1500)
    }

    const copyButton = (text, title = 'Copy') => (
        <button type="button"
            onClick={(event) => handleCopy(event, text)}
            title={title}
            aria-label={title}
            className="inline-flex items-center bg-transparent border-none cursor-pointer text-[10px] p-0.5 text-text-tertiary transition-colors duration-150 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
            <i className="fas fa-copy" />
        </button>
    )

    const widthStyle = (width) => (width ? { width } : undefined)

    const renderCell = (col) => {
        const cellClass = col.bold ? CELL_BOLD_CLASS : CELL_BASE_CLASS

        if (col.type === 'status') {
            const displayStatus = col.getDisplayStatus ? col.getDisplayStatus(item) : item.status
            const dateToUse = item.statusChangedAt || item.createdAt
            const days = dateToUse
                ? Math.max(1, Math.floor((Date.now() - new Date(dateToUse).getTime()) / 86400000))
                : 1
            const daysSuffix = displayStatus && displayStatus !== 'Retired' ? ` · ${days}d` : ''
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    <div className="flex flex-col gap-1">
                        <Badge
                            tone={getStatusToneForStatus(displayStatus)}
                            size="sm"
                            shape="rounded-md"
                            className="self-start"
                        >
                            {`${displayStatus || '---'}${daysSuffix}`}
                        </Badge>
                        <StatusHistoryBar
                            itemId={item.id}
                            itemType={config.historyType}
                            currentStatus={item.status}
                            createdAt={item.createdAt}
                        />
                    </div>
                </td>
            )
        }

        if (col.type === 'truckNumber') {
            const val = col.getValue ? col.getValue(item) : item[col.key]
            return (
                <td key={col.key} className={`${CELL_BOLD_CLASS} font-mono`} style={widthStyle(col.width)}>
                    {val ? (
                        <div className="flex items-center gap-1">
                            <span className="tabular-nums">{val}</span>
                            {copyButton(val, col.copyTitle || 'Copy')}
                        </div>
                    ) : (
                        '---'
                    )}
                </td>
            )
        }

        if (col.type === 'operator') {
            const operator = operators.find((op) => op.employeeId === item[col.lookupField || 'assignedOperator'])
            const assignedTrainees = operator?.isTrainer
                ? operators.filter((op) => op.assignedTrainer === operator.employeeId)
                : []
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    {operator?.name ? (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                                <span className="font-medium">{operator.name}</span>
                                {copyButton(operator.name, 'Copy operator name')}
                            </div>
                            {assignedTrainees.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                    {assignedTrainees.map((trainee) => (
                                        <Badge
                                            key={trainee.employeeId}
                                            tone="warning"
                                            variant="soft"
                                            size="sm"
                                            shape="rounded-md"
                                            weight="semibold"
                                            uppercase={false}
                                            icon="user-graduate"
                                            title={`Trainee: ${trainee.name}`}
                                        >
                                            {trainee.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <Badge
                                    as="button"
                                    tone="neutral"
                                    variant="custom"
                                    size="sm"
                                    shape="rounded-md"
                                    weight="semibold"
                                    uppercase={false}
                                    icon="comment"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        onOperatorComment?.(operator)
                                    }}
                                    title="Operator comments"
                                    aria-label="Operator comments"
                                    className="relative bg-bg-secondary border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                >
                                    <span>Comments</span>
                                    {operator.commentsCount > 0 && (
                                        <Badge
                                            tone="accent"
                                            size="xs"
                                            shape="pill"
                                            uppercase={false}
                                            className="absolute -top-0.5 -right-0.5 min-w-[12px] justify-center"
                                        >
                                            {formatBadgeCount(operator.commentsCount)}
                                        </Badge>
                                    )}
                                </Badge>
                                <Badge
                                    as="button"
                                    tone="neutral"
                                    variant="custom"
                                    size="sm"
                                    shape="rounded-md"
                                    weight="semibold"
                                    uppercase={false}
                                    icon="history"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        onOperatorHistory?.(operator)
                                    }}
                                    title="Operator history"
                                    aria-label="Operator history"
                                    className="bg-bg-secondary border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                >
                                    <span>History</span>
                                </Badge>
                            </div>
                        </div>
                    ) : (
                        <span className="italic text-text-tertiary">—</span>
                    )}
                </td>
            )
        }

        if (col.type === 'stars') {
            const rating = item[col.ratingField || col.key] || 0
            const showNAForRetired = col.naForRetired && item.status === 'Retired'
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    {showNAForRetired ? (
                        <span className="text-text-tertiary">N/A</span>
                    ) : (
                        <div className="flex items-center">
                            <StarRating value={rating} tone="warning" size="xs" />
                            {col.dirtyWarning && rating > 0 && rating < 3 && (
                                <Badge tone="danger" variant="soft" size="xs" shape="rounded-md" className="ml-1.5">
                                    Dirty
                                </Badge>
                            )}
                        </div>
                    )}
                </td>
            )
        }

        if (col.type === 'verified') {
            const isVerified = col.getIsVerified ? col.getIsVerified(item) : item.isVerified?.()
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    {item.status === 'Retired' ? (
                        <Badge tone="neutral" variant="soft" size="sm" shape="rounded-md">
                            N/A
                        </Badge>
                    ) : (
                        <Badge
                            as="button"
                            tone={isVerified ? 'success' : 'warning'}
                            size="sm"
                            shape="rounded-md"
                            icon={isVerified ? 'check-circle' : 'exclamation-circle'}
                            onClick={(event) => {
                                event.stopPropagation()
                                onVerify?.(item.id, config.getModalIdentifier(item))
                            }}
                            title={isVerified ? 'Verified' : 'Click to verify'}
                            aria-label={isVerified ? 'Verified' : 'Verify'}
                            className={`hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isVerified ? '!cursor-default' : ''}`}
                        >
                            {isVerified ? 'Verified' : 'Verify'}
                        </Badge>
                    )}
                </td>
            )
        }

        if (col.type === 'tractor') {
            const tractor = item.assignedTractor ? tractors.find((t) => t.id === item.assignedTractor) : null
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    {tractor?.truckNumber || '---'}
                </td>
            )
        }

        if (col.type === 'vin') {
            const vinVal = col.getValue ? col.getValue(item) : item[col.key]
            const normalizedKey = col.normalize?.(item)
            const isDuplicate = normalizedKey && duplicates[col.duplicateKey]?.has(normalizedKey)
            return (
                <td
                    key={col.key}
                    className={`${cellClass} font-mono text-[11px] text-text-secondary`}
                    style={widthStyle(col.width)}
                >
                    {vinVal ? (
                        <div className="flex items-center gap-1">
                            <span className="tabular-nums">{vinVal}</span>
                            {copyButton(vinVal, 'Copy VIN')}
                            {isDuplicate && (
                                <Badge
                                    tone="warning"
                                    variant="soft"
                                    size="xs"
                                    shape="rounded-md"
                                    icon="exclamation-triangle"
                                    title="Duplicate VIN"
                                    aria-label="Duplicate VIN"
                                />
                            )}
                        </div>
                    ) : (
                        '---'
                    )}
                </td>
            )
        }

        if (col.type === 'textWithWarning') {
            const val = col.getValue ? col.getValue(item) : item[col.key]
            const normalizedKey = col.normalize?.(item)
            const isDuplicate = normalizedKey && duplicates[col.duplicateKey]?.has(normalizedKey)
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    {val || '---'}
                    {isDuplicate && (
                        <Badge
                            tone="warning"
                            variant="soft"
                            size="xs"
                            shape="rounded-md"
                            icon="exclamation-triangle"
                            title={col.warningTitle}
                            aria-label={col.warningTitle}
                            className="ml-1.5"
                        />
                    )}
                </td>
            )
        }

        if (col.type === 'number') {
            const val = col.getValue ? col.getValue(item) : item[col.key]
            const hasWarning = col.getWarning?.(item)
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    {val != null ? (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="tabular-nums font-mono">{val}</span>
                            {hasWarning && (
                                <Badge
                                    tone="danger"
                                    variant="soft"
                                    size="xs"
                                    shape="rounded-md"
                                    icon="exclamation-triangle"
                                    title={col.warningTitle}
                                    aria-label={col.warningTitle}
                                />
                            )}
                        </span>
                    ) : (
                        '---'
                    )}
                </td>
            )
        }

        if (col.type === 'actions') {
            const identifier = config.getModalIdentifier(item)
            return (
                <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                    <div className="flex items-center gap-0.5">
                        <button type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onComment(item.id, identifier)
                            }}
                            className={ICON_BUTTON_CLASS}
                            title="View comments"
                            aria-label="View comments"
                        >
                            <i className="fas fa-comments" />
                            {item.commentsCount > 0 && (
                                <Badge
                                    tone="accent"
                                    size="xs"
                                    shape="pill"
                                    uppercase={false}
                                    className="absolute -top-0.5 -right-0.5 min-w-[12px] justify-center"
                                >
                                    {formatBadgeCount(item.commentsCount)}
                                </Badge>
                            )}
                        </button>
                        <button type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onIssue(item.id, identifier)
                            }}
                            className={ICON_BUTTON_CLASS}
                            title="View issues"
                            aria-label="View issues"
                        >
                            <i className="fas fa-tools" />
                            {item.openIssuesCount > 0 && (
                                <Badge
                                    tone="danger"
                                    size="xs"
                                    shape="pill"
                                    uppercase={false}
                                    className="absolute -top-0.5 -right-0.5 min-w-[12px] justify-center"
                                >
                                    {formatBadgeCount(item.openIssuesCount)}
                                </Badge>
                            )}
                        </button>
                        <button type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onHistory(item)
                            }}
                            className={ICON_BUTTON_CLASS}
                            title="View history"
                            aria-label="View history"
                        >
                            <i className="fas fa-history" />
                        </button>
                        <button type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onSendMessage?.(item, identifier)
                            }}
                            className={ICON_BUTTON_CLASS}
                            title="Send as message"
                            aria-label="Send as message"
                        >
                            <i className="fas fa-paper-plane" />
                        </button>
                    </div>
                </td>
            )
        }

        if (col.type === 'plant') {
            const plant = plants.find((p) => p.code === item[col.key || 'assignedPlant'])
            return (
                <td key={col.key || 'plant'} className={cellClass} style={widthStyle(col.width)}>
                    {plant?.name || item[col.key || 'assignedPlant'] || '---'}
                </td>
            )
        }

        const val = col.getValue ? col.getValue(item) : item[col.key]
        return (
            <td key={col.key} className={cellClass} style={widthStyle(col.width)}>
                {val || '---'}
            </td>
        )
    }

    return (
        <tr
            className={`cursor-pointer transition-colors duration-150 ${className || ''}`}
            onClick={() => onSelect(item.id)}
            style={style}
        >
            {columns.map(renderCell)}
        </tr>
    )
}
