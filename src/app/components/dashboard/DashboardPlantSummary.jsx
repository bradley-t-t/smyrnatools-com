import React, { memo, useEffect, useMemo, useState } from 'react'

import FlagSmyrnaLogo from '../../../assets/images/FlagSmyrnaLogo.webp'
import { usePreferences } from '../../context/PreferencesContext'
import { buildPlantChatContext, useDashboardChat } from '../../hooks/useDashboardChat'
const STORAGE_KEY = 'dashboard-plant-summary-minimized'
const getAssetViewType = (assetType) => {
    const viewMap = { Equipment: 'equipment', Mixer: 'mixers', Tractor: 'tractors', Trailer: 'trailers' }
    return viewMap[assetType] || 'equipment'
}
/** Skeleton pulse block. */
const Skeleton = ({ className = '', style }) => (
    <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} style={style} />
)
/** Skeleton for the metrics row. */
const MetricsSkeleton = () => (
    <div className="flex flex-wrap gap-2.5 bg-slate-50 border-b border-slate-200 px-6 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div
                key={i}
                className="flex items-center gap-2.5 bg-white rounded-lg shadow-sm border border-slate-100 px-3.5 py-2.5 min-w-[130px] flex-1"
            >
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                    <Skeleton style={{ height: 8, width: 50 }} />
                    <Skeleton style={{ height: 16, width: 40 }} />
                </div>
            </div>
        ))}
    </div>
)
/** Skeleton for the left pane alerts area. */
const AlertsSkeleton = () => (
    <div className="flex flex-col gap-4 py-2">
        {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton style={{ height: 12, width: 100 + i * 20 }} />
                    <Skeleton className="w-5 h-5 rounded-full ml-auto" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3].map((j) => (
                        <Skeleton key={j} style={{ height: 24, width: 60 + j * 10 }} className="rounded-md" />
                    ))}
                </div>
            </div>
        ))}
    </div>
)
/** Skeleton for the right pane AI area. */
const AISkeleton = ({ accentColor }) => (
    <div className="flex flex-col">
        <div
            className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200"
            style={{ background: `${accentColor}08` }}
        >
            <Skeleton className="w-7 h-7 rounded-lg" />
            <div className="flex flex-col gap-1">
                <Skeleton style={{ height: 10, width: 60 }} />
                <Skeleton style={{ height: 8, width: 100 }} />
            </div>
        </div>
        <div className="px-4 py-3 flex flex-col gap-3">
            <Skeleton style={{ height: 8, width: 140 }} className="mx-auto" />
            <div className="bg-slate-100 rounded-xl rounded-tl-sm px-3.5 py-2.5">
                <Skeleton style={{ height: 10, width: '100%' }} className="mb-2" />
                <Skeleton style={{ height: 10, width: '90%' }} className="mb-2" />
                <Skeleton style={{ height: 10, width: '70%' }} />
            </div>
        </div>
    </div>
)
/** Compact metric pill with label, value, and optional color. */
const MetricPill = ({ label, value, color, icon, accentColor }) => (
    <div
        className="flex items-center gap-2.5 bg-white rounded-lg shadow-sm border border-slate-100 px-3.5 py-2.5 min-w-[130px] flex-1"
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
        <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</span>
            <span className="text-lg font-bold leading-tight" style={{ color: color || accentColor }}>
                {value}
            </span>
        </div>
    </div>
)
/** Tinted notification row — background color creates visual grouping without borders. */
const NotificationRow = ({
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
/** Clickable asset pill with subtle hover effect. */
const AssetPill = ({ label, onClick, color }) => (
    <button
        onClick={onClick}
        className="rounded-full text-[11px] font-medium px-2.5 py-1 cursor-pointer transition-all hover:brightness-95 active:scale-[0.97]"
        style={{ background: `${color}14`, color }}
    >
        {label}
    </button>
)
/** Operator row with tinted background, matching NotificationRow style. */
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
/** AI chat bubble message. */
const AIChatBubble = ({ children, isAI, accentColor }) => (
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
/** The right-pane AI section styled as a chat interface. */
const AICopilotPane = ({
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
    dashboardPlant,
    accentColor,
    chat
}) => (
    <div className="flex flex-col">
        {/* Header */}
        <div
            className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200"
            style={{ background: `${accentColor}08` }}
        >
            <div
                className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: `${accentColor}15` }}
            >
                <i className="fas fa-robot text-xs" style={{ color: accentColor }} />
            </div>
            <div className="flex-1">
                <div className="text-slate-800 text-[13px] font-semibold">Analysis</div>
                <div className="text-slate-500 text-[10px]">
                    {aiSummaryLoading ? 'Analyzing...' : 'Plant performance insights'}
                </div>
            </div>
            {!aiSummaryLoading && isTypingComplete && (
                <button
                    onClick={handleRegenerateAISummary}
                    className="flex items-center justify-center w-7 h-7 bg-transparent border border-slate-200 rounded-lg text-slate-400 cursor-pointer hover:text-slate-600 hover:border-slate-300 transition-colors"
                    title="Regenerate analysis"
                >
                    <i className="fas fa-sync-alt text-[10px]" />
                </button>
            )}
        </div>
        {/* Chat messages area */}
        <div className="px-4 py-3 flex flex-col gap-3">
            {userRoleName && !aiSummaryLoading && (
                <div className="text-center text-slate-400 text-[10px] py-1">
                    <i className="fas fa-user-check mr-1" />
                    Analysis for <strong>{userRoleName}</strong>
                    {userPlantCode && isPlantManager && userPlantCode === dashboardPlant ? ' (your plant)' : ''}
                </div>
            )}
            {aiSummaryLoading && (
                <AIChatBubble isAI accentColor={accentColor}>
                    <div className="flex items-center gap-2 text-slate-500">
                        <i className="fas fa-circle-notch fa-spin text-xs" />
                        <span>Analyzing plant performance...</span>
                    </div>
                </AIChatBubble>
            )}
            {aiSummaryFailed && (
                <AIChatBubble isAI accentColor={accentColor}>
                    <div className="flex items-center gap-2 text-red-600">
                        <i className="fas fa-exclamation-triangle text-xs" />
                        <span>Failed to generate analysis. Try regenerating.</span>
                    </div>
                </AIChatBubble>
            )}
            {!aiSummaryLoading && !aiSummaryFailed && aiDisplayText && (
                <AIChatBubble isAI accentColor={accentColor}>
                    {aiDisplayText}
                </AIChatBubble>
            )}
            {showActionPlan && visibleActionItems > 0 && aiActionPlan.length > 0 && (
                <AIChatBubble isAI accentColor={accentColor}>
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-semibold uppercase mb-2">
                        <i className="fas fa-tasks text-[10px]" />
                        Action Plan
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {aiActionPlan.slice(0, visibleActionItems).map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-2"
                                style={{ animation: 'fadeSlideIn 0.25s ease both' }}
                            >
                                <span
                                    className="flex items-center justify-center w-4 h-4 rounded-full text-white flex-shrink-0 mt-0.5"
                                    style={{ background: accentColor, fontSize: 9, fontWeight: 700 }}
                                >
                                    {idx + 1}
                                </span>
                                <span className="text-slate-700 text-[13px] leading-snug">{item}</span>
                            </div>
                        ))}
                    </div>
                </AIChatBubble>
            )}
        </div>
        {/* Chat */}
        {!aiSummaryLoading && chat && (
            <div className="border-t border-slate-200">
                {chat.chatMessages.length > 0 && (
                    <div className="px-4 pt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {chat.chatMessages.map((msg, i) => (
                            <AIChatBubble key={i} isAI={msg.role === 'assistant'} accentColor={accentColor}>
                                {msg.content}
                            </AIChatBubble>
                        ))}
                        {chat.isChatLoading && (
                            <AIChatBubble isAI accentColor={accentColor}>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <i className="fas fa-circle-notch fa-spin text-xs" />
                                    <span>Thinking...</span>
                                </div>
                            </AIChatBubble>
                        )}
                    </div>
                )}
                <div className="px-4 py-3 flex gap-2">
                    <input
                        type="text"
                        value={chat.chatInput}
                        onChange={(e) => chat.setChatInput(e.target.value)}
                        onFocus={() => chat.setIsChatFocused(true)}
                        onBlur={() => chat.setIsChatFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && chat.sendMessage()}
                        placeholder={
                            chat.atLimit ? 'Daily limit reached' : `Ask a follow-up... (${chat.remainingMessages} left)`
                        }
                        disabled={chat.atLimit || chat.isChatLoading}
                        className="flex-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-400 transition-colors"
                    />
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={chat.sendMessage}
                        disabled={chat.atLimit || !chat.chatInput.trim() || chat.isChatLoading}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={
                            chat.chatInput.trim() && !chat.atLimit
                                ? { background: accentColor, borderColor: accentColor, color: 'white' }
                                : undefined
                        }
                    >
                        <i className="fas fa-paper-plane text-[10px]" />
                    </button>
                </div>
            </div>
        )}
    </div>
)
/** Summary counter strip — compact at-a-glance row of colored badges. */
const SummaryStrip = ({ items }) => {
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
/** Shared alerts content used by both desktop and mobile. */
const AlertsContent = ({
    plantNotifications,
    expandedSections,
    setExpandedSections,
    setEmbeddedView,
    setEmbeddedViewSearch,
    shopIssue
}) => (
    <>
        {/* Fleet Alert — gradient banner at top */}
        {shopIssue && (
            <div
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 mb-2"
                style={{
                    animation: 'fadeSlideIn 0.3s ease both',
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)'
                }}
            >
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full flex-shrink-0">
                    <i className="fas fa-exclamation-triangle text-white text-xs" />
                </div>
                <div className="flex-1">
                    <div className="text-white text-[12px] font-semibold">Fleet Alert</div>
                    <div className="text-red-100 text-[11px]">
                        {shopIssue.inShopCount} in shop &middot; {shopIssue.spareCount} spare
                    </div>
                </div>
            </div>
        )}
        {/* Summary counters */}
        <SummaryStrip
            items={[
                {
                    color: '#ea580c',
                    count: plantNotifications.assetsWithMostIssues.length,
                    icon: 'fa-exclamation-circle',
                    label: 'Issues'
                },
                {
                    color: '#be123c',
                    count: plantNotifications.longTermShopAssets.length,
                    icon: 'fa-tools',
                    label: 'In Shop'
                },
                {
                    color: '#0ea5e9',
                    count: plantNotifications.unassignedOperators.length,
                    icon: 'fa-user-slash',
                    label: 'Unassigned'
                },
                {
                    color: '#10b981',
                    count: plantNotifications.pendingOperators.length,
                    icon: 'fa-user-plus',
                    label: 'Pending'
                },
                {
                    color: '#8b5cf6',
                    count: plantNotifications.trainingOperators.length,
                    icon: 'fa-graduation-cap',
                    label: 'Training'
                }
            ]}
        />
        {/* Asset notifications */}
        {plantNotifications.assetsWithMostIssues.length > 0 && (
            <NotificationRow
                icon="fa-exclamation-circle"
                iconColor="#ea580c"
                title="Open Issues"
                count={plantNotifications.assetsWithMostIssues.length}
                items={plantNotifications.assetsWithMostIssues}
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
        {plantNotifications.longTermShopAssets.length > 0 && (
            <NotificationRow
                icon="fa-tools"
                iconColor="#be123c"
                title="Long-Term Shop"
                count={plantNotifications.longTermShopAssets.length}
                items={plantNotifications.longTermShopAssets}
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
                        className="flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 cursor-pointer transition-all hover:brightness-95 active:scale-[0.97]"
                        style={{ background: '#be123c14', color: '#be123c' }}
                    >
                        <span>{a.identifier}</span>
                        <span className="opacity-50 text-[10px]">({a.daysInShop}d)</span>
                        {a.downInYard && (
                            <span className="bg-red-100 text-red-600 rounded-full text-[9px] font-semibold px-1.5 py-0.5">
                                Yard
                            </span>
                        )}
                    </button>
                )}
            />
        )}
    </>
)
/** Shared operators content. */
const OperatorsContent = ({ plantNotifications, setEmbeddedView, setEmbeddedViewSearch }) => {
    const { unassignedOperators, pendingOperators, trainingOperators } = plantNotifications
    const hasAny = unassignedOperators.length > 0 || pendingOperators.length > 0 || trainingOperators.length > 0
    if (!hasAny) return null
    return (
        <>
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
        </>
    )
}
const DashboardPlantSummary = memo(function DashboardPlantSummary({
    dashboardPlant,
    plantNotifications,
    expandedSections,
    setExpandedSections,
    setEmbeddedView,
    setEmbeddedViewSearch,
    aiDisplayText,
    aiActionPlan,
    isTypingComplete,
    showActionPlan,
    visibleActionItems,
    handleRegenerateAISummary,
    userRoleName,
    userPlantCode,
    isPlantManager,
    isMobile,
    domainData
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [isMinimized, setIsMinimized] = useState(() => {
        if (typeof window === 'undefined') return true
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved === null ? true : saved === 'true'
    })
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(isMinimized))
    }, [isMinimized])
    const hasNotifications =
        plantNotifications.pendingOperators.length > 0 ||
        plantNotifications.assetsWithMostIssues.length > 0 ||
        plantNotifications.trainingOperators.length > 0 ||
        plantNotifications.longTermShopAssets.length > 0
    const alertCount = plantNotifications.assetsWithMostIssues.length + plantNotifications.longTermShopAssets.length
    const { leaderboardMetrics, aiSummary, aiSummaryLoading, aiSummaryFailed, shopIssue } = plantNotifications
    const chatContext = useMemo(
        () =>
            buildPlantChatContext({
                aiSummary,
                dashboardPlant,
                isPlantManager,
                plantNotifications,
                userPlantCode,
                userRoleName
            }),
        [aiSummary, dashboardPlant, isPlantManager, plantNotifications, userPlantCode, userRoleName]
    )
    const chat = useDashboardChat(chatContext, domainData)
    const isChatExpanded = (chat.isChatFocused || chat.isChatLoading) && !isMobile
    const toggleMinimized = () => setIsMinimized(!isMinimized)
    // Determine loading state: no metrics loaded yet and no notifications computed
    const isDataLoading = !leaderboardMetrics && !hasNotifications
    const hasAI = aiSummary || aiSummaryLoading || aiSummaryFailed
    // Desktop: Split pane layout
    return (
        <div className="bg-white border border-slate-200 rounded-2xl mb-6 overflow-hidden transition-all duration-300">
            {/* Accent header bar */}
            <div
                onClick={toggleMinimized}
                className={`flex items-center justify-between cursor-pointer ${isMobile ? 'gap-3 p-4' : 'gap-6 px-6 py-4'}`}
                style={{
                    backgroundColor: accentColor,
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
                        radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 50%)
                    `,
                    backgroundPosition: '0 0, 0 0, 0 0',
                    backgroundSize: '20px 20px, 20px 20px, 40px 40px'
                }}
            >
                <div className="flex items-center flex-1 gap-4">
                    <div
                        className={`flex items-center justify-center bg-white/15 rounded-xl transition-all duration-300 ${isMinimized ? 'w-10 h-10' : 'w-12 h-12'}`}
                    >
                        <img
                            src={FlagSmyrnaLogo}
                            alt="Smyrna"
                            className={`object-contain transition-all duration-300 ${isMinimized ? 'w-6 h-6' : 'w-8 h-8'}`}
                        />
                    </div>
                    <div className="flex-1">
                        <h2 className={`text-white font-bold m-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                            Plant {dashboardPlant || 'Summary'}
                        </h2>
                        {!isMinimized && !isDataLoading && (
                            <p className="text-white/70 text-sm m-0 mt-0.5">
                                {alertCount > 0 ? `${alertCount} items need attention` : 'All systems operational'}
                            </p>
                        )}
                    </div>
                    {isMinimized && alertCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-red-600 rounded-xl text-white text-sm font-semibold px-3 py-1.5">
                            <i className="fas fa-bell" />
                            {alertCount}
                        </div>
                    )}
                    {isMinimized && leaderboardMetrics && (
                        <div className="flex items-center bg-white/15 rounded-lg text-white text-sm font-semibold px-3 py-1.5">
                            #{leaderboardMetrics.rank}
                        </div>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        toggleMinimized()
                    }}
                    className="flex items-center justify-center w-9 h-9 bg-white/15 border-none rounded-lg text-white cursor-pointer transition-all duration-200 hover:bg-white/25"
                    title={isMinimized ? 'Expand' : 'Collapse'}
                >
                    <i className={`fas fa-chevron-${isMinimized ? 'down' : 'up'} text-sm`} />
                </button>
            </div>
            {!isMinimized && (
                <>
                    {/* Metrics row */}
                    {isDataLoading ? (
                        <MetricsSkeleton />
                    ) : leaderboardMetrics ? (
                        <div
                            className={`flex flex-wrap gap-2.5 bg-slate-50 border-b border-slate-200 ${isMobile ? 'p-4' : 'px-6 py-4'}`}
                        >
                            <MetricPill
                                label="Raw YPH"
                                value={leaderboardMetrics.rawYPH?.toFixed(2) || '--'}
                                icon="fa-chart-line"
                                accentColor={accentColor}
                            />
                            <MetricPill
                                label="Adjusted YPH"
                                value={leaderboardMetrics.adjustedYPH?.toFixed(2) || '--'}
                                icon="fa-calculator"
                                accentColor={accentColor}
                            />
                            <MetricPill
                                label="Net Help"
                                value={`${leaderboardMetrics.netHelp > 0 ? '+' : ''}${Math.round(leaderboardMetrics.netHelp || 0)}h`}
                                color={
                                    leaderboardMetrics.netHelp > 0
                                        ? '#16a34a'
                                        : leaderboardMetrics.netHelp < 0
                                          ? '#dc2626'
                                          : 'var(--text-secondary)'
                                }
                                icon="fa-hands-helping"
                                accentColor={accentColor}
                            />
                            <MetricPill
                                label="Cleanliness"
                                value={leaderboardMetrics.avgCleanliness?.toFixed(1) || '--'}
                                color={
                                    (leaderboardMetrics.avgCleanliness || 0) >= 4
                                        ? '#16a34a'
                                        : (leaderboardMetrics.avgCleanliness || 0) >= 3
                                          ? '#f59e0b'
                                          : '#dc2626'
                                }
                                icon="fa-broom"
                                accentColor={accentColor}
                            />
                            <MetricPill
                                label="Safety"
                                value={leaderboardMetrics.safetyIncidents || 0}
                                color={(leaderboardMetrics.safetyIncidents || 0) === 0 ? '#16a34a' : '#dc2626'}
                                icon="fa-hard-hat"
                                accentColor={accentColor}
                            />
                        </div>
                    ) : null}
                    {/* Split pane: Data left, Analysis right */}
                    <div className={isMobile ? 'flex flex-col' : 'flex'}>
                        {/* Left pane — Alerts & Operators */}
                        <div
                            className={`${isMobile ? 'p-4' : 'px-5 py-4'} ${!isMobile && (hasAI || isDataLoading) ? 'border-r border-slate-200' : ''}`}
                            style={
                                !isMobile
                                    ? {
                                          flex: isChatExpanded
                                              ? '0 0 0%'
                                              : hasAI || isDataLoading
                                                ? '0 0 60%'
                                                : '1 1 100%',
                                          maxHeight: isChatExpanded ? 0 : 1000,
                                          opacity: isChatExpanded ? 0 : 1,
                                          overflow: 'hidden',
                                          padding: isChatExpanded ? 0 : undefined,
                                          transition: 'all 0.5s ease'
                                      }
                                    : undefined
                            }
                        >
                            {isDataLoading ? (
                                <AlertsSkeleton />
                            ) : hasNotifications ? (
                                <>
                                    <AlertsContent
                                        plantNotifications={plantNotifications}
                                        expandedSections={expandedSections}
                                        setExpandedSections={setExpandedSections}
                                        setEmbeddedView={setEmbeddedView}
                                        setEmbeddedViewSearch={setEmbeddedViewSearch}
                                        shopIssue={shopIssue}
                                    />
                                    <OperatorsContent
                                        plantNotifications={plantNotifications}
                                        setEmbeddedView={setEmbeddedView}
                                        setEmbeddedViewSearch={setEmbeddedViewSearch}
                                    />
                                </>
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center gap-2 py-8 text-center"
                                    style={{ animation: 'fadeSlideIn 0.3s ease both' }}
                                >
                                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-50">
                                        <i className="fas fa-check text-emerald-500 text-base" />
                                    </div>
                                    <div className="text-slate-700 text-[13px] font-semibold">All clear</div>
                                    <div className="text-slate-400 text-[11px]">
                                        No alerts or operator issues detected
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Right pane — Analysis */}
                        {isDataLoading ? (
                            <div
                                className="bg-white"
                                style={
                                    !isMobile
                                        ? { flex: isChatExpanded ? '1 1 100%' : '0 0 40%', transition: 'all 0.5s ease' }
                                        : undefined
                                }
                            >
                                <AISkeleton accentColor={accentColor} />
                            </div>
                        ) : hasAI ? (
                            <div
                                className="bg-white"
                                style={
                                    !isMobile
                                        ? { flex: isChatExpanded ? '1 1 100%' : '0 0 40%', transition: 'all 0.5s ease' }
                                        : undefined
                                }
                            >
                                <AICopilotPane
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
                                    dashboardPlant={dashboardPlant}
                                    accentColor={accentColor}
                                    chat={chat}
                                />
                            </div>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    )
})
export default DashboardPlantSummary
