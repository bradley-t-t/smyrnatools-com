import React from 'react'

import EquipmentsView from '../../../views/equipment/EquipmentsView'
import MixersView from '../../../views/mixers/MixersView'
import OperatorsView from '../../../views/operators/OperatorsView'
import TractorsView from '../../../views/tractors/TractorsView'
import TrailersView from '../../../views/trailers/TrailersView'
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
export default function EmbeddedViewModal({ embeddedView, embeddedViewSearch, accentColor, onClose }) {
    const config = VIEW_CONFIG[embeddedView]
    if (!config) return null
    const ViewComponent = config.component
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4">
            <div className="relative w-full max-w-full md:max-w-6xl h-[95vh] md:h-[85vh] bg-white rounded-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div
                    className="flex items-center justify-between px-3 py-2.5 md:px-5 md:py-3 text-white flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                >
                    <div className="flex items-center gap-2 md:gap-3">
                        <i className={`fas ${config.icon} text-base md:text-lg`} />
                        <span className="font-semibold text-base md:text-lg">{config.title}</span>
                        {embeddedViewSearch && (
                            <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                                Searching: {embeddedViewSearch}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <i className="fas fa-times text-lg" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto">
                    <ViewComponent embedded={true} initialSearch={embeddedViewSearch} exactMatch={true} />
                </div>
            </div>
        </div>
    )
}
