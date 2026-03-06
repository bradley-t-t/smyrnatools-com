import { useCallback, useEffect, useRef, useState } from 'react'

import { INITIAL_STATS } from '../constants/dashboardConstants'
/**
 * Animates dashboard stat counters from zero to their final values on first render
 * and on region changes. Uses requestAnimationFrame for smooth 60fps transitions.
 */
export function useAnimatedStats(stats, regionPlantsLoaded, dashboardRegionCode) {
    const [animatedStats, setAnimatedStats] = useState(null)
    const animationRef = useRef(null)
    const animationStateRef = useRef({ hasAnimated: false, isAnimating: false, region: '' })
    const statsRef = useRef(stats)
    useEffect(() => {
        statsRef.current = stats
    }, [stats])
    useEffect(() => {
        const state = animationStateRef.current
        if (!regionPlantsLoaded) {
            setAnimatedStats(null)
            state.hasAnimated = false
            state.isAnimating = false
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
                animationRef.current = null
            }
            return
        }
        if (state.region !== dashboardRegionCode) {
            state.hasAnimated = false
            state.isAnimating = false
            state.region = dashboardRegionCode
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
                animationRef.current = null
            }
        }
        if (state.isAnimating) return
        if (state.hasAnimated) {
            setAnimatedStats(stats)
            return
        }
        state.isAnimating = true
        const duration = 1200
        const startTime = performance.now()
        const animateFromZero = (target, eased) => {
            if (target === null || target === undefined) return target
            if (typeof target !== 'object') {
                return typeof target === 'number' ? Math.round(target * eased) : target
            }
            if (Array.isArray(target)) return target
            const result = {}
            for (const key in target) {
                result[key] = animateFromZero(target[key], eased)
            }
            return result
        }
        const animate = (currentTime) => {
            const currentStats = statsRef.current
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setAnimatedStats(animateFromZero(currentStats, eased))
            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                state.hasAnimated = true
                state.isAnimating = false
                animationRef.current = null
                setAnimatedStats(statsRef.current)
            }
        }
        animationRef.current = requestAnimationFrame(animate)
    }, [regionPlantsLoaded, stats, dashboardRegionCode])
    return animatedStats || INITIAL_STATS
}
/**
 * Produces a character-by-character typing effect for AI-generated plant summaries.
 * Splits the response at the ACTION PLAN separator and reveals action items after typing completes.
 */
export function useAITypingEffect(aiSummary, dashboardPlant) {
    const [aiDisplayText, setAiDisplayText] = useState('')
    const [aiActionPlan, setAiActionPlan] = useState([])
    const [isTypingComplete, setIsTypingComplete] = useState(false)
    const [showActionPlan, setShowActionPlan] = useState(false)
    useEffect(() => {
        setAiDisplayText('')
        setAiActionPlan([])
        setIsTypingComplete(false)
        setShowActionPlan(false)
    }, [dashboardPlant])
    useEffect(() => {
        if (!aiSummary) {
            setAiDisplayText('')
            setAiActionPlan([])
            setIsTypingComplete(false)
            setShowActionPlan(false)
            return
        }
        const separator = '---ACTION PLAN---'
        const parts = aiSummary.split(separator)
        const summaryText = parts[0].trim()
        const actionPlanText = parts[1] ? parts[1].trim() : ''
        const actionItems = actionPlanText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('-'))
            .map((line) => line.substring(1).trim())
        setAiActionPlan(actionItems)
        setShowActionPlan(false)
        let currentIndex = 0
        setAiDisplayText('')
        setIsTypingComplete(false)
        const typingInterval = setInterval(() => {
            if (currentIndex < summaryText.length) {
                setAiDisplayText(summaryText.slice(0, currentIndex + 1))
                currentIndex++
            } else {
                clearInterval(typingInterval)
                setIsTypingComplete(true)
                if (actionItems.length > 0) {
                    setTimeout(() => setShowActionPlan(true), 300)
                }
            }
        }, 15)
        return () => clearInterval(typingInterval)
    }, [aiSummary])
    return { aiActionPlan, aiDisplayText, isTypingComplete, showActionPlan }
}
/**
 * Manages date range filter state for the status history chart.
 * Provides quick-select presets (this week, last month, this quarter, etc.)
 * and tracks the oldest available history date for the "all" option.
 */
export function useDateFilter() {
    const [historyStartDate, setHistoryStartDate] = useState('')
    const [historyEndDate, setHistoryEndDate] = useState('')
    const [oldestHistoryDate, setOldestHistoryDate] = useState('')
    const handleQuickDateFilter = useCallback(
        (filter) => {
            const today = new Date()
            const todayStr = today.toISOString().split('T')[0]
            const filters = {
                all: () => {
                    setHistoryStartDate(oldestHistoryDate || todayStr)
                    setHistoryEndDate(todayStr)
                },
                'last-month': () => {
                    const start = new Date(today)
                    start.setMonth(today.getMonth() - 1)
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(todayStr)
                },
                'last-quarter': () => {
                    const currentMonth = today.getMonth()
                    const lastQuarterStartMonth = Math.floor(currentMonth / 3) * 3 - 3
                    let year = today.getFullYear()
                    let month = lastQuarterStartMonth
                    if (month < 0) {
                        month = 9
                        year -= 1
                    }
                    const start = new Date(year, month, 1)
                    const end = new Date(year, month + 3, 0)
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(end.toISOString().split('T')[0])
                },
                'last-week': () => {
                    const start = new Date(today)
                    start.setDate(today.getDate() - 7)
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(todayStr)
                },
                'last-year': () => {
                    const start = new Date(today.getFullYear() - 1, 0, 1)
                    const end = new Date(today.getFullYear() - 1, 11, 31)
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(end.toISOString().split('T')[0])
                },
                'this-month': () => {
                    const start = new Date(today.getFullYear(), today.getMonth(), 1)
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(todayStr)
                },
                'this-quarter': () => {
                    const currentMonth = today.getMonth()
                    const quarterStartMonth = Math.floor(currentMonth / 3) * 3
                    const start = new Date(today.getFullYear(), quarterStartMonth, 1)
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(todayStr)
                },
                'this-week': () => {
                    const start = new Date(today)
                    start.setDate(today.getDate() - today.getDay())
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(todayStr)
                },
                'this-year': () => {
                    const start = new Date(today.getFullYear(), 0, 1)
                    setHistoryStartDate(start.toISOString().split('T')[0])
                    setHistoryEndDate(todayStr)
                }
            }
            filters[filter]?.()
        },
        [oldestHistoryDate]
    )
    return {
        handleQuickDateFilter,
        historyEndDate,
        historyStartDate,
        oldestHistoryDate,
        setHistoryEndDate,
        setHistoryStartDate,
        setOldestHistoryDate
    }
}
