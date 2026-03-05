import React from 'react'

const DEFAULT_GRID_COUNT = 8
const DEFAULT_LIST_COUNT = 10
const SKELETON_ROW_WIDTHS = ['60%', '40%', '50%', '70%', '45%']

/** Single shimmer card matching the CardSection layout (status bar, title, subtitle, detail rows). */
function SkeletonAssetCard() {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl bg-slate-200 animate-pulse" />
            <div className="p-8">
                <div className="mb-7 border-b-2 border-gray-200 pb-[18px]">
                    <div className="h-6 w-3/5 rounded bg-slate-200 animate-pulse mb-2" />
                    <div className="h-4 w-2/5 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="flex flex-col gap-1">
                    {SKELETON_ROW_WIDTHS.map((width, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0"
                        >
                            <div className="h-3.5 w-20 rounded bg-slate-200 animate-pulse" />
                            <div className="h-3.5 rounded bg-slate-200 animate-pulse" style={{ width }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/** Single shimmer table row matching the ListViewModeSection row layout. */
function SkeletonAssetRow({ columnCount, isEven }) {
    return (
        <tr className={isEven ? 'bg-white' : 'bg-slate-50'}>
            {Array.from({ length: columnCount }, (_, i) => (
                <td key={i} className="px-5 py-4 border-b border-gray-200">
                    <div
                        className="h-3.5 rounded bg-slate-200 animate-pulse"
                        style={{ width: `${45 + ((i * 17) % 40)}%` }}
                    />
                </td>
            ))}
        </tr>
    )
}

/** Single shimmer task row matching the ListView grouped-item layout. */
function SkeletonTaskRow() {
    return (
        <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4">
            <div className="h-4 w-4 shrink-0 rounded bg-slate-200 animate-pulse" />
            <div className="flex flex-1 flex-col gap-2 min-w-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 flex-col gap-1">
                        <div className="h-4 w-4/5 rounded bg-slate-200 animate-pulse" />
                        <div className="h-3 w-2/5 rounded bg-slate-200 animate-pulse" />
                    </div>
                    <div className="h-5 w-20 shrink-0 rounded-full bg-slate-200 animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-14 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                </div>
            </div>
            <div className="h-3.5 w-3 shrink-0 rounded bg-slate-200 animate-pulse" />
        </div>
    )
}

/** Skeleton group card mimicking a status-group section in the task ListView. */
function SkeletonTaskGroup({ rowCount }) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-200 bg-slate-50 px-6 py-4">
                <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="h-5 w-6 rounded-full bg-slate-200 animate-pulse" />
            </div>
            {Array.from({ length: rowCount }, (_, i) => (
                <SkeletonTaskRow key={i} />
            ))}
        </div>
    )
}

/**
 * Skeleton placeholder for the ListView (task list) while data loads.
 * Renders grouped shimmer cards matching the status-grouped task layout.
 * @param {number} [groupCount=3] - Number of skeleton groups to render.
 */
export function TaskListSkeleton({ groupCount = 3 }) {
    const rowCounts = [4, 3, 2]
    return (
        <div className="flex flex-col gap-5 w-full">
            {Array.from({ length: groupCount }, (_, i) => (
                <SkeletonTaskGroup key={i} rowCount={rowCounts[i % rowCounts.length]} />
            ))}
        </div>
    )
}

/** Single shimmer row matching the report list desktop table layout. */
function SkeletonReportRow({ columnWidths }) {
    return (
        <div className="flex items-center py-3 px-4 lg:px-7 border-b border-slate-100">
            {columnWidths.map((width, i) => (
                <div
                    key={i}
                    className="pr-3"
                    style={{
                        flex: width === 'flex' ? 1 : undefined,
                        flexShrink: width === 'flex' ? undefined : 0,
                        minWidth: 0,
                        width: width !== 'flex' ? width : undefined
                    }}
                >
                    <div
                        className="h-3.5 rounded bg-slate-200 animate-pulse"
                        style={{ width: `${55 + ((i * 19) % 35)}%` }}
                    />
                </div>
            ))}
        </div>
    )
}

/**
 * Skeleton placeholder for report lists (MyReportsList / ReviewReportsList).
 * Mimics the header row + data rows layout with shimmer rectangles.
 * @param {number} [rowCount=6] - Number of skeleton rows to render.
 * @param {number} [columnCount=5] - Number of columns in the header.
 */
export function ReportsListSkeleton({ rowCount = 6, columnCount = 5 }) {
    const columnWidths = Array.from({ length: columnCount }, (_, i) =>
        i < 2 ? 'flex' : i === columnCount - 1 ? '96px' : '112px'
    )
    return (
        <>
            <div className="hidden md:block">
                <div className="flex items-center gap-4 px-4 lg:px-7 py-3 bg-slate-50 border-b border-gray-200">
                    {columnWidths.map((width, i) => (
                        <div
                            key={i}
                            className="pr-3"
                            style={{
                                flex: width === 'flex' ? 1 : undefined,
                                flexShrink: width === 'flex' ? undefined : 0,
                                minWidth: 0,
                                width: width !== 'flex' ? width : undefined
                            }}
                        >
                            <div
                                className="h-3 rounded bg-slate-200 animate-pulse"
                                style={{ width: `${40 + ((i * 15) % 30)}%` }}
                            />
                        </div>
                    ))}
                </div>
                {Array.from({ length: rowCount }, (_, i) => (
                    <SkeletonReportRow key={i} columnWidths={columnWidths} />
                ))}
            </div>
            <div className="md:hidden">
                {Array.from({ length: rowCount }, (_, i) => (
                    <div key={i} className="p-4 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                                    <div className="h-4 w-14 rounded bg-slate-200 animate-pulse" />
                                </div>
                                <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse mb-1" />
                                <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
                            </div>
                            <div className="h-8 w-16 shrink-0 rounded-lg bg-slate-200 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

/**
 * Skeleton placeholder rendered while asset list/grid data is loading.
 * Mimics the grid (CardSection) or list (table row) layout with shimmer rectangles.
 * @param {'grid' | 'list' | null} viewMode - Current view mode; defaults to grid skeleton.
 * @param {number} [count] - Number of skeleton items to render.
 * @param {number} [columnCount=8] - Number of columns for list mode skeleton rows.
 */
export default function AssetListSkeleton({ viewMode, count, columnCount = 8 }) {
    if (viewMode === 'list') {
        const rowCount = count ?? DEFAULT_LIST_COUNT
        return (
            <div className="mx-6 mt-[30px] mb-6 overflow-x-auto">
                <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <table className="w-full border-collapse">
                        <tbody>
                            {Array.from({ length: rowCount }, (_, i) => (
                                <SkeletonAssetRow key={i} columnCount={columnCount} isEven={i % 2 === 0} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    const cardCount = count ?? DEFAULT_GRID_COUNT
    return (
        <div
            className="block w-full max-w-[100vw] overflow-auto overflow-x-hidden overscroll-none mb-6"
            style={{ maxHeight: 'calc(100vh - 250px)' }}
        >
            <div className="grid gap-4 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {Array.from({ length: cardCount }, (_, i) => (
                    <div
                        key={i}
                        className="animate-pulse"
                        style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                    >
                        <SkeletonAssetCard />
                    </div>
                ))}
            </div>
        </div>
    )
}
