import React from 'react'

import { DateUtility } from '../../../utils/DateUtility'
import { CHART_HEIGHT, CHART_PADDING, CHART_WIDTH, MAX_STAR_RATING } from '../../constants/historyConstants'
import HistoryEmptyState from './HistoryEmptyState'
import StatCard from './StatCard'

const USABLE_WIDTH = CHART_WIDTH - CHART_PADDING * 2
const RATING_VALUES = [5, 4, 3, 2, 1]
const STAR = '★'

/**
 * SVG line chart plotting star ratings over time with average / total /
 * current stat cards. Empty-state fallback when `data` is empty.
 */
export default function RatingChart({ data, title, emptyTitle, emptySubtitle }) {
    if (!data?.length) {
        return <HistoryEmptyState title={emptyTitle} subtitle={emptySubtitle} />
    }
    const averageRating = (data.reduce((sum, point) => sum + point.rating, 0) / data.length).toFixed(1)
    const currentRating = data[data.length - 1]?.rating ?? null
    return (
        <div className="flex flex-col gap-3">
            <h3 className="m-0 font-heading text-sm font-bold text-text-primary">{title}</h3>
            <div className="flex gap-3 flex-wrap">
                <StatCard label="Average Rating" value={`${averageRating}${STAR}`} />
                <StatCard label="Total Ratings" value={data.length} />
                <StatCard label="Current Rating" value={`${currentRating}${STAR}`} />
            </div>
            <div className="overflow-x-auto rounded-card p-3 bg-bg-secondary border border-border-light">
                <svg
                    className="w-full min-h-[250px]"
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + CHART_PADDING * 2}`}
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label={`${title} rating chart`}
                >
                    <g transform={`translate(${CHART_PADDING}, ${CHART_PADDING})`}>
                        {RATING_VALUES.map((rating) => {
                            const y = (MAX_STAR_RATING - rating) * (CHART_HEIGHT / MAX_STAR_RATING)
                            return (
                                <g key={rating}>
                                    <line
                                        x1="0"
                                        y1={y}
                                        x2={USABLE_WIDTH}
                                        y2={y}
                                        stroke="var(--border-light)"
                                        strokeWidth="1"
                                        strokeDasharray="4"
                                    />
                                    <text x="-10" y={y + 5} textAnchor="end" fontSize="12" fill="var(--text-secondary)">
                                        {`${rating}${STAR}`}
                                    </text>
                                </g>
                            )
                        })}
                        {data.map((point, index) => {
                            const x = (index / (data.length - 1 || 1)) * USABLE_WIDTH
                            const y = (MAX_STAR_RATING - point.rating) * (CHART_HEIGHT / MAX_STAR_RATING)
                            const nextPoint = data[index + 1]
                            return (
                                <g key={index}>
                                    {nextPoint && (
                                        <line
                                            x1={x}
                                            y1={y}
                                            x2={((index + 1) / (data.length - 1)) * USABLE_WIDTH}
                                            y2={(MAX_STAR_RATING - nextPoint.rating) * (CHART_HEIGHT / MAX_STAR_RATING)}
                                            stroke="var(--accent)"
                                            strokeWidth="2.5"
                                        />
                                    )}
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r="5"
                                        fill="var(--accent)"
                                        stroke="var(--bg-primary)"
                                        strokeWidth="2"
                                    />
                                    <text
                                        x={x}
                                        y={CHART_HEIGHT + 20}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="var(--text-secondary)"
                                        transform={`rotate(-45, ${x}, ${CHART_HEIGHT + 20})`}
                                    >
                                        {DateUtility.formatDate(point.timestamp)}
                                    </text>
                                </g>
                            )
                        })}
                    </g>
                </svg>
            </div>
        </div>
    )
}
