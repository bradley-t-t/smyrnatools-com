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
                    <div key={row.label} className="detail-row">
                        <div className="detail-label">{row.label}</div>
                        <div className="detail-value">
                            <span>{value}</span>
                            {hasWarning && (
                                <span className="warning-badge" title={row.warningTitle}>
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
