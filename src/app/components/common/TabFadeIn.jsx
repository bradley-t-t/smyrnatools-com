import React from 'react'

/**
 * Animation wrapper that remounts its children whenever `animationKey`
 * changes. Pair the `key` reset with a Tailwind `animate-fade-in-fast`
 * class so every tab / section switch reads as the new content easing in
 * rather than swapping in place.
 *
 * Reused by OperationsView, every Statistics surface (Plan, Asset,
 * Person), and every shell that switches between a List and a Statistics
 * tab so navigations land consistently across the app.
 *
 * `className` is composed AFTER the animation class so callers can apply
 * layout utilities (flex, gap, etc.) without overwriting the animation.
 * Reduced-motion users get an instant swap with no fade.
 */
export default function TabFadeIn({ animationKey, children, className }) {
    return (
        <div key={animationKey} className={`animate-fade-in-fast motion-reduce:animate-none ${className || ''}`}>
            {children}
        </div>
    )
}
