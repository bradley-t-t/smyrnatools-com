import React, { useEffect, useState } from 'react'

import { useAccentColor } from '../../../app/hooks/useAccentColor'
const GITHUB_URL = 'https://github.com/bradley-t-t'
const TURL_URL = 'https://taylorurl.com'
/**
 * Displays a timeline of application releases parsed from `/changelog.txt`.
 * Optionally overlays AI-generated summaries from `/changelog_ai.txt` when
 * available. Gaps between version numbers are filled with synthetic "patch"
 * entries. Each date group shows as a single collapsible card with a version
 * range that expands to show per-version changes.
 *
 * @param {Function} onBack - Callback to return to the login screen.
 */
function ChangelogView({ onBack }) {
    const [entries, setEntries] = useState([])
    const [loading, setLoading] = useState(true)
    const [aiSummaries, setAiSummaries] = useState({})
    const [expandedVersion, setExpandedVersion] = useState(null)
    const accentColor = useAccentColor()
    useEffect(() => {
        const loadChangelogs = async () => {
            try {
                const [changelogRes, aiRes] = await Promise.all([fetch('/changelog.txt'), fetch('/changelog_ai.txt')])
                const changelogText = await changelogRes.text()
                const parsed = parseMarkdown(changelogText)
                setEntries(parsed)
                if (parsed.length > 0) setExpandedVersion(parsed[0].version)
                if (aiRes.ok) {
                    const aiText = await aiRes.text()
                    setAiSummaries(parseAiSummaries(aiText))
                }
            } catch {
                setEntries([])
            }
            setLoading(false)
        }
        loadChangelogs()
    }, [])
    const parseAiSummaries = (text) => {
        const summaries = {}
        let currentVersion = null
        for (const rawLine of text.split('\n')) {
            const line = rawLine.replace(/\r$/, '')
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
    /**
     * Parses markdown changelog into version entries, then fills numeric gaps
     * between versions with synthetic "Bug fixes and performance improvements" patches.
     */
    const parseMarkdown = (text) => {
        const versions = []
        let currentVersion = null
        for (const rawLine of text.split('\n')) {
            const line = rawLine.replace(/\r$/, '')
            const versionMatch = line.match(/^## \[(.+?)] - (.+)$/)
            if (versionMatch) {
                if (currentVersion) versions.push(currentVersion)
                currentVersion = { changes: [], date: versionMatch[2], version: versionMatch[1] }
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
                        filled.push({
                            changes: ['Bug fixes and performance improvements'],
                            date: versions[i].date,
                            isSkipped: true,
                            version: ver.toFixed(1)
                        })
                        ver -= 0.1
                    }
                }
            }
        }
        return filled
    }
    /** Parses a YYYY-MM-DD date string as a local (not UTC) midnight date. */
    const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number)
        return new Date(year, month - 1, day)
    }
    const formatDate = (dateStr) => {
        try {
            return parseLocalDate(dateStr).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return dateStr
        }
    }
    const getRelativeTime = (dateStr) => {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const date = parseLocalDate(dateStr)
            const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24))
            if (diffDays <= 0) return 'Today'
            if (diffDays === 1) return 'Yesterday'
            if (diffDays < 7) return `${diffDays} days ago`
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
            return formatDate(dateStr)
        } catch {
            return dateStr
        }
    }
    const currentVersion = entries[0]?.version || '-'
    const totalUpdates = entries.filter((e) => !e.isSkipped).length
    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            {/* Header */}
            <div className="shrink-0 px-5 pt-4 pb-5 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-5">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-9 h-9 bg-slate-100 rounded-xl text-slate-600 border-none cursor-pointer hover:bg-slate-200 transition-colors"
                    >
                        <i className="fas fa-arrow-left text-sm" />
                    </button>
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 bg-slate-100 rounded-xl text-slate-600 no-underline hover:bg-slate-200 transition-colors"
                    >
                        <i className="fab fa-github" />
                    </a>
                </div>
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-slate-800 m-0 leading-tight">Release Notes</h1>
                        <p className="text-slate-400 text-[12px] mt-1.5 mb-0">
                            {totalUpdates} releases · updated {getRelativeTime(entries[0]?.date)} · managed by{' '}
                            <a
                                href={TURL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 font-medium no-underline hover:text-slate-700 transition-colors"
                            >
                                TaylorURL.com
                            </a>
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <div
                            className="text-[30px] font-extrabold leading-none tracking-tight"
                            style={{ color: accentColor }}
                        >
                            v{currentVersion}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-slate-400">Latest</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <i className="fas fa-circle-notch fa-spin text-2xl" style={{ color: accentColor }} />
                        <span className="text-slate-400 text-[13px]">Loading releases...</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 pb-4">
                        {entries
                            .filter((e) => !e.isSkipped)
                            .map((entry, idx) => {
                                const isLatest = idx === 0
                                const isExpanded = expandedVersion === entry.version
                                const summary = aiSummaries[entry.version] || null
                                const changes = summary ?? entry.changes
                                const relative = getRelativeTime(entry.date)
                                const formatted = formatDate(entry.date)
                                const showBoth = relative !== formatted
                                return (
                                    <div
                                        key={entry.version}
                                        className={`bg-white rounded-2xl overflow-hidden ${
                                            isLatest ? 'ring-2 shadow-sm' : 'border border-slate-200'
                                        }`}
                                        style={isLatest ? { '--tw-ring-color': accentColor } : undefined}
                                    >
                                        <div
                                            onClick={() => setExpandedVersion(isExpanded ? null : entry.version)}
                                            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                        >
                                            <div
                                                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    isLatest ? '' : 'bg-slate-100'
                                                }`}
                                                style={isLatest ? { backgroundColor: accentColor } : undefined}
                                            >
                                                <i
                                                    className={`fas fa-code-branch text-[13px] ${
                                                        isLatest ? 'text-white' : 'text-slate-400'
                                                    }`}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-[14px] font-bold tabular-nums"
                                                        style={{ color: accentColor }}
                                                    >
                                                        v{entry.version}
                                                    </span>
                                                    {isLatest && (
                                                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                                                            Latest
                                                        </span>
                                                    )}
                                                    {summary && (
                                                        <i className="fas fa-sparkles text-amber-400 text-[9px]" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[11px] text-slate-400">
                                                        {relative}
                                                        {showBoth ? ` · ${formatted}` : ''}
                                                        {' · '}
                                                        {changes.length} change{changes.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <i
                                                className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-300 text-[10px]`}
                                            />
                                        </div>
                                        {isExpanded && (
                                            <div className="border-t border-slate-100 px-4 pt-3 pb-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {changes.map((change, i) => (
                                                        <div key={i} className="flex items-start gap-2.5">
                                                            <div
                                                                className={`shrink-0 w-[18px] h-[18px] rounded-md flex items-center justify-center mt-[2px] ${
                                                                    summary ? 'bg-emerald-50' : 'bg-slate-100'
                                                                }`}
                                                            >
                                                                <i
                                                                    className={`fas fa-check text-[8px] ${
                                                                        summary ? 'text-emerald-500' : 'text-slate-400'
                                                                    }`}
                                                                />
                                                            </div>
                                                            <span className="text-[13px] text-slate-600 leading-relaxed">
                                                                {change}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
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
