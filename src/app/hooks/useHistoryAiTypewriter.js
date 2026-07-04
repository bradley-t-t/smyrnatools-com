import { useEffect, useRef, useState } from 'react'

import { AI_TYPEWRITER_CHARS_PER_TICK, AI_TYPEWRITER_TICK_MS } from '../constants/historyConstants'

/**
 * Streams an AI summary character-by-character into a displayed string.
 * Returns the currently visible text and a flag for when typing is complete.
 * Resets and replays whenever the source `aiSummary` changes.
 */
export default function useHistoryAiTypewriter(aiSummary) {
    const [displayText, setDisplayText] = useState('')
    const [isTypingComplete, setIsTypingComplete] = useState(false)
    const previousSummaryRef = useRef(null)

    useEffect(() => {
        if (!aiSummary) {
            previousSummaryRef.current = null
            setDisplayText('')
            setIsTypingComplete(false)
            return
        }
        if (aiSummary === previousSummaryRef.current) return
        previousSummaryRef.current = aiSummary
        setDisplayText('')
        setIsTypingComplete(false)
        let currentIndex = 0
        const interval = setInterval(() => {
            if (currentIndex < aiSummary.length) {
                currentIndex = Math.min(currentIndex + AI_TYPEWRITER_CHARS_PER_TICK, aiSummary.length)
                setDisplayText(aiSummary.slice(0, currentIndex))
            } else {
                clearInterval(interval)
                setIsTypingComplete(true)
            }
        }, AI_TYPEWRITER_TICK_MS)
        return () => clearInterval(interval)
    }, [aiSummary])

    return { displayText, isTypingComplete }
}
