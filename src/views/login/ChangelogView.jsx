import React, { useEffect, useState } from 'react'

const GITHUB_URL = 'https://github.com/bradley-t-t'
const TURL_URL = 'https://taylorurl.com'

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

    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        } catch {
            return dateStr
        }
    }

    const getRelativeTime = (dateStr) => {
        try {
            const diffDays = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
            if (diffDays === 0) return 'Today'
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
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
            <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-[10px] text-slate-600 border-none cursor-pointer transition-colors hover:bg-slate-200"
                    >
                        <i className="fas fa-arrow-left text-sm" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold text-slate-900 m-0">Release Notes</h1>
                            <span className="bg-[#1e3a5f] rounded-md text-white text-[11px] font-semibold px-2 py-[3px]">
                                v{currentVersion}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[13px] mt-1 mb-0">
                            {totalUpdates} releases · Updated {getRelativeTime(entries[0]?.date)}
                            <span className="text-slate-400"> · </span>
                            Managed by{' '}
                            <a
                                href={TURL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1e3a5f] font-semibold no-underline hover:underline"
                            >
                                TaylorURL.com
                            </a>
                            {' using the '}
                            <span className="text-[#1e3a5f] font-semibold">TURL Release Management System</span>
                        </p>
                    </div>
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-[10px] text-slate-600 no-underline transition-colors hover:bg-slate-200"
                    >
                        <i className="fab fa-github text-lg" />
                    </a>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <i className="fas fa-circle-notch fa-spin text-[#1e3a5f] text-2xl" />
                        <span className="text-slate-500 text-[13px]">Loading releases...</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {entries.map((entry, idx) => {
                            const summary = aiSummaries[entry.version] || null
                            const isExpanded = expandedVersion === entry.version
                            const isLatest = idx === 0

                            return (
                                <div
                                    key={entry.version}
                                    className={`bg-white rounded-[14px] overflow-hidden transition-shadow ${
                                        isLatest ? 'border-2 border-[#1e3a5f]' : 'border border-slate-200'
                                    }`}
                                >
                                    <div
                                        onClick={() => setExpandedVersion(isExpanded ? null : entry.version)}
                                        className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer"
                                    >
                                        <div
                                            className={`flex items-center justify-center flex-col w-11 h-11 rounded-[10px] ${
                                                entry.isSkipped
                                                    ? 'bg-slate-100'
                                                    : isLatest
                                                      ? 'bg-[#1e3a5f]'
                                                      : 'bg-sky-50'
                                            }`}
                                        >
                                            {entry.isSkipped ? (
                                                <i className="fas fa-wrench text-slate-400 text-sm" />
                                            ) : (
                                                <span
                                                    className={`text-[15px] font-bold ${
                                                        isLatest ? 'text-white' : 'text-[#1e3a5f]'
                                                    }`}
                                                >
                                                    {entry.version}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-800 text-sm font-semibold">
                                                    {entry.isSkipped
                                                        ? `Patch ${entry.version}`
                                                        : `Version ${entry.version}`}
                                                </span>
                                                {isLatest && (
                                                    <span className="bg-green-100 rounded text-green-600 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center text-slate-400 text-xs gap-1.5 mt-0.5">
                                                <i className="fas fa-calendar text-[10px]" />
                                                {formatDate(entry.date)}
                                                {!entry.isSkipped && summary && (
                                                    <>
                                                        <span className="text-slate-200">·</span>
                                                        <i className="fas fa-sparkles text-amber-400 text-[10px]" />
                                                        {summary.length} improvements
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                                                isExpanded ? 'bg-slate-100' : 'bg-transparent'
                                            }`}
                                        >
                                            <i
                                                className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400 text-[11px]`}
                                            />
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="bg-[#fafbfc] border-t border-slate-100 py-4 pr-4 pl-[74px]">
                                            {entry.isSkipped ? (
                                                <div className="flex items-center text-slate-500 text-[13px] gap-2">
                                                    <i className="fas fa-check-circle text-green-500 text-xs" />
                                                    Bug fixes and performance improvements
                                                </div>
                                            ) : summary?.length > 0 ? (
                                                <div className="flex flex-col gap-2.5">
                                                    {summary.map((change, i) => (
                                                        <div key={i} className="flex items-start gap-2.5">
                                                            <div className="flex items-center justify-center shrink-0 w-5 h-5 bg-green-100 rounded-md mt-px">
                                                                <i className="fas fa-check text-green-600 text-[9px]" />
                                                            </div>
                                                            <span className="text-slate-700 text-[13px] leading-normal">
                                                                {change}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    {entry.changes.map((change, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-start text-slate-500 text-xs gap-2.5 leading-normal"
                                                        >
                                                            <span className="shrink-0 w-[5px] h-[5px] bg-slate-300 rounded-full mt-1.5" />
                                                            {change}
                                                        </div>
                                                    ))}
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
