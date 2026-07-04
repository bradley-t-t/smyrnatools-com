import { useEffect, useState } from 'react'

const ACTIVATION_OFFSET_PX = 120
const REMEASURE_DELAYS_MS = [50, 300]

/**
 * Scrollspy that highlights the last anchor whose top has crossed the
 * activation line (a fixed distance from the scroll container top).
 * Re-measures after layout settles so async content doesn't leave the
 * wrong section active on first paint.
 *
 * @param {object} args
 * @param {React.RefObject} args.scrollContainerRef - container to watch
 * @param {Array<{id: string}>} args.sections - ordered list of sections
 * @param {Array<unknown>} args.deps - reactive deps that should re-run
 *   the spy (added/removed sections, content length changes, etc.)
 * @returns {[string, (id: string) => void]} `[activeId, jumpTo]`
 */
export function usePlanScrollSpy({ scrollContainerRef, sections, deps = [] }) {
    const [activeSection, setActiveSection] = useState(sections[0]?.id || '')

    useEffect(() => {
        const root = scrollContainerRef.current
        if (!root) return
        const update = () => {
            const containerTop = root.getBoundingClientRect().top
            const atBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 4
            let best = sections[0]?.id || ''
            if (atBottom) {
                // When the container is at its scroll floor, the last rendered
                // section's top may still be below the activation line —
                // force-activate whichever nav section renders last.
                for (let i = sections.length - 1; i >= 0; i--) {
                    if (root.querySelector(`#${sections[i].id}`)) {
                        best = sections[i].id
                        break
                    }
                }
            } else {
                for (const section of sections) {
                    const el = root.querySelector(`#${section.id}`)
                    if (!el) continue
                    const top = el.getBoundingClientRect().top - containerTop
                    if (top - ACTIVATION_OFFSET_PX <= 0) best = section.id
                }
            }
            setActiveSection((prev) => (prev === best ? prev : best))
        }
        update()
        root.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        const timers = REMEASURE_DELAYS_MS.map((ms) => window.setTimeout(update, ms))
        return () => {
            root.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
            timers.forEach((id) => window.clearTimeout(id))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    const jumpTo = (id) => {
        const root = scrollContainerRef.current
        if (!root) return
        const el = root.querySelector(`#${id}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return [activeSection, jumpTo]
}
