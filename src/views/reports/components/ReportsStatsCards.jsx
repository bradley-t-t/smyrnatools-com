import React, { useMemo, useState } from 'react'

const RANGE_OPTIONS = [
    { label: 'Last Week', value: 'week' },
    { days: 30, label: '1 Month', value: 'month' },
    { days: 365, label: '1 Year', value: 'year' }
]

const getLastWeekMondayISO = () => {
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
    const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7)
    const yyyy = lastMonday.getFullYear()
    const mm = String(lastMonday.getMonth() + 1).padStart(2, '0')
    const dd = String(lastMonday.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

const computeMyReportsStats = (items) => {
    const total = items.length
    const completed = items.filter((item) => item.completed).length
    const pending = items.filter((item) => !item.completed && item.hasSavedData).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, completionRate, notStarted: total - completed - pending, pending, total }
}

const computeReviewStats = (items, reviewedByCurrentUser, rangeValue) => {
    let filteredItems

    if (rangeValue === 'week') {
        const lastMondayISO = getLastWeekMondayISO()
        filteredItems = items.filter((item) => {
            if (!item.week) return false
            const itemWeek = String(item.week).slice(0, 10)
            return itemWeek === lastMondayISO
        })
    } else {
        const rangeDays = RANGE_OPTIONS.find((r) => r.value === rangeValue)?.days || 30
        const cutoffDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
        filteredItems = items.filter((item) => {
            const itemDate = new Date(item.week || item.createdAt || item.created_at)
            return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate
        })
    }

    const total = filteredItems.length
    const reviewed = filteredItems.filter((item) => reviewedByCurrentUser?.has(item.id)).length
    const completionRate = total > 0 ? Math.round((reviewed / total) * 100) : 0
    return { completionRate, pending: total - reviewed, reviewed, total }
}

const StatItem = ({ icon, color, bgColor, count, label }) => (
    <div className="flex items-center gap-3">
        <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${bgColor} ${color}`}>
            <i className={`fas ${icon} text-sm`} />
        </div>
        <div>
            <div className="text-xl font-bold text-slate-800 leading-none">{count}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        </div>
    </div>
)

const Divider = () => <div className="w-px h-8 bg-gray-200" />

const ProgressPill = ({ percent, label }) => {
    const color = percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-red-500'
    return (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-slate-800">{percent}%</span>
                <span className="text-xs text-slate-400">{label}</span>
            </div>
        </div>
    )
}

const RangeSelector = ({ value, onChange }) => (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {RANGE_OPTIONS.map((opt) => (
            <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    value === opt.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
)

function ReportsStatsCards({ items, tab, reviewedByCurrentUser }) {
    const [reviewRange, setReviewRange] = useState('week')

    const stats = useMemo(
        () =>
            tab === 'all'
                ? computeMyReportsStats(items)
                : computeReviewStats(items, reviewedByCurrentUser, reviewRange),
        [items, tab, reviewedByCurrentUser, reviewRange]
    )

    if (tab === 'all') {
        return (
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-6 bg-white border border-gray-200 rounded-xl px-5 py-3">
                    <StatItem
                        icon="fa-check-circle"
                        color="text-emerald-600"
                        bgColor="bg-emerald-50"
                        count={stats.completed}
                        label="Completed"
                    />
                    <Divider />
                    <StatItem
                        icon="fa-clock"
                        color="text-amber-600"
                        bgColor="bg-amber-50"
                        count={stats.pending}
                        label="In Progress"
                    />
                    <Divider />
                    <StatItem
                        icon="fa-file-alt"
                        color="text-indigo-600"
                        bgColor="bg-indigo-50"
                        count={stats.notStarted}
                        label="Not Started"
                    />
                </div>
                <ProgressPill percent={stats.completionRate} label={`${stats.completed}/${stats.total} submitted`} />
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-6 bg-white border border-gray-200 rounded-xl px-5 py-3">
                <StatItem
                    icon="fa-check-double"
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                    count={stats.reviewed}
                    label="Reviewed"
                />
                <Divider />
                <StatItem
                    icon="fa-eye"
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                    count={stats.pending}
                    label="Pending"
                />
            </div>
            <div className="flex items-center gap-3">
                <RangeSelector value={reviewRange} onChange={setReviewRange} />
                <ProgressPill percent={stats.completionRate} label={`${stats.reviewed}/${stats.total} reviewed`} />
            </div>
        </div>
    )
}

export default ReportsStatsCards
