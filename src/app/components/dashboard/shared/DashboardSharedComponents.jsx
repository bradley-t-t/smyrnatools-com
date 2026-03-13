import React from 'react'

/** Maps asset type labels to their corresponding embedded view route keys. */
export const getAssetViewType = (assetType) => {
    const viewMap = { Equipment: 'equipment', Mixer: 'mixers', Tractor: 'tractors', Trailer: 'trailers' }
    return viewMap[assetType] || 'equipment'
}

/** Skeleton pulse block — generic loading placeholder with configurable size via className and style. */
export const Skeleton = ({ className = '', style }) => (
    <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} style={style} />
)

/**
 * Compact metric pill displaying a label, value, optional icon, and dynamic color.
 * Used in summary headers to show KPIs at a glance.
 */
export const MetricPill = ({ label, value, color, icon, accentColor, suffix }) => (
    <div
        className="flex items-center gap-2.5 bg-white rounded-lg shadow-sm border border-slate-100 px-3.5 py-2.5 min-w-[120px] flex-1"
        style={{ animation: 'fadeSlideIn 0.3s ease both' }}
    >
        {icon && (
            <div
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                style={{ background: `${color || accentColor}15` }}
            >
                <i className={`fas ${icon} text-xs`} style={{ color: color || accentColor }} />
            </div>
        )}
        <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</span>
            <span className="text-lg font-bold leading-tight" style={{ color: color || accentColor }}>
                {value}
                {suffix && <span className="text-xs font-medium text-slate-400 ml-0.5">{suffix}</span>}
            </span>
        </div>
    </div>
)

/** Clickable pill button for navigating to an asset in an embedded view. */
export const AssetPill = ({ label, onClick, color }) => (
    <button
        onClick={onClick}
        className="rounded-full text-[11px] font-medium px-2.5 py-1 cursor-pointer transition-all hover:brightness-95 active:scale-[0.97]"
        style={{ background: `${color}14`, color }}
    >
        {label}
    </button>
)

/**
 * Tinted notification row with expand/collapse for overflow items.
 * Groups related alerts under a colored icon header with a count badge.
 */
export const NotificationRow = ({
    icon,
    iconColor,
    title,
    count,
    items,
    renderItem,
    maxItems = 3,
    expandKey,
    expandedSections,
    setExpandedSections
}) => {
    const isExpanded = expandedSections?.[expandKey]
    const displayItems = isExpanded ? items : items.slice(0, maxItems)
    const hasMore = items.length > maxItems
    return (
        <div
            className="rounded-lg px-3 py-2 mb-1.5"
            style={{ animation: 'fadeSlideIn 0.3s ease both', background: `${iconColor}08` }}
        >
            <div className="flex items-center gap-2.5 mb-1.5">
                <div
                    className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0"
                    style={{ background: `${iconColor}18` }}
                >
                    <i className={`fas ${icon} text-xs`} style={{ color: iconColor }} />
                </div>
                <span className="text-slate-800 text-[13px] font-semibold flex-1">{title}</span>
                <span
                    className="rounded-full text-white text-[10px] font-bold min-w-[20px] text-center px-1.5 py-0.5 leading-none"
                    style={{ background: iconColor }}
                >
                    {count}
                </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-[38px]">
                {displayItems.map((item, i) => renderItem(item, i))}
                {hasMore && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setExpandedSections((prev) => ({ ...prev, [expandKey]: !isExpanded }))
                        }}
                        className="rounded-full text-[11px] font-semibold px-2.5 py-0.5 cursor-pointer transition-all hover:brightness-95"
                        style={{ background: `${iconColor}15`, color: iconColor }}
                    >
                        {isExpanded ? 'Show less' : `+${items.length - maxItems} more`}
                    </button>
                )}
            </div>
        </div>
    )
}

/**
 * Operator group row with tinted background, matching NotificationRow visual style.
 * Each operator name is a clickable pill that opens the operators embedded view.
 */
export const OperatorGroup = ({
    icon,
    iconColor,
    title,
    count,
    operators,
    nameField = 'name',
    setEmbeddedView,
    setEmbeddedViewSearch
}) => (
    <div
        className="rounded-lg px-3 py-2 mb-1.5"
        style={{ animation: 'fadeSlideIn 0.3s ease both', background: `${iconColor}08` }}
    >
        <div className="flex items-center gap-2.5 mb-1.5">
            <div
                className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0"
                style={{ background: `${iconColor}18` }}
            >
                <i className={`fas ${icon} text-xs`} style={{ color: iconColor }} />
            </div>
            <span className="text-slate-800 text-[13px] font-semibold flex-1">{title}</span>
            <span
                className="rounded-full text-white text-[10px] font-bold min-w-[20px] text-center px-1.5 py-0.5 leading-none"
                style={{ background: iconColor }}
            >
                {count}
            </span>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-[38px]">
            {operators.map((o, i) => (
                <button
                    key={i}
                    onClick={() => {
                        setEmbeddedView('operators')
                        setEmbeddedViewSearch(o[nameField] || '')
                    }}
                    className="rounded-full text-[11px] font-medium px-2.5 py-1 cursor-pointer transition-all hover:brightness-95 active:scale-[0.97]"
                    style={{ background: `${iconColor}14`, color: iconColor }}
                >
                    {o[nameField]}
                </button>
            ))}
        </div>
    </div>
)

/** AI chat bubble — left-aligned for AI responses, right-aligned for user messages. */
export const AIChatBubble = ({ children, isAI, accentColor }) => (
    <div
        className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
        style={{ animation: 'fadeSlideIn 0.3s ease both' }}
    >
        <div
            className={`rounded-xl px-3.5 py-2.5 max-w-[95%] text-[13px] leading-relaxed ${
                isAI ? 'bg-slate-50 text-slate-700 rounded-tl-sm' : 'text-white rounded-tr-sm'
            }`}
            style={!isAI ? { background: accentColor } : undefined}
        >
            {children}
        </div>
    </div>
)

/** Summary counter strip — compact at-a-glance row of colored badges showing counts by category. */
export const SummaryStrip = ({ items }) => {
    const visible = items.filter((i) => i.count > 0)
    if (visible.length === 0) return null
    return (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {visible.map(({ label, count, color, icon }, i) => (
                <div
                    key={i}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${color}10`, color }}
                >
                    <i className={`fas ${icon} text-[8px]`} />
                    <span>{count}</span>
                    <span className="text-slate-400 font-medium">{label}</span>
                </div>
            ))}
        </div>
    )
}
