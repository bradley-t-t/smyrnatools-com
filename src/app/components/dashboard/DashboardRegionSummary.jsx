import React, { memo, useMemo } from 'react'

import FlagSmyrnaLogo from '../../../assets/images/FlagSmyrnaLogo.webp'
import { usePreferences } from '../../context/PreferencesContext'
import { buildRegionChatContext, useDashboardChat } from '../../hooks/useDashboardChat'
/** Skeleton pulse block. */
const Skeleton = ({ className = '', style }) => (
    <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} style={style} />
)
/** Skeleton for the metrics row. */
const MetricsSkeleton = () => (
    <div className="flex flex-wrap gap-2.5 bg-slate-50 border-b border-slate-200 px-6 py-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
                key={i}
                className="flex items-center gap-2.5 bg-white rounded-lg shadow-sm border border-slate-100 px-3.5 py-2.5 min-w-[120px] flex-1"
            >
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                    <Skeleton style={{ width: 50, height: 8 }} />
                    <Skeleton style={{ width: 40, height: 16 }} />
                </div>
            </div>
        ))}
    </div>
)
/** Skeleton for content area. */
const ContentSkeleton = () => (
    <div className="flex flex-col gap-4 py-2 px-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton style={{ width: 100 + i * 20, height: 12 }} />
                    <Skeleton className="w-5 h-5 rounded-full ml-auto" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3].map((j) => (
                        <Skeleton key={j} style={{ width: 60 + j * 10, height: 24 }} className="rounded-md" />
                    ))}
                </div>
            </div>
        ))}
    </div>
)
/** AI skeleton for the right pane. */
const AISkeleton = ({ accentColor }) => (
    <div className="flex flex-col">
        <div
            className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200"
            style={{ background: `${accentColor}08` }}
        >
            <Skeleton className="w-7 h-7 rounded-lg" />
            <div className="flex flex-col gap-1">
                <Skeleton style={{ width: 60, height: 10 }} />
                <Skeleton style={{ width: 100, height: 8 }} />
            </div>
        </div>
        <div className="px-4 py-3 flex flex-col gap-3">
            <Skeleton style={{ width: 140, height: 8 }} className="mx-auto" />
            <div className="bg-slate-100 rounded-xl rounded-tl-sm px-3.5 py-2.5">
                <Skeleton style={{ width: '100%', height: 10 }} className="mb-2" />
                <Skeleton style={{ width: '90%', height: 10 }} className="mb-2" />
                <Skeleton style={{ width: '70%', height: 10 }} />
            </div>
        </div>
    </div>
)
/** Compact metric pill. */
const MetricPill = ({ label, value, color, icon, accentColor, suffix }) => (
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
        <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</span>
            <span className="text-lg font-bold leading-tight" style={{ color: color || accentColor }}>
                {value}
                {suffix && <span className="text-xs font-medium text-slate-400 ml-0.5">{suffix}</span>}
            </span>
        </div>
    </div>
)
/** Small clickable asset pill. */
const AssetPill = ({ label, onClick, color }) => (
    <button
        onClick={onClick}
        className="rounded-md text-[12px] font-medium px-2 py-1 cursor-pointer transition-all hover:opacity-80"
        style={{ background: `${color}10`, border: `1px solid ${color}25`, color }}
    >
        {label}
    </button>
)
/** Alert row. */
const AlertRow = ({
    icon,
    iconColor,
    title,
    count,
    items,
    renderItem,
    maxItems = 4,
    expandKey,
    expandedSections,
    setExpandedSections
}) => {
    const isExpanded = expandedSections[expandKey]
    const displayItems = isExpanded ? items : items.slice(0, maxItems)
    const hasMore = items.length > maxItems
    return (
        <div
            className="border-b border-slate-100 last:border-b-0 py-3 first:pt-0 last:pb-0"
            style={{ animation: 'fadeSlideIn 0.3s ease both' }}
        >
            <div className="flex items-center gap-2 mb-2">
                <i className={`fas ${icon} text-xs`} style={{ color: iconColor }} />
                <span className="text-slate-800 text-[13px] font-semibold flex-1">{title}</span>
                <span
                    className="rounded-full text-white text-[10px] font-bold px-1.5 py-0.5 leading-none"
                    style={{ background: iconColor }}
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
                        className="text-sky-600 bg-sky-50 border border-sky-200 rounded-md text-[11px] font-semibold px-2 py-1 cursor-pointer hover:bg-sky-100 transition-colors"
                    >
                        {isExpanded ? 'Less' : `+${items.length - maxItems}`}
                    </button>
                )}
            </div>
        </div>
    )
}
/** Operator group. */
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
        className="border-b border-slate-100 last:border-b-0 py-3 first:pt-0 last:pb-0"
        style={{ animation: 'fadeSlideIn 0.3s ease both' }}
    >
        <div className="flex items-center gap-2 mb-2">
            <i className={`fas ${icon} text-xs`} style={{ color: iconColor }} />
            <span className="text-slate-800 text-[13px] font-semibold flex-1">{title}</span>
            <span
                className="rounded-full text-white text-[10px] font-bold px-1.5 py-0.5 leading-none"
                style={{ background: iconColor }}
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
                    className="rounded-md text-[12px] font-medium px-2 py-1 cursor-pointer transition-colors"
                    style={{ background: `${iconColor}10`, border: `1px solid ${iconColor}25`, color: iconColor }}
                >
                    {o[nameField]}
                </button>
            ))}
        </div>
    </div>
)
const getAssetViewType = (assetType) => {
    const viewMap = { Equipment: 'equipment', Mixer: 'mixers', Tractor: 'tractors', Trailer: 'trailers' }
    return viewMap[assetType] || 'equipment'
}
/** AI chat bubble. */
const AIChatBubble = ({ children, isAI = true, accentColor }) => (
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
/** Analysis pane for the right side. */
const AnalysisPane = ({
    aiSummaryLoading,
    aiSummaryFailed,
    aiDisplayText,
    aiActionPlan,
    showActionPlan,
    visibleActionItems = 0,
    isTypingComplete,
    handleRegenerateAISummary,
    userRoleName,
    regionDisplayName,
    accentColor,
    chat
}) => (
    <div className="flex flex-col">
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
                    {aiSummaryLoading ? 'Analyzing...' : `${regionDisplayName} insights`}
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
        <div className="px-4 py-3 flex flex-col gap-3">
            {userRoleName && !aiSummaryLoading && (
                <div className="text-center text-slate-400 text-[10px] py-1">
                    <i className="fas fa-user-check mr-1" />
                    Analysis for <strong>{userRoleName}</strong>
                </div>
            )}
            {aiSummaryLoading && (
                <AIChatBubble accentColor={accentColor}>
                    <div className="flex items-center gap-2 text-slate-500">
                        <i className="fas fa-circle-notch fa-spin text-xs" />
                        <span>Analyzing regional performance...</span>
                    </div>
                </AIChatBubble>
            )}
            {aiSummaryFailed && (
                <AIChatBubble accentColor={accentColor}>
                    <div className="flex items-center gap-2 text-red-600">
                        <i className="fas fa-exclamation-triangle text-xs" />
                        <span>Failed to generate analysis. Try regenerating.</span>
                    </div>
                </AIChatBubble>
            )}
            {!aiSummaryLoading && !aiSummaryFailed && aiDisplayText && (
                <AIChatBubble accentColor={accentColor}>{aiDisplayText}</AIChatBubble>
            )}
            {showActionPlan && visibleActionItems > 0 && aiActionPlan.length > 0 && (
                <AIChatBubble accentColor={accentColor}>
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
const DashboardRegionSummary = memo(function DashboardRegionSummary({
    regionDisplayName,
    regionSubtitle,
    plantNotifications,
    displayStats,
    expandedSections,
    setExpandedSections,
    setEmbeddedView,
    setEmbeddedViewSearch,
    isMobile,
    dataReady,
    aiDisplayText,
    aiActionPlan,
    isTypingComplete,
    showActionPlan,
    visibleActionItems,
    aiSummaryLoading,
    aiSummaryFailed,
    aiSummary,
    handleRegenerateAISummary,
    userRoleName,
    domainData
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const chatContext = useMemo(
        () => buildRegionChatContext({ aiSummary, displayStats, plantNotifications, regionDisplayName, userRoleName }),
        [aiSummary, displayStats, plantNotifications, regionDisplayName, userRoleName]
    )
    const chat = useDashboardChat(chatContext, domainData)
    const isChatExpanded = (chat.isChatFocused || chat.isChatLoading) && !isMobile
    const hasNotifications =
        plantNotifications.unverifiedMixers.length > 0 ||
        plantNotifications.pendingOperators.length > 0 ||
        plantNotifications.assetsWithMostIssues.length > 0 ||
        plantNotifications.overdueService.length > 0 ||
        plantNotifications.trainingOperators.length > 0 ||
        plantNotifications.longTermShopAssets.length > 0
    const alertCount =
        plantNotifications.unverifiedMixers.length +
        plantNotifications.overdueService.length +
        plantNotifications.assetsWithMostIssues.length +
        plantNotifications.longTermShopAssets.length
    const { shopIssue } = plantNotifications
    const isDataLoading = !dataReady
    const stats = displayStats || {}
    const opStats = stats.operators || {}
    const hasAI = aiSummary || aiSummaryLoading || aiSummaryFailed
    const renderAssetPill = (asset, color) => (
        <AssetPill
            label={`${asset.type} ${asset.identifier || ''}`}
            color={color}
            onClick={() => {
                setEmbeddedView(getAssetViewType(asset.type))
                setEmbeddedViewSearch(asset.identifier || '')
            }}
        />
    )
    return (
        <div className="bg-white border border-slate-200 rounded-2xl mb-6 overflow-hidden transition-all duration-300">
            {/* Header */}
            <div
                className={`flex items-center justify-between ${isMobile ? 'gap-3 p-4' : 'gap-6 px-6 py-4'}`}
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
                    <div className="flex items-center justify-center w-12 h-12 bg-white/15 rounded-xl">
                        <img src={FlagSmyrnaLogo} alt="Smyrna" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1">
                        <h2 className={`text-white font-bold m-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                            {regionDisplayName} Overview
                        </h2>
                        <p className="text-white/60 text-xs m-0 mt-0.5">
                            {regionSubtitle || ''}
                            {!isDataLoading && alertCount > 0 && (
                                <span className="text-white/50">
                                    {' '}
                                    · {alertCount} issue{alertCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                    </div>
                    {alertCount > 0 && !isDataLoading && (
                        <div className="flex items-center gap-1.5 bg-red-600 rounded-xl text-white text-sm font-semibold px-3 py-1.5">
                            <i className="fas fa-bell" />
                            {alertCount}
                        </div>
                    )}
                </div>
            </div>
            {/* Metrics row */}
            {isDataLoading ? (
                <MetricsSkeleton />
            ) : (
                <div
                    className={`flex flex-wrap gap-2.5 bg-slate-50 border-b border-slate-200 ${isMobile ? 'p-4' : 'px-6 py-4'}`}
                >
                    <MetricPill
                        label="Fleet Total"
                        value={stats.fleetTotal || 0}
                        icon="fa-truck"
                        accentColor={accentColor}
                    />
                    <MetricPill
                        label="Allocation"
                        value={`${Math.round(stats.overallAllocationPercent || 0)}%`}
                        icon="fa-th-large"
                        color={
                            (stats.overallAllocationPercent || 0) >= 80
                                ? '#16a34a'
                                : (stats.overallAllocationPercent || 0) >= 50
                                  ? '#f59e0b'
                                  : '#dc2626'
                        }
                        accentColor={accentColor}
                    />
                    <MetricPill
                        label="In Shop"
                        value={
                            (stats.mixers?.shop || 0) +
                            (stats.tractors?.shop || 0) +
                            (stats.trailers?.shop || 0) +
                            (stats.equipment?.shop || 0)
                        }
                        icon="fa-tools"
                        color="#f59e0b"
                        accentColor={accentColor}
                    />
                    <MetricPill
                        label="Overdue"
                        value={stats.overdueTotal || 0}
                        icon="fa-exclamation-triangle"
                        color={(stats.overdueTotal || 0) === 0 ? '#16a34a' : '#dc2626'}
                        accentColor={accentColor}
                    />
                    <MetricPill
                        label="Operators"
                        value={opStats.active || 0}
                        icon="fa-users"
                        accentColor={accentColor}
                        suffix={opStats.unassigned > 0 ? `(${opStats.unassigned} idle)` : ''}
                    />
                    <MetricPill
                        label="Verified"
                        value={`${Math.round(stats.verificationAverage || 0)}%`}
                        icon="fa-clipboard-check"
                        color={
                            (stats.verificationAverage || 0) >= 90
                                ? '#16a34a'
                                : (stats.verificationAverage || 0) >= 70
                                  ? '#f59e0b'
                                  : '#dc2626'
                        }
                        accentColor={accentColor}
                    />
                </div>
            )}
            {/* Split pane */}
            <div className={isMobile ? 'flex flex-col' : 'flex'}>
                {/* Left pane — Issues */}
                <div
                    className={`${isMobile ? 'p-4' : 'px-5 py-4'} ${!isMobile && (hasAI || isDataLoading) ? 'border-r border-slate-200' : ''}`}
                    style={
                        !isMobile
                            ? {
                                  flex: isChatExpanded ? '0 0 0%' : hasAI || isDataLoading ? '0 0 60%' : '1 1 100%',
                                  opacity: isChatExpanded ? 0 : 1,
                                  overflow: 'hidden',
                                  maxHeight: isChatExpanded ? 0 : 1000,
                                  padding: isChatExpanded ? 0 : undefined,
                                  transition: 'all 0.5s ease'
                              }
                            : undefined
                    }
                >
                    {isDataLoading ? (
                        <ContentSkeleton />
                    ) : hasNotifications ? (
                        <>
                            {plantNotifications.unverifiedMixers.length > 0 && (
                                <AlertRow
                                    icon="fa-clipboard-check"
                                    iconColor="#dc2626"
                                    title="Unverified Mixers"
                                    count={plantNotifications.unverifiedMixers.length}
                                    items={plantNotifications.unverifiedMixers}
                                    expandKey="unverifiedMixers"
                                    expandedSections={expandedSections}
                                    setExpandedSections={setExpandedSections}
                                    renderItem={(m, i) => (
                                        <AssetPill
                                            key={i}
                                            label={m.truckNumber || 'N/A'}
                                            color="#dc2626"
                                            onClick={() => {
                                                setEmbeddedView('mixers')
                                                setEmbeddedViewSearch(m.truckNumber || '')
                                            }}
                                        />
                                    )}
                                />
                            )}
                            {plantNotifications.overdueService.length > 0 && (
                                <AlertRow
                                    icon="fa-wrench"
                                    iconColor="#f59e0b"
                                    title="Service Overdue"
                                    count={plantNotifications.overdueService.length}
                                    items={plantNotifications.overdueService}
                                    expandKey="overdueService"
                                    expandedSections={expandedSections}
                                    setExpandedSections={setExpandedSections}
                                    renderItem={(a, i) => <span key={i}>{renderAssetPill(a, '#f59e0b')}</span>}
                                />
                            )}
                            {plantNotifications.assetsWithMostIssues.length > 0 && (
                                <AlertRow
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
                                <AlertRow
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
                                            className="flex items-center gap-1.5 rounded-md text-[12px] font-medium px-2 py-1 cursor-pointer transition-colors"
                                            style={{
                                                background: '#be123c10',
                                                border: '1px solid #be123c25',
                                                color: '#be123c'
                                            }}
                                        >
                                            <span>{a.identifier}</span>
                                            <span className="text-slate-400 text-[10px]">({a.daysInShop}d)</span>
                                            {a.downInYard && (
                                                <span className="bg-red-100 text-red-600 rounded text-[9px] font-semibold px-1 py-0.5">
                                                    Yard
                                                </span>
                                            )}
                                        </button>
                                    )}
                                />
                            )}
                            {shopIssue && (
                                <div
                                    className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3 mt-3"
                                    style={{ animation: 'fadeSlideIn 0.3s ease both' }}
                                >
                                    <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-lg flex-shrink-0">
                                        <i className="fas fa-exclamation text-white text-sm" />
                                    </div>
                                    <div>
                                        <div className="text-red-800 text-[13px] font-semibold">Fleet Alert</div>
                                        <div className="text-red-600 text-[12px]">
                                            <strong>{shopIssue.inShopCount}</strong> in shop,{' '}
                                            <strong>{shopIssue.spareCount}</strong> spare
                                        </div>
                                    </div>
                                </div>
                            )}
                            {(plantNotifications.unassignedOperators.length > 0 ||
                                plantNotifications.pendingOperators.length > 0 ||
                                plantNotifications.trainingOperators.length > 0) && (
                                <div className="border-t border-slate-200 mt-3 pt-3">
                                    {plantNotifications.unassignedOperators.length > 0 && (
                                        <OperatorGroup
                                            icon="fa-user-slash"
                                            iconColor="#0ea5e9"
                                            title="Unassigned"
                                            count={plantNotifications.unassignedOperators.length}
                                            operators={plantNotifications.unassignedOperators}
                                            setEmbeddedView={setEmbeddedView}
                                            setEmbeddedViewSearch={setEmbeddedViewSearch}
                                        />
                                    )}
                                    {plantNotifications.pendingOperators.length > 0 && (
                                        <OperatorGroup
                                            icon="fa-user-plus"
                                            iconColor="#10b981"
                                            title="Pending Start"
                                            count={plantNotifications.pendingOperators.length}
                                            operators={plantNotifications.pendingOperators}
                                            nameField="operatorName"
                                            setEmbeddedView={setEmbeddedView}
                                            setEmbeddedViewSearch={setEmbeddedViewSearch}
                                        />
                                    )}
                                    {plantNotifications.trainingOperators.length > 0 && (
                                        <OperatorGroup
                                            icon="fa-graduation-cap"
                                            iconColor="#8b5cf6"
                                            title="In Training"
                                            count={plantNotifications.trainingOperators.length}
                                            operators={plantNotifications.trainingOperators}
                                            nameField="operatorName"
                                            setEmbeddedView={setEmbeddedView}
                                            setEmbeddedViewSearch={setEmbeddedViewSearch}
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div
                            className="flex flex-col items-center justify-center gap-2 py-10 text-center"
                            style={{ animation: 'fadeSlideIn 0.3s ease both' }}
                        >
                            <i className="fas fa-check-circle text-emerald-500 text-2xl" />
                            <div className="text-slate-800 text-sm font-semibold">All clear</div>
                            <div className="text-slate-500 text-xs">No regional issues detected</div>
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
                ) : hasAI || isDataLoading ? (
                    <div
                        className="bg-white"
                        style={
                            !isMobile
                                ? { flex: isChatExpanded ? '1 1 100%' : '0 0 40%', transition: 'all 0.5s ease' }
                                : undefined
                        }
                    >
                        <AnalysisPane
                            aiSummaryLoading={aiSummaryLoading}
                            aiSummaryFailed={aiSummaryFailed}
                            aiDisplayText={aiDisplayText}
                            aiActionPlan={aiActionPlan}
                            showActionPlan={showActionPlan}
                            visibleActionItems={visibleActionItems}
                            isTypingComplete={isTypingComplete}
                            handleRegenerateAISummary={handleRegenerateAISummary}
                            userRoleName={userRoleName}
                            regionDisplayName={regionDisplayName}
                            accentColor={accentColor}
                            chat={chat}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    )
})
export default DashboardRegionSummary
