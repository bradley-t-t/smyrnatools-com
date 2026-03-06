import React, { useEffect, useState } from 'react'

const GITHUB_URL = 'https://github.com/bradley-t-t'
const TURL_URL = 'https://taylorurl.com'

/**
 * Displays a timeline of application releases parsed from `/changelog.txt`.
 * Optionally overlays AI-generated summaries from `/changelog_ai.txt` when
 * available. Gaps between version numbers are filled with synthetic "patch"
 * entries. The latest release is auto-expanded on load.
 *
 * @param {Function} onBack - Callback to return to the login screen.
 */
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

        for (const line of text.split('\n')) {
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

        for (const line of text.split('\n')) {
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
            const diffDays = Math.round((today - date) / (1000 * 60 * 60 * 24))
            if (diffDays === 0) return 'Today'
            if (diffDays === 1) return 'Yesterday'
            if (diffDays < 7) return `${diffDays} days ago`
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
            return formatDate(dateStr)
        } catch {
            return dateStr
        }
    }

    /** Groups entries by date, preserving order. */
    const groupEntriesByDate = (entries) => {
        const groups = []
        const map = new Map()
        for (const entry of entries) {
            if (!map.has(entry.date)) {
                const group = { date: entry.date, entries: [] }
                map.set(entry.date, group)
                groups.push(group)
            }
            map.get(entry.date).entries.push(entry)
        }
        return groups
    }

    const currentVersion = entries[0]?.version || '-'
    const totalUpdates = entries.filter((e) => !e.isSkipped).length

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
            {/* Header */}
            <div className="shrink-0 bg-accent px-5 pt-4 pb-5">
                <div className="flex items-center justify-between mb-5">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-9 h-9 bg-white/10 rounded-xl text-white border-none cursor-pointer hover:bg-white/20 transition-colors"
                    >
                        <i className="fas fa-arrow-left text-sm" />
                    </button>
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 bg-white/10 rounded-xl text-white no-underline hover:bg-white/20 transition-colors"
                    >
                        <i className="fab fa-github" />
                    </a>
                </div>
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-white m-0 leading-tight">Release Notes</h1>
                        <p className="text-white/40 text-[12px] mt-1.5 mb-0">
                            {totalUpdates} releases · updated {getRelativeTime(entries[0]?.date)} · managed by{' '}
                            <a
                                href={TURL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/60 font-medium no-underline hover:text-white transition-colors"
                            >
                                TaylorURL.com
                            </a>
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-[30px] font-extrabold text-white leading-none tracking-tight">
                            v{currentVersion}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-white/50">Latest</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <i className="fas fa-circle-notch fa-spin text-accent text-2xl" />
                        <span className="text-slate-400 text-[13px]">Loading releases...</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5 pb-4">
                        {groupEntriesByDate(entries).map((group, groupIdx) => {
                            const realEntries = group.entries.filter((e) => !e.isSkipped)
                            const skippedEntries = group.entries.filter((e) => e.isSkipped)

                            return (
                                <div key={group.date}>
                                    {/* Sticky date header */}
                                    <div className="sticky top-0 z-10 flex items-center gap-2.5 py-2 bg-slate-50">
                                        {(() => {
                                            const relative = getRelativeTime(group.date)
                                            const formatted = formatDate(group.date)
                                            const showBoth = relative !== formatted
                                            return (
                                                <>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                                        {relative}
                                                    </span>
                                                    <div className="flex-1 h-px bg-slate-200" />
                                                    {showBoth && (
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                            {formatted}
                                                        </span>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>

                                    <div className="flex flex-col gap-2 mt-1">
                                        {/* Real release entries */}
                                        {realEntries.map((entry) => {
                                            const isLatest = groupIdx === 0 && realEntries[0] === entry
                                            const summary = aiSummaries[entry.version] || null
                                            const isExpanded = expandedVersion === entry.version
                                            const changeCount = summary ? summary.length : entry.changes.length

                                            return (
                                                <div
                                                    key={entry.version}
                                                    className={`bg-white rounded-2xl overflow-hidden ${
                                                        isLatest
                                                            ? 'ring-2 ring-accent shadow-sm'
                                                            : 'border border-slate-200'
                                                    }`}
                                                >
                                                    <div
                                                        onClick={() =>
                                                            setExpandedVersion(isExpanded ? null : entry.version)
                                                        }
                                                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                                    >
                                                        {/* Version icon */}
                                                        <div
                                                            className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                                                                isLatest ? 'bg-accent' : 'bg-slate-100'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`text-[13px] font-bold tabular-nums ${
                                                                    isLatest ? 'text-white' : 'text-slate-500'
                                                                }`}
                                                            >
                                                                {entry.version}
                                                            </span>
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[14px] font-semibold text-slate-800">
                                                                    Version {entry.version}
                                                                </span>
                                                                {isLatest && (
                                                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                                                                        Latest
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                {summary ? (
                                                                    <>
                                                                        <i className="fas fa-sparkles text-amber-400 text-[9px]" />
                                                                        <span className="text-[11px] text-amber-500">
                                                                            {changeCount} improvements
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-400">
                                                                        {changeCount} change
                                                                        {changeCount !== 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <i
                                                            className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-300 text-[10px]`}
                                                        />
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="border-t border-slate-100 px-4 pt-3 pb-4">
                                                            <div className="flex flex-col gap-2">
                                                                {(summary ?? entry.changes).map((change, i) => (
                                                                    <div key={i} className="flex items-start gap-2.5">
                                                                        <div
                                                                            className={`shrink-0 w-[18px] h-[18px] rounded-md flex items-center justify-center mt-[2px] ${
                                                                                summary
                                                                                    ? 'bg-emerald-50'
                                                                                    : 'bg-slate-100'
                                                                            }`}
                                                                        >
                                                                            <i
                                                                                className={`fas fa-check text-[8px] ${
                                                                                    summary
                                                                                        ? 'text-emerald-500'
                                                                                        : 'text-slate-400'
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

                                        {/* Patch/skipped entries — single compact row */}
                                        {skippedEntries.length > 0 && (
                                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-100/70 rounded-xl border border-slate-200/80">
                                                <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                                    <i className="fas fa-wrench text-slate-400 text-[9px]" />
                                                </div>
                                                <span className="text-[12px] text-slate-500">
                                                    {skippedEntries.length === 1
                                                        ? `Patch ${skippedEntries[0].version}`
                                                        : `${skippedEntries.length} patch releases`}{' '}
                                                    — bug fixes &amp; performance improvements
                                                </span>
                                            </div>
                                        )}
                                    </div>
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
