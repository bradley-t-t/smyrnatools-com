/* eslint-disable react/forbid-dom-props */
import React from 'react'

/** Shimmer block — uses `animate-pulse` with motion-reduce safety. The
 *  width and height stay as runtime style props because they vary per
 *  call site (no clean Tailwind utility covers arbitrary px widths
 *  driven by the parent's content shape). */
function Block({ className = '', delay = 0, height, width = '100%' }) {
    return (
        <div
            className={`animate-pulse motion-reduce:animate-none rounded-md bg-bg-tertiary ${className}`}
            style={{
                animationDelay: delay ? `${delay}ms` : undefined,
                animationFillMode: 'both',
                height,
                width
            }}
        />
    )
}

/** Flat panel chrome — title row + bordered body — matches the live layout. */
function PanelChrome({ children, titleWidth = 80, delay = 0 }) {
    return (
        <section className="flex flex-col gap-2">
            <Block delay={delay} height={14} width={titleWidth} />
            <div className="rounded-card p-3 bg-bg-primary border border-border-light">{children}</div>
        </section>
    )
}

/** Flat-table skeleton — header row + N body rows. */
function TableChrome({ delay = 0, columns = 7, rows = 5 }) {
    return (
        <div className="rounded-md overflow-hidden border border-border-light">
            <div
                className="grid px-3 py-2 bg-bg-secondary border-b border-border-light"
                style={{ gridTemplateColumns: `1.5fr repeat(${columns - 1}, 1fr)` }}
            >
                {Array.from({ length: columns }, (_, i) => (
                    <Block key={i} delay={delay + i * 20} height={10} width="50%" />
                ))}
            </div>
            {Array.from({ length: rows }, (_, r) => (
                <div
                    key={r}
                    className={`grid px-3 py-2.5 bg-bg-primary ${r < rows - 1 ? 'border-b border-border-light' : ''}`}
                    style={{ gridTemplateColumns: `1.5fr repeat(${columns - 1}, 1fr)` }}
                >
                    {Array.from({ length: columns }, (_, c) => (
                        <Block key={c} delay={delay + r * 60 + c * 20} height={12} width={c === 0 ? '70%' : '40%'} />
                    ))}
                </div>
            ))}
        </div>
    )
}

/** List skeleton — row with text on left, metric on right. Used for alerts. */
function ListChrome({ rows = 3, delay = 0 }) {
    return (
        <div className="flex flex-col">
            {Array.from({ length: rows }, (_, i) => (
                <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2.5 ${
                        i < rows - 1 ? 'border-b border-border-light' : ''
                    }`}
                >
                    <Block delay={delay + i * 60} height={12} width="60%" />
                    <Block delay={delay + i * 60 + 30} height={12} width={48} />
                </div>
            ))}
        </div>
    )
}

/**
 * Loading placeholder — mirrors the live 3-column dashboard layout.
 * Renders skeletons for: alerts list, KPI strip, fleet table, and
 * the side-by-side operators / managers tables.
 */
export default function DashboardSkeleton({ isMobile }) {
    const kpiColumns = isMobile ? 3 : 6
    return (
        <div
            className="flex flex-col gap-3 sm:gap-5 animate-fade-in-fast"
            aria-busy="true"
            aria-label="Loading dashboard"
        >
            <PanelChrome delay={0} titleWidth={70}>
                <ListChrome delay={40} rows={3} />
            </PanelChrome>

            <PanelChrome delay={120} titleWidth={120}>
                <div className="flex flex-col gap-3">
                    <div
                        className="grid rounded-md overflow-hidden border border-border-light"
                        style={{ gridTemplateColumns: `repeat(${kpiColumns}, minmax(0, 1fr))` }}
                    >
                        {Array.from({ length: kpiColumns }, (_, i) => (
                            <div
                                key={i}
                                className={`flex flex-col gap-1.5 px-3 py-2.5 bg-bg-primary ${
                                    i < kpiColumns - 1 ? 'border-r border-border-light' : ''
                                }`}
                            >
                                <Block delay={140 + i * 30} height={10} width="60%" />
                                <Block delay={180 + i * 30} height={20} width="50%" />
                                <Block delay={220 + i * 30} height={10} width="80%" />
                            </div>
                        ))}
                    </div>
                    <TableChrome columns={4} delay={300} rows={5} />
                </div>
            </PanelChrome>

            <PanelChrome delay={460} titleWidth={64}>
                <TableChrome columns={isMobile ? 4 : 7} delay={500} rows={6} />
            </PanelChrome>

            <PanelChrome delay={680} titleWidth={70}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <Block delay={720} height={10} width={70} />
                        <TableChrome columns={2} delay={740} rows={5} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Block delay={800} height={10} width={70} />
                        <TableChrome columns={2} delay={820} rows={4} />
                    </div>
                </div>
            </PanelChrome>

            <PanelChrome delay={920} titleWidth={80}>
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-4 rounded-md overflow-hidden border border-border-light">
                        {Array.from({ length: 4 }, (_, i) => (
                            <div
                                key={i}
                                className={`flex flex-col gap-1.5 px-3 py-2.5 bg-bg-primary ${
                                    i < 3 ? 'border-r border-border-light' : ''
                                }`}
                            >
                                <Block delay={940 + i * 30} height={10} width="60%" />
                                <Block delay={980 + i * 30} height={20} width="50%" />
                                <Block delay={1020 + i * 30} height={10} width="80%" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <TableChrome columns={2} delay={1080} rows={4} />
                        <TableChrome columns={2} delay={1140} rows={4} />
                    </div>
                </div>
            </PanelChrome>
        </div>
    )
}
