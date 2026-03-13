import React from 'react'

import CardSection from '../../app/components/sections/CardSection'

/**
 * Generic grid card driven by asset-type config.
 * Renders detail rows from config.cardConfig.rows.
 */
function AssetCard({ item, config, duplicates, onSelect }) {
    const { cardConfig, statusColors } = config
    const statusColor = cardConfig.getStatusColor(item, statusColors)
    const itemNumber = cardConfig.itemNumber(item)

    return (
        <CardSection
            item={item}
            itemType={config.singularLabel}
            itemNumber={itemNumber}
            onSelect={onSelect}
            statusColor={statusColor}
        >
            {cardConfig.rows.map((row) => {
                const value = row.getValue ? row.getValue(item) : (item[row.key] ?? 'Unknown')
                const hasWarning = row.getWarning?.(item, duplicates)

                return (
                    <div key={row.label} className="flex justify-between items-center py-1">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{row.label}</div>
                        <div className="text-sm font-medium">
                            <span>{value}</span>
                            {hasWarning && (
                                <span className="ml-1.5 text-amber-500" title={row.warningTitle}>
                                    <i className="fas fa-exclamation-triangle" />
                                </span>
                            )}
                        </div>
                    </div>
                )
            })}
        </CardSection>
    )
}

export default AssetCard
