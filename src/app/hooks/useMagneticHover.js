import { useCallback, useEffect, useRef } from 'react'
const MAGNETIC_RADIUS_PX = 80
const MAX_DISPLACEMENT_PX = 8
const LERP_SPEED = 0.08
const RESET_LERP_SPEED = 0.1
/**
 * Makes nav items magnetically gravitate toward the mouse cursor when it
 * enters a proximity radius. Each registered element smoothly displaces
 * toward the pointer using a requestAnimationFrame lerp loop, and springs
 * back when the cursor leaves range.
 *
 * @returns {{
 *   registerElement: (el: HTMLElement | null) => void,
 *   handleMouseMove: (e: MouseEvent) => void,
 *   handleMouseLeave: () => void
 * }}
 */
export function useMagneticHover() {
    const elementsRef = useRef(new Set())
    const mouseRef = useRef({ x: -9999, y: -9999 })
    const animFrameRef = useRef(null)
    const activeRef = useRef(true)
    const registerElement = useCallback((el) => {
        if (!el) return
        elementsRef.current.add(el)
        el._magneticOffset = { x: 0, y: 0 }
    }, [])
    const handleMouseMove = useCallback((e) => {
        mouseRef.current = { x: e.clientX, y: e.clientY }
    }, [])
    const handleMouseLeave = useCallback(() => {
        mouseRef.current = { x: -9999, y: -9999 }
    }, [])
    useEffect(() => {
        activeRef.current = true
        const animate = () => {
            if (!activeRef.current) return
            const { x: mx, y: my } = mouseRef.current
            elementsRef.current.forEach((el) => {
                if (!el.isConnected) {
                    elementsRef.current.delete(el)
                    return
                }
                const rect = el.getBoundingClientRect()
                const centerX = rect.left + rect.width / 2
                const centerY = rect.top + rect.height / 2
                const dx = mx - centerX
                const dy = my - centerY
                const distance = Math.sqrt(dx * dx + dy * dy)
                const offset = el._magneticOffset ?? { x: 0, y: 0 }
                let targetX = 0
                let targetY = 0
                let speed = RESET_LERP_SPEED
                if (distance < MAGNETIC_RADIUS_PX && mx > 0) {
                    const strength = 1 - distance / MAGNETIC_RADIUS_PX
                    const easedStrength = strength * strength
                    // Scale displacement along the cursor direction up to the full max
                    targetX = (dx / distance) * easedStrength * MAX_DISPLACEMENT_PX
                    targetY = (dy / distance) * easedStrength * MAX_DISPLACEMENT_PX
                    speed = LERP_SPEED
                }
                offset.x += (targetX - offset.x) * speed
                offset.y += (targetY - offset.y) * speed
                // Snap to zero when displacement is negligible to avoid sub-pixel jitter
                if (Math.abs(offset.x) < 0.1 && Math.abs(offset.y) < 0.1 && targetX === 0 && targetY === 0) {
                    offset.x = 0
                    offset.y = 0
                    el.style.transform = ''
                } else {
                    el.style.transform = `translate(${offset.x}px, ${offset.y}px)`
                }
                el._magneticOffset = offset
            })
            animFrameRef.current = requestAnimationFrame(animate)
        }
        animFrameRef.current = requestAnimationFrame(animate)
        return () => {
            activeRef.current = false
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        }
    }, [])
    return { handleMouseLeave, handleMouseMove, registerElement }
}
