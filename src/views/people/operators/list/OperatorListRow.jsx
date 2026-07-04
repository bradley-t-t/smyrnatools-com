import React from 'react'

import Badge from '../../../../app/components/common/Badge'
import PhoneLink from '../../../../app/components/common/PhoneLink'
import StatusHistoryBar from '../../../../app/components/common/StatusHistoryBar'
import { renderStarsOrNA } from './operatorRatingHelpers'
import { getOperatorStatusTone } from './operatorStatusBadge'

const CELL_BASE = 'text-text-primary text-[12px] font-medium py-1.5 px-2.5 text-left align-middle'
const CELL_SECONDARY = 'text-text-secondary text-[11.5px] py-1.5 px-2.5 text-left align-middle'
const CELL_HIGHLIGHT = 'text-text-primary text-[12.5px] font-bold py-1.5 px-2.5 text-left align-middle'
const ACTION_BUTTON =
    'inline-flex items-center justify-center w-5 h-5 mr-0.5 rounded text-[11px] cursor-pointer border-none bg-transparent text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
const COPY_BUTTON =
    'inline-flex items-center justify-center bg-transparent border-none text-text-tertiary cursor-pointer text-xs p-0.5 rounded transition-colors hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

const computeDaysSinceStatusChange = (operator) => {
    const dateToUse = operator.statusChangedAt || operator.createdAt
    if (!dateToUse) return 1
    return Math.max(1, Math.floor((Date.now() - new Date(dateToUse).getTime()) / 86400000))
}

const handleCopyName = (event, name) => {
    event.stopPropagation()
    navigator.clipboard.writeText(name)
    const icon = event.currentTarget.querySelector('i')
    icon.className = 'fas fa-check'
    icon.style.color = '#22c55e'
    setTimeout(() => {
        icon.className = 'fas fa-copy'
        icon.style.color = ''
    }, 1500)
}

/**
 * Renders one operator row inside the ListViewModeSection table. All visual
 * vocabulary (status pills, copy affordance, action buttons, badges) is
 * unchanged from the original inline renderRow callback.
 */
function OperatorListRow({ operator, onSelect, onOpenComments, onOpenHistory, duplicate, trainerName }) {
    return (
        <tr
            key={operator.employeeId}
            onClick={() => onSelect(operator)}
            className="border-b border-border-light cursor-pointer group"
        >
            <td className={`${CELL_BASE} w-[10%] group-hover:bg-bg-tertiary`}>{operator.plantCode || '—'}</td>
            <td className={`${CELL_HIGHLIGHT} w-[24%] group-hover:bg-bg-tertiary`}>
                <div className="flex items-center gap-1.5">
                    <span className={duplicate ? 'duplicate' : ''}>{operator.name}</span>
                    <button type="button"
                        onClick={(e) => handleCopyName(e, operator.name)}
                        title="Copy name"
                        aria-label="Copy operator name"
                        className={COPY_BUTTON}
                    >
                        <i className="fas fa-copy"></i>
                    </button>
                </div>
            </td>
            <td className={`${CELL_SECONDARY} w-[14%] group-hover:bg-bg-tertiary`}>
                {operator.phone ? <PhoneLink phone={operator.phone} /> : '—'}
            </td>
            <td className={`${CELL_SECONDARY} w-[14%] group-hover:bg-bg-tertiary`}>
                <div>
                    <Badge tone={getOperatorStatusTone(operator.status)} size="sm" className="self-start">
                        {operator.status || '—'}
                        {operator.status &&
                            operator.status !== 'Terminated' &&
                            ` · ${computeDaysSinceStatusChange(operator)}d`}
                    </Badge>
                    <StatusHistoryBar
                        itemId={operator.employeeId}
                        itemType="operator"
                        currentStatus={operator.status}
                        createdAt={operator.createdAt}
                    />
                </div>
            </td>
            <td className={`${CELL_SECONDARY} w-[12%] group-hover:bg-bg-tertiary`}>{renderStarsOrNA(operator)}</td>
            <td className={`${CELL_SECONDARY} w-[14%] group-hover:bg-bg-tertiary`}>{trainerName || '—'}</td>
            <td className={`${CELL_SECONDARY} w-[12%] group-hover:bg-bg-tertiary`}>
                <div className="flex items-center">
                    <button type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onOpenComments(operator)
                        }}
                        title="View comments"
                        aria-label="View comments"
                        className={`${ACTION_BUTTON} relative`}
                    >
                        <i className="fas fa-comments" aria-hidden="true"></i>
                        {operator.commentsCount > 0 && (
                            <Badge
                                tone="accent"
                                size="xs"
                                shape="pill"
                                uppercase={false}
                                className="absolute -top-0.5 -right-0.5 ring-1 ring-bg-primary"
                                aria-label={`${operator.commentsCount} comment${operator.commentsCount === 1 ? '' : 's'}`}
                            >
                                {operator.commentsCount > 9 ? '9+' : operator.commentsCount}
                            </Badge>
                        )}
                    </button>
                    <button type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onOpenHistory(operator)
                        }}
                        title="View history"
                        aria-label="View history"
                        className={ACTION_BUTTON}
                    >
                        <i className="fas fa-history"></i>
                    </button>
                </div>
            </td>
        </tr>
    )
}

export default OperatorListRow
