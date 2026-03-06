import { useEffect, useState } from 'react'
const MOBILE_BREAKPOINT = 768
/** Tracks viewport width against MOBILE_BREAKPOINT (768px) via resize listener. */
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT)
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])
    return isMobile
}
