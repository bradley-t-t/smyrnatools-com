import React from 'react'

export default function ToggleButtonGroup({ items, selectedId, onSelect }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <button
                    key={item.id}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium outline-none transition-all md:px-5 md:py-2.5 md:text-sm ${
                        selectedId === item.id
                            ? 'border-2 border-accent bg-accent/10 font-semibold text-accent'
                            : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => onSelect(item.id)}
                >
                    {item.label}
                </button>
            ))}
        </div>
    )
}
