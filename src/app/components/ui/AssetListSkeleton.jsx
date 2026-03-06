import React from 'react'

import { useIsMobile } from '../../hooks/useIsMobile'

const DEFAULT_GRID_COUNT = 8
const DEFAULT_LIST_COUNT = 10
const SKELETON_ROW_WIDTHS = ['60%', '40%', '50%', '70%', '45%']
const MOBILE_DETAIL_ROW_COUNT = 3

/** Single shimmer card matching the CardSection layout (status bar, title, subtitle, detail rows). */
function SkeletonAssetCard({ compact }) {
    const rows = compact ? SKELETON_ROW_WIDTHS.slice(0, MOBILE_DETAIL_ROW_COUNT) : SKELETON_ROW_WIDTHS
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl bg-slate-200 animate-pulse" />
            <div className={compact ? 'p-5' : 'p-8'}>
                <div className={`${compact ? 'mb-4 pb-3' : 'mb-7 pb-[18px]'} border-b-2 border-gray-200`}>
                    <div className={`${compact ? 'h-5' : 'h-6'} w-3/5 rounded bg-slate-200 animate-pulse mb-2`} />
                    <div className={`${compact ? 'h-3.5' : 'h-4'} w-2/5 rounded bg-slate-200 animate-pulse`} />
                </div>
                <div className="flex flex-col gap-1">
                    {rows.map((width, i) => (
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
function SkeletonAssetRow({ columnCount, isEven, compact }) {
    return (
        <tr className={isEven ? 'bg-white' : 'bg-slate-50'}>
            {Array.from({ length: columnCount }, (_, i) => (
                <td key={i} className={`border-b border-gray-200 ${compact ? 'px-2 py-2.5' : 'py-5 px-4'}`}>
                    <div
                        className={`${compact ? 'h-3' : 'h-3.5'} rounded bg-slate-200 animate-pulse`}
                        style={{ minWidth: '40px', width: `${45 + ((i * 17) % 40)}%` }}
                    />
                </td>
            ))}
        </tr>
    )
}

/** Single shimmer task row matching the ListView grouped-item layout. */
function SkeletonTaskRow({ compact }) {
    // Heights derived from real item font sizes × 1.5 line-height:
    //   Mobile title:    0.8125rem (13px) → 20px   Desktop title:    0.9375rem (15px) → 22px
    //   Mobile comments: 0.75rem   (12px) → 18px   Desktop comments: 0.8125rem (13px) → 20px
    //   Mobile metadata: 0.6875rem (11px) → 16px   Desktop metadata: 0.8125rem (13px) → 20px
    const titleH = compact ? '20px' : '22px'
    const subtitleH = compact ? '18px' : '20px'
    const metaH = compact ? '16px' : '20px'
    return (
        <div
            className={`flex border-b border-slate-100 ${compact ? 'items-start gap-3 px-4 py-3' : 'items-center gap-4 px-6 py-4'}`}
        >
            <div className="h-4 w-4 shrink-0 rounded bg-slate-200 animate-pulse" />
            <div className="flex flex-1 flex-col min-w-0" style={{ gap: compact ? '0.375rem' : '0.5rem' }}>
                <div className={`flex ${compact ? 'flex-col gap-[0.375rem]' : 'items-start justify-between gap-4'}`}>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="w-4/5 rounded bg-slate-200 animate-pulse" style={{ height: titleH }} />
                        <div className="w-2/5 rounded bg-slate-200 animate-pulse" style={{ height: subtitleH }} />
                    </div>
                    <div className="w-20 shrink-0 rounded-full bg-slate-200 animate-pulse" style={{ height: '20px' }} />
                </div>
                <div className="flex items-center flex-wrap" style={{ gap: compact ? '0.5rem' : '0.75rem' }}>
                    <div className="w-14 rounded bg-slate-200 animate-pulse" style={{ height: metaH }} />
                    <div className="w-12 rounded bg-slate-200 animate-pulse" style={{ height: metaH }} />
                    <div className="w-16 rounded bg-slate-200 animate-pulse" style={{ height: metaH }} />
                </div>
            </div>
            <div className="h-3.5 w-3 shrink-0 rounded bg-slate-200 animate-pulse" />
        </div>
    )
}

/** Skeleton group card mimicking a status-group section in the task ListView. */
function SkeletonTaskGroup({ rowCount, compact }) {
    return (
        <div className="overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm">
            <div
                className={`flex items-center gap-3 border-b border-gray-200 bg-slate-50 ${compact ? 'px-4 py-3' : 'px-6 py-4'}`}
            >
                <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="h-5 w-6 rounded-full bg-slate-200 animate-pulse" />
            </div>
            {Array.from({ length: rowCount }, (_, i) => (
                <SkeletonTaskRow key={i} compact={compact} />
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
    const isMobile = useIsMobile()
    const rowCounts = [4, 3, 2]
    return (
        <div className="flex flex-col gap-4 sm:gap-5 w-full">
            {Array.from({ length: groupCount }, (_, i) => (
                <SkeletonTaskGroup key={i} rowCount={rowCounts[i % rowCounts.length]} compact={isMobile} />
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
export function ReportsListSkeleton({ rowCount = 25, columnCount = 5 }) {
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
    const isMobile = useIsMobile()

    if (viewMode === 'list') {
        const rowCount = count ?? DEFAULT_LIST_COUNT
        return (
            <div
                className={`${isMobile ? 'mx-1 mt-3' : 'mx-6 mt-[30px]'} mb-6 overflow-x-auto`}
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div
                    className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${isMobile ? 'min-w-[1100px]' : 'w-full'}`}
                >
                    <table className="w-full border-collapse">
                        <tbody>
                            {Array.from({ length: rowCount }, (_, i) => (
                                <SkeletonAssetRow
                                    key={i}
                                    columnCount={columnCount}
                                    isEven={i % 2 === 0}
                                    compact={isMobile}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    const cardCount = count ?? (isMobile ? 4 : DEFAULT_GRID_COUNT)
    return (
        <div
            className="block w-full max-w-[100vw] overflow-auto overflow-x-hidden overscroll-none mb-6"
            style={{ maxHeight: 'calc(100vh - 250px)' }}
        >
            <div
                className={`grid ${isMobile ? 'gap-3 p-3' : 'gap-4 p-4'}`}
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '260px' : '300px'}, 1fr))` }}
            >
                {Array.from({ length: cardCount }, (_, i) => (
                    <div
                        key={i}
                        className="animate-pulse"
                        style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                    >
                        <SkeletonAssetCard compact={isMobile} />
                    </div>
                ))}
            </div>
        </div>
    )
}
