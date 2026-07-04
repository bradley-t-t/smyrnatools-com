import React from 'react'

import Skeleton, { SkeletonStack } from '../common/Skeleton'

/** Skeleton placeholder matching either grid or list view. */
function PlantsLoadingState({ viewMode }) {
    if (viewMode === 'grid') {
        return (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                <SkeletonStack count={8} gapClassName="hidden">
                    {() => (
                        <div className="rounded-card border border-border-light bg-bg-primary p-5">
                            <div className="mb-4 flex items-center gap-3">
                                <Skeleton className="h-10 w-10" rounded="rounded-md" />
                                <div className="flex-1">
                                    <Skeleton className="mb-1.5 h-4 w-20" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                                <Skeleton className="h-6 w-24" rounded="rounded-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Skeleton className="h-10" />
                                <Skeleton className="h-10" />
                            </div>
                        </div>
                    )}
                </SkeletonStack>
            </div>
        )
    }
    return (
        <div className="overflow-hidden rounded-card border border-border-light bg-bg-primary">
            <SkeletonStack count={8} gapClassName="gap-0">
                {() => (
                    <div className="flex items-center gap-4 border-b border-border-light px-5 py-4 last:border-b-0">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-20" rounded="rounded-full" />
                        <Skeleton className="h-5 w-24" rounded="rounded-full" />
                    </div>
                )}
            </SkeletonStack>
        </div>
    )
}

export default PlantsLoadingState
