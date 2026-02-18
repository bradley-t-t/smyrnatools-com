import React, { useMemo } from 'react'

const computeMyReportsStats = (items) => {
    const total = items.length
    const completed = items.filter((item) => item.completed).length
    const pending = items.filter((item) => !item.completed && item.hasSavedData).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, completionRate, notStarted: total - completed - pending, pending, total }
}

const computeReviewStats = (items, reviewedByCurrentUser) => {
    const total = items.length
    const reviewed = reviewedByCurrentUser?.size ?? 0
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

function ReportsStatsCards({ items, tab, reviewedByCurrentUser }) {
    const stats = useMemo(
        () => (tab === 'all' ? computeMyReportsStats(items) : computeReviewStats(items, reviewedByCurrentUser)),
        [items, tab, reviewedByCurrentUser]
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
            <ProgressPill percent={stats.completionRate} label={`${stats.reviewed}/${stats.total} reviewed`} />
        </div>
    )
}

export default ReportsStatsCards
