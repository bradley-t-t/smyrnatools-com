import React from 'react'

import Skeleton from '../../common/Skeleton'

export function TeamMemberSkeleton() {
    return (
        <div className="flex items-center gap-2.5 py-1.5">
            <Skeleton className="h-7 w-7 shrink-0" />
            <div className="flex-1 min-w-0">
                <Skeleton className="h-3 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    )
}

export function IssueRowSkeleton() {
    return (
        <div className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border-light last:border-b-0">
            <Skeleton className="h-7 w-7 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="flex gap-1 shrink-0">
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7" />
            </div>
        </div>
    )
}
