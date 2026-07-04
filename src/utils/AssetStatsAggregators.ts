/**
 * Pure per-section aggregators consumed by `useAssetStatistics`. Each function
 * is a one-pass rollup over an already-scoped asset list — no React, no fetches,
 * no side effects. This file is a barrel — implementations live in the topical
 * modules below, grouped by section of the Statistics page.
 */

export * from './AssetStatsFleet'
export * from './AssetStatsOperations'
export * from './AssetStatsScope'
export * from './AssetStatsService'
