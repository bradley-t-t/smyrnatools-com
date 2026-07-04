import React from 'react'

import ListViewModeSection from '../../../app/components/sections/ListViewModeSection'
import AssetEmptyState from './AssetEmptyState'
import AssetGridSection from './AssetGridSection'
import AssetPotentialMatches from './AssetPotentialMatches'

const ONE_DAY_MS = 86400000

/**
 * Renders the main results region of `AssetView`: empty state, list/grid
 * for the primary filtered set, and the dimmed "potential matches" branch
 * when the search has hits outside the active filter chips.
 */
export default function AssetMainContent({
    config,
    data,
    filteredResult,
    filters,
    handleSelectItem,
    modalsRef,
    onAdd,
    renderRow,
    verification
}) {
    const hasPotential = filteredResult.potentialMatches.length > 0
    const hasFiltered = filteredResult.filtered.length > 0

    if (!hasFiltered && !hasPotential) {
        return <AssetEmptyState config={config} filters={filters} onAdd={onAdd} />
    }

    const onShowCommentModal = (id, number) => modalsRef.current?.openCommentModal(id, number)
    const onShowIssueModal = (id, number) => modalsRef.current?.openIssueModal(id, number)
    const onShowHistoryModal = (item) => modalsRef.current?.openHistoryModal(item)
    const onShowOperatorCommentModal = (op) => modalsRef.current?.openOperatorCommentModal(op)
    const onShowOperatorHistoryModal = (op) => modalsRef.current?.openOperatorHistoryModal(op)

    const statusCol = config.listConfig.columns.find((c) => c.type === 'status')
    const getDisplayStatus = (item) => (statusCol?.getDisplayStatus ? statusCol.getDisplayStatus(item) : item.status)
    const getStatusDays = (item) => {
        const dateToUse = item.statusChangedAt || item.createdAt
        if (!dateToUse || item.status === 'Retired') return null
        return Math.max(1, Math.floor((Date.now() - new Date(dateToUse).getTime()) / ONE_DAY_MS))
    }

    const listProps = {
        colWidths: config.listConfig.colWidths,
        containerClassName: 'list-table-container',
        handleSelectItem,
        headerLabels: config.listConfig.headerLabels,
        onShowCommentModal,
        onShowHistoryModal,
        onShowIssueModal,
        onVerify: config.hasVerification ? verification.handleVerify : undefined,
        renderRow,
        tableClassName: 'list-table',
        ...(config.hasOperatorAssignment ? { operators: data.operators, plants: data.plants } : {})
    }

    const renderViewSection = (itemsToRender) =>
        filters.viewMode === 'grid' ? (
            <AssetGridSection
                config={config}
                getDisplayStatus={getDisplayStatus}
                getStatusDays={getStatusDays}
                itemsToRender={itemsToRender}
                onSelectItem={handleSelectItem}
                onShowCommentModal={onShowCommentModal}
                onShowHistoryModal={onShowHistoryModal}
                onShowIssueModal={onShowIssueModal}
                onShowOperatorCommentModal={onShowOperatorCommentModal}
                onShowOperatorHistoryModal={onShowOperatorHistoryModal}
                operators={data.operators}
                plants={data.plants}
                tractors={data.tractors}
            />
        ) : (
            <ListViewModeSection filteredItems={itemsToRender} {...listProps} />
        )

    return (
        <>
            {hasFiltered ? renderViewSection(filteredResult.filtered) : null}
            {hasPotential ? (
                <AssetPotentialMatches count={filteredResult.potentialMatches.length} hasFiltered={hasFiltered}>
                    {renderViewSection(filteredResult.potentialMatches)}
                </AssetPotentialMatches>
            ) : null}
        </>
    )
}
