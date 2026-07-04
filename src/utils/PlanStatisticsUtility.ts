/**
 * PlanStatisticsUtility — barrel re-export of the topical Plan Statistics
 * analytics modules. Historical importers (`from '...PlanStatisticsUtility'`)
 * keep working unchanged; new code should import from the focused files
 * directly when it only needs one slice:
 *
 *   • PlanStatisticsConstants — period defs, chart palette
 *   • PlanStatisticsDates     — ISO + calendar-boundary math
 *   • PlanStatisticsRange     — buildRange, formatPeriodLabel, shiftAnchor
 */
export * from './PlanStatisticsConstants'
export * from './PlanStatisticsDates'
export * from './PlanStatisticsRange'
