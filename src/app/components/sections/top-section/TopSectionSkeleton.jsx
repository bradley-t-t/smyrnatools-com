import React from 'react'

/** Loading placeholder matching the chrome of the real TopSection so layout
 *  doesn't jump when content swaps in. */
const TopSectionSkeleton = ({ isMobile, customBottomSkeleton }) => (
    <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
            <div className="h-5 w-40 rounded animate-pulse bg-bg-tertiary" />
            <div className="flex items-center gap-2">
                <div className="h-7 w-20 rounded animate-pulse bg-bg-tertiary" />
            </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <div
                className={`${isMobile ? 'flex-1 h-8' : 'h-8 min-w-[220px] max-w-[420px] flex-[0_1_auto]'} rounded animate-pulse bg-bg-tertiary`}
            />
            <div className="flex items-center gap-2 ml-auto">
                <div className="h-7 w-16 rounded animate-pulse bg-bg-tertiary" />
                <div className="h-7 w-28 rounded animate-pulse bg-bg-tertiary" />
                <div className="h-7 w-32 rounded animate-pulse bg-bg-tertiary" />
            </div>
        </div>
        {customBottomSkeleton}
    </div>
)

export default TopSectionSkeleton
