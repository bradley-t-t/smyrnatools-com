import React from 'react'

import AssetGridCard from '../AssetGridCard'

const BASE_DELAY_MS = 80
const MIN_DELAY_MS = BASE_DELAY_MS / 2

/**
 * Grid rendering branch for `AssetView`. Maps each item to an
 * `AssetGridCard`, computing an animated stagger delay that shortens for
 * longer lists so the cascade never feels sluggish.
 */
export default function AssetGridSection({
    config,
    getDisplayStatus,
    getStatusDays,
    itemsToRender,
    onSelectItem,
    onShowCommentModal,
    onShowHistoryModal,
    onShowIssueModal,
    onShowOperatorCommentModal,
    onShowOperatorHistoryModal,
    operators,
    plants,
    tractors
}) {
    const delayDecrement = Math.max(0, (BASE_DELAY_MS - MIN_DELAY_MS) / Math.max(itemsToRender.length, 1))

    return (
        <div className="mb-6 overflow-auto max-h-[calc(100vh-250px)]">
            <div className="grid gap-4 p-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                {itemsToRender.map((item, index) => {
                    const operator = operators?.find((op) => op.employeeId === item.assignedOperator)
                    const plant = plants?.find((p) => p.code === item.assignedPlant)
                    const tractor = tractors?.find((t) => t.id === item.assignedTractor)
                    const isVerified =
                        typeof item.isVerified === 'function' ? item.isVerified(item.latestHistoryDate) : undefined
                    const number = config.getModalIdentifier(item)
                    const staggerDelay = Math.max(MIN_DELAY_MS, BASE_DELAY_MS - delayDecrement * index)

                    return (
                        <div
                            key={item.id}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${index * staggerDelay}ms` }}
                        >
                            <AssetGridCard
                                config={config}
                                displayStatus={getDisplayStatus(item)}
                                isVerified={isVerified}
                                item={item}
                                onSelect={onSelectItem}
                                onShowCommentModal={() => onShowCommentModal(item.id, number)}
                                onShowHistoryModal={() => onShowHistoryModal(item)}
                                onShowIssueModal={() => onShowIssueModal(item.id, number)}
                                onShowOperatorCommentModal={onShowOperatorCommentModal}
                                onShowOperatorHistoryModal={onShowOperatorHistoryModal}
                                operator={operator}
                                plantName={plant?.name || item.assignedPlant || '---'}
                                statusDays={getStatusDays(item)}
                                tractor={tractor}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
