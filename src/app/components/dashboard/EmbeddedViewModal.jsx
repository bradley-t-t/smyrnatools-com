/* eslint-disable react/forbid-dom-props */
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

import EquipmentsView from '../../../views/assets/equipment/EquipmentsView'
import MixersView from '../../../views/assets/mixers/MixersView'
import TractorsView from '../../../views/assets/tractors/TractorsView'
import TrailersView from '../../../views/assets/trailers/TrailersView'
import OperatorsView from '../../../views/people/operators/OperatorsView'

/** Maps view keys to their component, icon, and display title. */
const VIEW_CONFIG = {
    equipment: { component: EquipmentsView, icon: 'fa-snowplow', title: 'Equipment' },
    mixers: { component: MixersView, icon: 'fa-truck-moving', title: 'Mixers' },
    operators: { component: OperatorsView, icon: 'fa-users', title: 'Operators' },
    tractors: { component: TractorsView, icon: 'fa-truck-front', title: 'Tractors' },
    trailers: { component: TrailersView, icon: 'fa-truck', title: 'Trailers' }
}
/**
 * Full-screen modal that embeds an asset or operator list view from the dashboard.
 * Allows quick drill-down into a specific view with an optional pre-applied search filter.
 * @param {Object} props
 * @param {'equipment'|'mixers'|'operators'|'tractors'|'trailers'} props.embeddedView - Key selecting which view to render.
 * @param {string} [props.embeddedViewSearch] - Initial search string passed to the embedded view.
 * @param {string} props.accentColor - Theme accent color for the header bar.
 * @param {Function} props.onClose - Callback invoked when the close button is clicked.
 */
export default function EmbeddedViewModal({
    embeddedView,
    embeddedViewSearch,
    embeddedViewProps,
    accentColor,
    onClose
}) {
    /* Close on Escape — matches the keyboard model users expect from a
     * modal layer. */
    useEffect(() => {
        if (!embeddedView) return
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [embeddedView, onClose])

    const config = VIEW_CONFIG[embeddedView]
    if (!config) return null
    const ViewComponent = config.component
    if (typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4 animate-fade-in-fast"
            role="dialog"
            aria-modal="true"
            aria-label={config.title}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose?.()
            }}
        >
            <div className="relative w-full max-w-full md:max-w-6xl h-[95vh] md:h-[85vh] bg-bg-primary border border-border-light rounded-modal shadow-modal overflow-hidden flex flex-col animate-pop-in">
                <div
                    className="flex items-center justify-between px-3 py-2.5 md:px-5 md:py-3 text-white flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <i className={`fas ${config.icon} text-base md:text-lg`} aria-hidden="true" />
                        <span className="font-heading font-semibold text-base md:text-lg truncate">{config.title}</span>
                        {embeddedViewSearch && (
                            <span className="px-2 py-0.5 bg-white/20 rounded-md text-sm truncate">
                                Searching: {embeddedViewSearch}
                            </span>
                        )}
                    </div>
                    <button type="button"
                        onClick={onClose}
                        className="flex items-center justify-center w-9 h-9 rounded-md bg-white/10 transition-all duration-150 hover:bg-white/20 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                        aria-label="Close"
                        title="Close"
                    >
                        <i className="fas fa-times text-lg" aria-hidden="true" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto bg-bg-secondary">
                    <ViewComponent
                        embedded={true}
                        initialSearch={embeddedViewSearch}
                        exactMatch={true}
                        {...(embeddedViewProps || {})}
                    />
                </div>
            </div>
        </div>,
        document.body
    )
}
