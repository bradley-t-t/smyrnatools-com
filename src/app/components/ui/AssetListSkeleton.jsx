/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { useIsMobile } from '../../hooks/useIsMobile'

const DEFAULT_GRID_COUNT = 8
const DEFAULT_LIST_COUNT = 10
const SKELETON_ROW_WIDTHS = ['60%', '40%', '50%', '70%', '45%']
const MOBILE_DETAIL_ROW_COUNT = 3
const STAGGER_MS = 60

function SkeletonAssetCard({ compact }) {
    const rows = compact ? SKELETON_ROW_WIDTHS.slice(0, MOBILE_DETAIL_ROW_COUNT) : SKELETON_ROW_WIDTHS
    return (
        <div className="relative overflow-hidden rounded-card border border-border-light bg-bg-secondary shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-card bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none" />
            <div className={compact ? 'p-5' : 'p-8'}>
                <div className={`${compact ? 'mb-4 pb-3' : 'mb-7 pb-[18px]'} border-b border-border-light`}>
                    <div
                        className={`${compact ? 'h-5' : 'h-6'} w-3/5 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none mb-2`}
                    />
                    <div
                        className={`${compact ? 'h-3.5' : 'h-4'} w-2/5 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none`}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    {rows.map((width, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b border-border-light last:border-b-0"
                        >
                            <div className="h-3.5 w-20 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none" />
                            <div
                                className="h-3.5 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none"
                                style={{ width }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function SkeletonAssetRow({ columnCount, isEven, compact }) {
    return (
        <tr className={isEven ? 'bg-bg-primary' : 'bg-bg-secondary'}>
            {Array.from({ length: columnCount }, (_, index) => (
                <td key={index} className={`border-b border-border-light ${compact ? 'px-2 py-2.5' : 'py-5 px-4'}`}>
                    <div
                        className={`${compact ? 'h-3' : 'h-3.5'} rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none`}
                        style={{ minWidth: '40px', width: `${45 + ((index * 17) % 40)}%` }}
                    />
                </td>
            ))}
        </tr>
    )
}

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
            className={`flex border-b border-border-light last:border-b-0 ${compact ? 'items-start gap-3 px-4 py-3' : 'items-center gap-4 px-6 py-4'}`}
        >
            <div className="h-4 w-4 shrink-0 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none" />
            <div className="flex flex-1 flex-col min-w-0" style={{ gap: compact ? '0.375rem' : '0.5rem' }}>
                <div className={`flex ${compact ? 'flex-col gap-[0.375rem]' : 'items-start justify-between gap-4'}`}>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div
                            className="w-4/5 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none"
                            style={{ height: titleH }}
                        />
                        <div
                            className="w-2/5 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none"
                            style={{ height: subtitleH }}
                        />
                    </div>
                    <div className="w-20 shrink-0 rounded-full bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none h-5" />
                </div>
                <div className="flex items-center flex-wrap" style={{ gap: compact ? '0.5rem' : '0.75rem' }}>
                    <div
                        className="w-14 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none"
                        style={{ height: metaH }}
                    />
                    <div
                        className="w-12 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none"
                        style={{ height: metaH }}
                    />
                    <div
                        className="w-16 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none"
                        style={{ height: metaH }}
                    />
                </div>
            </div>
            <div className="h-3.5 w-3 shrink-0 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none" />
        </div>
    )
}

/** Skeleton group card mimicking a status-group section in the task ListView. */
function SkeletonTaskGroup({ rowCount, compact }) {
    return (
        <div className="overflow-hidden rounded-card border border-border-light bg-bg-secondary shadow-sm">
            <div
                className={`flex items-center gap-3 border-b border-border-light bg-bg-tertiary ${compact ? 'px-4 py-3' : 'px-6 py-4'}`}
            >
                <div className="h-4 w-4 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none" />
                <div className="h-4 w-24 rounded-md bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none" />
                <div className="h-5 w-6 rounded-full bg-bg-tertiary animate-pulse-slow motion-reduce:animate-none" />
            </div>
            {Array.from({ length: rowCount }, (_, index) => (
                <SkeletonTaskRow key={index} compact={compact} />
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
        <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-4 sm:gap-5 w-full">
            <span className="sr-only">Loading tasks…</span>
            {Array.from({ length: groupCount }, (_, index) => (
                <SkeletonTaskGroup key={index} rowCount={rowCounts[index % rowCounts.length]} compact={isMobile} />
            ))}
        </div>
    )
}

/** Skeleton for the asset list/grid views. Mirrors CardSection (grid) or table rows (list). */
export default function AssetListSkeleton({ viewMode, count, columnCount = 8 }) {
    const isMobile = useIsMobile()
    if (viewMode === 'list') {
        const rowCount = count ?? DEFAULT_LIST_COUNT
        return (
            <div
                role="status"
                aria-live="polite"
                aria-busy="true"
                className={`${isMobile ? 'mx-1 mt-3' : 'mx-6 mt-[30px]'} mb-6 overflow-x-auto`}
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <span className="sr-only">Loading…</span>
                <div
                    className={`overflow-hidden rounded-card border border-border-light bg-bg-primary ${isMobile ? 'min-w-[1100px]' : 'w-full'}`}
                >
                    <table className="w-full border-collapse">
                        <tbody>
                            {Array.from({ length: rowCount }, (_, index) => (
                                <SkeletonAssetRow
                                    key={index}
                                    columnCount={columnCount}
                                    isEven={index % 2 === 0}
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
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="block w-full max-w-[100vw] overflow-auto overflow-x-hidden overscroll-none mb-6"
            style={{ maxHeight: 'calc(100vh - 250px)' }}
        >
            <span className="sr-only">Loading…</span>
            <div
                className={`grid ${isMobile ? 'gap-3 p-3' : 'gap-4 p-4'}`}
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '260px' : '300px'}, 1fr))` }}
            >
                {Array.from({ length: cardCount }, (_, index) => (
                    <div key={index} style={{ animationDelay: `${index * STAGGER_MS}ms`, animationFillMode: 'both' }}>
                        <SkeletonAssetCard compact={isMobile} />
                    </div>
                ))}
            </div>
        </div>
    )
}
