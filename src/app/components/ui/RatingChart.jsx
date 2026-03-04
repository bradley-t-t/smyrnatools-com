import React from 'react'

import { FormatUtility } from '../../../utils/FormatUtility'
import { CHART_HEIGHT, CHART_PADDING, CHART_WIDTH, MAX_STAR_RATING } from '../../constants/historyConstants'
import HistoryEmptyState from './HistoryEmptyState'
import StatCard from './StatCard'

const USABLE_WIDTH = CHART_WIDTH - CHART_PADDING * 2
const RATING_VALUES = [5, 4, 3, 2, 1]

/**
 * SVG line chart plotting star ratings over time with stat summary cards.
 * Shows average, total, and current rating. Falls back to an empty state when no data.
 * @param {Object} props
 * @param {Array<{rating: number, timestamp: string}>} props.data - Rating data points.
 * @param {string} props.title - Chart heading.
 * @param {string} props.emptyTitle - Empty state title.
 * @param {string} props.emptySubtitle - Empty state subtitle.
 */
export default function RatingChart({ data, title, emptyTitle, emptySubtitle }) {
    if (data.length === 0) {
        return <HistoryEmptyState title={emptyTitle} subtitle={emptySubtitle} />
    }

    const averageRating = (data.reduce((sum, d) => sum + d.rating, 0) / data.length).toFixed(1)
    const currentRating = data[data.length - 1].rating

    return (
        <div className="flex flex-col gap-2.5">
            <h3 className="m-0 mb-3 text-sm font-bold text-slate-800">{title}</h3>
            <div className="flex gap-4 mb-4 flex-wrap">
                <StatCard label="Average Rating" value={`${averageRating}\u2605`} />
                <StatCard label="Total Ratings" value={data.length} />
                <StatCard label="Current Rating" value={`${currentRating}\u2605`} />
            </div>
            <div className="overflow-x-auto my-3 bg-slate-50 rounded-md p-3 border border-gray-200">
                <svg
                    className="w-full min-h-[250px]"
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + CHART_PADDING * 2}`}
                    preserveAspectRatio="xMidYMid meet"
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
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                        strokeDasharray="4"
                                    />
                                    <text x="-10" y={y + 5} textAnchor="end" fontSize="12" fill="#64748b">
                                        {rating}\u2605
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
                                            stroke="#1e3a5f"
                                            strokeWidth="3"
                                        />
                                    )}
                                    <circle cx={x} cy={y} r="6" fill="#1e3a5f" stroke="white" strokeWidth="2" />
                                    <text
                                        x={x}
                                        y={CHART_HEIGHT + 20}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="#64748b"
                                        transform={`rotate(-45, ${x}, ${CHART_HEIGHT + 20})`}
                                    >
                                        {FormatUtility.formatDate(point.timestamp)}
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
