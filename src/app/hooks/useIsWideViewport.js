import { useEffect, useState } from 'react'

/**
 * Subscribes to a min-width media query and returns true when the viewport
 * matches. Defaults to the Tailwind `lg` breakpoint (1024px) — the threshold
 * at which the asset/people list views can fit a side panel next to the table
 * without crowding the columns.
 *
 * @param {number} [minWidth=1024] Pixel width that flips the result to true.
 * @returns {boolean}
 */
export default function useIsWideViewport(minWidth = 1024) {
    const query = `(min-width: ${minWidth}px)`
    const [matches, setMatches] = useState(() =>
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia(query).matches
            : true
    )

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
        const mq = window.matchMedia(query)
        const handler = (event) => setMatches(event.matches)
        setMatches(mq.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [query])

    return matches
}
