import React from 'react'

import Skeleton, { SkeletonStack } from '../../../../app/components/common/Skeleton'

const SKELETON_ROLE_COUNT = 6

/** Initial-load placeholder shown until role data arrives. */
const RolesLoadingSkeleton = () => (
    <div className="min-h-screen bg-bg-secondary p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <SkeletonStack count={SKELETON_ROLE_COUNT} gapClassName="gap-3">
            {() => (
                <div className="rounded-card border border-border-light bg-bg-primary p-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10" rounded="rounded-md" />
                        <div className="flex-1">
                            <Skeleton className="mb-1.5 h-4 w-40" />
                            <div className="flex gap-1.5">
                                <Skeleton className="h-3.5 w-12" rounded="rounded-md" />
                                <Skeleton className="h-3.5 w-16" rounded="rounded-md" />
                                <Skeleton className="h-3.5 w-20" rounded="rounded-md" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SkeletonStack>
    </div>
)

export default RolesLoadingSkeleton
