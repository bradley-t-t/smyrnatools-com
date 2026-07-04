import { useEffect, useRef, useState } from 'react'

/**
 * Watches a scroll container and toggles the analysis panel visibility
 * once the user scrolls more than one full viewport height. Only active
 * while the timeline tab is showing.
 */
export default function useHistoryAnalysisScrollCollapse(activeTab) {
    const scrollContainerRef = useRef(null)
    const [analysisVisible, setAnalysisVisible] = useState(true)

    useEffect(() => {
        if (activeTab !== 'timeline') return
        const container = scrollContainerRef.current
        if (!container) return
        const threshold = container.clientHeight
        const onScroll = () => {
            setAnalysisVisible(container.scrollTop < threshold)
        }
        container.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
        return () => container.removeEventListener('scroll', onScroll)
    }, [activeTab])

    return { analysisVisible, scrollContainerRef }
}
