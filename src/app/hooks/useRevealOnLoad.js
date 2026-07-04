import { useEffect, useRef, useState } from 'react'

/** Tracks loading→loaded transitions and exposes a `revealControls` flag that
 *  flips true for 1.2s after the first time loading completes, so chrome can
 *  animate in. `hideRealContent` is true while skeleton should be shown. */
export function useRevealOnLoad(isLoading) {
    const wasLoadingRef = useRef(isLoading)
    const hasRevealedRef = useRef(false)
    const needsRevealRef = useRef(false)
    const [revealControls, setRevealControls] = useState(false)

    useEffect(() => {
        if (wasLoadingRef.current && !isLoading && !hasRevealedRef.current) {
            hasRevealedRef.current = true
            needsRevealRef.current = false
            setRevealControls(true)
            const timer = setTimeout(() => setRevealControls(false), 1200)
            return () => clearTimeout(timer)
        }
        if (isLoading && !hasRevealedRef.current) {
            needsRevealRef.current = true
        }
        wasLoadingRef.current = isLoading
    }, [isLoading])

    const hideRealContent = !hasRevealedRef.current && (isLoading || (needsRevealRef.current && !revealControls))
    return { hideRealContent, revealControls }
}
