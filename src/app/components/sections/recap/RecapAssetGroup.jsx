/* eslint-disable react/forbid-dom-props */
import React from 'react'

import Badge from '../../common/Badge'
import { formatDate, formatFieldName, formatValue, getChangeIcon } from './recapHelpers'

/**
 * Collapsible card representing a single asset (mixer or operator) and its
 * change history within the recap modal. Header toggles expansion; expanded
 * body renders one row per field change with old → new diff and metadata.
 */
function RecapAssetGroup({ group, changes, isExpanded, onToggle, operatorNames, userNames }) {
    const isMixer = group.type === 'mixer'
    const isTerminated = group.type === 'operator' && group.status === 'Terminated'
    const tile = isMixer
        ? { bg: '#dbeafe', fg: '#1e40af', icon: 'truck' }
        : { bg: '#fef3c7', fg: '#92400e', icon: 'hard-hat' }

    return (
        <div className="rounded overflow-hidden bg-bg-primary border border-border-light">
            <button type="button"
                onClick={onToggle}
                className="flex w-full items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-bg-tertiary border-none text-left bg-transparent"
            >
                <Badge
                    variant="custom"
                    size="lg"
                    shape="rounded-md"
                    weight="bold"
                    bg={tile.bg}
                    fg={tile.fg}
                    icon={tile.icon}
                    className="h-6 w-6 justify-center p-0"
                />
                {isTerminated ? (
                    <span className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="line-through text-[12px] truncate text-text-secondary">{group.name}</span>
                        <Badge tone="danger" size="sm" weight="bold" className="shrink-0">
                            Terminated
                        </Badge>
                    </span>
                ) : (
                    <span className="flex-1 text-[12px] font-semibold truncate text-text-primary">{group.name}</span>
                )}
                <Badge tone="neutral" size="xs" weight="bold" className="font-mono">
                    {changes.length}
                </Badge>
                <i
                    className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-text-tertiary`}
                />
            </button>
            {isExpanded && (
                <div className="border-t border-border-light">
                    {changes.map((entry, index) => (
                        <div
                            key={entry.id || index}
                            className="flex gap-2 px-3 py-2"
                            style={{
                                borderBottom: index < changes.length - 1 ? '1px solid var(--border-light)' : 'none'
                            }}
                        >
                            <div className="flex h-6 w-6 items-center justify-center rounded shrink-0 mt-0.5 bg-bg-tertiary text-text-secondary">
                                <i className={`${getChangeIcon(entry.field_name)} text-[10px]`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                                        {formatFieldName(entry.field_name)}
                                    </span>
                                    <span className="text-[10px] font-mono tabular-nums shrink-0 text-text-tertiary">
                                        {formatDate(entry.changed_at)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                                    <span className="px-1.5 py-0.5 rounded truncate max-w-[130px] font-mono tabular-nums bg-red-100 text-text-primary">
                                        {formatValue(entry.old_value, entry.field_name, operatorNames)}
                                    </span>
                                    <i className="fa-solid fa-arrow-right text-[8px] shrink-0 text-text-tertiary" />
                                    <span className="px-1.5 py-0.5 rounded truncate max-w-[130px] font-mono tabular-nums bg-green-100 text-text-primary">
                                        {formatValue(entry.new_value, entry.field_name, operatorNames)}
                                    </span>
                                </div>
                                {entry.changed_by && userNames[entry.changed_by] && (
                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text-tertiary">
                                        <i className="fa-solid fa-user-pen text-[8px]" />
                                        <span>{userNames[entry.changed_by]}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default RecapAssetGroup
