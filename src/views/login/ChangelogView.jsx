import React, { useEffect, useState } from 'react'

function ChangelogView({ onBack }) {
    const [entries, setEntries] = useState([])
    const [loading, setLoading] = useState(true)
    const [aiSummaries, setAiSummaries] = useState({})
    const [expandedVersion, setExpandedVersion] = useState(null)

    useEffect(() => {
        const loadChangelogs = async () => {
            try {
                const [changelogRes, aiRes] = await Promise.all([fetch('/changelog.txt'), fetch('/changelog_ai.txt')])

                const changelogText = await changelogRes.text()
                const parsed = parseMarkdown(changelogText)
                setEntries(parsed)
                if (parsed.length > 0) {
                    setExpandedVersion(parsed[0].version)
                }

                if (aiRes.ok) {
                    const aiText = await aiRes.text()
                    const summaries = parseAiSummaries(aiText)
                    setAiSummaries(summaries)
                }
            } catch {
                setEntries([])
            }
            setLoading(false)
        }
        loadChangelogs()
    }, [])

    const parseAiSummaries = (text) => {
        const lines = text.split('\n')
        const summaries = {}
        let currentVersion = null

        for (const line of lines) {
            const versionMatch = line.match(/^## \[(.+?)]/)
            if (versionMatch) {
                currentVersion = versionMatch[1]
                summaries[currentVersion] = []
            } else if (currentVersion && line.startsWith('- ')) {
                summaries[currentVersion].push(line.substring(2).trim())
            }
        }
        return summaries
    }

    const parseMarkdown = (text) => {
        const lines = text.split('\n')
        const versions = []
        let currentVersion = null

        for (const line of lines) {
            const versionMatch = line.match(/^## \[(.+?)] - (.+)$/)
            if (versionMatch) {
                if (currentVersion) versions.push(currentVersion)
                currentVersion = {
                    changes: [],
                    date: versionMatch[2],
                    version: versionMatch[1]
                }
            } else if (currentVersion && line.startsWith('- ')) {
                currentVersion.changes.push(line.substring(2))
            }
        }
        if (currentVersion) versions.push(currentVersion)

        const filled = []
        for (let i = 0; i < versions.length; i++) {
            filled.push(versions[i])
            if (i < versions.length - 1) {
                const currentVer = parseFloat(versions[i].version)
                const nextVer = parseFloat(versions[i + 1].version)
                if (!isNaN(currentVer) && !isNaN(nextVer)) {
                    let ver = currentVer - 0.1
                    while (ver > nextVer + 0.05) {
                        const skippedVersion = ver.toFixed(1)
                        filled.push({
                            changes: ['Bug fixes and performance improvements'],
                            date: versions[i].date,
                            isSkipped: true,
                            version: skippedVersion
                        })
                        ver -= 0.1
                    }
                }
            }
        }
        return filled
    }

    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        } catch {
            return dateStr
        }
    }

    const getRelativeTime = (dateStr) => {
        try {
            const date = new Date(dateStr)
            const now = new Date()
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
            if (diffDays === 0) return 'Today'
            if (diffDays === 1) return 'Yesterday'
            if (diffDays < 7) return `${diffDays} days ago`
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
            return formatDate(dateStr)
        } catch {
            return dateStr
        }
    }

    const getSummaryForVersion = (version) => {
        return aiSummaries[version] || null
    }

    const currentVersion = entries[0]?.version || '-'
    const totalUpdates = entries.filter((e) => !e.isSkipped).length

    return (
        <div
            style={{
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden'
            }}
        >
            <div
                style={{
                    background: '#fff',
                    borderBottom: '1px solid #e2e8f0',
                    flexShrink: 0,
                    padding: '20px 24px'
                }}
            >
                <div style={{ alignItems: 'center', display: 'flex', gap: 16 }}>
                    <button
                        onClick={onBack}
                        style={{
                            alignItems: 'center',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: 10,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            height: 40,
                            justifyContent: 'center',
                            transition: 'background 0.15s',
                            width: 40
                        }}
                    >
                        <i className="fas fa-arrow-left" style={{ fontSize: 14 }}></i>
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                            <h1 style={{ color: '#0f172a', fontSize: 20, fontWeight: 700, margin: 0 }}>
                                Release Notes
                            </h1>
                            <span
                                style={{
                                    background: '#1e3a5f',
                                    borderRadius: 6,
                                    color: '#fff',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '3px 8px'
                                }}
                            >
                                v{currentVersion}
                            </span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0 0' }}>
                            {totalUpdates} releases · Updated {getRelativeTime(entries[0]?.date)}
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {loading ? (
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            justifyContent: 'center',
                            padding: 64
                        }}
                    >
                        <i className="fas fa-circle-notch fa-spin" style={{ color: '#1e3a5f', fontSize: 24 }}></i>
                        <span style={{ color: '#64748b', fontSize: 13 }}>Loading releases...</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {entries.map((entry, idx) => {
                            const summary = getSummaryForVersion(entry.version)
                            const isExpanded = expandedVersion === entry.version
                            const isLatest = idx === 0

                            return (
                                <div
                                    key={entry.version}
                                    style={{
                                        background: '#fff',
                                        border: isLatest ? '2px solid #1e3a5f' : '1px solid #e2e8f0',
                                        borderRadius: 14,
                                        overflow: 'hidden',
                                        transition: 'box-shadow 0.2s'
                                    }}
                                >
                                    <div
                                        onClick={() => setExpandedVersion(isExpanded ? null : entry.version)}
                                        style={{
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            gap: 14,
                                            padding: '14px 16px'
                                        }}
                                    >
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                background: entry.isSkipped
                                                    ? '#f1f5f9'
                                                    : isLatest
                                                      ? '#1e3a5f'
                                                      : '#f0f9ff',
                                                borderRadius: 10,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: 44,
                                                justifyContent: 'center',
                                                width: 44
                                            }}
                                        >
                                            {entry.isSkipped ? (
                                                <i
                                                    className="fas fa-wrench"
                                                    style={{ color: '#94a3b8', fontSize: 14 }}
                                                ></i>
                                            ) : (
                                                <span
                                                    style={{
                                                        color: isLatest ? '#fff' : '#1e3a5f',
                                                        fontSize: 15,
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {entry.version}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                                                <span style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>
                                                    {entry.isSkipped
                                                        ? `Patch ${entry.version}`
                                                        : `Version ${entry.version}`}
                                                </span>
                                                {isLatest && (
                                                    <span
                                                        style={{
                                                            background: '#dcfce7',
                                                            borderRadius: 4,
                                                            color: '#16a34a',
                                                            fontSize: 9,
                                                            fontWeight: 700,
                                                            letterSpacing: '0.5px',
                                                            padding: '2px 6px',
                                                            textTransform: 'uppercase'
                                                        }}
                                                    >
                                                        Latest
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    color: '#94a3b8',
                                                    display: 'flex',
                                                    fontSize: 12,
                                                    gap: 6,
                                                    marginTop: 2
                                                }}
                                            >
                                                <i className="fas fa-calendar" style={{ fontSize: 10 }}></i>
                                                {formatDate(entry.date)}
                                                {!entry.isSkipped && summary && (
                                                    <>
                                                        <span style={{ color: '#e2e8f0' }}>·</span>
                                                        <i
                                                            className="fas fa-sparkles"
                                                            style={{ color: '#f59e0b', fontSize: 10 }}
                                                        ></i>
                                                        {summary.length} improvements
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                alignItems: 'center',
                                                background: isExpanded ? '#f1f5f9' : 'transparent',
                                                borderRadius: 8,
                                                display: 'flex',
                                                height: 32,
                                                justifyContent: 'center',
                                                transition: 'all 0.15s',
                                                width: 32
                                            }}
                                        >
                                            <i
                                                className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}
                                                style={{ color: '#94a3b8', fontSize: 11 }}
                                            ></i>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div
                                            style={{
                                                background: '#fafbfc',
                                                borderTop: '1px solid #f1f5f9',
                                                padding: '16px 16px 16px 74px'
                                            }}
                                        >
                                            {entry.isSkipped ? (
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        color: '#64748b',
                                                        display: 'flex',
                                                        fontSize: 13,
                                                        gap: 8
                                                    }}
                                                >
                                                    <i
                                                        className="fas fa-check-circle"
                                                        style={{ color: '#22c55e', fontSize: 12 }}
                                                    ></i>
                                                    Bug fixes and performance improvements
                                                </div>
                                            ) : summary && summary.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {summary.map((change, i) => (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                alignItems: 'flex-start',
                                                                display: 'flex',
                                                                gap: 10
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    alignItems: 'center',
                                                                    background: '#dcfce7',
                                                                    borderRadius: 6,
                                                                    display: 'flex',
                                                                    flexShrink: 0,
                                                                    height: 20,
                                                                    justifyContent: 'center',
                                                                    marginTop: 1,
                                                                    width: 20
                                                                }}
                                                            >
                                                                <i
                                                                    className="fas fa-check"
                                                                    style={{ color: '#16a34a', fontSize: 9 }}
                                                                ></i>
                                                            </div>
                                                            <span
                                                                style={{
                                                                    color: '#334155',
                                                                    fontSize: 13,
                                                                    lineHeight: 1.5
                                                                }}
                                                            >
                                                                {change}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {entry.changes.slice(0, 5).map((change, i) => (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                alignItems: 'flex-start',
                                                                color: '#64748b',
                                                                display: 'flex',
                                                                fontSize: 12,
                                                                gap: 10,
                                                                lineHeight: 1.5
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    background: '#cbd5e1',
                                                                    borderRadius: '50%',
                                                                    flexShrink: 0,
                                                                    height: 5,
                                                                    marginTop: 6,
                                                                    width: 5
                                                                }}
                                                            ></span>
                                                            {change.length > 100
                                                                ? change.substring(0, 100) + '...'
                                                                : change}
                                                        </div>
                                                    ))}
                                                    {entry.changes.length > 5 && (
                                                        <span
                                                            style={{ color: '#94a3b8', fontSize: 11, marginLeft: 15 }}
                                                        >
                                                            +{entry.changes.length - 5} more technical changes
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ChangelogView
