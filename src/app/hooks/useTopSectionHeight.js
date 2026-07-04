import { useLayoutEffect } from 'react'

/** Publishes the TopSection's rendered height as `--top-section-height` on the
 *  document root so sticky elements below can offset accordingly. Re-measures
 *  via ResizeObserver while mounted. */
export function useTopSectionHeight(forwardedRef) {
    useLayoutEffect(() => {
        if (!forwardedRef?.current) return
        const element = forwardedRef.current
        const updateHeight = () => {
            document.documentElement.style.setProperty('--top-section-height', `${element.offsetHeight}px`)
        }
        updateHeight()
        const resizeObserver = new ResizeObserver(updateHeight)
        resizeObserver.observe(element)
        return () => resizeObserver.disconnect()
    }, [forwardedRef])
}
