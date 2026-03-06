import React, { memo, useEffect, useState } from 'react'

import { usePreferences } from '../../context/PreferencesContext'
/** LocalStorage key for persisting the plant summary minimized/expanded state. */
const STORAGE_KEY = 'dashboard-plant-summary-minimized'
/**
 * Expandable alert card with icon, count badge, and a collapsible item list.
 * Used for unverified mixers, overdue service, open issues, and long-term shop alerts.
 */
const AlertItem = ({
    icon,
    iconBg,
    count,
    title,
    subtitle,
    items,
    expandKey,
    renderItem,
    maxItems = 5,
    expandedSections,
    setExpandedSections
}) => {
    const isExpanded = expandedSections[expandKey]
    const displayItems = isExpanded ? items : items.slice(0, maxItems)
    const hasMore = items.length > maxItems
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-3.5 border-b border-slate-100">
                <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                    style={{ background: iconBg }}
                >
                    <i className={`fas ${icon} text-white text-base`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-900 text-[15px] font-semibold">{title}</span>
                        <span
                            className="rounded-xl text-white text-xs font-bold px-2 py-0.5"
                            style={{ background: iconBg }}
                        >
                            {count}
                        </span>
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">{subtitle}</div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 p-3">
                {displayItems.map((item, i) => renderItem(item, i))}
                {hasMore && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setExpandedSections((prev) => ({ ...prev, [expandKey]: !isExpanded }))
                        }}
                        className="bg-sky-50 border border-sky-200 rounded-lg text-sky-700 text-xs font-semibold px-3 py-1.5 cursor-pointer hover:bg-sky-100 transition-colors"
                    >
                        {isExpanded ? 'Show less' : `+${items.length - maxItems} more`}
                    </button>
                )}
            </div>
        </div>
    )
}
/** Clickable pill button for navigating to a specific asset in an embedded view. */
const AssetButton = ({ label, onClick, color }) => (
    <button
        onClick={onClick}
        className="bg-slate-50 rounded-lg text-sm font-medium px-3 py-1.5 cursor-pointer transition-all hover:opacity-80"
        style={{ border: `1px solid ${color}20`, color }}
    >
        {label}
    </button>
)
/** Compact KPI card displaying a labeled value with optional icon and color. */
const MetricCard = ({ label, value, color, icon, accentColor, isMobile }) => (
    <div
        className={`flex flex-col items-center gap-1 bg-white rounded-xl shadow-sm ${isMobile ? 'flex-[1_1_45%] min-w-[120px] px-2.5 py-3.5' : 'flex-[1_1_auto] min-w-[100px] px-5 py-4'}`}
    >
        {icon && <i className={`fas ${icon} text-sm mb-1`} style={{ color: color || '#64748b' }} />}
        <div
            className={`font-bold leading-none ${isMobile ? 'text-[22px]' : 'text-[26px]'}`}
            style={{ color: color || accentColor }}
        >
            {value}
        </div>
        <div className="text-slate-500 text-[11px] font-medium text-center uppercase">{label}</div>
    </div>
)
/** Operator category card with icon header and clickable name buttons that open the operators embedded view. */
const OperatorSection = ({
    iconBg,
    icon,
    title,
    count,
    subtitle,
    operators,
    buttonBg,
    buttonBorder,
    buttonColor,
    setEmbeddedView,
    setEmbeddedViewSearch,
    nameField = 'name'
}) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-3.5 border-b border-slate-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: iconBg }}>
                <i className={`fas ${icon} text-white text-base`} />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-900 text-[15px] font-semibold">{title}</span>
                    <span
                        className="rounded-xl text-white text-xs font-bold px-2 py-0.5"
                        style={{ background: iconBg }}
                    >
                        {count}
                    </span>
                </div>
                <div className="text-slate-500 text-xs mt-0.5">{subtitle}</div>
            </div>
        </div>
        <div className="flex flex-wrap gap-2 p-3">
            {operators.map((o, i) => (
                <button
                    key={i}
                    onClick={() => {
                        setEmbeddedView('operators')
                        setEmbeddedViewSearch(o[nameField] || '')
                    }}
                    className="rounded-lg text-sm font-medium px-3 py-1.5 cursor-pointer"
                    style={{ background: buttonBg, border: `1px solid ${buttonBorder}`, color: buttonColor }}
                >
                    {o[nameField]}
                </button>
            ))}
        </div>
    </div>
)
/** Maps a display asset type name to its embedded view key. */
const getAssetViewType = (assetType) => {
    const viewMap = { Equipment: 'equipment', Mixer: 'mixers', Tractor: 'tractors', Trailer: 'trailers' }
    return viewMap[assetType] || 'equipment'
}
/**
 * Collapsible plant-level summary panel on the dashboard.
 * Shows leaderboard metrics, AI-generated analysis, asset/operator alerts,
 * and operator status tabs. Persists minimized state to localStorage.
 * Only renders when there are notifications or leaderboard data available.
 */
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
    handleRegenerateAISummary,
    userRoleName,
    userPlantCode,
    isPlantManager,
    isMobile
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [activeTab, setActiveTab] = useState('alerts')
    const [isMinimized, setIsMinimized] = useState(() => {
        if (typeof window === 'undefined') return true
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved === null ? true : saved === 'true'
    })
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(isMinimized))
    }, [isMinimized])
    const hasNotifications =
        plantNotifications.unverifiedMixers.length > 0 ||
        plantNotifications.pendingOperators.length > 0 ||
        plantNotifications.assetsWithMostIssues.length > 0 ||
        plantNotifications.overdueService.length > 0 ||
        plantNotifications.trainingOperators.length > 0 ||
        plantNotifications.longTermShopAssets.length > 0
    if (!hasNotifications && !plantNotifications.leaderboardMetrics) return null
    const alertCount =
        plantNotifications.unverifiedMixers.length +
        plantNotifications.overdueService.length +
        plantNotifications.assetsWithMostIssues.length +
        plantNotifications.longTermShopAssets.length
    const { leaderboardMetrics, aiSummary, aiSummaryLoading, aiSummaryFailed, shopIssue } = plantNotifications
    const toggleMinimized = () => setIsMinimized(!isMinimized)
    const renderAssetButton = (asset, color) => (
        <AssetButton
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
            <div
                onClick={toggleMinimized}
                className={`flex items-center justify-between cursor-pointer ${isMobile ? 'gap-3 p-4' : 'gap-6 px-7 py-5'}`}
                style={{ background: accentColor }}
            >
                <div className="flex items-center flex-1 gap-4">
                    <div
                        className={`flex items-center justify-center bg-white/15 rounded-xl transition-all duration-300 ${isMinimized ? 'w-11 h-11' : 'w-[52px] h-[52px]'}`}
                    >
                        <i
                            className={`fas fa-building text-white transition-all duration-300 ${isMinimized ? 'text-lg' : 'text-[22px]'}`}
                        />
                    </div>
                    <div className="flex-1">
                        <h2 className={`text-white font-bold m-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                            Plant {dashboardPlant || 'Summary'}
                        </h2>
                        {!isMinimized && (
                            <p className="text-white/70 text-sm m-0 mt-1">
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
                    {leaderboardMetrics && (
                        <div
                            className={`flex flex-wrap gap-3 justify-center bg-slate-50 border-b border-slate-200 ${isMobile ? 'p-4' : 'px-7 py-5'}`}
                        >
                            <MetricCard
                                label="Raw YPH"
                                value={leaderboardMetrics.rawYPH?.toFixed(2) || '--'}
                                icon="fa-chart-line"
                                accentColor={accentColor}
                                isMobile={isMobile}
                            />
                            <MetricCard
                                label="Adjusted YPH"
                                value={leaderboardMetrics.adjustedYPH?.toFixed(2) || '--'}
                                icon="fa-calculator"
                                accentColor={accentColor}
                                isMobile={isMobile}
                            />
                            <MetricCard
                                label="Net Help"
                                value={`${leaderboardMetrics.netHelp > 0 ? '+' : ''}${Math.round(leaderboardMetrics.netHelp || 0)}h`}
                                color={
                                    leaderboardMetrics.netHelp > 0
                                        ? '#16a34a'
                                        : leaderboardMetrics.netHelp < 0
                                          ? '#dc2626'
                                          : '#64748b'
                                }
                                icon="fa-hands-helping"
                                accentColor={accentColor}
                                isMobile={isMobile}
                            />
                            <MetricCard
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
                                isMobile={isMobile}
                            />
                            <MetricCard
                                label="Safety"
                                value={leaderboardMetrics.safetyIncidents || 0}
                                color={(leaderboardMetrics.safetyIncidents || 0) === 0 ? '#16a34a' : '#dc2626'}
                                icon="fa-hard-hat"
                                accentColor={accentColor}
                                isMobile={isMobile}
                            />
                        </div>
                    )}
                    {(aiSummary || aiSummaryLoading || aiSummaryFailed) && (
                        <AISummarySection
                            aiSummaryLoading={aiSummaryLoading}
                            aiSummaryFailed={aiSummaryFailed}
                            aiDisplayText={aiDisplayText}
                            aiActionPlan={aiActionPlan}
                            showActionPlan={showActionPlan}
                            isTypingComplete={isTypingComplete}
                            handleRegenerateAISummary={handleRegenerateAISummary}
                            userRoleName={userRoleName}
                            userPlantCode={userPlantCode}
                            isPlantManager={isPlantManager}
                            dashboardPlant={dashboardPlant}
                            accentColor={accentColor}
                            isMobile={isMobile}
                        />
                    )}
                    {hasNotifications && (
                        <div className={isMobile ? 'p-4' : 'px-7 py-5'}>
                            <TabHeader
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                alertCount={alertCount}
                                accentColor={accentColor}
                            />
                            {activeTab === 'alerts' && (
                                <AlertsTab
                                    plantNotifications={plantNotifications}
                                    expandedSections={expandedSections}
                                    setExpandedSections={setExpandedSections}
                                    setEmbeddedView={setEmbeddedView}
                                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                                    renderAssetButton={renderAssetButton}
                                    shopIssue={shopIssue}
                                />
                            )}
                            {activeTab === 'operators' && (
                                <OperatorsTab
                                    plantNotifications={plantNotifications}
                                    setEmbeddedView={setEmbeddedView}
                                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                                />
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
})
/** AI-powered plant performance analysis with typewriter-style display and regenerate button. */
const AISummarySection = ({
    aiSummaryLoading,
    aiSummaryFailed,
    aiDisplayText,
    aiActionPlan,
    showActionPlan,
    isTypingComplete,
    handleRegenerateAISummary,
    userRoleName,
    userPlantCode,
    isPlantManager,
    dashboardPlant,
    accentColor,
    isMobile
}) => (
    <div className={`bg-white border-b border-slate-200 ${isMobile ? 'p-4' : 'px-7 py-5'}`}>
        <div className={`flex items-start gap-3 rounded-xl p-4 ${aiSummaryFailed ? 'bg-red-50' : 'bg-sky-50'}`}>
            <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${aiSummaryFailed ? 'bg-red-100' : 'bg-sky-100'}`}
            >
                <i
                    className={`fas ${aiSummaryLoading ? 'fa-circle-notch fa-spin' : aiSummaryFailed ? 'fa-exclamation-triangle' : 'fa-robot'} text-sm`}
                    style={{ color: aiSummaryFailed ? '#dc2626' : '#0284c7' }}
                />
            </div>
            <div className="flex-1">
                {userRoleName && !aiSummaryLoading && (
                    <div className="text-slate-500 text-[11px] mb-1.5">
                        <i className="fas fa-user-check mr-1" />
                        Analysis for <strong>{userRoleName}</strong>
                        {userPlantCode && isPlantManager && userPlantCode === dashboardPlant ? ' (your plant)' : ''}
                    </div>
                )}
                <p className={`text-sm leading-relaxed m-0 ${aiSummaryFailed ? 'text-red-600' : 'text-slate-700'}`}>
                    {aiSummaryLoading
                        ? 'Analyzing plant performance...'
                        : aiSummaryFailed
                          ? 'Failed to generate analysis'
                          : aiDisplayText}
                </p>
                {showActionPlan && aiActionPlan.length > 0 && (
                    <div className="border-t border-slate-200 mt-3 pt-3">
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold uppercase mb-2.5">
                            <i className="fas fa-tasks" />
                            Action Plan
                        </div>
                        <div className="flex flex-col gap-2">
                            {aiActionPlan.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2.5">
                                    <span
                                        className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold flex-shrink-0"
                                        style={{ background: accentColor }}
                                    >
                                        {idx + 1}
                                    </span>
                                    <span className="text-slate-700 text-sm leading-normal">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {!aiSummaryLoading && isTypingComplete && (
                <button
                    onClick={handleRegenerateAISummary}
                    className="bg-transparent border-none text-slate-500 cursor-pointer p-1 hover:text-slate-700"
                    title="Regenerate analysis"
                >
                    <i className="fas fa-sync-alt text-xs" />
                </button>
            )}
        </div>
    </div>
)
/** Tab switcher between Alerts and Operators sections with badge counts. */
const TabHeader = ({ activeTab, setActiveTab, alertCount, accentColor }) => (
    <div className="flex gap-1 border-b-2 border-slate-200 mb-5">
        {[
            { badge: alertCount, icon: 'fa-bell', id: 'alerts', label: 'Alerts' },
            { icon: 'fa-users', id: 'operators', label: 'Operators' }
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="border-none rounded-t-lg text-sm font-semibold px-5 py-2.5 cursor-pointer transition-all"
                style={{
                    background: activeTab === tab.id ? accentColor : 'transparent',
                    color: activeTab === tab.id ? '#fff' : '#64748b'
                }}
            >
                <i className={`fas ${tab.icon} mr-2`} />
                {tab.label}
                {tab.badge > 0 && (
                    <span
                        className="rounded-xl text-white text-[11px] ml-1.5 px-2 py-0.5"
                        style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#dc2626' }}
                    >
                        {tab.badge}
                    </span>
                )}
            </button>
        ))}
    </div>
)
/** Alerts tab content showing unverified, overdue, issue-heavy, and long-term shop assets. */
const AlertsTab = ({
    plantNotifications,
    expandedSections,
    setExpandedSections,
    setEmbeddedView,
    setEmbeddedViewSearch,
    renderAssetButton,
    shopIssue
}) => (
    <div className="flex flex-col gap-4">
        {plantNotifications.unverifiedMixers.length > 0 && (
            <AlertItem
                icon="fa-clipboard-check"
                iconBg="#dc2626"
                count={plantNotifications.unverifiedMixers.length}
                title="Unverified Mixers"
                subtitle="Needs weekly verification"
                items={plantNotifications.unverifiedMixers}
                expandKey="unverifiedMixers"
                expandedSections={expandedSections}
                setExpandedSections={setExpandedSections}
                renderItem={(m, i) => (
                    <AssetButton
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
            <AlertItem
                icon="fa-wrench"
                iconBg="#f59e0b"
                count={plantNotifications.overdueService.length}
                title="Service Overdue"
                subtitle="Last service 6+ months ago"
                items={plantNotifications.overdueService}
                expandKey="overdueService"
                maxItems={4}
                expandedSections={expandedSections}
                setExpandedSections={setExpandedSections}
                renderItem={(a, i) => <span key={i}>{renderAssetButton(a, '#f59e0b')}</span>}
            />
        )}
        {plantNotifications.assetsWithMostIssues.length > 0 && (
            <AlertItem
                icon="fa-exclamation-circle"
                iconBg="#ea580c"
                count={plantNotifications.assetsWithMostIssues.length}
                title="Open Issues"
                subtitle="Assets with unresolved issues"
                items={plantNotifications.assetsWithMostIssues}
                expandKey="assetsWithIssues"
                maxItems={4}
                expandedSections={expandedSections}
                setExpandedSections={setExpandedSections}
                renderItem={(a, i) => (
                    <AssetButton
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
            <AlertItem
                icon="fa-tools"
                iconBg="#be123c"
                count={plantNotifications.longTermShopAssets.length}
                title="Long-Term Shop"
                subtitle="In shop for 6+ days"
                items={plantNotifications.longTermShopAssets}
                expandKey="longTermShop"
                maxItems={4}
                expandedSections={expandedSections}
                setExpandedSections={setExpandedSections}
                renderItem={(a, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            setEmbeddedView(getAssetViewType(a.type))
                            setEmbeddedViewSearch(a.identifier || '')
                        }}
                        className="flex items-center gap-2 bg-slate-50 rounded-lg text-rose-700 text-sm font-medium px-3 py-1.5 cursor-pointer"
                        style={{ border: '1px solid #be123c20' }}
                    >
                        <span>{a.identifier}</span>
                        <span className="text-slate-400 text-xs">({a.daysInShop}d)</span>
                        {a.downInYard && (
                            <span className="bg-red-100 text-red-600 rounded text-[10px] font-semibold px-1.5 py-0.5">
                                In Yard
                            </span>
                        )}
                    </button>
                )}
            />
        )}
        {shopIssue && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-lg flex-shrink-0">
                    <i className="fas fa-exclamation text-white text-base" />
                </div>
                <div>
                    <div className="text-red-800 text-[15px] font-semibold">Fleet Availability Alert</div>
                    <div className="text-red-600 text-sm mt-1">
                        <strong>{shopIssue.inShopCount}</strong> in shop, only <strong>{shopIssue.spareCount}</strong>{' '}
                        spare
                    </div>
                </div>
            </div>
        )}
    </div>
)
/** Operators tab content showing unassigned, pending-start, and in-training operator groups. */
const OperatorsTab = ({ plantNotifications, setEmbeddedView, setEmbeddedViewSearch }) => {
    const { unassignedOperators, pendingOperators, trainingOperators } = plantNotifications
    const hasOperatorAlerts =
        unassignedOperators.length > 0 || pendingOperators.length > 0 || trainingOperators.length > 0
    return (
        <div className="flex flex-col gap-4">
            {unassignedOperators.length > 0 && (
                <OperatorSection
                    iconBg="#0ea5e9"
                    icon="fa-user-slash"
                    title="Unassigned Operators"
                    count={unassignedOperators.length}
                    subtitle="Not assigned to any asset"
                    operators={unassignedOperators}
                    buttonBg="#f0f9ff"
                    buttonBorder="#bae6fd"
                    buttonColor="#0369a1"
                    setEmbeddedView={setEmbeddedView}
                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                />
            )}
            {pendingOperators.length > 0 && (
                <OperatorSection
                    iconBg="#10b981"
                    icon="fa-user-plus"
                    title="Pending Start"
                    count={pendingOperators.length}
                    subtitle="New hires awaiting start"
                    operators={pendingOperators}
                    buttonBg="#ecfdf5"
                    buttonBorder="#a7f3d0"
                    buttonColor="#047857"
                    setEmbeddedView={setEmbeddedView}
                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                    nameField="operatorName"
                />
            )}
            {trainingOperators.length > 0 && (
                <OperatorSection
                    iconBg="#8b5cf6"
                    icon="fa-graduation-cap"
                    title="In Training"
                    count={trainingOperators.length}
                    subtitle="Currently being trained"
                    operators={trainingOperators}
                    buttonBg="#f5f3ff"
                    buttonBorder="#ddd6fe"
                    buttonColor="#6d28d9"
                    setEmbeddedView={setEmbeddedView}
                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                    nameField="operatorName"
                />
            )}
            {!hasOperatorAlerts && (
                <div className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl px-5 py-10 text-center">
                    <i className="fas fa-check-circle text-emerald-500 text-[32px]" />
                    <div className="text-slate-900 text-[15px] font-semibold">All operators assigned</div>
                    <div className="text-slate-500 text-sm">No operators need attention</div>
                </div>
            )}
        </div>
    )
}
export default DashboardPlantSummary
