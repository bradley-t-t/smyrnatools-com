import React from 'react'

import CommentModalSection from '../../../app/components/sections/CommentModalSection'
import IssueModalSection from '../../../app/components/sections/IssueModalSection'
import { OperatorService } from '../../../services/OperatorService'

/**
 * Right-rail panel that hosts the comment / issue / operator-comment views
 * when the viewport is wide enough to keep them next to the list. Returns
 * `null` if no panel is open so the main column can claim the full width.
 */
export default function AssetSidePanel({ config, onClose, sidePanel }) {
    if (!sidePanel) return null

    return (
        <aside className="hidden lg:flex w-[440px] shrink-0 self-start sticky top-[var(--sticky-cover-height,0px)] flex-col h-[calc(100vh-var(--sticky-cover-height,0px)-12px)]">
            {sidePanel.kind === 'comment' && (
                <CommentModalSection
                    displayMode="panel"
                    itemId={sidePanel.itemId}
                    itemNumber={sidePanel.itemNumber}
                    itemType={config.itemTypeLabel}
                    onClose={onClose}
                    service={config.service}
                />
            )}
            {sidePanel.kind === 'issue' && (
                <IssueModalSection
                    displayMode="panel"
                    itemId={sidePanel.itemId}
                    itemNumber={sidePanel.itemNumber}
                    itemType={config.itemTypeLabel}
                    onClose={onClose}
                    service={config.service}
                />
            )}
            {sidePanel.kind === 'operatorComment' && sidePanel.operator && (
                <CommentModalSection
                    displayMode="panel"
                    itemId={sidePanel.operator.employeeId}
                    itemNumber={sidePanel.operator.name}
                    itemType="Operator"
                    onClose={onClose}
                    service={OperatorService}
                />
            )}
        </aside>
    )
}
