/* PlanUtility — barrel re-export.
 *
 * The Plan/Operations scheduling subsystem was retired; the only helper
 * still consumed by live code is:
 *   - getTodayDate (src/utils/plan/planTime) — CST "today" anchor
 */

export { getTodayDate } from './plan/planTime'
