import { useCallback } from 'react'

/** Hook for computing week-over-week variance percentages and styling classes between last week's and current week's report data. */
export function useReportVariance(lastWeekData, currentWeekData = {}) {
    const getLastWeekValue = useCallback(
        (fieldName) => {
            if (!lastWeekData) return ''
            const v = lastWeekData[fieldName]
            return v === undefined || v === null ? '' : v
        },
        [lastWeekData]
    )

    const formatVariancePercent = useCallback(
        (fieldName, currentValue) => {
            const lastRaw = getLastWeekValue(fieldName)
            const currRaw = currentValue ?? currentWeekData[fieldName]
            const last = Number(lastRaw)
            const curr = Number(currRaw)
            if (!isFinite(last) || !isFinite(curr)) return ''
            if (last === 0) return curr === 0 ? '0%' : '100%'
            const pct = ((curr - last) / last) * 100
            const rounded = Number(pct.toFixed(1))
            if (rounded === 0) return '0%'
            return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`
        },
        [getLastWeekValue, currentWeekData]
    )

    const getVarianceClass = useCallback((varianceStr) => {
        const n = parseFloat(varianceStr)
        if (!isFinite(n)) return 'rpt-variance-neutral'
        if (n > 0) return 'rpt-variance-positive'
        if (n < 0) return 'rpt-variance-negative'
        return 'rpt-variance-neutral'
    }, [])

    const getVarianceSymbol = useCallback((varianceStr) => {
        const n = parseFloat(varianceStr)
        if (n > 0) return '▲'
        if (n < 0) return '▼'
        return ''
    }, [])

    return {
        formatVariancePercent,
        getLastWeekValue,
        getVarianceClass,
        getVarianceSymbol
    }
}
