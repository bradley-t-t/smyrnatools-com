import React from 'react'

function Bar({ className = '', style }) {
    return (
        <div className={`rounded animate-pulse ${className}`} style={{ background: 'var(--bg-tertiary)', ...style }} />
    )
}

/** Loading state shown until the account profile + sessions resolve. Mirrors
 *  the header, stat strip, side nav, card stack, and at-a-glance rail of the
 *  real layout so the swap from skeleton to real content doesn't jolt. */
export default function AccountSkeleton() {
    return (
        <div
            className="global-dashboard-container dashboard-container global-flush-top flush-top bg-bg-secondary flex flex-col overflow-hidden absolute"
            style={{ inset: 0 }}
        >
            {/* Slim header */}
            <div className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-bg-primary border-b border-border-light">
                <Bar className="h-6 w-24" />
                <Bar className="h-6 w-40 rounded-md" />
                <div className="flex-1" />
                <Bar className="h-8 w-24 rounded-lg" />
                <Bar className="h-8 w-72 rounded-lg" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6 flex gap-4 h-full">
                    {/* Side nav skeleton */}
                    <div className="hidden lg:flex flex-col gap-1.5 py-5 w-[200px]">
                        <Bar className="h-3 w-16 mb-2" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                                <Bar className="h-3 w-3" />
                                <Bar className="h-3 w-24" />
                            </div>
                        ))}
                    </div>

                    {/* Main */}
                    <div className="flex-1 min-w-0 py-3 sm:py-5 flex flex-col gap-4">
                        {/* Stat strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 rounded overflow-hidden border border-border-light">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div
                                    key={i}
                                    className="px-3 py-2.5 flex flex-col gap-1.5 bg-bg-primary"
                                    style={{ borderRight: i < 6 ? '1px solid var(--border-light)' : 'none' }}
                                >
                                    <Bar className="h-2.5 w-16" />
                                    <Bar className="h-5 w-12" />
                                    <Bar className="h-2.5 w-20" />
                                </div>
                            ))}
                        </div>
                        {/* Cards */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-lg bg-bg-primary border border-border-light">
                                <div className="px-5 py-4 flex items-center gap-3 border-b border-border-light">
                                    <Bar className="h-10 w-10" />
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <Bar className="h-3.5 w-40" />
                                        <Bar className="h-2.5 w-56" />
                                    </div>
                                </div>
                                <div className="px-5 py-5 flex flex-col gap-3">
                                    <Bar className="h-10 w-full" />
                                    <Bar className="h-10 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* At-a-glance rail skeleton */}
                    <div className="hidden xl:block py-5 w-60">
                        <Bar className="h-3 w-20 mb-2 ml-2" />
                        <div className="rounded p-3 flex flex-col gap-2 bg-bg-primary border border-border-light">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div
                                    key={i}
                                    className="flex flex-col gap-1.5 py-2"
                                    style={{ borderBottom: i < 6 ? '1px dashed var(--border-light)' : 'none' }}
                                >
                                    <Bar className="h-2.5 w-14" />
                                    <Bar className="h-3.5 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
