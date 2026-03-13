import React, { memo, useState } from 'react'

import { getAssetViewType } from './shared/DashboardSharedComponents'

/* ── Skeleton ── */

const SidebarSkeleton = () => (
    <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-3/5 bg-slate-200 rounded animate-pulse" />
        </div>
        {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
                <div className="h-2.5 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
                    <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="flex gap-1.5">
                        <div className="h-6 w-20 bg-slate-200 rounded-lg animate-pulse" />
                        <div className="h-6 w-16 bg-slate-200 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
        ))}
    </div>
)

/* ── AI Analysis ── */

const AISection = ({
    aiSummaryLoading,
    aiSummaryFailed,
    aiDisplayText,
    aiActionPlan,
    showActionPlan,
    visibleActionItems = 0,
    isTypingComplete,
    handleRegenerateAISummary,
    userRoleName,
    userPlantCode,
    isPlantManager,
    isPlantMode,
    dashboardPlant,
    regionDisplayName,
    accentColor,
    chat
}) => {
    const scope = isPlantMode ? 'Plant' : regionDisplayName

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="rounded-lg p-1.5" style={{ backgroundColor: `${accentColor}15` }}>
                    <i className="fas fa-robot" style={{ color: accentColor, fontSize: 14 }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Analysis</div>
                    <div className="text-[10px] text-slate-400 truncate">
                        {aiSummaryLoading ? 'Analyzing...' : `${scope} insights`}
                    </div>
                </div>
                {userRoleName && !aiSummaryLoading && (
                    <span className="text-[9px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 font-medium truncate max-w-[90px]">
                        {userRoleName}
                    </span>
                )}
                {!aiSummaryLoading && isTypingComplete && (
                    <button
                        onClick={handleRegenerateAISummary}
                        className="flex items-center justify-center w-6 h-6 rounded-md text-slate-400 bg-transparent border border-slate-200 cursor-pointer hover:bg-slate-50 hover:text-slate-600 transition-colors"
                        title="Regenerate"
                    >
                        <i className="fas fa-redo text-[8px]" />
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="px-4 py-3">
                {aiSummaryLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                        <i className="fas fa-circle-notch fa-spin text-[10px]" style={{ color: accentColor }} />
                        <span>{isPlantMode ? 'Analyzing plant data...' : 'Analyzing regional data...'}</span>
                    </div>
                )}

                {aiSummaryFailed && (
                    <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">
                        <i className="fas fa-exclamation-triangle text-[10px]" />
                        <span>Analysis unavailable. Try regenerating.</span>
                    </div>
                )}

                {!aiSummaryLoading && !aiSummaryFailed && aiDisplayText && (
                    <div className="text-[12px] text-slate-600 leading-relaxed">{aiDisplayText}</div>
                )}

                {showActionPlan && visibleActionItems > 0 && aiActionPlan.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Action Plan
                        </div>
                        <div className="space-y-1.5">
                            {aiActionPlan.slice(0, visibleActionItems).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <span
                                        className="flex items-center justify-center w-4 h-4 rounded text-white flex-shrink-0 mt-0.5 text-[8px] font-bold"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        {idx + 1}
                                    </span>
                                    <span className="text-slate-600 text-[11px] leading-snug">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat */}
            {!aiSummaryLoading && chat && (
                <div className="border-t border-gray-100">
                    {chat.chatMessages.length > 0 && (
                        <div className="px-4 py-3 space-y-2.5 max-h-48 overflow-y-auto">
                            {chat.chatMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div
                                        className={`max-w-[90%] text-[12px] leading-relaxed rounded-xl px-3 py-2 ${
                                            msg.role === 'assistant' ? 'bg-slate-50 text-slate-700' : 'text-white'
                                        }`}
                                        style={msg.role !== 'assistant' ? { backgroundColor: accentColor } : undefined}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {chat.isChatLoading && (
                                <div className="flex items-center gap-2 text-slate-400 text-xs px-1">
                                    <i className="fas fa-circle-notch fa-spin text-[10px]" />
                                    <span>Thinking...</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="px-4 py-2.5 flex gap-2">
                        <input
                            type="text"
                            value={chat.chatInput}
                            onChange={(e) => chat.setChatInput(e.target.value)}
                            onFocus={() => chat.setIsChatFocused(true)}
                            onBlur={() => chat.setIsChatFocused(false)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && chat.sendMessage()}
                            placeholder={
                                chat.atLimit
                                    ? 'Daily limit reached'
                                    : `Ask a follow-up... (${chat.remainingMessages} left)`
                            }
                            disabled={chat.atLimit || chat.isChatLoading}
                            className="flex-1 text-[12px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-slate-300 transition-colors min-w-0 placeholder:text-slate-300"
                        />
                        <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={chat.sendMessage}
                            disabled={chat.atLimit || !chat.chatInput.trim() || chat.isChatLoading}
                            className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                            style={{
                                backgroundColor: chat.chatInput.trim() && !chat.atLimit ? accentColor : '#f1f5f9',
                                color: chat.chatInput.trim() && !chat.atLimit ? 'white' : '#94a3b8'
                            }}
                        >
                            <i className="fas fa-paper-plane text-[10px]" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Alert list items ── */

const AlertGroup = ({
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
        <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
                <i className={`fas ${icon} text-[10px]`} style={{ color: iconColor }} />
                <span className="text-[11px] font-semibold text-slate-700 flex-1">{title}</span>
                <span
                    className="inline-block rounded-2xl px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
                >
                    {count}
                </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {displayItems.map((item, i) => renderItem(item, i))}
                {hasMore && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setExpandedSections((prev) => ({ ...prev, [expandKey]: !isExpanded }))
                        }}
                        className="rounded-lg text-[10px] font-medium px-2 py-1 cursor-pointer border-none bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        {isExpanded ? 'Show less' : `+${items.length - maxItems} more`}
                    </button>
                )}
            </div>
        </div>
    )
}

const AssetPill = ({ label, onClick, color }) => (
    <button
        onClick={onClick}
        className="rounded-lg text-[10px] font-medium px-2 py-1 cursor-pointer border-none transition-colors hover:brightness-95 active:scale-[0.97]"
        style={{ backgroundColor: `${color}12`, color }}
    >
        {label}
    </button>
)

const AlertsSection = ({
    plantNotifications,
    expandedSections,
    setExpandedSections,
    setEmbeddedView,
    setEmbeddedViewSearch,
    accentColor
}) => {
    const { assetsWithMostIssues, longTermShopAssets, shopIssue } = plantNotifications
    const hasAlerts = assetsWithMostIssues.length > 0 || longTermShopAssets.length > 0 || shopIssue

    if (!hasAlerts) {
        return (
            <div className="bg-green-50 rounded-lg px-3 py-3 flex items-center gap-2.5">
                <i className="fas fa-check-circle text-green-500 text-sm" />
                <div>
                    <div className="text-green-700 text-[12px] font-semibold">All clear</div>
                    <div className="text-green-500 text-[10px]">No fleet issues</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {shopIssue && (
                <div
                    className="rounded-lg px-3 py-2.5 flex items-center gap-2.5"
                    style={{ backgroundColor: accentColor }}
                >
                    <i className="fas fa-exclamation-triangle text-white/80 text-xs" />
                    <div className="flex-1 min-w-0">
                        <div className="text-white text-[11px] font-semibold">Fleet Alert</div>
                        <div className="text-white/60 text-[10px]">
                            {shopIssue.inShopCount} in shop &middot; {shopIssue.spareCount} spare
                        </div>
                    </div>
                </div>
            )}

            {assetsWithMostIssues.length > 0 && (
                <AlertGroup
                    icon="fa-exclamation-circle"
                    iconColor="#ea580c"
                    title="Open Issues"
                    count={assetsWithMostIssues.length}
                    items={assetsWithMostIssues}
                    expandKey="assetsWithIssues"
                    expandedSections={expandedSections}
                    setExpandedSections={setExpandedSections}
                    renderItem={(a, i) => (
                        <AssetPill
                            key={i}
                            label={`${a.type} ${a.identifier || ''} (${a.openIssueCount})`}
                            color="#ea580c"
                            onClick={() => {
                                setEmbeddedView(getAssetViewType(a.type))
                                setEmbeddedViewSearch(a.identifier || '')
                            }}
                        />
                    )}
                />
            )}

            {longTermShopAssets.length > 0 && (
                <AlertGroup
                    icon="fa-tools"
                    iconColor="#be123c"
                    title="Long-Term Shop"
                    count={longTermShopAssets.length}
                    items={longTermShopAssets}
                    expandKey="longTermShop"
                    expandedSections={expandedSections}
                    setExpandedSections={setExpandedSections}
                    renderItem={(a, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setEmbeddedView(getAssetViewType(a.type))
                                setEmbeddedViewSearch(a.identifier || '')
                            }}
                            className="flex items-center gap-1 rounded-lg text-[10px] font-medium px-2 py-1 cursor-pointer border-none transition-colors hover:brightness-95 active:scale-[0.97]"
                            style={{ backgroundColor: '#be123c12', color: '#be123c' }}
                        >
                            <span>{a.identifier}</span>
                            <span className="opacity-50 text-[9px]">({a.daysInShop}d)</span>
                            {a.downInYard && (
                                <span className="bg-red-100 text-red-600 rounded text-[8px] font-semibold px-1 py-0.5">
                                    Yard
                                </span>
                            )}
                        </button>
                    )}
                />
            )}
        </div>
    )
}

/* ── People ── */

const OperatorGroup = ({
    icon,
    iconColor,
    title,
    count,
    operators,
    nameField = 'name',
    setEmbeddedView,
    setEmbeddedViewSearch
}) => (
    <div className="bg-slate-50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
            <i className={`fas ${icon} text-[10px]`} style={{ color: iconColor }} />
            <span className="text-[11px] font-semibold text-slate-700 flex-1">{title}</span>
            <span
                className="inline-block rounded-2xl px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
            >
                {count}
            </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
            {operators.map((o, i) => (
                <button
                    key={i}
                    onClick={() => {
                        setEmbeddedView('operators')
                        setEmbeddedViewSearch(o[nameField] || '')
                    }}
                    className="rounded-lg text-[10px] font-medium px-2 py-1 cursor-pointer border-none transition-colors hover:brightness-95 active:scale-[0.97]"
                    style={{ backgroundColor: `${iconColor}12`, color: iconColor }}
                >
                    {o[nameField]}
                </button>
            ))}
        </div>
    </div>
)

const PeopleSection = ({ plantNotifications, setEmbeddedView, setEmbeddedViewSearch }) => {
    const { unassignedOperators, pendingOperators, trainingOperators } = plantNotifications
    const hasAny = unassignedOperators.length > 0 || pendingOperators.length > 0 || trainingOperators.length > 0
    if (!hasAny) return null
    return (
        <div className="space-y-2">
            {unassignedOperators.length > 0 && (
                <OperatorGroup
                    icon="fa-user-slash"
                    iconColor="#0ea5e9"
                    title="Unassigned"
                    count={unassignedOperators.length}
                    operators={unassignedOperators}
                    setEmbeddedView={setEmbeddedView}
                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                />
            )}
            {pendingOperators.length > 0 && (
                <OperatorGroup
                    icon="fa-user-plus"
                    iconColor="#10b981"
                    title="Pending Start"
                    count={pendingOperators.length}
                    operators={pendingOperators}
                    nameField="operatorName"
                    setEmbeddedView={setEmbeddedView}
                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                />
            )}
            {trainingOperators.length > 0 && (
                <OperatorGroup
                    icon="fa-graduation-cap"
                    iconColor="#8b5cf6"
                    title="In Training"
                    count={trainingOperators.length}
                    operators={trainingOperators}
                    nameField="operatorName"
                    setEmbeddedView={setEmbeddedView}
                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                />
            )}
        </div>
    )
}

/* ── Section header ── */

const SectionLabel = ({ label, count, countColor, collapsed, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left bg-transparent border-none p-0 cursor-pointer group"
    >
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 group-hover:text-slate-600 transition-colors flex-1">
            {label}
        </span>
        {count > 0 && (
            <span
                className="inline-block rounded-2xl px-2 py-0.5 text-[9px] font-bold"
                style={{ backgroundColor: `${countColor}15`, color: countColor }}
            >
                {count}
            </span>
        )}
        <i
            className={`fas fa-chevron-down text-[8px] text-slate-300 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
        />
    </button>
)

/* ── Main sidebar ── */

const EXPANDED_WIDTH = 320
const COLLAPSED_WIDTH = 48

const DashboardSidebar = memo(function DashboardSidebar({
    accentColor,
    aiActionPlan,
    aiDisplayText,
    aiSummaryFailed,
    aiSummaryLoading,
    chat,
    dashboardPlant,
    dashboardRegionCode,
    dataReady,
    expandedSections,
    handleRegenerateAISummary,
    isPlantManager,
    isPlantMode,
    isTypingComplete,
    onRefresh,
    plantNotifications,
    refreshing,
    regionDisplayName,
    regionPlants,
    selectedRegion,
    setEmbeddedView,
    setEmbeddedViewSearch,
    setExpandedSections,
    setPlantModalOpen,
    showActionPlan,
    userPlantCode,
    userRoleName,
    visibleActionItems
}) {
    const hasAI = aiDisplayText || aiSummaryLoading || aiSummaryFailed
    const [minimized, setMinimized] = useState(false)
    const [collapsed, setCollapsed] = useState({})
    const toggle = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

    const alertCount =
        (plantNotifications.assetsWithMostIssues?.length || 0) +
        (plantNotifications.longTermShopAssets?.length || 0) +
        (plantNotifications.shopIssue ? 1 : 0)

    const peopleCount =
        (plantNotifications.unassignedOperators?.length || 0) +
        (plantNotifications.pendingOperators?.length || 0) +
        (plantNotifications.trainingOperators?.length || 0)

    const plantLabel =
        dashboardPlant === 'MY_PLANTS'
            ? 'My Plants'
            : dashboardPlant?.startsWith('DISTRICT:')
              ? dashboardPlant.slice(9)
              : dashboardPlant
                ? regionPlants.find((p) => (p.plantCode || p.plant_code) === dashboardPlant)?.plantName ||
                  dashboardPlant
                : 'All Plants'

    const width = minimized ? COLLAPSED_WIDTH : EXPANDED_WIDTH

    return (
        <aside
            className="bg-white border-l border-gray-200 flex flex-col sticky top-0 z-10 max-h-[calc(100dvh-68px)] overflow-hidden"
            style={{
                width,
                minWidth: width,
                maxWidth: width,
                transition:
                    'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            {/* Minimized rail */}
            {minimized ? (
                <>
                    <button
                        type="button"
                        onClick={() => setMinimized(false)}
                        className="flex items-center justify-center w-full h-11 border-0 border-b border-solid border-gray-200 bg-transparent cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
                        title="Expand sidebar"
                    >
                        <i className="fas fa-chevron-left text-[10px]" />
                    </button>
                    <div className="flex-1 flex flex-col items-center gap-1 py-3 overflow-hidden">
                        {hasAI && (
                            <button
                                type="button"
                                onClick={() => setMinimized(false)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer hover:bg-slate-50 transition-colors"
                                title="AI Analysis"
                            >
                                <i className="fas fa-robot text-sm" style={{ color: accentColor }} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setMinimized(false)}
                            className="relative flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            title={`Fleet Alerts (${alertCount})`}
                        >
                            <i className="fas fa-bell text-sm" />
                            {alertCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center px-1">
                                    {alertCount}
                                </span>
                            )}
                        </button>
                        {peopleCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setMinimized(false)}
                                className="relative flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                                title={`People (${peopleCount})`}
                            >
                                <i className="fas fa-users text-sm" />
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-sky-500 text-white text-[8px] font-bold flex items-center justify-center px-1">
                                    {peopleCount}
                                </span>
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Expanded header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0 overflow-hidden">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setMinimized(true)}
                                className="flex items-center justify-center w-7 h-7 rounded-md border-none bg-transparent cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
                                title="Minimize sidebar"
                            >
                                <i className="fas fa-chevron-right text-[10px]" />
                            </button>
                            {dashboardRegionCode && selectedRegion?.type !== 'Office' ? (
                                <button
                                    type="button"
                                    onClick={() => setPlantModalOpen(true)}
                                    disabled={refreshing}
                                    className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[13px] font-medium px-3 py-2 truncate cursor-pointer hover:bg-slate-100 transition-colors text-left"
                                >
                                    <i className="fas fa-map-marker-alt text-[10px]" style={{ color: accentColor }} />
                                    <span className="truncate flex-1">{plantLabel}</span>
                                    <i className="fas fa-chevron-down text-[8px] text-slate-300" />
                                </button>
                            ) : (
                                <div className="flex-1 text-sm font-semibold text-slate-800 truncate">
                                    {regionDisplayName}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={onRefresh}
                                disabled={refreshing}
                                className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm border-none cursor-pointer transition-colors flex-shrink-0"
                                style={{
                                    backgroundColor: accentColor,
                                    opacity: refreshing ? 0.6 : 1,
                                    cursor: refreshing ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <i className={`fas fa-sync-alt text-xs ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Expanded content */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5">
                        <div>
                            {!dataReady ? (
                                <SidebarSkeleton />
                            ) : (
                                <div className="space-y-5">
                                    {hasAI && (
                                        <AISection
                                            aiSummaryLoading={aiSummaryLoading}
                                            aiSummaryFailed={aiSummaryFailed}
                                            aiDisplayText={aiDisplayText}
                                            aiActionPlan={aiActionPlan}
                                            showActionPlan={showActionPlan}
                                            visibleActionItems={visibleActionItems}
                                            isTypingComplete={isTypingComplete}
                                            handleRegenerateAISummary={handleRegenerateAISummary}
                                            userRoleName={userRoleName}
                                            userPlantCode={userPlantCode}
                                            isPlantManager={isPlantManager}
                                            isPlantMode={isPlantMode}
                                            dashboardPlant={dashboardPlant}
                                            regionDisplayName={regionDisplayName}
                                            accentColor={accentColor}
                                            chat={chat}
                                        />
                                    )}

                                    <div className="space-y-2.5">
                                        <SectionLabel
                                            label="Fleet Alerts"
                                            count={alertCount}
                                            countColor="#ea580c"
                                            collapsed={collapsed.alerts}
                                            onToggle={() => toggle('alerts')}
                                        />
                                        {!collapsed.alerts && (
                                            <AlertsSection
                                                plantNotifications={plantNotifications}
                                                expandedSections={expandedSections}
                                                setExpandedSections={setExpandedSections}
                                                setEmbeddedView={setEmbeddedView}
                                                setEmbeddedViewSearch={setEmbeddedViewSearch}
                                                accentColor={accentColor}
                                            />
                                        )}
                                    </div>

                                    {peopleCount > 0 && (
                                        <div className="space-y-2.5">
                                            <SectionLabel
                                                label="People"
                                                count={peopleCount}
                                                countColor="#0ea5e9"
                                                collapsed={collapsed.people}
                                                onToggle={() => toggle('people')}
                                            />
                                            {!collapsed.people && (
                                                <PeopleSection
                                                    plantNotifications={plantNotifications}
                                                    setEmbeddedView={setEmbeddedView}
                                                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </aside>
    )
})

export default DashboardSidebar
