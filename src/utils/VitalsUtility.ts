import type { Metric } from 'web-vitals'

type PerfEntryCallback = (metric: Metric) => void

/** Lazily reports Core Web Vitals (CLS, FID, FCP, LCP, TTFB) via a provided callback. */
const vitalsUtility = (onPerfEntry: PerfEntryCallback) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
            getCLS(onPerfEntry)
            getFID(onPerfEntry)
            getFCP(onPerfEntry)
            getLCP(onPerfEntry)
            getTTFB(onPerfEntry)
        })
    }
}
export default vitalsUtility
