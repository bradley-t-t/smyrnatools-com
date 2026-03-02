import React from 'react'

import EquipmentsView from '../../../views/equipment/EquipmentsView'
import MixersView from '../../../views/mixers/MixersView'
import OperatorsView from '../../../views/operators/OperatorsView'
import TractorsView from '../../../views/tractors/TractorsView'
import TrailersView from '../../../views/trailers/TrailersView'

const VIEW_CONFIG = {
    equipment: { component: EquipmentsView, icon: 'fa-snowplow', title: 'Equipment' },
    mixers: { component: MixersView, icon: 'fa-truck-moving', title: 'Mixers' },
    operators: { component: OperatorsView, icon: 'fa-users', title: 'Operators' },
    tractors: { component: TractorsView, icon: 'fa-truck-front', title: 'Tractors' },
    trailers: { component: TrailersView, icon: 'fa-truck', title: 'Trailers' }
}

export default function EmbeddedViewModal({ embeddedView, embeddedViewSearch, accentColor, onClose }) {
    const config = VIEW_CONFIG[embeddedView]
    if (!config) return null

    const ViewComponent = config.component

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div
                    className="flex items-center justify-between px-5 py-3 text-white flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                >
                    <div className="flex items-center gap-3">
                        <i className={`fas ${config.icon} text-lg`} />
                        <span className="font-semibold text-lg">{config.title}</span>
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
