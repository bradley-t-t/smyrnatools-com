import React, { memo, useState } from 'react'

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
    const [activeTab, setActiveTab] = useState('alerts')
    const [isMinimized, setIsMinimized] = useState(false)

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

    const AlertItem = ({ icon, iconBg, count, title, subtitle, items, expandKey, renderItem, maxItems = 5 }) => {
        const isExpanded = expandedSections[expandKey]
        const displayItems = isExpanded ? items : items.slice(0, maxItems)
        const hasMore = items.length > maxItems

        return (
            <div
                style={{
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        alignItems: 'center',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: '12px',
                        padding: '14px 16px'
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            background: iconBg,
                            borderRadius: '10px',
                            display: 'flex',
                            flexShrink: 0,
                            height: '40px',
                            justifyContent: 'center',
                            width: '40px'
                        }}
                    >
                        <i className={`fas ${icon}`} style={{ color: '#fff', fontSize: '16px' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                            <span style={{ color: '#1e293b', fontSize: '15px', fontWeight: 600 }}>{title}</span>
                            <span
                                style={{
                                    background: iconBg,
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '2px 8px'
                                }}
                            >
                                {count}
                            </span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{subtitle}</div>
                    </div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {displayItems.map((item, i) => renderItem(item, i))}
                        {hasMore && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedSections((prev) => ({ ...prev, [expandKey]: !isExpanded }))
                                }}
                                style={{
                                    background: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '8px',
                                    color: '#0369a1',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    padding: '6px 12px'
                                }}
                            >
                                {isExpanded ? 'Show less' : `+${items.length - maxItems} more`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const AssetButton = ({ label, onClick, color }) => (
        <button
            onClick={onClick}
            style={{
                background: '#f8fafc',
                border: `1px solid ${color}20`,
                borderRadius: '8px',
                color: color,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                padding: '6px 12px',
                transition: 'all 0.15s'
            }}
        >
            {label}
        </button>
    )

    const MetricCard = ({ label, value, color, icon }) => (
        <div
            style={{
                alignItems: 'center',
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                flex: isMobile ? '1 1 45%' : '1 1 auto',
                flexDirection: 'column',
                gap: '4px',
                minWidth: isMobile ? '120px' : '100px',
                padding: isMobile ? '14px 10px' : '16px 20px'
            }}
        >
            {icon && (
                <i
                    className={`fas ${icon}`}
                    style={{ color: color || '#64748b', fontSize: '14px', marginBottom: '4px' }}
                ></i>
            )}
            <div
                style={{
                    color: color || '#1e3a5f',
                    fontSize: isMobile ? '22px' : '26px',
                    fontWeight: 700,
                    lineHeight: 1
                }}
            >
                {value}
            </div>
            <div
                style={{
                    color: '#64748b',
                    fontSize: '11px',
                    fontWeight: 500,
                    textAlign: 'center',
                    textTransform: 'uppercase'
                }}
            >
                {label}
            </div>
        </div>
    )

    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                marginBottom: '24px',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
            }}
        >
            <div
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: isMobile ? '12px' : '24px',
                    justifyContent: 'space-between',
                    padding: isMobile ? '16px' : '20px 28px'
                }}
            >
                <div style={{ alignItems: 'center', display: 'flex', flex: 1, gap: '16px' }}>
                    <div
                        style={{
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: '12px',
                            display: 'flex',
                            height: isMinimized ? '44px' : '52px',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            width: isMinimized ? '44px' : '52px'
                        }}
                    >
                        <i
                            className="fas fa-building"
                            style={{
                                color: '#fff',
                                fontSize: isMinimized ? '18px' : '22px',
                                transition: 'all 0.3s ease'
                            }}
                        ></i>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ color: '#fff', fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: 0 }}>
                            Plant {dashboardPlant || 'Summary'}
                        </h2>
                        {!isMinimized && (
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                {alertCount > 0 ? `${alertCount} items need attention` : 'All systems operational'}
                            </p>
                        )}
                    </div>
                    {isMinimized && alertCount > 0 && (
                        <div
                            style={{
                                alignItems: 'center',
                                background: '#dc2626',
                                borderRadius: '12px',
                                color: '#fff',
                                display: 'flex',
                                fontSize: '13px',
                                fontWeight: 600,
                                gap: '6px',
                                padding: '6px 12px'
                            }}
                        >
                            <i className="fas fa-bell"></i>
                            {alertCount}
                        </div>
                    )}
                    {isMinimized && plantNotifications.leaderboardMetrics && (
                        <div
                            style={{
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                                color: '#fff',
                                display: 'flex',
                                fontSize: '14px',
                                fontWeight: 600,
                                padding: '6px 12px'
                            }}
                        >
                            #{plantNotifications.leaderboardMetrics.rank}
                        </div>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsMinimized(!isMinimized)
                    }}
                    style={{
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        height: '36px',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        width: '36px'
                    }}
                    title={isMinimized ? 'Expand' : 'Collapse'}
                >
                    <i className={`fas fa-chevron-${isMinimized ? 'down' : 'up'}`} style={{ fontSize: '14px' }}></i>
                </button>
            </div>

            {!isMinimized && (
                <>
                    {plantNotifications.leaderboardMetrics && (
                        <div
                            style={{
                                background: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '12px',
                                justifyContent: 'center',
                                padding: isMobile ? '16px' : '20px 28px'
                            }}
                        >
                            <MetricCard
                                label="Raw YPH"
                                value={plantNotifications.leaderboardMetrics.rawYPH?.toFixed(2) || '--'}
                                icon="fa-chart-line"
                            />
                            <MetricCard
                                label="Adjusted YPH"
                                value={plantNotifications.leaderboardMetrics.adjustedYPH?.toFixed(2) || '--'}
                                icon="fa-calculator"
                            />
                            <MetricCard
                                label="Net Help"
                                value={`${plantNotifications.leaderboardMetrics.netHelp > 0 ? '+' : ''}${Math.round(plantNotifications.leaderboardMetrics.netHelp || 0)}h`}
                                color={
                                    plantNotifications.leaderboardMetrics.netHelp > 0
                                        ? '#16a34a'
                                        : plantNotifications.leaderboardMetrics.netHelp < 0
                                          ? '#dc2626'
                                          : '#64748b'
                                }
                                icon="fa-hands-helping"
                            />
                            <MetricCard
                                label="Cleanliness"
                                value={plantNotifications.leaderboardMetrics.avgCleanliness?.toFixed(1) || '--'}
                                color={
                                    (plantNotifications.leaderboardMetrics.avgCleanliness || 0) >= 4
                                        ? '#16a34a'
                                        : (plantNotifications.leaderboardMetrics.avgCleanliness || 0) >= 3
                                          ? '#f59e0b'
                                          : '#dc2626'
                                }
                                icon="fa-broom"
                            />
                            <MetricCard
                                label="Safety"
                                value={plantNotifications.leaderboardMetrics.safetyIncidents || 0}
                                color={
                                    (plantNotifications.leaderboardMetrics.safetyIncidents || 0) === 0
                                        ? '#16a34a'
                                        : '#dc2626'
                                }
                                icon="fa-hard-hat"
                            />
                        </div>
                    )}

                    {(plantNotifications.aiSummary ||
                        plantNotifications.aiSummaryLoading ||
                        plantNotifications.aiSummaryFailed) && (
                        <div
                            style={{
                                background: '#fff',
                                borderBottom: '1px solid #e2e8f0',
                                padding: isMobile ? '16px' : '20px 28px'
                            }}
                        >
                            <div
                                style={{
                                    alignItems: 'flex-start',
                                    background: plantNotifications.aiSummaryFailed ? '#fef2f2' : '#f0f9ff',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    gap: '12px',
                                    padding: '16px'
                                }}
                            >
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: plantNotifications.aiSummaryFailed ? '#fee2e2' : '#e0f2fe',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        flexShrink: 0,
                                        height: '36px',
                                        justifyContent: 'center',
                                        width: '36px'
                                    }}
                                >
                                    <i
                                        className={`fas ${plantNotifications.aiSummaryLoading ? 'fa-circle-notch fa-spin' : plantNotifications.aiSummaryFailed ? 'fa-exclamation-triangle' : 'fa-robot'}`}
                                        style={{
                                            color: plantNotifications.aiSummaryFailed ? '#dc2626' : '#0284c7',
                                            fontSize: '14px'
                                        }}
                                    ></i>
                                </div>
                                <div style={{ flex: 1 }}>
                                    {userRoleName && !plantNotifications.aiSummaryLoading && (
                                        <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '6px' }}>
                                            <i className="fas fa-user-check" style={{ marginRight: '4px' }}></i>
                                            Analysis for <strong>{userRoleName}</strong>
                                            {userPlantCode && isPlantManager && userPlantCode === dashboardPlant
                                                ? ' (your plant)'
                                                : ''}
                                        </div>
                                    )}
                                    <p
                                        style={{
                                            color: plantNotifications.aiSummaryFailed ? '#dc2626' : '#334155',
                                            fontSize: '14px',
                                            lineHeight: 1.6,
                                            margin: 0
                                        }}
                                    >
                                        {plantNotifications.aiSummaryLoading
                                            ? 'Analyzing plant performance...'
                                            : plantNotifications.aiSummaryFailed
                                              ? 'Failed to generate analysis'
                                              : aiDisplayText}
                                    </p>
                                    {showActionPlan && aiActionPlan.length > 0 && (
                                        <div
                                            style={{
                                                borderTop: '1px solid #e2e8f0',
                                                marginTop: '12px',
                                                paddingTop: '12px'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    color: '#475569',
                                                    display: 'flex',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    gap: '6px',
                                                    marginBottom: '10px',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                <i className="fas fa-tasks"></i>
                                                Action Plan
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {aiActionPlan.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            alignItems: 'flex-start',
                                                            display: 'flex',
                                                            gap: '10px'
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                alignItems: 'center',
                                                                background: '#1e3a5f',
                                                                borderRadius: '50%',
                                                                color: '#fff',
                                                                display: 'flex',
                                                                flexShrink: 0,
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                height: '20px',
                                                                justifyContent: 'center',
                                                                width: '20px'
                                                            }}
                                                        >
                                                            {idx + 1}
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: '#334155',
                                                                fontSize: '13px',
                                                                lineHeight: 1.5
                                                            }}
                                                        >
                                                            {item}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!plantNotifications.aiSummaryLoading && isTypingComplete && (
                                    <button
                                        onClick={handleRegenerateAISummary}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}
                                        title="Regenerate analysis"
                                    >
                                        <i className="fas fa-sync-alt" style={{ fontSize: '12px' }}></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {hasNotifications && (
                        <div style={{ padding: isMobile ? '16px' : '20px 28px' }}>
                            <div
                                style={{
                                    borderBottom: '2px solid #e2e8f0',
                                    display: 'flex',
                                    gap: '4px',
                                    marginBottom: '20px'
                                }}
                            >
                                <button
                                    onClick={() => setActiveTab('alerts')}
                                    style={{
                                        background: activeTab === 'alerts' ? '#1e3a5f' : 'transparent',
                                        border: 'none',
                                        borderRadius: '8px 8px 0 0',
                                        color: activeTab === 'alerts' ? '#fff' : '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        padding: '10px 20px',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <i className="fas fa-bell" style={{ marginRight: '8px' }}></i>
                                    Alerts{' '}
                                    {alertCount > 0 && (
                                        <span
                                            style={{
                                                background:
                                                    activeTab === 'alerts' ? 'rgba(255,255,255,0.2)' : '#dc2626',
                                                borderRadius: '10px',
                                                color: '#fff',
                                                fontSize: '11px',
                                                marginLeft: '6px',
                                                padding: '2px 8px'
                                            }}
                                        >
                                            {alertCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('operators')}
                                    style={{
                                        background: activeTab === 'operators' ? '#1e3a5f' : 'transparent',
                                        border: 'none',
                                        borderRadius: '8px 8px 0 0',
                                        color: activeTab === 'operators' ? '#fff' : '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        padding: '10px 20px',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
                                    Operators
                                </button>
                            </div>

                            {activeTab === 'alerts' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {plantNotifications.unverifiedMixers.length > 0 && (
                                        <AlertItem
                                            icon="fa-clipboard-check"
                                            iconBg="#dc2626"
                                            count={plantNotifications.unverifiedMixers.length}
                                            title="Unverified Mixers"
                                            subtitle="Needs weekly verification"
                                            items={plantNotifications.unverifiedMixers}
                                            expandKey="unverifiedMixers"
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
                                            renderItem={(a, i) => (
                                                <AssetButton
                                                    key={i}
                                                    label={`${a.type} ${a.identifier || ''}`}
                                                    color="#f59e0b"
                                                    onClick={() => {
                                                        setEmbeddedView(
                                                            a.type === 'Mixer'
                                                                ? 'mixers'
                                                                : a.type === 'Tractor'
                                                                  ? 'tractors'
                                                                  : a.type === 'Trailer'
                                                                    ? 'trailers'
                                                                    : 'equipment'
                                                        )
                                                        setEmbeddedViewSearch(a.identifier || '')
                                                    }}
                                                />
                                            )}
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
                                            renderItem={(a, i) => (
                                                <AssetButton
                                                    key={i}
                                                    label={`${a.type} ${a.identifier || ''} (${a.openIssueCount})`}
                                                    color="#ea580c"
                                                    onClick={() => {
                                                        setEmbeddedView(
                                                            a.type === 'Mixer'
                                                                ? 'mixers'
                                                                : a.type === 'Tractor'
                                                                  ? 'tractors'
                                                                  : a.type === 'Trailer'
                                                                    ? 'trailers'
                                                                    : 'equipment'
                                                        )
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
                                            renderItem={(a, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setEmbeddedView(
                                                            a.type === 'Mixer'
                                                                ? 'mixers'
                                                                : a.type === 'Tractor'
                                                                  ? 'tractors'
                                                                  : a.type === 'Trailer'
                                                                    ? 'trailers'
                                                                    : 'equipment'
                                                        )
                                                        setEmbeddedViewSearch(a.identifier || '')
                                                    }}
                                                    style={{
                                                        alignItems: 'center',
                                                        background: '#f8fafc',
                                                        border: '1px solid #be123c20',
                                                        borderRadius: '8px',
                                                        color: '#be123c',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        gap: '8px',
                                                        padding: '6px 12px'
                                                    }}
                                                >
                                                    <span>{a.identifier}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                                        ({a.daysInShop}d)
                                                    </span>
                                                    {a.downInYard && (
                                                        <span
                                                            style={{
                                                                background: '#fee2e2',
                                                                borderRadius: '4px',
                                                                color: '#dc2626',
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                padding: '2px 6px'
                                                            }}
                                                        >
                                                            In Yard
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        />
                                    )}
                                    {plantNotifications.shopIssue && (
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                gap: '12px',
                                                padding: '16px'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    background: '#dc2626',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    flexShrink: 0,
                                                    height: '40px',
                                                    justifyContent: 'center',
                                                    width: '40px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-exclamation"
                                                    style={{ color: '#fff', fontSize: '16px' }}
                                                ></i>
                                            </div>
                                            <div>
                                                <div style={{ color: '#991b1b', fontSize: '15px', fontWeight: 600 }}>
                                                    Fleet Availability Alert
                                                </div>
                                                <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px' }}>
                                                    <strong>{plantNotifications.shopIssue.inShopCount}</strong> in shop,
                                                    only <strong>{plantNotifications.shopIssue.spareCount}</strong>{' '}
                                                    spare
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'operators' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {plantNotifications.unassignedOperators.length > 0 && (
                                        <div
                                            style={{
                                                background: '#fff',
                                                borderRadius: '12px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    gap: '12px',
                                                    padding: '14px 16px'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        background: '#0ea5e9',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        height: '40px',
                                                        justifyContent: 'center',
                                                        width: '40px'
                                                    }}
                                                >
                                                    <i
                                                        className="fas fa-user-slash"
                                                        style={{ color: '#fff', fontSize: '16px' }}
                                                    ></i>
                                                </div>
                                                <div>
                                                    <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                                                        <span
                                                            style={{
                                                                color: '#1e293b',
                                                                fontSize: '15px',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            Unassigned Operators
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: '#0ea5e9',
                                                                borderRadius: '12px',
                                                                color: '#fff',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                padding: '2px 8px'
                                                            }}
                                                        >
                                                            {plantNotifications.unassignedOperators.length}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}
                                                    >
                                                        Not assigned to any asset
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '8px',
                                                    padding: '12px 16px'
                                                }}
                                            >
                                                {plantNotifications.unassignedOperators.map((o, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setEmbeddedView('operators')
                                                            setEmbeddedViewSearch(o.name || '')
                                                        }}
                                                        style={{
                                                            background: '#f0f9ff',
                                                            border: '1px solid #bae6fd',
                                                            borderRadius: '8px',
                                                            color: '#0369a1',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: 500,
                                                            padding: '6px 12px'
                                                        }}
                                                    >
                                                        {o.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {plantNotifications.pendingOperators.length > 0 && (
                                        <div
                                            style={{
                                                background: '#fff',
                                                borderRadius: '12px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    gap: '12px',
                                                    padding: '14px 16px'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        background: '#10b981',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        height: '40px',
                                                        justifyContent: 'center',
                                                        width: '40px'
                                                    }}
                                                >
                                                    <i
                                                        className="fas fa-user-plus"
                                                        style={{ color: '#fff', fontSize: '16px' }}
                                                    ></i>
                                                </div>
                                                <div>
                                                    <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                                                        <span
                                                            style={{
                                                                color: '#1e293b',
                                                                fontSize: '15px',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            Pending Start
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: '#10b981',
                                                                borderRadius: '12px',
                                                                color: '#fff',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                padding: '2px 8px'
                                                            }}
                                                        >
                                                            {plantNotifications.pendingOperators.length}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}
                                                    >
                                                        New hires awaiting start
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '8px',
                                                    padding: '12px 16px'
                                                }}
                                            >
                                                {plantNotifications.pendingOperators.map((o, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setEmbeddedView('operators')
                                                            setEmbeddedViewSearch(o.operatorName || '')
                                                        }}
                                                        style={{
                                                            background: '#ecfdf5',
                                                            border: '1px solid #a7f3d0',
                                                            borderRadius: '8px',
                                                            color: '#047857',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: 500,
                                                            padding: '6px 12px'
                                                        }}
                                                    >
                                                        {o.operatorName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {plantNotifications.trainingOperators.length > 0 && (
                                        <div
                                            style={{
                                                background: '#fff',
                                                borderRadius: '12px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    gap: '12px',
                                                    padding: '14px 16px'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        background: '#8b5cf6',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        height: '40px',
                                                        justifyContent: 'center',
                                                        width: '40px'
                                                    }}
                                                >
                                                    <i
                                                        className="fas fa-graduation-cap"
                                                        style={{ color: '#fff', fontSize: '16px' }}
                                                    ></i>
                                                </div>
                                                <div>
                                                    <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                                                        <span
                                                            style={{
                                                                color: '#1e293b',
                                                                fontSize: '15px',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            In Training
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: '#8b5cf6',
                                                                borderRadius: '12px',
                                                                color: '#fff',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                padding: '2px 8px'
                                                            }}
                                                        >
                                                            {plantNotifications.trainingOperators.length}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}
                                                    >
                                                        Currently being trained
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '8px',
                                                    padding: '12px 16px'
                                                }}
                                            >
                                                {plantNotifications.trainingOperators.map((o, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setEmbeddedView('operators')
                                                            setEmbeddedViewSearch(o.operatorName || '')
                                                        }}
                                                        style={{
                                                            background: '#f5f3ff',
                                                            border: '1px solid #ddd6fe',
                                                            borderRadius: '8px',
                                                            color: '#6d28d9',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: 500,
                                                            padding: '6px 12px'
                                                        }}
                                                    >
                                                        {o.operatorName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {plantNotifications.unassignedOperators.length === 0 &&
                                        plantNotifications.pendingOperators.length === 0 &&
                                        plantNotifications.trainingOperators.length === 0 && (
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    background: '#f8fafc',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    padding: '40px 20px',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-check-circle"
                                                    style={{ color: '#10b981', fontSize: '32px' }}
                                                ></i>
                                                <div style={{ color: '#1e293b', fontSize: '15px', fontWeight: 600 }}>
                                                    All operators assigned
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '13px' }}>
                                                    No operators need attention
                                                </div>
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
})

export default DashboardPlantSummary
