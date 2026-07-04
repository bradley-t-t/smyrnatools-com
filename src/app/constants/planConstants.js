/* The Plan/Operations scheduling subsystem was retired. The only constant
 * still consumed by live code is the operations timezone, used by
 * src/utils/plan/planTime to resolve "today" in Central time. */

/* Smyrna's operations run on Central time regardless of where the
 * dispatcher (or developer) is sitting, so every "today" decision anchors
 * here — UTC may already be tomorrow while CST is still today. */
export const PLAN_TIME_ZONE = 'America/Chicago'
